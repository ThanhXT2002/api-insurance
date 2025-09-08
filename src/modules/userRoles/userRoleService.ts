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

  async getWithPermissions(roleId: number) {
    return this.repo.findWithPermissions(roleId)
  }

  async create(data: any, ctx?: { actorId?: number }) {
    // Validate unique key
    const existing = await this.repo.findByKey(data.key)
    if (existing) {
      throw new Error(`Role with key '${data.key}' already exists`)
    }

    // Validate key format (should be lowercase with underscores)
    if (!/^[a-z][a-z_]*$/.test(data.key)) {
      throw new Error('Role key must be lowercase with underscores (e.g., "admin", "content_manager")')
    }

    return super.create(data, ctx)
  }

  async update(where: any, data: any, ctx?: { actorId?: number }) {
    // If updating key, validate uniqueness
    if (data.key) {
      const existing = await this.repo.findByKey(data.key)
      if (existing && existing.id !== where.id) {
        throw new Error(`Role with key '${data.key}' already exists`)
      }

      // Validate key format
      if (!/^[a-z][a-z_]*$/.test(data.key)) {
        throw new Error('Role key must be lowercase with underscores (e.g., "admin", "content_manager")')
      }
    }

    return super.update(where, data, ctx)
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
