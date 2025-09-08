import { BaseRepository } from '../../bases/repositoryBase'
import prisma from '../../config/prismaClient'

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
    return db.rolePermission.create({
      data: {
        roleId,
        permissionId
      }
    })
  }

  async removePermission(roleId: number, permissionId: number, client?: any) {
    const db = client || prisma
    return db.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId
      }
    })
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
