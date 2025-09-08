import { Request, Response } from 'express'
import { UserService } from './userService'
import { ApiResponse } from '../../bases/apiResponse'
import { StatusCodes } from 'http-status-codes'

export class UserController {
  constructor(private userService: UserService) {}

  // GET /api/users - Get all users with roles
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, keyword } = req.query

      const result = await this.userService.getUsersWithRoles({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        keyword: keyword as string
      })

      res.json(ApiResponse.ok(result, 'Users retrieved successfully'))
    } catch (error: any) {
      res.status(500).json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/users/:id - Get user with full permission details
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id)
      if (isNaN(id)) {
        res.status(400).json(ApiResponse.error('Invalid user ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const result = await this.userService.getUserWithPermissions(id)
      if (!result) {
        res.status(404).json(ApiResponse.error('User not found', 'Not found', StatusCodes.NOT_FOUND))
        return
      }

      res.json(ApiResponse.ok(result, 'User retrieved successfully'))
    } catch (error: any) {
      res.status(500).json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/users/:userId/roles - Assign role to user
  async assignRole(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      const { roleId } = req.body

      if (isNaN(userId) || !roleId) {
        res.status(400).json(ApiResponse.error('Invalid user ID or role ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const auditContext = { userId: (req as any).user?.id }
      await this.userService.assignRole(userId, Number(roleId), auditContext)

      res.json(ApiResponse.ok(null, 'Role assigned successfully'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(ApiResponse.error(error.message, 'Not found', StatusCodes.NOT_FOUND))
      } else if (error.message.includes('already has')) {
        res.status(409).json(ApiResponse.error(error.message, 'Conflict', StatusCodes.CONFLICT))
      } else {
        res
          .status(500)
          .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
      }
    }
  }

  // DELETE /api/users/:userId/roles/:roleId - Remove role from user
  async removeRole(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      const roleId = Number(req.params.roleId)

      if (isNaN(userId) || isNaN(roleId)) {
        res.status(400).json(ApiResponse.error('Invalid user ID or role ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const auditContext = { userId: (req as any).user?.id }
      await this.userService.removeRole(userId, roleId, auditContext)

      res.json(ApiResponse.ok(null, 'Role removed successfully'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(ApiResponse.error(error.message, 'Not found', StatusCodes.NOT_FOUND))
      } else {
        res
          .status(500)
          .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
      }
    }
  }

  // GET /api/users/:userId/roles - Get user roles
  async getUserRoles(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      if (isNaN(userId)) {
        res.status(400).json(ApiResponse.error('Invalid user ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const roles = await this.userService.getUserRoles(userId)
      res.json(ApiResponse.ok(roles, 'User roles retrieved successfully'))
    } catch (error: any) {
      res.status(500).json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/users/:userId/permissions - Assign direct permission to user
  async assignPermission(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      const { permissionId } = req.body

      if (isNaN(userId) || !permissionId) {
        res
          .status(400)
          .json(ApiResponse.error('Invalid user ID or permission ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const auditContext = { userId: (req as any).user?.id }
      await this.userService.assignPermission(userId, Number(permissionId), auditContext)

      res.json(ApiResponse.ok(null, 'Permission assigned successfully'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(ApiResponse.error(error.message, 'Not found', StatusCodes.NOT_FOUND))
      } else if (error.message.includes('already has')) {
        res.status(409).json(ApiResponse.error(error.message, 'Conflict', StatusCodes.CONFLICT))
      } else {
        res
          .status(500)
          .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
      }
    }
  }

  // DELETE /api/users/:userId/permissions/:permissionId - Remove direct permission from user
  async removePermission(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      const permissionId = Number(req.params.permissionId)

      if (isNaN(userId) || isNaN(permissionId)) {
        res
          .status(400)
          .json(ApiResponse.error('Invalid user ID or permission ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const auditContext = { userId: (req as any).user?.id }
      await this.userService.removePermission(userId, permissionId, auditContext)

      res.json(ApiResponse.ok(null, 'Permission removed successfully'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(ApiResponse.error(error.message, 'Not found', StatusCodes.NOT_FOUND))
      } else {
        res
          .status(500)
          .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
      }
    }
  }

  // GET /api/users/:userId/permissions - Get user direct permissions
  async getUserDirectPermissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      if (isNaN(userId)) {
        res.status(400).json(ApiResponse.error('Invalid user ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const permissions = await this.userService.getUserDirectPermissions(userId)
      res.json(ApiResponse.ok(permissions, 'User direct permissions retrieved successfully'))
    } catch (error: any) {
      res.status(500).json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/users/:userId/effective-permissions - Get all effective permissions (role + direct)
  async getUserEffectivePermissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      if (isNaN(userId)) {
        res.status(400).json(ApiResponse.error('Invalid user ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const permissions = await this.userService.getUserEffectivePermissions(userId)
      res.json(ApiResponse.ok(permissions, 'User effective permissions retrieved successfully'))
    } catch (error: any) {
      res.status(500).json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/users/search - Advanced user search with role/permission filters
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { keyword, roleIds, permissionIds, page, limit } = req.body

      const result = await this.userService.searchUsers({
        keyword,
        roleIds,
        permissionIds,
        page: page || 1,
        limit: limit || 20
      })

      res.json(ApiResponse.ok(result, 'Users found successfully'))
    } catch (error: any) {
      res.status(500).json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/users/:userId/has-permission/:permissionKey - Check if user has specific permission
  async checkPermission(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      const { permissionKey } = req.params

      if (isNaN(userId) || !permissionKey) {
        res
          .status(400)
          .json(ApiResponse.error('Invalid user ID or permission key', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const hasPermission = await this.userService.hasPermission(userId, permissionKey)
      res.json(ApiResponse.ok({ hasPermission }, 'Permission check completed'))
    } catch (error: any) {
      res.status(500).json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
