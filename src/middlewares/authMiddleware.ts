import { Request, Response, NextFunction } from 'express'
import { getSupabaseAdmin } from '../config/supabaseClient'
import { AuthRepository } from '../modules/auth/authRepository'
import { AuthService } from '../modules/auth/authService'

// Extend Express Request interface to include user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        supabaseId: string
        email: string
        name: string | null
        avatarUrl: string | null
        active: boolean
        roles: Array<{
          id: number
          key: string
          name: string
          permissions: Array<{
            id: number
            key: string
            name: string
          }>
        }>
        permissions: Set<string> // Flat set of all permission keys for quick lookup
      }
    }
  }
}

export class AuthMiddleware {
  private authRepository: AuthRepository
  private authService: AuthService

  constructor() {
    this.authRepository = new AuthRepository()
    this.authService = new AuthService(this.authRepository)
  }

  /**
   * Middleware to verify Supabase token and load user context
   */
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req)

      if (!token) {
        res.status(401).json({
          success: false,
          message: 'Token không được cung cấp',
          error: 'MISSING_TOKEN'
        })
        return
      }

      // Verify token with Supabase
      const supabaseUser = await this.verifySupabaseToken(token)

      if (!supabaseUser) {
        res.status(401).json({
          success: false,
          message: 'Token không hợp lệ',
          error: 'INVALID_TOKEN'
        })
        return
      }

      // Get or create local user profile
      const localUser = await this.getOrCreateLocalUser(supabaseUser)

      if (!localUser.active) {
        res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa',
          error: 'ACCOUNT_DISABLED'
        })
        return
      }

      // Load user roles and permissions
      const userWithPermissions = await this.loadUserPermissions(localUser)

      // Inject user context into request
      req.user = userWithPermissions

      next()
    } catch (error) {
      console.error('Auth middleware error:', error)
      res.status(500).json({
        success: false,
        message: 'Lỗi xác thực người dùng',
        error: 'AUTH_ERROR'
      })
    }
  }

  /**
   * Middleware to check if user has specific permissions
   */
  requirePermissions = (requiredPermissions: string | string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Chưa xác thực người dùng',
          error: 'NOT_AUTHENTICATED'
        })
        return
      }

      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]
      const hasAllPermissions = permissions.every((permission) => req.user!.permissions.has(permission))

      if (!hasAllPermissions) {
        res.status(403).json({
          success: false,
          message: 'Không có quyền truy cập',
          error: 'INSUFFICIENT_PERMISSIONS',
          requiredPermissions: permissions,
          userPermissions: Array.from(req.user.permissions)
        })
        return
      }

      next()
    }
  }

  /**
   * Middleware to check if user has specific roles
   */
  requireRoles = (requiredRoles: string | string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Chưa xác thực người dùng',
          error: 'NOT_AUTHENTICATED'
        })
        return
      }

      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
      const userRoleKeys = req.user.roles.map((role) => role.key)
      const hasAnyRole = roles.some((role) => userRoleKeys.includes(role))

      if (!hasAnyRole) {
        res.status(403).json({
          success: false,
          message: 'Không có vai trò phù hợp',
          error: 'INSUFFICIENT_ROLES',
          requiredRoles: roles,
          userRoles: userRoleKeys
        })
        return
      }

      next()
    }
  }

  /**
   * Optional authentication - does not fail if no token provided
   */
  optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req)

      if (!token) {
        next()
        return
      }

      const supabaseUser = await this.verifySupabaseToken(token)

      if (supabaseUser) {
        const localUser = await this.getOrCreateLocalUser(supabaseUser)
        if (localUser.active) {
          const userWithPermissions = await this.loadUserPermissions(localUser)
          req.user = userWithPermissions
        }
      }

      next()
    } catch (error) {
      console.error('Optional auth middleware error:', error)
      // Continue without authentication for optional middleware
      next()
    }
  }

  private extractToken(req: Request): string | null {
    // Try Authorization header first
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }

    // Try query parameter as fallback
    if (req.query.token && typeof req.query.token === 'string') {
      return req.query.token
    }

    return null
  }

  private async verifySupabaseToken(token: string) {
    try {
      const supabase = getSupabaseAdmin()
      const {
        data: { user },
        error
      } = await supabase.auth.getUser(token)

      if (error || !user) {
        return null
      }

      return user
    } catch (error) {
      console.error('Supabase token verification failed:', error)
      return null
    }
  }

  private async getOrCreateLocalUser(supabaseUser: any) {
    // Try to find existing user by supabaseId
    let localUser = await this.authRepository.findBySupabaseId(supabaseUser.id)

    if (!localUser) {
      // Try to find by email (in case user was created before supabaseId was linked)
      localUser = await this.authRepository.findByEmail(supabaseUser.email)

      if (localUser) {
        // Link existing user with supabaseId
        localUser = await this.authRepository.update(localUser.id, {
          supabaseId: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || localUser.name,
          avatarUrl: supabaseUser.user_metadata?.avatar_url || localUser.avatarUrl
        })
      } else {
        // Create new user profile
        localUser = await this.authRepository.create({
          supabaseId: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.name || null,
          avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
          active: true
        })

        // Assign default role to new user
        const defaultRole = await this.authRepository.ensureDefaultRole()
        await this.authRepository.createRoleAssignment(localUser.id, defaultRole.id)
      }
    } else {
      // Update user metadata from Supabase if needed
      if (supabaseUser.user_metadata) {
        const updates: any = {}
        if (supabaseUser.user_metadata.name && supabaseUser.user_metadata.name !== localUser.name) {
          updates.name = supabaseUser.user_metadata.name
        }
        if (supabaseUser.user_metadata.avatar_url && supabaseUser.user_metadata.avatar_url !== localUser.avatarUrl) {
          updates.avatarUrl = supabaseUser.user_metadata.avatar_url
        }

        if (Object.keys(updates).length > 0) {
          localUser = await this.authRepository.update(localUser.id, updates)
        }
      }
    }

    return localUser
  }

  private async loadUserPermissions(user: any) {
    // Load user with roles and permissions
    const userWithRoles = await this.authRepository.findUnique({
      where: { id: user.id },
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

    if (!userWithRoles) {
      throw new Error('User not found')
    }

    // Build roles array with permissions
    const roles = userWithRoles.roleAssignments.map((assignment: any) => ({
      id: assignment.role.id,
      key: assignment.role.key,
      name: assignment.role.name,
      permissions: assignment.role.rolePermissions.map((rp: any) => ({
        id: rp.permission.id,
        key: rp.permission.key,
        name: rp.permission.name
      }))
    }))

    // Build flat permission set for quick lookup
    const permissions = new Set<string>()

    // Add permissions from roles
    roles.forEach((role: any) => {
      role.permissions.forEach((permission: any) => {
        permissions.add(permission.key)
      })
    })

    // Add/remove direct user permissions (these can override role permissions)
    userWithRoles.userPermissions.forEach((up: any) => {
      if (up.allowed) {
        permissions.add(up.permission.key)
      } else {
        permissions.delete(up.permission.key) // Remove permission if explicitly denied
      }
    })

    return {
      id: userWithRoles.id,
      supabaseId: userWithRoles.supabaseId!,
      email: userWithRoles.email,
      name: userWithRoles.name,
      avatarUrl: userWithRoles.avatarUrl,
      active: userWithRoles.active,
      roles,
      permissions
    }
  }
}

// Create singleton instance
export const authMiddleware = new AuthMiddleware()

// Export individual middleware functions for easy use
export const authenticate = authMiddleware.authenticate
export const optionalAuthenticate = authMiddleware.optionalAuthenticate
export const requirePermissions = authMiddleware.requirePermissions
export const requireRoles = authMiddleware.requireRoles
