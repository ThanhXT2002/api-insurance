import { BaseService } from '../../bases/baseService'
import { UserRepository } from './userRepository'
import { getSupabase } from '../../config/supabaseClient'
import { fileUploadService } from '../../services/fileUploadService'
import { withRollback, RollbackManager } from '../../utils/rollbackHelper'

export class UserService extends BaseService {
  constructor(protected repo: UserRepository) {
    super(repo)
  }
  // Override getAll to support keyword search on email/name
  async getAll(params: any = {}) {
    const { keyword, page, limit, ...other } = params
    const safePage = page || 1
    const safeLimit = limit || 20
    const skip = (safePage - 1) * safeLimit

    if (keyword) {
      const where = {
        OR: [
          { email: { contains: keyword, mode: 'insensitive' } },
          { name: { contains: keyword, mode: 'insensitive' } }
        ]
      }

      const users = await (this.repo as any).findManyWithRoles({ where, skip, take: safeLimit })
      const total = await this.repo.count(where)
      const transformed = this.transformUserAuditFields(users)
      return { rows: transformed, total }
    }

    return super.getAll({ page: safePage, limit: safeLimit, ...other })
  }

  /**
   * Create user flow:
   * 1. Create user in Supabase (email/password)
   * 2. Upload avatar (if provided)
   * 3. Create local user record and role assignments in a DB transaction
   * 4. On any error, rollback uploaded files and throw
   *
   * Expected data shape:
   * { email, password, name?, avatarFile?: { buffer, originalname }, roleKeys?: string[] , ...other }
   */
  async createUser(data: any, ctx?: { actorId?: number }) {
    return withRollback(async (rollback: RollbackManager) => {
      // 1) Supabase signup
      const supabase = getSupabase()
      if (!data.email || !data.password) throw new Error('Email and password are required')

      const { data: sbData, error: sbError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password
      })

      if (sbError) throw sbError
      const sbUser = (sbData as any).user
      if (!sbUser) throw new Error('Supabase user not created')

      // 2) Upload avatar if present
      let uploadedAvatarUrl: string | null = null
      if (data.avatarFile && data.avatarFile.buffer) {
        const uploaded = await fileUploadService.uploadAvatar(data.avatarFile.buffer, data.avatarFile.originalname)
        uploadedAvatarUrl = uploaded.url
        // register rollback action to delete uploaded file if anything fails later
        rollback.addFileDeleteAction(uploaded.url)
      }

      // 3) create local user and role assignments in a transaction
      const created = await this.repo.runTransaction(async (tx) => {
        // create user profile in local DB (link to supabaseId)
        const userCreateData: any = {
          email: data.email,
          name: data.name ?? null,
          supabaseId: sbUser.id,
          avatarUrl: uploadedAvatarUrl ?? null,
          active: typeof data.active === 'boolean' ? data.active : true,
          createdBy: ctx?.actorId ?? null,
          updatedBy: ctx?.actorId ?? null
        }

        const newUser = await this.repo.create(userCreateData, tx)

        // role assignments: data.roleKeys can be array of role keys
        if (Array.isArray(data.roleKeys) && data.roleKeys.length > 0) {
          // find roles and create assignments using the transaction client `tx`
          const roles = await tx.userRole.findMany({ where: { key: { in: data.roleKeys } } })

          for (const r of roles) {
            await tx.userRoleAssignment.create({ data: { userId: newUser.id, roleId: r.id } })
          }
        }

        // return created user with roles
        return await this.repo.findById(
          { where: { id: newUser.id }, include: { roleAssignments: { include: { role: true } } } },
          tx
        )
      })

      // success: clear rollback actions implicitly by withRollback
      return created
    })
  }

  async updateById(id: number, data: any, ctx?: { actorId?: number }) {
    const existing = await this.repo.findById(id)
    if (!existing) throw new Error('User not found')

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

        // Handle audit field
        if (ctx?.actorId) updateData.updatedBy = ctx.actorId

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

        // return updated user with roles
        return tx.user.findUnique({ where: { id: user.id }, include: { roleAssignments: { include: { role: true } } } })
      })

      // If update succeeded and we replaced avatar, attempt to delete old avatar (best-effort)
      try {
        if (newAvatarUrl && existing.avatarUrl) {
          await fileUploadService.deleteFileByUrl(existing.avatarUrl)
        }
      } catch (err: any) {
        // log and continue - not fatal
        console.error('Failed to delete old avatar:', err?.message || err)
      }

      return updated
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

      // Transform the result to include role keys for easier frontend handling
      const transformed = this.transformUserAuditFields([user])[0]

      if (includeRoles && transformed.roleAssignments) {
        // Add roleKeys array for easier form handling
        transformed.roleKeys = transformed.roleAssignments.map((assignment: any) => assignment.role.key)

        // Add roles array with simplified structure
        transformed.roles = transformed.roleAssignments.map((assignment: any) => ({
          id: assignment.role.id,
          key: assignment.role.key,
          name: assignment.role.name,
          description: assignment.role.description
        }))
      }

      if (includePermissions && transformed.userPermissions) {
        // Add direct permissions with simplified structure
        transformed.directPermissions = transformed.userPermissions.map((userPerm: any) => ({
          id: userPerm.permission.id,
          key: userPerm.permission.key,
          name: userPerm.permission.name,
          description: userPerm.permission.description,
          allowed: userPerm.allowed
        }))
      }

      return transformed
    } catch (error) {
      throw error
    }
  }

  // Convenience method for getting user with roles for update operations
  async getUserForUpdate(id: number) {
    return this.getById(id, { includeRoles: true, includePermissions: false })
  }

  // Convenience method for getting user with full details
  async getUserWithFullDetails(id: number) {
    return this.getById(id, { includeRoles: true, includePermissions: true })
  }

  async deleteById(id: number, hard = false, ctx?: { actorId?: number }) {
    const existing = await this.repo.findById(id)
    if (!existing) throw new Error('User not found')
    if (hard) return this.repo.delete({ id })
    return this.delete({ id }, false)
  }

  async deleteMultiple(ids: number[], hard = false, ctx?: { actorId?: number }) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('No ids provided')
    if (hard) return this.repo.deleteMany({ id: { in: ids } })
    return this.repo.updateMany({ id: { in: ids } }, { active: false, updatedBy: ctx?.actorId })
  }

  async activeMultiple(ids: number[], active: boolean, ctx?: { actorId?: number }) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('No ids provided')
    return this.repo.updateMany({ id: { in: ids } }, { active, updatedBy: ctx?.actorId })
  }
}

export default UserService
