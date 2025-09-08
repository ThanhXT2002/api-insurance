import { User, UserRole, Permission, UserRoleAssignment, UserPermission } from '@prisma/client'
import prisma from '../../config/prismaClient'
import { BaseRepository } from '../../bases/repositoryBase'

export class UserRepository extends BaseRepository<any> {
  constructor() {
    super(prisma.user, {})
  }

  // Get user with roles and permissions
  async findByIdWithPermissions(id: number): Promise<
    | (User & {
        roleAssignments?: (UserRoleAssignment & {
          role: UserRole & { rolePermissions?: { permission: Permission }[] }
        })[]
        userPermissions?: (UserPermission & { permission: Permission })[]
      })
    | null
  > {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        userPermissions: {
          include: {
            permission: true
          }
        }
      }
    })
  }

  // Get all users with basic role info
  async findManyWithRoles(args?: { skip?: number; take?: number; where?: any }): Promise<User[]> {
    return await prisma.user.findMany({
      ...args,
      include: {
        roleAssignments: {
          include: {
            role: true
          }
        }
      }
    })
  }

  // Assign role to user
  async assignRole(userId: number, roleId: number): Promise<UserRoleAssignment> {
    return await prisma.userRoleAssignment.create({
      data: {
        userId,
        roleId
      }
    })
  }

  // Remove role from user
  async removeRole(userId: number, roleId: number): Promise<boolean> {
    const result = await prisma.userRoleAssignment.deleteMany({
      where: {
        userId,
        roleId
      }
    })
    return result.count > 0
  }

  // Check if user has role
  async hasRole(userId: number, roleId: number): Promise<boolean> {
    const count = await prisma.userRoleAssignment.count({
      where: {
        userId,
        roleId
      }
    })
    return count > 0
  }

  // Get user roles
  async getUserRoles(userId: number): Promise<(UserRoleAssignment & { role: UserRole })[]> {
    return await prisma.userRoleAssignment.findMany({
      where: { userId },
      include: {
        role: true
      }
    })
  }

  // Assign direct permission to user
  async assignPermission(userId: number, permissionId: number): Promise<UserPermission> {
    return await prisma.userPermission.create({
      data: {
        userId,
        permissionId
      }
    })
  }

  // Remove direct permission from user
  async removePermission(userId: number, permissionId: number): Promise<boolean> {
    const result = await prisma.userPermission.deleteMany({
      where: {
        userId,
        permissionId
      }
    })
    return result.count > 0
  }

  // Get user direct permissions
  async getUserPermissions(userId: number): Promise<(UserPermission & { permission: Permission })[]> {
    return await prisma.userPermission.findMany({
      where: { userId },
      include: {
        permission: true
      }
    })
  }

  // Get all effective permissions for user (role + direct permissions)
  async getEffectivePermissions(userId: number): Promise<Permission[]> {
    const result = await prisma.$queryRaw<Permission[]>`
      SELECT DISTINCT p.id, p.key, p.name, p.description
      FROM "permissions" p
      WHERE p.id IN (
        -- Permissions from roles
        SELECT rp.permission_id 
        FROM "user_role_assignments" ura
        JOIN "role_permissions" rp ON ura.role_id = rp.role_id
        WHERE ura.user_id = ${userId}
        
        UNION
        
        -- Direct permissions
        SELECT up.permission_id
        FROM "user_permissions" up
        WHERE up.user_id = ${userId}
      )
      ORDER BY p.key
    `
    return result
  }

  // Search users with role/permission filters
  async searchUsers(params: {
    keyword?: string
    roleIds?: number[]
    permissionIds?: number[]
    skip?: number
    take?: number
  }): Promise<{ users: User[]; total: number }> {
    const { keyword, roleIds, permissionIds, skip = 0, take = 20 } = params

    let whereClause = ''
    const conditions: string[] = []

    if (keyword) {
      conditions.push(`(u.email ILIKE '%${keyword}%' OR u.name ILIKE '%${keyword}%')`)
    }

    if (roleIds && roleIds.length > 0) {
      conditions.push(`u.id IN (
        SELECT ura.user_id FROM "user_role_assignments" ura 
        WHERE ura.role_id IN (${roleIds.join(',')})
      )`)
    }

    if (permissionIds && permissionIds.length > 0) {
      conditions.push(`u.id IN (
        SELECT DISTINCT user_id FROM (
          SELECT ura.user_id 
          FROM "user_role_assignments" ura
          JOIN "role_permissions" rp ON ura.role_id = rp.role_id
          WHERE rp.permission_id IN (${permissionIds.join(',')})
          
          UNION
          
          SELECT up.user_id
          FROM "user_permissions" up
          WHERE up.permission_id IN (${permissionIds.join(',')})
        ) AS user_permissions
      )`)
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`
    }

    const users = await prisma.$queryRaw<User[]>`
      SELECT u.* FROM "users" u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ${take} OFFSET ${skip}
    `

    const totalResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM "users" u
      ${whereClause}
    `

    return {
      users,
      total: Number(totalResult[0].count)
    }
  }
}
