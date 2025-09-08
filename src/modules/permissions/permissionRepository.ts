import { BaseRepository } from '../../bases/repositoryBase'
import prisma from '../../config/prismaClient'

export class PermissionRepository extends BaseRepository<'permission'> {
  constructor(logger?: any) {
    super('permission', logger)
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

  async getRolePermissions(permissionId: number, client?: any) {
    const db = client || prisma
    return db.rolePermission.findMany({
      where: { permissionId },
      include: {
        role: true
      }
    })
  }

  async getUserPermissions(permissionId: number, client?: any) {
    const db = client || prisma
    return db.userPermission.findMany({
      where: { permissionId },
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

  async getUsersWithPermission(permissionId: number, client?: any) {
    const db = client || prisma

    // Get users with direct permission
    const directUsers = await db.userPermission.findMany({
      where: {
        permissionId,
        allowed: true
      },
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

    // Get users with permission through roles
    const roleUsers = await db.userRoleAssignment.findMany({
      where: {
        role: {
          rolePermissions: {
            some: { permissionId }
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            active: true
          }
        },
        role: {
          select: {
            id: true,
            key: true,
            name: true
          }
        }
      }
    })

    return {
      directUsers: directUsers.map((up: any) => up.user),
      roleUsers: roleUsers.map((ra: any) => ({
        user: ra.user,
        role: ra.role
      }))
    }
  }
}
