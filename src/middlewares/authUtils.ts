import { Request } from 'express'

/**
 * Utility functions for working with authentication and permissions
 */
export class AuthUtils {
  /**
   * Check if current user has specific permission
   */
  static hasPermission(req: Request, permission: string): boolean {
    return req.user?.permissions.has(permission) || false
  }

  /**
   * Check if current user has any of the specified permissions
   */
  static hasAnyPermission(req: Request, permissions: string[]): boolean {
    if (!req.user?.permissions) return false
    return permissions.some((permission) => req.user!.permissions.has(permission))
  }

  /**
   * Check if current user has all specified permissions
   */
  static hasAllPermissions(req: Request, permissions: string[]): boolean {
    if (!req.user?.permissions) return false
    return permissions.every((permission) => req.user!.permissions.has(permission))
  }

  /**
   * Check if current user has specific role
   */
  static hasRole(req: Request, roleKey: string): boolean {
    return req.user?.roles.some((role) => role.key === roleKey) || false
  }

  /**
   * Check if current user has any of the specified roles
   */
  static hasAnyRole(req: Request, roleKeys: string[]): boolean {
    if (!req.user?.roles) return false
    const userRoleKeys = req.user.roles.map((role) => role.key)
    return roleKeys.some((roleKey) => userRoleKeys.includes(roleKey))
  }

  /**
   * Check if current user is admin (has admin or super_admin role)
   */
  static isAdmin(req: Request): boolean {
    return this.hasAnyRole(req, ['admin', 'super_admin'])
  }

  /**
   * Check if current user is super admin
   */
  static isSuperAdmin(req: Request): boolean {
    return this.hasRole(req, 'super_admin')
  }

  /**
   * Check if user can manage resource (is owner or has admin permissions)
   */
  static canManageResource(req: Request, resourceOwnerId: number, managePermission?: string): boolean {
    // User is the owner
    if (req.user?.id === resourceOwnerId) {
      return true
    }

    // User has specific management permission
    if (managePermission && this.hasPermission(req, managePermission)) {
      return true
    }

    // User is admin
    return this.isAdmin(req)
  }

  /**
   * Get user permission keys as array
   */
  static getUserPermissions(req: Request): string[] {
    return req.user ? Array.from(req.user.permissions) : []
  }

  /**
   * Get user role keys as array
   */
  static getUserRoles(req: Request): string[] {
    return req.user?.roles.map((role) => role.key) || []
  }

  /**
   * Check if user can access resource based on visibility rules
   */
  static canAccessResource(
    req: Request,
    resourceData: {
      isPublic?: boolean
      ownerId?: number
      status?: string
      permissions?: string[]
    }
  ): boolean {
    // Public resource
    if (resourceData.isPublic) {
      return true
    }

    // No user authentication required for public status
    if (resourceData.status === 'PUBLISHED') {
      return true
    }

    // User not authenticated
    if (!req.user) {
      return false
    }

    // User is owner
    if (resourceData.ownerId && req.user.id === resourceData.ownerId) {
      return true
    }

    // User has required permissions
    if (resourceData.permissions && this.hasAnyPermission(req, resourceData.permissions)) {
      return true
    }

    // User is admin
    return this.isAdmin(req)
  }

  /**
   * Filter data based on user permissions
   */
  static filterByPermissions<T extends Record<string, any>>(
    req: Request,
    data: T[],
    filterRules: {
      ownerField?: keyof T
      statusField?: keyof T
      publishedStatuses?: string[]
      viewPermissions?: string[]
    }
  ): T[] {
    const {
      ownerField = 'createdBy',
      statusField = 'status',
      publishedStatuses = ['PUBLISHED'],
      viewPermissions = []
    } = filterRules

    return data.filter((item) => {
      // Show published content to everyone
      if (statusField && publishedStatuses.includes(item[statusField])) {
        return true
      }

      // User not authenticated - only show published
      if (!req.user) {
        return false
      }

      // Show user's own content
      if (ownerField && item[ownerField] === req.user.id) {
        return true
      }

      // Show if user has view permissions
      if (viewPermissions.length > 0 && this.hasAnyPermission(req, viewPermissions)) {
        return true
      }

      // Show if user is admin
      return this.isAdmin(req)
    })
  }

  /**
   * Get audit context for database operations
   */
  static getAuditContext(req: Request): { createdBy?: number; updatedBy?: number } {
    return req.user ? { createdBy: req.user.id, updatedBy: req.user.id } : {}
  }

  /**
   * Get user context for logging
   */
  static getUserContext(req: Request): {
    userId?: number
    email?: string
    roles?: string[]
    permissions?: string[]
  } {
    if (!req.user) return {}

    return {
      userId: req.user.id,
      email: req.user.email,
      roles: this.getUserRoles(req),
      permissions: this.getUserPermissions(req)
    }
  }
}

/**
 * Decorator for checking permissions in controller methods
 */
export function RequirePermissions(permissions: string | string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = function (req: Request, res: any, next: any) {
      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions]

      if (!AuthUtils.hasAllPermissions(req, requiredPermissions)) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền truy cập',
          error: 'INSUFFICIENT_PERMISSIONS',
          requiredPermissions
        })
      }

      return originalMethod.call(this, req, res, next)
    }

    return descriptor
  }
}

/**
 * Decorator for checking roles in controller methods
 */
export function RequireRoles(roles: string | string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = function (req: Request, res: any, next: any) {
      const requiredRoles = Array.isArray(roles) ? roles : [roles]

      if (!AuthUtils.hasAnyRole(req, requiredRoles)) {
        return res.status(403).json({
          success: false,
          message: 'Không có vai trò phù hợp',
          error: 'INSUFFICIENT_ROLES',
          requiredRoles
        })
      }

      return originalMethod.call(this, req, res, next)
    }

    return descriptor
  }
}

/**
 * Decorator for admin-only methods
 */
export function AdminOnly(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value

  descriptor.value = function (req: Request, res: any, next: any) {
    if (!AuthUtils.isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền truy cập',
        error: 'ADMIN_ONLY'
      })
    }

    return originalMethod.call(this, req, res, next)
  }

  return descriptor
}
