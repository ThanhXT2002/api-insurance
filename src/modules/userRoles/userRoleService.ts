import { BaseService } from '../../bases/baseService'
import { UserRoleRepository } from './userRoleRepository'
import { refreshMatViewHelper } from '../../utils/refreshMatViewHelper'

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

  async create(data: any, ctx?: { actorId?: number }) {
    // Normalize key and extract permissionIds if provided
    data.key = this.normalizeRoleKey(data.key)
    const permissionIds: number[] = Array.isArray(data.permissionIds)
      ? data.permissionIds.map((v: any) => Number(v))
      : []

    // Remove permissionIds so super.create or prisma.create won't receive it
    delete data.permissionIds

    // Run in transaction: ensure uniqueness, create role, validate + assign permissions
    const result = await this.repo.runTransaction(async (tx) => {
      // unique check inside transaction
      const existing = await tx.userRole.findUnique({ where: { key: data.key } })
      if (existing) {
        throw new Error(`Role với key '${data.key}' đã tồn tại`)
      }

      // create role
      const role = await tx.userRole.create({
        data: {
          key: data.key,
          name: data.name,
          description: data.description ?? null
        }
      })

      if (permissionIds.length) {
        // validate permissions exist
        const perms = await tx.permission.findMany({ where: { id: { in: permissionIds } } })
        if (perms.length !== permissionIds.length) {
          throw new Error('Không tìm thấy một hoặc nhiều permission')
        }

        const rpData = permissionIds.map((pid) => ({ roleId: role.id, permissionId: pid }))
        await tx.rolePermission.createMany({ data: rpData, skipDuplicates: true })
      }

      return role
    })

    // Refresh materialized view after role creation with permissions
    if (permissionIds.length > 0) {
      await refreshMatViewHelper()
    }

    return result
  }

  async update(where: any, data: any, ctx?: { actorId?: number }) {
    // If updating key, normalize
    if (data.key) data.key = this.normalizeRoleKey(data.key)

    const permissionIdsProvided = Array.isArray(data.permissionIds)
    const permissionIds: number[] = permissionIdsProvided ? data.permissionIds.map((v: any) => Number(v)) : []

    // remove permissionIds from role update payload
    delete data.permissionIds

    const result = await this.repo.runTransaction(async (tx) => {
      // if changing key, ensure uniqueness
      if (data.key) {
        const existing = await tx.userRole.findUnique({ where: { key: data.key } })
        if (existing && existing.id !== where.id) {
          throw new Error(`Role with key '${data.key}' already exists`)
        }
      }

      // update role fields
      const role = await tx.userRole.update({
        where,
        data: {
          ...(data.key !== undefined ? { key: data.key } : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {})
        }
      })

      // sync permissions when provided
      if (permissionIdsProvided) {
        if (permissionIds.length) {
          const perms = await tx.permission.findMany({ where: { id: { in: permissionIds } } })
          if (perms.length !== permissionIds.length) {
            throw new Error('Không tìm thấy một hoặc nhiều permission')
          }
        }

        const currentRPs = await tx.rolePermission.findMany({
          where: { roleId: role.id },
          select: { permissionId: true }
        })
        const currentIds: number[] = currentRPs.map((r: any) => Number(r.permissionId))

        const toAdd: number[] = permissionIds.filter((id: number) => !currentIds.includes(id))
        const toRemove: number[] = currentIds.filter((id: number) => !permissionIds.includes(id))

        if (toRemove.length) {
          await tx.rolePermission.deleteMany({ where: { roleId: role.id, permissionId: { in: toRemove } } })
        }

        if (toAdd.length) {
          const rpData = toAdd.map((pid) => ({ roleId: role.id, permissionId: pid }))
          await tx.rolePermission.createMany({ data: rpData, skipDuplicates: true })
        }
      }

      return role
    })

    // Refresh materialized view after role update with permission changes
    if (permissionIdsProvided) {
      await refreshMatViewHelper()
    }

    return result
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
      throw new Error('Không tìm thấy role')
    }

    // Check if permission is already assigned
    const existing = await this.repo.getRolePermissions(roleId)
    if (existing.some((rp: any) => rp.permission.id === permissionId)) {
      throw new Error('Permission đã được gán cho role này')
    }

    return this.repo.assignPermission(roleId, permissionId)
  }

  async removePermission(roleId: number, permissionId: number) {
    // Check if role exists
    const role = await this.repo.findById(roleId)
    if (!role) {
      throw new Error('Không tìm thấy role')
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
          throw new Error(`Không tìm thấy permission với ID ${permissionId}`)
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
      throw new Error(`Không thể xóa role. Có ${usage.usersUsing} người dùng đang được gán role này`)
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
