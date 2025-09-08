import { BaseRepository } from '../../bases/repositoryBase'
import prisma from '../../config/prismaClient'

export class ReportsRepository extends BaseRepository<any> {
  constructor() {
    super(prisma.user, {}) // Use user as base model for the repository
  }

  // Get permissions summary statistics
  async getPermissionsSummary(): Promise<{
    totalPermissions: number
    totalRoles: number
    totalUsers: number
    rolePermissionCount: number
    userPermissionCount: number
    userRoleAssignments: number
  }> {
    const [totalPermissions, totalRoles, totalUsers, rolePermissionCount, userPermissionCount, userRoleAssignments] =
      await Promise.all([
        prisma.permission.count(),
        prisma.userRole.count(),
        prisma.user.count(),
        prisma.rolePermission.count(),
        prisma.userPermission.count(),
        prisma.userRoleAssignment.count()
      ])

    return {
      totalPermissions,
      totalRoles,
      totalUsers,
      rolePermissionCount,
      userPermissionCount,
      userRoleAssignments
    }
  }

  // Get user count by role
  async getUsersByRole(): Promise<any[]> {
    return await prisma.$queryRaw`
      SELECT 
        ur.id,
        ur.key,
        ur.name,
        COUNT(ura.user_id) as user_count
      FROM "user_roles" ur
      LEFT JOIN "user_role_assignments" ura ON ur.id = ura.role_id
      GROUP BY ur.id, ur.key, ur.name
      ORDER BY user_count DESC
    `
  }

  // Get permission count by role
  async getPermissionsByRole(): Promise<any[]> {
    return await prisma.$queryRaw`
      SELECT 
        ur.id,
        ur.key,
        ur.name,
        COUNT(rp.permission_id) as permission_count
      FROM "user_roles" ur
      LEFT JOIN "role_permissions" rp ON ur.id = rp.role_id
      GROUP BY ur.id, ur.key, ur.name
      ORDER BY permission_count DESC
    `
  }

  // Get most used permissions
  async getMostUsedPermissions(): Promise<any[]> {
    return await prisma.$queryRaw`
      SELECT 
        p.id,
        p.key,
        p.name,
        COALESCE(role_usage.role_count, 0) as role_usage_count,
        COALESCE(direct_usage.direct_count, 0) as direct_usage_count,
        (COALESCE(role_usage.role_count, 0) + COALESCE(direct_usage.direct_count, 0)) as total_usage
      FROM "permissions" p
      LEFT JOIN (
        SELECT permission_id, COUNT(*) as role_count
        FROM "role_permissions"
        GROUP BY permission_id
      ) role_usage ON p.id = role_usage.permission_id
      LEFT JOIN (
        SELECT permission_id, COUNT(*) as direct_count
        FROM "user_permissions"
        GROUP BY permission_id
      ) direct_usage ON p.id = direct_usage.permission_id
      ORDER BY total_usage DESC
      LIMIT 20
    `
  }

  // Get users with multiple roles
  async getUsersWithMultipleRoles(): Promise<any[]> {
    return await prisma.$queryRaw`
      SELECT 
        u.id,
        u.email,
        u.name,
        COUNT(ura.role_id) as role_count,
        ARRAY_AGG(ur.name ORDER BY ur.name) as role_names
      FROM "users" u
      JOIN "user_role_assignments" ura ON u.id = ura.user_id
      JOIN "user_roles" ur ON ura.role_id = ur.id
      GROUP BY u.id, u.email, u.name
      HAVING COUNT(ura.role_id) > 1
      ORDER BY role_count DESC
    `
  }

  // Get orphaned permissions (not assigned to any role or user)
  async getOrphanedPermissions(): Promise<any[]> {
    return await prisma.$queryRaw`
      SELECT p.*
      FROM "permissions" p
      WHERE p.id NOT IN (
        SELECT DISTINCT permission_id FROM "role_permissions"
        UNION
        SELECT DISTINCT permission_id FROM "user_permissions"
      )
      ORDER BY p.key
    `
  }

  // Get role-permission matrix data
  async getRolePermissionMatrix(): Promise<{
    roles: any[]
    permissions: any[]
    rolesWithPermissions: any[]
  }> {
    const [roles, permissions, rolesWithPermissions] = await Promise.all([
      prisma.userRole.findMany({
        orderBy: { name: 'asc' }
      }),
      prisma.permission.findMany({
        orderBy: { key: 'asc' }
      }),
      prisma.userRole.findMany({
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        },
        orderBy: { name: 'asc' }
      })
    ])

    return {
      roles,
      permissions,
      rolesWithPermissions
    }
  }

  // Get user access audit data
  async getUserAccessAudit(userId: number): Promise<any> {
    return await prisma.user.findUnique({
      where: { id: userId },
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
}
