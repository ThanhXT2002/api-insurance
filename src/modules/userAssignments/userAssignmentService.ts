import { User, UserRole, Permission } from '@prisma/client'
import { BaseService } from '../../bases/baseService'
import { UserAssignmentRepository } from './userAssignmentRepository'

export class UserAssignmentService extends BaseService<any> {
  constructor(private userRepository: UserAssignmentRepository) {
    super(userRepository)
  }

  // Get user with all permissions (role + direct)
  async getUserWithPermissions(id: number): Promise<{
    user: User
    roles: UserRole[]
    directPermissions: Permission[]
    effectivePermissions: Permission[]
  } | null> {
    const user = await this.userRepository.findByIdWithPermissions(id)
    if (!user) return null

    const roles = user.roleAssignments?.map((ra: any) => ra.role) || []
    const directPermissions = user.userPermissions?.map((up: any) => up.permission) || []
    const effectivePermissions = await this.userRepository.getEffectivePermissions(id)

    return {
      user: {
        id: user.id,
        supabaseId: user.supabaseId,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        addresses: user.addresses
      },
      roles,
      directPermissions,
      effectivePermissions
    }
  }

  // Assign role to user
  async assignRole(userId: number, roleId: number, auditContext?: { userId: number }): Promise<boolean> {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(userId)
      if (!user) {
        throw new Error(`Không tìm thấy người dùng với ID ${userId}`)
      }

      // Check if assignment already exists
      const hasRole = await this.userRepository.hasRole(userId, roleId)
      if (hasRole) {
        throw new Error('Người dùng đã có role này')
      }

      await this.userRepository.assignRole(userId, roleId)
      return true
    } catch (error: any) {
      throw error
    }
  }

  // Remove role from user
  async removeRole(userId: number, roleId: number, auditContext?: { userId: number }): Promise<boolean> {
    try {
      const success = await this.userRepository.removeRole(userId, roleId)
      if (!success) {
        throw new Error('Không tìm thấy assignment role')
      }

      return true
    } catch (error: any) {
      throw error
    }
  }

  // Get user roles
  async getUserRoles(userId: number): Promise<UserRole[]> {
    const assignments = await this.userRepository.getUserRoles(userId)
    return assignments.map((assignment: any) => assignment.role)
  }

  // Assign direct permission to user
  async assignPermission(userId: number, permissionId: number, auditContext?: { userId: number }): Promise<boolean> {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(userId)
      if (!user) {
        throw new Error(`Không tìm thấy người dùng với ID ${userId}`)
      }

      // Check if assignment already exists
      const userPermissions = await this.userRepository.getUserPermissions(userId)
      const hasPermission = userPermissions.some((up: any) => up.permissionId === permissionId)
      if (hasPermission) {
        throw new Error('Người dùng đã có permission này')
      }

      await this.userRepository.assignPermission(userId, permissionId)
      return true
    } catch (error: any) {
      throw error
    }
  }

  // Remove direct permission from user
  async removePermission(userId: number, permissionId: number, auditContext?: { userId: number }): Promise<boolean> {
    try {
      const success = await this.userRepository.removePermission(userId, permissionId)
      if (!success) {
        throw new Error('Không tìm thấy assignment permission')
      }

      return true
    } catch (error: any) {
      throw error
    }
  }

  // List direct permissions assigned to a user
  async listDirectPermissionsForUser(userId: number): Promise<Permission[]> {
    const assignments = await this.userRepository.getUserPermissions(userId)
    return assignments.map((assignment: any) => assignment.permission)
  }

  // List effective permissions for a user (role + direct)
  async listEffectivePermissionsForUser(userId: number): Promise<Permission[]> {
    return await this.userRepository.getEffectivePermissions(userId)
  }

  // Check if user has permission (through role or direct)
  async hasPermission(userId: number, permissionKey: string): Promise<boolean> {
    const permissions = await this.listEffectivePermissionsForUser(userId)
    return permissions.some((p: Permission) => p.key === permissionKey)
  }

  // Search users with filters
  async searchUsers(params: {
    keyword?: string
    roleIds?: number[]
    permissionIds?: number[]
    page?: number
    limit?: number
  }): Promise<{
    users: User[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const page = params.page || 1
    const limit = params.limit || 20
    const skip = (page - 1) * limit

    const result = await this.userRepository.searchUsers({
      ...params,
      skip,
      take: limit
    })

    return {
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    }
  }

  // Get users with basic role information
  async getUsersWithRoles(params: { page?: number; limit?: number; keyword?: string }): Promise<{
    users: any[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const page = params.page || 1
    const limit = params.limit || 20
    const skip = (page - 1) * limit

    let where = {}
    if (params.keyword) {
      where = {
        OR: [
          { email: { contains: params.keyword, mode: 'insensitive' } },
          { name: { contains: params.keyword, mode: 'insensitive' } }
        ]
      }
    }

    const users = await this.userRepository.findManyWithRoles({
      skip,
      take: limit,
      where
    })

    const total = await this.userRepository.count(where)

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }
}
