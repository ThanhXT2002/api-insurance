import { BaseService } from '../../bases/baseService'
import { PermissionRepository } from './permissionRepository'

export class PermissionService extends BaseService {
  constructor(protected repo: PermissionRepository) {
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
    // Validate unique key
    const existing = await this.repo.findByKey(data.key)
    if (existing) {
      throw new Error(`Permission with key '${data.key}' already exists`)
    }

    // Validate key format (should be lowercase with dots)
    if (!/^[a-z][a-z_]*(\.[a-z][a-z_]*)*$/.test(data.key)) {
      throw new Error('Permission key must be lowercase with dots (e.g., "resource.action")')
    }

    return super.create(data, ctx)
  }

  async update(where: any, data: any, ctx?: { actorId?: number }) {
    // If updating key, validate uniqueness
    if (data.key) {
      const existing = await this.repo.findByKey(data.key)
      if (existing && existing.id !== where.id) {
        throw new Error(`Permission with key '${data.key}' already exists`)
      }

      // Validate key format
      if (!/^[a-z][a-z_]*(\.[a-z][a-z_]*)*$/.test(data.key)) {
        throw new Error('Permission key must be lowercase with dots (e.g., "resource.action")')
      }
    }

    return super.update(where, data, ctx)
  }

  async checkPermissionUsage(permissionId: number) {
    const [rolePermissions, userPermissions] = await Promise.all([
      this.repo.getRolePermissions(permissionId),
      this.repo.getUserPermissions(permissionId)
    ])

    return {
      rolesUsing: rolePermissions.length,
      usersUsing: userPermissions.length,
      canDelete: rolePermissions.length === 0 && userPermissions.length === 0
    }
  }

  async getUsersWithPermission(permissionId: number) {
    return this.repo.getUsersWithPermission(permissionId)
  }

  async checkUserPermission(userId: number, permissionKey: string) {
    // This will be implemented after User module is created
    // For now, return basic check
    const permission = await this.repo.findByKey(permissionKey)
    if (!permission) {
      return { hasPermission: false, source: null }
    }

    // TODO: Implement full user permission check with roles
    return { hasPermission: false, source: 'not_implemented' }
  }
}
