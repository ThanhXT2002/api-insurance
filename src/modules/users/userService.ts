import { BaseService } from '../../bases/baseService'
import { UserRepository } from './userRepository'
import { getSupabase, getSupabaseAdmin } from '../../config/supabaseClient'
import { fileUploadService } from '../../services/fileUploadService'
import { withRollback, RollbackManager } from '../../utils/rollbackHelper'
import { UserCreateDto } from '~/types/userType'

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
          { name: { contains: keyword, mode: 'insensitive' } }
        ]
      }

      if (typeof active === 'boolean') {
        // apply active filter in addition to keyword
        where.active = active
      }

      const users = await (this.repo as any).findManyWithRoles({ where, skip, take: safeLimit })
      const total = await this.repo.count(where)
      const transformed = this.transformUserAuditFields(users)
      return { rows: transformed, total }
    }

    const baseParams: any = { page: safePage, limit: safeLimit, ...other }
    if (typeof active === 'boolean') baseParams.active = active
    return super.getAll(baseParams)
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

  async updateById(id: number, data: any, ctx?: { actorId?: number }) {
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
        // Remove avatarFile from payload to avoid unexpected DB fields
        delete updateData.avatarFile

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
      const includeRoles = options?.includeRoles !== false // default true
      const includePermissions = options?.includePermissions || false

      let include: any = options?.include || {}

      if (includeRoles) {
        include.roleAssignments = {
          include: {
            role: {
              select: {
                id: true,
                key: true,
                name: true,
                description: true
              }
            }
          }
        }
      }

      if (includePermissions) {
        include.userPermissions = {
          include: {
            permission: {
              select: {
                id: true,
                key: true,
                name: true,
                description: true
              }
            }
          }
        }
      }

      const user = await this.repo.findById({
        where: { id: typeof id === 'string' ? parseInt(id) : id },
        include: Object.keys(include).length > 0 ? include : undefined,
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


  // Convenience method for getting user with full details
  async getUserWithFullDetails(id: number) {
    return this.getById(id, { includeRoles: true, includePermissions: true })
  }

  async deleteById(id: number, hard = false, ctx?: { actorId?: number }) {
    const existing = await this.repo.findById(id)
    if (!existing) throw new Error('Không tìm thấy người dùng')
    if (hard) return this.repo.delete({ id })
    return this.delete({ id }, false)
  }

  async deleteMultiple(ids: number[], hard = false, ctx?: { actorId?: number }) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('Không có id nào được cung cấp')
    if (hard) return this.repo.deleteMany({ id: { in: ids } })
    // Prisma User model doesn't have updatedBy — only toggle active flag
    return this.repo.updateMany({ id: { in: ids } }, { active: false })
  }

  async activeMultiple(ids: number[], active: boolean, ctx?: { actorId?: number }) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('Không có id nào được cung cấp')
    // Prisma User model doesn't have updatedBy — only update active
    return this.repo.updateMany({ id: { in: ids } }, { active })
  }
}

export default UserService
