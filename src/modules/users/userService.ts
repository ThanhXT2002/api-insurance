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
  // Override getAll to support keyword search on email/name
  async getAll(params: any = {}) {
    const { keyword, page, limit, active, ...other } = params
    const safePage = page || 1
    const safeLimit = limit || 20
    const skip = (safePage - 1) * safeLimit

    if (keyword) {
      // Build keyword search where clause. Include `active` if caller provided it.
      const where: any = {
        OR: [
          { email: { contains: keyword, mode: 'insensitive' } },
          { phoneNumber: { contains: keyword, mode: 'insensitive' } },
          { name: { contains: keyword, mode: 'insensitive' } }
        ]
      }

      if (typeof active === 'boolean') {
        // apply active filter in addition to keyword
        where.active = active
      }

      // Use provided orderBy if caller gave one, otherwise default to newest-first
      const orderBy = (params && (params as any).orderBy) || { id: 'desc' }
      const users = await (this.repo as any).findManyWithRoles({ where, skip, take: safeLimit, orderBy })
      const total = await this.repo.count(where)
      // Transform audit fields first
      const transformed = this.transformUserAuditFields(users)

      // For each user, expose roleKeys and permissionKeys as arrays of keys and remove nested relation objects
      const rows = (transformed || []).map((u: any) => {
        const out: any = { ...u }
        out.roleKeys = (u.roleAssignments || []).map((ra: any) => ra?.role?.key).filter(Boolean)
        out.permissionKeys = (u.userPermissions || []).map((up: any) => up?.permission?.key).filter(Boolean)
        // Clean up nested relations to keep response compact
        delete out.roleAssignments
        delete out.userPermissions
        return out
      })

      return { rows, total }
    }

    const baseParams: any = { page: safePage, limit: safeLimit, ...other }
    if (typeof active === 'boolean') baseParams.active = active

    // For consistency with the keyword-search branch, use findManyWithRoles to fetch
    // roleAssignments and userPermissions so we can expose roleKeys and permissionKeys.
    const where = { ...(other ?? {}) } as any
    if (typeof active === 'boolean') where.active = active

    const orderBy = (params && (params as any).orderBy) || { id: 'desc' }
    const users = await (this.repo as any).findManyWithRoles({ where, skip, take: safeLimit, orderBy })
    const total = await this.repo.count(where)
    const transformed = this.transformUserAuditFields(users)

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
   * Create user flow:
   * 1. Create user in Supabase (email/password)
   * 2. Upload avatar (if provided)
   * 3. Create local user record and role assignments in a DB transaction
   * 4. On any error, rollback uploaded files and throw
   *
   * Expected data shape:
   * UserCreateDto (see userCreate.dto.ts) — roleKeys and permissionKeys are arrays of keys (strings)
   */
  async createUser(data: UserCreateDto, ctx?: { actorId?: number }) {
    return withRollback(async (rollback: RollbackManager) => {
      // 1) Supabase signup
      const supabase = getSupabase()
      if (!data.email || !data.password) throw new Error('Email và mật khẩu là bắt buộc')

      const { data: sbData, error: sbError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password
      })

      if (sbError) throw sbError
      const sbUser = (sbData as any).user
      if (!sbUser) throw new Error('Không tạo được người dùng Supabase')

      // Register rollback to remove Supabase user if any subsequent step fails.
      // Use the admin client helper which returns a service-role client when available.
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
          console.error('Rollback: không thể xóa người dùng Supabase', err)
        }
      })

      // 2) Upload avatar if present
      let uploadedAvatarUrl: string | null = null
      if (data.avatarFile && (data.avatarFile as any).buffer) {
        const uploaded = await fileUploadService.uploadAvatar(
          (data.avatarFile as any).buffer,
          (data.avatarFile as any).originalname
        )
        uploadedAvatarUrl = uploaded.url
        rollback.addFileDeleteAction(uploaded.url)
      }

      // 3) create local user and role/permission assignments in a transaction
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

        // role assignments by key
        if (Array.isArray(data.roleKeys) && data.roleKeys.length > 0) {
          const roles = await tx.userRole.findMany({ where: { key: { in: data.roleKeys } } })
          for (const r of roles) {
            await tx.userRoleAssignment.create({ data: { userId: newUser.id, roleId: r.id } })
          }
        }

        // direct permissions by key -> create UserPermission with allowed = true
        if (Array.isArray(data.permissionKeys) && data.permissionKeys.length > 0) {
          const perms = await tx.permission.findMany({ where: { key: { in: data.permissionKeys } } })
          for (const p of perms) {
            await tx.userPermission.create({ data: { userId: newUser.id, permissionId: p.id, allowed: true } })
          }
        }

        return await this.repo.findById(
          {
            where: { id: newUser.id },
            include: {
              // only select the role key and permission key to minimize data
              roleAssignments: { include: { role: { select: { key: true } } } },
              userPermissions: { include: { permission: { select: { key: true } } } }
            }
          },
          tx
        )
      })

      // Transform returned nested objects into arrays of keys for API response
      const transformed: any = {
        ...created,
        roleKeys: (created?.roleAssignments || []).map((ra: any) => ra.role?.key).filter(Boolean),
        permissionKeys: (created?.userPermissions || []).map((up: any) => up.permission?.key).filter(Boolean)
      }

      // Remove nested objects to keep response minimal
      delete transformed.roleAssignments
      delete transformed.userPermissions

      return transformed
    })
  }

  async updateById(id: number, data: UserUpdateDto, ctx?: { actorId?: number }) {
    const existing = await this.repo.findById(id)
    if (!existing) throw new Error('Không tìm thấy người dùng')

    // Support updating avatar and roles atomically with rollback for uploaded file
    return withRollback(async (rollback: RollbackManager) => {
      // If new avatar provided, upload it first and register rollback to delete if update fails
      let newAvatarUrl: string | null = null
      if (data.avatarFile && data.avatarFile.buffer) {
        const uploaded = await fileUploadService.uploadAvatar(data.avatarFile.buffer, data.avatarFile.originalname)
        newAvatarUrl = uploaded.url
        rollback.addFileDeleteAction(newAvatarUrl)
      }

      const updated = await this.repo.runTransaction(async (tx) => {
        // Prepare update payload
        const updateData: any = { ...data }
        if (newAvatarUrl) {
          updateData.avatarUrl = newAvatarUrl
        }
        // Remove fields that are not columns on User model to avoid Prisma errors
        // (roleKeys and permissionKeys are handled via separate tables)
        delete updateData.avatarFile
        delete updateData.roleKeys
        delete updateData.permissionKeys

        // Note: User model in Prisma does not have audit fields (createdBy/updatedBy).
        // Audit fields are present on other models (Post, PostCategory). Do not set updatedBy here.

        // Update user
        const user = await this.repo.update({ id }, updateData, tx)

        // If roleKeys provided, replace role assignments inside the transaction
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

        // If permissionKeys provided, replace direct user permissions inside the transaction
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

        // return updated user with roles and permissions (select keys only)
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

      // Transform the result to include roleKeys and permissionKeys when requested
      const transformed = this.transformUserAuditFields([user])[0]

      // Always expose simple arrays of roleKeys and permissionKeys for API consumers
      transformed.roleKeys = (transformed.roleAssignments || [])
        .map((assignment: any) => assignment?.role?.key)
        .filter(Boolean)
      transformed.permissionKeys = (transformed.userPermissions || [])
        .map((userPerm: any) => userPerm?.permission?.key)
        .filter(Boolean)

      // Remove nested relation objects to keep response minimal and stable
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
    // Prisma User model doesn't have updatedBy — only update active
    return this.repo.updateMany({ id: { in: ids } }, { active })
  }
}

export default UserService
