import { BaseRepository } from '../../bases/repositoryBase'
import prisma from '../../config/prismaClient'
import { refreshMatViewHelper } from '../../utils/refreshMatViewHelper'

export class UserRoleRepository extends BaseRepository<'userRole'> {
  constructor(logger?: any) {
    super('userRole', logger)
  }

  async findByKey(key: string, client?: any) {
    return this.findUnique({ where: { key } }, client)
  }

  async search(keyword: string, client?: any) {
    return this.findMany(
      {
        where: {
          OR: [
            { key: { contains: keyword, mode: 'insensitive' } },
            { name: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } }
          ]
        }
      },
      client
    )
  }

  async findWithPermissions(roleId: number, client?: any) {
    return this.findUnique(
      {
        where: { id: roleId },
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        }
      },
      client
    )
  }

  async getRolePermissions(roleId: number, client?: any) {
    const db = client || prisma
    return db.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true
      }
    })
  }

  async getRoleUsers(roleId: number, client?: any) {
    const db = client || prisma
    return db.userRoleAssignment.findMany({
      where: { roleId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            active: true
          }
        }
      }
    })
  }

  async assignPermission(roleId: number, permissionId: number, client?: any) {
    const db = client || prisma
    const result = await db.rolePermission.create({
      data: {
        roleId,
        permissionId
      }
    })

    // Refresh materialized view after role permission assignment
    if (!client) {
      // Only refresh if not in transaction
      await refreshMatViewHelper()
    }

    return result
  }

  async removePermission(roleId: number, permissionId: number, client?: any) {
    const db = client || prisma
    const result = await db.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId
      }
    })

    // Refresh materialized view after role permission removal
    if (!client && result.count > 0) {
      // Only refresh if not in transaction and changes made
      await refreshMatViewHelper()
    }

    return result
  }

  async assignPermissions(roleId: number, permissionIds: number[], client?: any) {
    const db = client || prisma

    // Clear existing permissions
    await db.rolePermission.deleteMany({
      where: { roleId }
    })

    // Add new permissions
    if (permissionIds.length > 0) {
      await db.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId
        }))
      })
    }

    // Refresh materialized view after bulk permission assignment
    if (!client) {
      // Only refresh if not in transaction
      await refreshMatViewHelper()
    }

    return true
  }

  async checkRoleUsage(roleId: number, client?: any) {
    const db = client || prisma
    const assignments = await db.userRoleAssignment.count({
      where: { roleId }
    })
    return assignments
  }
}
