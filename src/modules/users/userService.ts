import { BaseService } from '../../bases/baseService'
import { UserRepository } from './userRepository'
import { getSupabase, getSupabaseAdmin } from '../../config/supabaseClient'
import { fileUploadService } from '../../services/fileUploadService'
import { withRollback, RollbackManager } from '../../utils/rollbackHelper'
import { UserCreateDto, UserUpdateDto } from '~/types/userType'

export class UserService extends BaseService {
  constructor(protected repo: UserRepository) {
    super(repo)
  }
  // Ghi đè `getAll` để hỗ trợ tìm kiếm theo keyword trên email/name
  async getAll(params: any = {}) {
    const { keyword, page, limit, active, ...other } = params
    const safePage = page || 1
    const safeLimit = limit || 20
    const skip = (safePage - 1) * safeLimit

    if (keyword) {
      // Xây dựng điều kiện where cho tìm kiếm theo keyword. Nếu caller truyền `active` thì thêm filter đó.
      const where: any = {
        OR: [
          { email: { contains: keyword, mode: 'insensitive' } },
          { phoneNumber: { contains: keyword, mode: 'insensitive' } },
          { name: { contains: keyword, mode: 'insensitive' } }
        ]
      }

      if (typeof active === 'boolean') {
        // áp dụng filter `active` cùng với điều kiện keyword
        where.active = active
      }

      // Sử dụng orderBy do caller truyền nếu có, nếu không thì mặc định newest-first
      const orderBy = (params && (params as any).orderBy) || { id: 'desc' }
      const users = await (this.repo as any).findManyWithRoles({ where, skip, take: safeLimit, orderBy })
      const total = await this.repo.count(where)
      // Giải thích (vi):
      // 1) `findManyWithRoles` đã include `roleAssignments.role` và
      //    `userPermissions.permission` (xem userRepository.findManyWithRoles).
      // 2) Ở layer Service/API, không nên trả về các object relation lồng nhau
      //    (roleAssignments, userPermissions) xuống frontend — frontend chỉ
      //    cần các danh sách key (roleKeys, permissionKeys) để hiển thị hoặc gửi
      //    lại khi cập nhật. Gom nested relations thành mảng key giúp response
      //    phẳng, dễ tiêu thụ và ổn định.
      // 3) `transformUserAuditFields` được gọi để chuyển các trường audit
      //    (creator/updater) thành tên hiển thị trước khi trả về.
      const transformed = this.transformUserAuditFields(users)

      // Chuyển các relation lồng nhau thành mảng key và loại bỏ các object lồng nhau
      const rows = (transformed || []).map((u: any) => {
        const out: any = { ...u }
        // roleKeys: lấy trường `key` từ roleAssignments
        out.roleKeys = (u.roleAssignments || []).map((ra: any) => ra?.role?.key).filter(Boolean)
        // permissionKeys: lấy trường `key` từ userPermissions
        out.permissionKeys = (u.userPermissions || []).map((up: any) => up?.permission?.key).filter(Boolean)
        // Xóa các trường nested để giữ response gọn
        delete out.roleAssignments
        delete out.userPermissions
        return out
      })

      return { rows, total }
    }

    const baseParams: any = { page: safePage, limit: safeLimit, ...other }
    if (typeof active === 'boolean') baseParams.active = active

    // Để đồng nhất với nhánh tìm theo keyword, dùng `findManyWithRoles` để fetch
    // cả roleAssignments và userPermissions nhằm có thể trả về roleKeys và permissionKeys.
    //
    // Giải thích (vi):
    // - Trả về `roleKeys` và `permissionKeys` cho mọi endpoint giúp frontend
    //   tránh phải xử lý nested relations hoặc gửi thêm nhiều request phụ.
    // - Mặc định sắp xếp (`orderBy`) đặt về `{ id: 'desc' }` để trả về bản
    //   ghi mới nhất trước (newest-first). Nếu caller muốn thứ tự khác,
    //   họ có thể truyền `params.orderBy` và hàm sẽ tôn trọng.
    const where = { ...(other ?? {}) } as any
    if (typeof active === 'boolean') where.active = active

    const orderBy = (params && (params as any).orderBy) || { id: 'desc' }
    const users = await (this.repo as any).findManyWithRoles({ where, skip, take: safeLimit, orderBy })
    const total = await this.repo.count(where)
    const transformed = this.transformUserAuditFields(users)
    // Chuyển các relation lồng nhau thành mảng key giống nhánh keyword
    const rows = (transformed || []).map((u: any) => {
      const out: any = { ...u }
      out.roleKeys = (u.roleAssignments || []).map((ra: any) => ra?.role?.key).filter(Boolean)
      out.permissionKeys = (u.userPermissions || []).map((up: any) => up?.permission?.key).filter(Boolean)
      delete out.roleAssignments
      delete out.userPermissions
      return out
    })

    return { rows, total }
  }
  /**
   * Luồng tạo người dùng:
   * 1. Tạo người dùng trên Supabase (email/password)
   * 2. Upload avatar (nếu có)
   * 3. Tạo profile cục bộ và gán role/permission trong 1 transaction DB
   * 4. Nếu có lỗi ở bất kỳ bước nào, rollback các file đã upload và ném lỗi
   *
   * Dạng dữ liệu mong đợi:
   * UserCreateDto — roleKeys và permissionKeys là mảng key (chuỗi)
   */
  async createUser(data: UserCreateDto, ctx?: { actorId?: number }) {
    // Gói vớiRollback giúp chúng ta đăng ký các hành động rollback (xóa file, xóa supabase user)
    // nếu bất kỳ bước phụ trợ nào thất bại sau khi đã tạo tài nguyên bên ngoài DB.
    // Mục tiêu: đảm bảo tính nguyên tử cho luồng business (không để rác file hoặc user Supabase khi transaction DB fail).
    return withRollback(async (rollback: RollbackManager) => {
      // 1) Tạo user trên Supabase (auth)
      // - Bắt buộc có email và password cho signup.
      // - Nếu Supabase trả lỗi ở bước này thì dừng và ném lỗi ngay — không có side-effect khác cần rollback.
      const supabase = getSupabase()
      if (!data.email || !data.password) throw new Error('Email và mật khẩu là bắt buộc')

      const { data: sbData, error: sbError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password
      })

      if (sbError) throw sbError
      const sbUser = (sbData as any).user
      if (!sbUser) throw new Error('Không tạo được người dùng Supabase')

      // Đăng ký rollback để xóa người dùng Supabase nếu các bước tiếp theo thất bại.
      // Lý do: sau khi tạo Supabase user, chúng ta có một tài nguyên bên ngoài DB; nếu
      // tạo profile cục bộ trong DB fail, cần dọn dẹp Supabase user để không để rác account.
      // rollback.addAsyncAction chạy khi withRollback bắt lỗi và thực hiện cleanup.
      rollback.addAsyncAction(async () => {
        try {
          const adminClient: any = getSupabaseAdmin()
          if (adminClient?.auth?.admin?.deleteUser) {
            await adminClient.auth.admin.deleteUser(sbUser.id)
          } else if (adminClient?.auth?.deleteUser) {
            await adminClient.auth.deleteUser(sbUser.id)
          } else {
            console.warn('Rollback: chức năng deleteUser của Supabase admin không có sẵn, có thể cần dọn dẹp thủ công')
          }
        } catch (err) {
          // Không throw nữa trong rollback — chỉ log vì rollback là best-effort
          console.error('Rollback: không thể xóa người dùng Supabase', err)
        }
      })

      // 2) Upload avatar (nếu có)
      // - Thực hiện trước transaction DB để có URL lưu vào field avatarUrl.
      // - Nếu upload thành công thì thêm action xóa file vào rollback manager nhằm dọn file nếu bước sau fail.
      // - Lưu ý: upload có thể tốn thời gian; giữ nhỏ (resize) ở client nếu cần.
      let uploadedAvatarUrl: string | null = null
      if (data.avatarFile && (data.avatarFile as any).buffer) {
        const uploaded = await fileUploadService.uploadAvatar(
          (data.avatarFile as any).buffer,
          (data.avatarFile as any).originalname
        )
        uploadedAvatarUrl = uploaded.url
        // Nếu transaction DB fail sau này, rollback sẽ gọi xóa file này
        rollback.addFileDeleteAction(uploaded.url)
      }

      // 3) Tạo profile cục bộ và gán role/permission trong 1 transaction
      // - Mọi thao tác DB (user, userRoleAssignment, userPermission) được gói trong transaction
      //   để đảm bảo tính nhất quán (rollback DB tự động khi có lỗi trong transaction).
      // - Sau transaction, chúng ta thực hiện 1 query chọn lọc để trả về chỉ `key` của role/permission
      //   (giúp frontend không cần xử lý nested relation).
      const created = await this.repo.runTransaction(async (tx) => {
        const userCreateData: any = {
          email: data.email,
          name: data.name ?? null,
          phoneNumber: data.phoneNumber ?? null,
          supabaseId: sbUser.id,
          avatarUrl: uploadedAvatarUrl ?? data.avatarUrl ?? null,
          active: typeof data.active === 'boolean' ? data.active : true
        }

        const newUser = await this.repo.create(userCreateData, tx)

        // Gán role dựa trên roleKeys (key là định danh chuỗi của role)
        if (Array.isArray(data.roleKeys) && data.roleKeys.length > 0) {
          const roles = await tx.userRole.findMany({ where: { key: { in: data.roleKeys } } })
          for (const r of roles) {
            await tx.userRoleAssignment.create({ data: { userId: newUser.id, roleId: r.id } })
          }
        }

        // Gán quyền trực tiếp cho user (nếu có) dưới dạng userPermission.allowed = true
        if (Array.isArray(data.permissionKeys) && data.permissionKeys.length > 0) {
          const perms = await tx.permission.findMany({ where: { key: { in: data.permissionKeys } } })
          for (const p of perms) {
            await tx.userPermission.create({ data: { userId: newUser.id, permissionId: p.id, allowed: true } })
          }
        }

        // Trả về bản ghi user vừa tạo, include chỉ các key cần thiết để chuyển sang response phẳng
        return await this.repo.findById(
          {
            where: { id: newUser.id },
            include: {
              // chỉ lấy key để giảm payload và tránh lộ thông tin thừa
              roleAssignments: { include: { role: { select: { key: true } } } },
              userPermissions: { include: { permission: { select: { key: true } } } }
            }
          },
          tx
        )
      })

      // 4) Chuẩn bị response: chuyển nested relations thành mảng key
      // - Giữ response phẳng (roleKeys, permissionKeys) để frontend dễ dùng
      const transformed: any = {
        ...created,
        roleKeys: (created?.roleAssignments || []).map((ra: any) => ra.role?.key).filter(Boolean),
        permissionKeys: (created?.userPermissions || []).map((up: any) => up.permission?.key).filter(Boolean)
      }

      // Xóa các object nested trước khi trả về
      delete transformed.roleAssignments
      delete transformed.userPermissions

      return transformed
    })
  }

  async updateById(id: number, data: UserUpdateDto, ctx?: { actorId?: number }) {
    const existing = await this.repo.findById(id)
    if (!existing) throw new Error('Không tìm thấy người dùng')

    // Luồng cập nhật:
    // - Nếu client gửi file avatar mới, upload trước để có URL (không ghi vào DB ngay lập tức).
    // - Thực hiện các cập nhật DB (user, roleAssignments, userPermissions) trong 1 transaction.
    // - Nếu transaction fail, rollback manager sẽ xóa file avatar mới đã upload (đã đăng ký ở trên).
    // - Nếu update thành công và avatar được thay, cố gắng xóa avatar cũ (best-effort, không làm fail toàn bộ yêu cầu).
    // Mục tiêu: đảm bảo cập nhật avatar và mapping role/permission có tính nguyên tử về business logic,
    // đồng thời tránh để lại file rác nếu DB rollback.
    return withRollback(async (rollback: RollbackManager) => {
      // Nếu có file avatar mới, upload trước và đăng ký hành động xóa trong rollback
      let newAvatarUrl: string | null = null
      if (data.avatarFile && data.avatarFile.buffer) {
        const uploaded = await fileUploadService.uploadAvatar(data.avatarFile.buffer, data.avatarFile.originalname)
        newAvatarUrl = uploaded.url
        // Nếu transaction DB thất bại sẽ xóa file mới này
        rollback.addFileDeleteAction(newAvatarUrl)
      }

      const updated = await this.repo.runTransaction(async (tx) => {
        // Chuẩn bị payload cho update:
        // - Merge dữ liệu gửi lên, thay avatarUrl nếu đã upload file mới.
        // - Loại bỏ các trường tạm không tồn tại trên model User (avatarFile, roleKeys, permissionKeys)
        //   để tránh lỗi Prisma khi update.
        const updateData: any = { ...data }
        if (newAvatarUrl) {
          updateData.avatarUrl = newAvatarUrl
        }
        delete updateData.avatarFile
        delete updateData.roleKeys
        delete updateData.permissionKeys

        // Cập nhật bản ghi user chính
        const user = await this.repo.update({ id }, updateData, tx)

        // Nếu caller truyền roleKeys (mảng string key), thay toàn bộ roleAssignments trong transaction
        if (Array.isArray(data.roleKeys)) {
          // delete existing assignments for user
          await tx.userRoleAssignment.deleteMany({ where: { userId: user.id } })

          if (data.roleKeys.length > 0) {
            const roles = await tx.userRole.findMany({ where: { key: { in: data.roleKeys } } })
            for (const r of roles) {
              await tx.userRoleAssignment.create({ data: { userId: user.id, roleId: r.id } })
            }
          }
        }

        // Nếu caller truyền permissionKeys (mảng string key), thay toàn bộ userPermissions trong transaction
        if (Array.isArray(data.permissionKeys)) {
          // delete existing user permissions for user
          await tx.userPermission.deleteMany({ where: { userId: user.id } })

          if (data.permissionKeys.length > 0) {
            const perms = await tx.permission.findMany({ where: { key: { in: data.permissionKeys } } })
            for (const p of perms) {
              await tx.userPermission.create({ data: { userId: user.id, permissionId: p.id, allowed: true } })
            }
          }
        }

        // Trả về user đã cập nhật kèm roleAssignments/userPermissions (chỉ select key) để thuận tiện cho việc
        // chuyển sang response phẳng ở ngoài transaction.
        return tx.user.findUnique({
          where: { id: user.id },
          include: {
            roleAssignments: { include: { role: { select: { key: true } } } },
            userPermissions: { include: { permission: { select: { key: true } } } }
          }
        })
      })

      // Transform the returned object to arrays of keys
      const transformedUpdated: any = {
        ...updated,
        roleKeys: (updated?.roleAssignments || []).map((ra: any) => ra.role?.key).filter(Boolean),
        permissionKeys: (updated?.userPermissions || []).map((up: any) => up.permission?.key).filter(Boolean)
      }
      delete transformedUpdated.roleAssignments
      delete transformedUpdated.userPermissions

      // If update succeeded and we replaced avatar, attempt to delete old avatar (best-effort)
      try {
        if (newAvatarUrl && existing.avatarUrl) {
          await fileUploadService.deleteFileByUrl(existing.avatarUrl)
        }
      } catch (err: any) {
        // log and continue - not fatal
        console.error('Failed to delete old avatar:', err?.message || err)
      }

      return transformedUpdated
    })
  }

  // Override getById to include roles and other necessary fields for update operations
  async getById(
    id: number | string,
    options?: { include?: any; select?: any; includeRoles?: boolean; includePermissions?: boolean }
  ) {
    try {
      // Luôn include roleAssignments và userPermissions để trả về roleKeys/permissionKeys
      // Nếu caller truyền options.include thì merge với default include
      const defaultInclude = {
        roleAssignments: {
          include: {
            role: {
              select: { id: true, key: true, name: true, description: true }
            }
          }
        },
        userPermissions: {
          include: {
            permission: {
              select: { id: true, key: true, name: true, description: true }
            }
          }
        }
      }

      const finalInclude = options?.include ? { ...defaultInclude, ...options.include } : defaultInclude

      const user = await this.repo.findById({
        where: { id: typeof id === 'string' ? parseInt(id) : id },
        include: Object.keys(finalInclude).length > 0 ? finalInclude : undefined,
        select: options?.select
      })

      if (!user) return null

      // Chuyển đổi kết quả để bao gồm roleKeys và permissionKeys khi được yêu cầu
      const transformed = this.transformUserAuditFields([user])[0]

      // Luôn cung cấp mảng đơn giản roleKeys và permissionKeys cho client/API sử dụng
      transformed.roleKeys = (transformed.roleAssignments || [])
        .map((assignment: any) => assignment?.role?.key)
        .filter(Boolean)
      transformed.permissionKeys = (transformed.userPermissions || [])
        .map((userPerm: any) => userPerm?.permission?.key)
        .filter(Boolean)

      // Xóa các object relation lồng nhau để giữ response gọn và ổn định
      delete transformed.roleAssignments
      delete transformed.userPermissions
      delete transformed.roles
      delete transformed.directPermissions

      return transformed
    } catch (error) {
      throw error
    }
  }

  async deleteById(id: number, hard = false, ctx?: { actorId?: number }) {
    const existing = await this.repo.findById(id)
    if (!existing) throw new Error('Không tìm thấy người dùng')
    // Thực hiện xóa toàn bộ bằng helper chung để đảm bảo consistency
    const result = await this.hardDeleteIds([id], ctx)
    return result
  }

  // NOTE: giữ chữ ký tương thích với BaseService.deleteMultiple(where, hard?)
  // Nhưng ở cấp module user, chúng ta luôn thực hiện hard delete. Nếu caller truyền
  // một mảng ids trực tiếp hoặc một object where ({ id: { in: [...] } }) đều được hỗ trợ.
  async deleteMultiple(where: any, hard?: boolean, ctx?: { actorId?: number }) {
    // Chuẩn hóa danh sách ids từ tham số 'where'
    let ids: number[] = []
    if (Array.isArray(where)) ids = where
    else if (where && where.id && Array.isArray(where.id.in)) ids = where.id.in
    else throw new Error('Không có id nào được cung cấp')

    return this.hardDeleteIds(ids, ctx)
  }

  // Helper dùng chung để xóa nhiều user theo ids: xóa các bảng liên quan trong transaction,
  // xác nhận hậu điều kiện, rồi dọn dẹp avatar và Supabase user (best-effort).
  private async hardDeleteIds(ids: number[], ctx?: { actorId?: number }) {
    // Lấy users để biết supabaseId và avatarUrl
    const users = await this.repo.findMany({ where: { id: { in: ids } } })
    if (!users || users.length === 0) return { deleted: 0, avatarFailures: [], supabaseFailures: [] }

    const supabaseIds = users.map((u: any) => u.supabaseId).filter(Boolean)
    const avatarUrls = users.map((u: any) => u.avatarUrl).filter(Boolean)

    // Thực hiện xóa các bản ghi liên quan trong transaction
    await this.repo.runTransaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId: { in: ids } } })
      await tx.userRoleAssignment.deleteMany({ where: { userId: { in: ids } } })

      // Thêm các xóa khác nếu cần ở đây
      await tx.user.deleteMany({ where: { id: { in: ids } } })
    })

    // Kiểm tra hậu điều kiện
    const remaining = await this.repo.findMany({ where: { id: { in: ids } } })
    if (remaining && remaining.length > 0) {
      console.error(
        '[hardDeleteIds] Sau transaction vẫn còn user trong DB, ids còn lại=',
        remaining.map((r: any) => r.id)
      )
      return {
        deleted: users.length - remaining.length,
        remaining: remaining.map((r: any) => r.id),
        avatarFailures: [],
        supabaseFailures: []
      }
    }

    // Xóa avatar (best-effort) -- song song với retry nhỏ
    const avatarFailures: { url: string; error: any }[] = []
    const avatarResults = await Promise.allSettled(
      avatarUrls.map((url: string) =>
        (async function tryDeleteAvatar(retries = 1) {
          try {
            await fileUploadService.deleteFileByUrl(url)
            return { url, ok: true }
          } catch (err: any) {
            if (retries > 0) {
              await new Promise((r) => setTimeout(r, 200))
              return tryDeleteAvatar(retries - 1)
            }
            return { url, ok: false, error: err?.message || err }
          }
        })()
      )
    )

    for (const r of avatarResults) {
      if (r.status === 'fulfilled') {
        const v: any = r.value
        if (!v.ok) avatarFailures.push({ url: v.url, error: v.error })
      } else {
        avatarFailures.push({ url: 'unknown', error: r.reason })
      }
    }

    // Xóa Supabase users (best-effort)
    const supabaseFailures: { supabaseId: string; error: any }[] = []
    if (supabaseIds.length > 0) {
      const adminClient: any = getSupabaseAdmin()
      const sbResults = await Promise.allSettled(
        supabaseIds.map((sbId: string) =>
          (async function tryDeleteSb(retries = 1) {
            try {
              if (adminClient?.auth?.admin?.deleteUser) {
                return await adminClient.auth.admin.deleteUser(sbId)
              } else if (adminClient?.auth?.deleteUser) {
                return await adminClient.auth.deleteUser(sbId)
              } else {
                throw new Error('Supabase admin deleteUser không có sẵn')
              }
            } catch (err: any) {
              if (retries > 0) {
                await new Promise((r) => setTimeout(r, 200))
                return tryDeleteSb(retries - 1)
              }
              throw err
            }
          })()
        )
      )

      for (let i = 0; i < sbResults.length; i++) {
        const res = sbResults[i]
        const sbId = supabaseIds[i]
        if (res.status === 'rejected') {
          supabaseFailures.push({ supabaseId: sbId, error: res.reason?.message || res.reason })
        }
      }
    }

    return {
      deleted: users.length,
      avatarFailures,
      supabaseFailures
    }
  }

  async activeMultiple(ids: number[], active: boolean, ctx?: { actorId?: number }) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('Không có id nào được cung cấp')
    // Model User của Prisma không có trường updatedBy — chỉ cập nhật cờ active ở đây
    return this.repo.updateMany({ id: { in: ids } }, { active })
  }
}

export default UserService
