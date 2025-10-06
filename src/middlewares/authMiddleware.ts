import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getSupabaseAdmin, getSupabase } from '../config/supabaseClient'
import { AuthRepository } from '../modules/auth/authRepository'
import { UserCacheHelper } from '../services/cacheService'
import prisma from '../config/prismaClient'

// Extend Express Request interface to include user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        supabaseId: string
        email: string
        name: string | null
        phoneNumber: string | null
        addresses: string | null
        avatarUrl: string | null
        active: boolean
        updatedAt: Date
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

  constructor() {
    this.authRepository = new AuthRepository()
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
      // Verify JWT token using SUPABASE_JWT_SECRET
      const secret = process.env.SUPABASE_JWT_SECRET
      if (!secret) {
        console.error('SUPABASE_JWT_SECRET not found in environment variables')
        return null
      }

      // Try both raw secret and base64 decoded secret
      let finalSecret = secret

      // If secret looks like base64, try to decode it
      if (secret.includes('/') || secret.includes('+') || secret.includes('=')) {
        try {
          const decodedSecret = Buffer.from(secret, 'base64').toString('utf-8')
          finalSecret = decodedSecret
        } catch (base64Error) {
          console.error('Base64 decode failed, using raw secret')
        }
      }

      // Try to decode without verification first to see the structure
      try {
        const decoded = jwt.decode(token, { complete: true })
        // console.log('Token structure:', {
        //   header: decoded?.header,
        //   payload: decoded?.payload
        //     ? {
        //         sub: (decoded.payload as any).sub,
        //         email: (decoded.payload as any).email,
        //         iss: (decoded.payload as any).iss,
        //         exp: (decoded.payload as any).exp
        //       }
        //     : null
        // })
      } catch (decodeError) {
        console.error('Failed to decode token structure:', decodeError)
      }

      // Now try to verify with different secret formats
      let decoded: any = null

      // Try 1: Raw secret
      try {
        decoded = jwt.verify(token, secret) as any
      } catch (rawError) {
        // Try 2: Base64 decoded secret
        try {
          const base64Secret = Buffer.from(secret, 'base64')
          decoded = jwt.verify(token, base64Secret) as any
        } catch (base64Error) {
          throw new Error('All secret formats failed')
        }
      }

      // Create user object compatible with existing code
      const user = {
        id: decoded.sub,
        email: decoded.email,
        user_metadata: decoded.user_metadata || {},
        app_metadata: decoded.app_metadata || {}
      }
      return user
    } catch (error) {
      // Additional debug info
      if (error instanceof Error) {
        console.error('Error type:', error.constructor.name)
        console.error('Error message:', error.message)
      }

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
        localUser = await this.authRepository.update(
          { id: localUser.id },
          {
            supabaseId: supabaseUser.id,
            name: supabaseUser.user_metadata?.name || localUser.name,
            avatarUrl: supabaseUser.user_metadata?.avatar_url || localUser.avatarUrl
          }
        )
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
        // Only update name from provider if local user doesn't already have a name
        if (
          (!localUser.name || localUser.name === null) &&
          supabaseUser.user_metadata.name &&
          supabaseUser.user_metadata.name !== localUser.name
        ) {
          updates.name = supabaseUser.user_metadata.name
        }
        // Only update avatarUrl from provider if local user doesn't already have one
        if (
          (!localUser.avatarUrl || localUser.avatarUrl === null) &&
          supabaseUser.user_metadata.avatar_url &&
          supabaseUser.user_metadata.avatar_url !== localUser.avatarUrl
        ) {
          updates.avatarUrl = supabaseUser.user_metadata.avatar_url
        }

        if (Object.keys(updates).length > 0) {
          localUser = await this.authRepository.update({ id: localUser.id }, updates)
        }
      }
    }

    return localUser
  }

  private async loadUserPermissions(user: any): Promise<{
    id: number
    supabaseId: string
    email: string
    name: string | null
    phoneNumber: string | null
    addresses: string | null
    avatarUrl: string | null
    active: boolean
    updatedAt: Date
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
    permissions: Set<string>
  }> {
    // Check cache first using CacheService
    const cached = UserCacheHelper.getUser(user.id)
    if (cached) {
      console.log(`[AuthMiddleware] Cache HIT for user ${user.id}`)
      return cached
    }

    console.log(`[AuthMiddleware] Cache MISS for user ${user.id} - Loading with RAW SQL`)

    // ULTRA OPTIMIZED: 1 RAW SQL QUERY DUY NHẤT - TRÁNH CARTESIAN PRODUCT
    const timerLabel = `[AuthMiddleware-${Date.now()}] RAW SQL Load user ${user.id}`
    console.time(timerLabel)

    const rawResult = (await prisma.$queryRaw`
      SELECT 
        u.id as user_id,
        u."supabaseId" as user_supabase_id,
        u.email as user_email,
        u.name as user_name,
        u."phoneNumber" as user_phone_number,
        u.addresses as user_addresses,
        u."avatarUrl" as user_avatar_url,
        u.active as user_active,
        u."updatedAt" as user_updated_at,
        -- Role info
        r.id as role_id,
        r.key as role_key,
        r.name as role_name,
        -- Role permissions
        p1.id as role_perm_id,
        p1.key as role_perm_key,
        p1.name as role_perm_name,
        -- User permissions
        p2.id as user_perm_id,
        p2.key as user_perm_key,
        p2.name as user_perm_name,
        up.allowed as user_perm_allowed
      FROM users u
      -- Get user roles
      LEFT JOIN user_role_assignments ura ON u.id = ura."userId"
      LEFT JOIN user_roles r ON ura."roleId" = r.id
      -- Get role permissions
      LEFT JOIN role_permissions rp ON r.id = rp."roleId"
      LEFT JOIN permissions p1 ON rp."permissionId" = p1.id
      -- Get direct user permissions
      LEFT JOIN user_permissions up ON u.id = up."userId"
      LEFT JOIN permissions p2 ON up."permissionId" = p2.id
      WHERE u.id = ${user.id}
    `) as any[]

    console.timeEnd(timerLabel)

    if (rawResult.length === 0) {
      throw new Error('User not found')
    }

    // Process raw result (1 lần duy nhất trong memory - NHANH)
    console.time(`[AuthMiddleware] Process user ${user.id} data`)

    const userInfo = rawResult[0]
    const rolesMap = new Map<number, any>()
    const permissionsSet = new Set<string>()

    rawResult.forEach((row: any) => {
      // Build roles map
      if (row.role_id && !rolesMap.has(row.role_id)) {
        rolesMap.set(row.role_id, {
          id: row.role_id,
          key: row.role_key,
          name: row.role_name,
          permissions: []
        })
      }

      // Add role permissions
      if (row.role_perm_id && row.role_id) {
        const role = rolesMap.get(row.role_id)
        const existingPerm = role.permissions.find((p: any) => p.id === row.role_perm_id)
        if (!existingPerm) {
          role.permissions.push({
            id: row.role_perm_id,
            key: row.role_perm_key,
            name: row.role_perm_name
          })
        }
        permissionsSet.add(row.role_perm_key)
      }

      // Handle direct user permissions
      if (row.user_perm_id) {
        if (row.user_perm_allowed) {
          permissionsSet.add(row.user_perm_key)
        } else {
          permissionsSet.delete(row.user_perm_key)
        }
      }
    })

    const result = {
      id: userInfo.user_id,
      supabaseId: userInfo.user_supabase_id,
      email: userInfo.user_email,
      name: userInfo.user_name,
      phoneNumber: userInfo.user_phone_number,
      addresses: userInfo.user_addresses,
      avatarUrl: userInfo.user_avatar_url,
      active: userInfo.user_active,
      updatedAt: userInfo.user_updated_at,
      roles: Array.from(rolesMap.values()),
      permissions: permissionsSet
    }

    console.timeEnd(`[AuthMiddleware] Process user ${user.id} data`)

    console.log(`[DEBUG] User ${user.id}: Found ${rolesMap.size} roles, ${permissionsSet.size} total permissions`)

    // Cache the result using CacheService
    UserCacheHelper.setUser(user.id, result)

    return result
  }

  // Public method to clear cache for a specific user (useful after update)
  public clearUserCache(userId: number) {
    UserCacheHelper.clearUser(userId)
  }

  // Public method to clear all cache
  public clearAllCache() {
    UserCacheHelper.clearAllUsers()
  }
}

// Create singleton instance
export const authMiddleware = new AuthMiddleware()

// Export individual middleware functions for easy use
export const authenticate = authMiddleware.authenticate
export const optionalAuthenticate = authMiddleware.optionalAuthenticate
export const requirePermissions = authMiddleware.requirePermissions
export const requireRoles = authMiddleware.requireRoles
