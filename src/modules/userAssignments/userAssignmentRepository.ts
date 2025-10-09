import { User, UserRole, Permission, UserRoleAssignment, UserPermission } from '../../../generated/prisma'
import prisma from '../../config/prismaClient'
import { BaseRepository } from '../../bases/repositoryBase'
import { refreshMatViewHelper } from '../../utils/refreshMatViewHelper'

export class UserAssignmentRepository extends BaseRepository<any> {
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
    const result = await prisma.userRoleAssignment.create({
      data: {
        userId,
        roleId
      }
    })

    // Refresh materialized view after role assignment
    await refreshMatViewHelper()

    return result
  }

  // Remove role from user
  async removeRole(userId: number, roleId: number): Promise<boolean> {
    const result = await prisma.userRoleAssignment.deleteMany({
      where: {
        userId,
        roleId
      }
    })

    if (result.count > 0) {
      // Refresh materialized view after role removal
      await refreshMatViewHelper()
    }

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
    const result = await prisma.userPermission.create({
      data: {
        userId,
        permissionId
      }
    })

    // Refresh materialized view after permission assignment
    await refreshMatViewHelper()

    return result
  }

  // Remove direct permission from user
  async removePermission(userId: number, permissionId: number): Promise<boolean> {
    const result = await prisma.userPermission.deleteMany({
      where: {
        userId,
        permissionId
      }
    })

    if (result.count > 0) {
      // Refresh materialized view after permission removal
      await refreshMatViewHelper()
    }

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
    // 1) Get roleIds assigned to user
    const roleAssignments: { roleId: number }[] = await prisma.userRoleAssignment.findMany({
      where: { userId },
      select: { roleId: true }
    })
    const roleIds: number[] = roleAssignments.map((r) => r.roleId)

    // 2) Fetch permissions assigned to those roles
    const rolePerms = roleIds.length
      ? await prisma.rolePermission.findMany({ where: { roleId: { in: roleIds } }, include: { permission: true } })
      : []

    // 3) Fetch direct user permissions
    const userPerms = await prisma.userPermission.findMany({ where: { userId }, include: { permission: true } })

    // 4) Merge and dedupe by permission id
    const map = new Map<number, Permission>()
    for (const rp of rolePerms) {
      if (rp.permission) map.set(rp.permission.id, rp.permission)
    }
    for (const up of userPerms) {
      if (up.permission) map.set(up.permission.id, up.permission)
    }

    const permissions = Array.from(map.values())
    // 5) Sort by key to preserve previous ordering
    permissions.sort((a, b) => a.key.localeCompare(b.key))
    return permissions
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
    // Build Prisma where filter safely
    const where: any = {}

    if (keyword) {
      where.OR = [
        { email: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } }
      ]
    }

    // Filter by roleIds using nested some
    if (roleIds && roleIds.length > 0) {
      where.roleAssignments = { some: { roleId: { in: roleIds } } }
    }

    // Filter by permissionIds: either direct user_permissions or via role -> role_permissions
    if (permissionIds && permissionIds.length > 0) {
      // Build OR condition that checks direct permissions or role-derived permissions
      const permCondition = {
        OR: [
          { userPermissions: { some: { permissionId: { in: permissionIds } } } },
          {
            roleAssignments: {
              some: {
                role: {
                  rolePermissions: { some: { permissionId: { in: permissionIds } } }
                }
              }
            }
          }
        ]
      }

      // Merge with existing where. If where already has AND/OR, ensure we combine properly.
      if (where.AND) {
        where.AND.push(permCondition)
      } else if (where.OR) {
        // If there was only an OR for keyword, convert to AND of previous OR and this permCondition
        where.AND = [{ OR: where.OR }, permCondition]
        delete where.OR
      } else {
        where.AND = [permCondition]
      }
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        roleAssignments: { include: { role: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    })

    const total = await prisma.user.count({ where })

    return { users, total }
  }
}
