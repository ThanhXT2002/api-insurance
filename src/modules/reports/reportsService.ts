import { BaseService } from '../../bases/baseService'
import { ReportsRepository } from './reportsRepository'

export class ReportsService extends BaseService<any> {
  constructor(private reportsRepository: ReportsRepository) {
    super(reportsRepository)
  }

  // Get permissions summary with additional calculations
  async getPermissionsSummary(): Promise<{
    totalPermissions: number
    totalRoles: number
    totalUsers: number
    rolePermissionCount: number
    userPermissionCount: number
    userRoleAssignments: number
    averagePermissionsPerRole: number
    averageRolesPerUser: number
  }> {
    const data = await this.reportsRepository.getPermissionsSummary()

    // Calculate averages
    const averagePermissionsPerRole =
      data.totalRoles > 0 ? Math.round((data.rolePermissionCount / data.totalRoles) * 100) / 100 : 0

    const averageRolesPerUser =
      data.totalUsers > 0 ? Math.round((data.userRoleAssignments / data.totalUsers) * 100) / 100 : 0

    return {
      ...data,
      averagePermissionsPerRole,
      averageRolesPerUser
    }
  }

  // Get users by role with percentage calculations
  async getUsersByRole(): Promise<any[]> {
    const data = await this.reportsRepository.getUsersByRole()
    const totalUsers = await this.reportsRepository.count()

    return data.map((item: any) => ({
      ...item,
      user_count: Number(item.user_count),
      percentage: totalUsers > 0 ? Math.round((Number(item.user_count) / totalUsers) * 10000) / 100 : 0
    }))
  }

  // Get permissions by role with additional metrics
  async getPermissionsByRole(): Promise<any[]> {
    const data = await this.reportsRepository.getPermissionsByRole()

    return data.map((item: any) => ({
      ...item,
      permission_count: Number(item.permission_count)
    }))
  }

  // Get most used permissions with usage analysis
  async getMostUsedPermissions(): Promise<any[]> {
    const data = await this.reportsRepository.getMostUsedPermissions()

    return data.map((item: any) => ({
      ...item,
      role_usage_count: Number(item.role_usage_count),
      direct_usage_count: Number(item.direct_usage_count),
      total_usage: Number(item.total_usage),
      usage_type:
        Number(item.role_usage_count) > Number(item.direct_usage_count)
          ? 'mainly_role_based'
          : Number(item.direct_usage_count) > 0
            ? 'mainly_direct'
            : 'unused'
    }))
  }

  // Get users with multiple roles analysis
  async getUsersWithMultipleRoles(): Promise<any[]> {
    const data = await this.reportsRepository.getUsersWithMultipleRoles()

    return data.map((item: any) => ({
      ...item,
      role_count: Number(item.role_count),
      complexity_level: this.calculateComplexityLevel(Number(item.role_count))
    }))
  }

  // Get orphaned permissions with recommendations
  async getOrphanedPermissions(): Promise<{
    permissions: any[]
    total: number
    recommendations: string[]
  }> {
    const permissions = await this.reportsRepository.getOrphanedPermissions()

    const recommendations = []
    if (permissions.length > 0) {
      recommendations.push('Consider reviewing and removing unused permissions')
      recommendations.push('Assign orphaned permissions to appropriate roles')
      recommendations.push('Document the purpose of each permission')
    }

    return {
      permissions,
      total: permissions.length,
      recommendations
    }
  }

  // Get role-permission matrix with analysis
  async getRolePermissionMatrix(): Promise<{
    roles: any[]
    permissions: any[]
    matrix: any[]
    statistics: {
      totalCombinations: number
      activeCombinations: number
      coveragePercentage: number
    }
  }> {
    const data = await this.reportsRepository.getRolePermissionMatrix()

    // Build matrix
    const matrix = data.rolesWithPermissions.map((role: any) => ({
      role: {
        id: role.id,
        key: role.key,
        name: role.name
      },
      permissions: data.permissions.map((permission: any) => ({
        permission: {
          id: permission.id,
          key: permission.key,
          name: permission.name
        },
        hasPermission: role.rolePermissions.some((rp: any) => rp.permission.id === permission.id)
      }))
    }))

    // Calculate statistics
    const totalCombinations = data.roles.length * data.permissions.length
    const activeCombinations = data.rolesWithPermissions.reduce(
      (total: number, role: any) => total + role.rolePermissions.length,
      0
    )
    const coveragePercentage =
      totalCombinations > 0 ? Math.round((activeCombinations / totalCombinations) * 10000) / 100 : 0

    return {
      roles: data.roles,
      permissions: data.permissions,
      matrix,
      statistics: {
        totalCombinations,
        activeCombinations,
        coveragePercentage
      }
    }
  }

  // Get user access audit with detailed analysis
  async getUserAccessAudit(userId: number): Promise<{
    user: any
    roles: any[]
    directPermissions: any[]
    effectivePermissions: any[]
    summary: any
    securityAnalysis: any
  } | null> {
    const user = await this.reportsRepository.getUserAccessAudit(userId)
    if (!user) return null

    // Calculate effective permissions
    const rolePermissions = user.roleAssignments.flatMap((ra: any) =>
      ra.role.rolePermissions.map((rp: any) => ({
        ...rp.permission,
        source: 'role',
        roleName: ra.role.name
      }))
    )

    const directPermissions = user.userPermissions.map((up: any) => ({
      ...up.permission,
      source: 'direct'
    }))

    // Remove duplicates and merge
    const allPermissions = [...rolePermissions, ...directPermissions]
    const uniquePermissions = allPermissions.reduce((acc, perm) => {
      const existing = acc.find((p: any) => p.id === perm.id)
      if (!existing) {
        acc.push(perm)
      } else if (perm.source === 'direct') {
        existing.source = 'both'
      }
      return acc
    }, [] as any[])

    // Security analysis
    const securityAnalysis = {
      riskLevel: this.calculateRiskLevel(user.roleAssignments.length, directPermissions.length),
      hasAdminAccess: this.checkAdminAccess(uniquePermissions),
      redundantPermissions: this.findRedundantPermissions(rolePermissions, directPermissions),
      recommendations: this.generateSecurityRecommendations(user.roleAssignments.length, directPermissions.length)
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        active: user.active
      },
      roles: user.roleAssignments.map((ra: any) => ra.role),
      directPermissions: user.userPermissions.map((up: any) => up.permission),
      effectivePermissions: uniquePermissions,
      summary: {
        totalRoles: user.roleAssignments.length,
        totalDirectPermissions: user.userPermissions.length,
        totalEffectivePermissions: uniquePermissions.length,
        permissionSources: {
          fromRoles: rolePermissions.length,
          direct: directPermissions.length
        }
      },
      securityAnalysis
    }
  }

  // Helper methods for analysis
  private calculateComplexityLevel(roleCount: number): string {
    if (roleCount >= 5) return 'high'
    if (roleCount >= 3) return 'medium'
    return 'low'
  }

  private calculateRiskLevel(roleCount: number, directPermissionCount: number): string {
    const totalAccess = roleCount + directPermissionCount
    if (totalAccess >= 10) return 'high'
    if (totalAccess >= 5) return 'medium'
    return 'low'
  }

  private checkAdminAccess(permissions: any[]): boolean {
    return permissions.some((p: any) => p.key.includes('admin') || p.key.includes('delete') || p.key.includes('manage'))
  }

  private findRedundantPermissions(rolePermissions: any[], directPermissions: any[]): any[] {
    return directPermissions.filter((direct: any) => rolePermissions.some((role: any) => role.id === direct.id))
  }

  private generateSecurityRecommendations(roleCount: number, directPermissionCount: number): string[] {
    const recommendations = []

    if (roleCount > 3) {
      recommendations.push('Consider consolidating roles to reduce complexity')
    }

    if (directPermissionCount > 5) {
      recommendations.push('Review direct permissions - consider using roles instead')
    }

    if (roleCount === 0 && directPermissionCount > 0) {
      recommendations.push('Consider creating a role for this permission set')
    }

    return recommendations
  }
}
