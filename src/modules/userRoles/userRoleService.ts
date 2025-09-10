import { BaseService } from '../../bases/baseService'
import { UserRoleRepository } from './userRoleRepository'

export class UserRoleService extends BaseService {
  constructor(protected repo: UserRoleRepository) {
    super(repo)
  }

  // Override keyword search
  async getAll(params: any = {}) {
    const { keyword, ...otherParams } = params
    if (keyword) {
      const results = await this.repo.search(keyword)
      return { rows: results, total: results.length }
    }
    return super.getAll(otherParams)
  }

  async findByKey(key: string) {
    return this.repo.findByKey(key)
  }

  async create(data: any, ctx?: { actorId?: number }) {
    // Normalize key to lowercase_with_underscores and validate uniqueness on normalized key
    data.key = this.normalizeRoleKey(data.key)

    const existing = await this.repo.findByKey(data.key)
    if (existing) {
      throw new Error(`Role with key '${data.key}' already exists`)
    }

    return super.create(data, ctx)
  }

  async update(where: any, data: any, ctx?: { actorId?: number }) {
    // If updating key, validate uniqueness
    if (data.key) {
      data.key = this.normalizeRoleKey(data.key)
      const existing = await this.repo.findByKey(data.key)
      if (existing && existing.id !== where.id) {
        throw new Error(`Role with key '${data.key}' already exists`)
      }
    }

    return super.update(where, data, ctx)
  }

  // Helper: normalize a provided key into lowercase_with_underscores
  private normalizeRoleKey(key: any): string {
    if (!key && key !== 0) return ''
    // Convert to string, trim, replace spaces and non-word characters with underscore
    const s = String(key)
      .trim()
      .toLowerCase()
      // replace runs of non-alpha-numeric with underscore
      .replace(/[^a-z0-9]+/g, '_')
      // collapse multiple underscores
      .replace(/_+/g, '_')
      // remove leading/trailing underscores
      .replace(/^_+|_+$/g, '')
    // Ensure starts with a letter; if not, prefix with 'role_'
    if (!/^[a-z]/.test(s)) return `role_${s}`
    return s
  }

  async getWithPermissions(roleId: number) {
    return this.repo.findWithPermissions(roleId)
  }

  async getRolePermissions(roleId: number) {
    return this.repo.getRolePermissions(roleId)
  }

  async getRoleUsers(roleId: number) {
    return this.repo.getRoleUsers(roleId)
  }

  async assignPermission(roleId: number, permissionId: number) {
    // Check if role exists
    const role = await this.repo.findById(roleId)
    if (!role) {
      throw new Error('Role not found')
    }

    // Check if permission is already assigned
    const existing = await this.repo.getRolePermissions(roleId)
    if (existing.some((rp: any) => rp.permission.id === permissionId)) {
      throw new Error('Permission already assigned to this role')
    }

    return this.repo.assignPermission(roleId, permissionId)
  }

  async removePermission(roleId: number, permissionId: number) {
    // Check if role exists
    const role = await this.repo.findById(roleId)
    if (!role) {
      throw new Error('Role not found')
    }

    return this.repo.removePermission(roleId, permissionId)
  }

  async assignPermissions(roleId: number, permissionIds: number[]) {
    // Check if role exists
    const role = await this.repo.findById(roleId)
    if (!role) {
      throw new Error('Role not found')
    }

    // Validate that all permissions exist
    // This could be done in a transaction for consistency
    return this.repo.runTransaction(async (tx) => {
      // Verify all permissions exist
      for (const permissionId of permissionIds) {
        const permission = await tx.permission.findUnique({
          where: { id: permissionId }
        })
        if (!permission) {
          throw new Error(`Permission with ID ${permissionId} not found`)
        }
      }

      return this.repo.assignPermissions(roleId, permissionIds, tx)
    })
  }

  async checkRoleUsage(roleId: number) {
    const usageCount = await this.repo.checkRoleUsage(roleId)
    return {
      usersUsing: usageCount,
      canDelete: usageCount === 0
    }
  }

  async delete(where: any, hard?: boolean) {
    const roleId = where.id

    // Check if role is in use
    const usage = await this.checkRoleUsage(roleId)
    if (!usage.canDelete) {
      throw new Error(`Cannot delete role. ${usage.usersUsing} users are assigned to this role`)
    }

    // Delete role permissions first
    await this.repo.runTransaction(async (tx) => {
      // Remove all role permissions
      await tx.rolePermission.deleteMany({
        where: { roleId }
      })

      // Delete the role
      await tx.userRole.delete({
        where: { id: roleId }
      })
    })

    return true
  }
}
