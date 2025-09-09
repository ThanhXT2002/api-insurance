import { Request, Response } from 'express'
import { UserAssignmentService } from './userAssignmentService'
import { ApiResponse } from '../../bases/apiResponse'
import { StatusCodes } from 'http-status-codes'

export class UserAssignmentController {
  constructor(private userService: UserAssignmentService) {}

  // GET /api/user-assignments - Get all user assignments with basic role information
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, keyword } = req.query

      const result = await this.userService.getUsersWithRoles({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        keyword: keyword as string
      })

      res.status(StatusCodes.OK).json(ApiResponse.ok(result, 'Users retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/user-assignments/:id - Get user with full permission details
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id)
      if (isNaN(id)) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json(ApiResponse.error('Invalid user ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const result = await this.userService.getUserWithPermissions(id)
      if (!result) {
        res.status(StatusCodes.NOT_FOUND).json(ApiResponse.error('User not found', 'Not found', StatusCodes.NOT_FOUND))
        return
      }

      res.status(StatusCodes.OK).json(ApiResponse.ok(result, 'User retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/user-assignments/:userId/roles - Assign role to user
  async assignRole(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      const { roleId } = req.body

      if (isNaN(userId) || !roleId) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json(ApiResponse.error('Invalid user ID or role ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const auditContext = { userId: (req as any).user?.id }
      await this.userService.assignRole(userId, Number(roleId), auditContext)

      res.status(StatusCodes.OK).json(ApiResponse.ok(null, 'Role assigned successfully'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(StatusCodes.NOT_FOUND).json(ApiResponse.error(error.message, 'Not found', StatusCodes.NOT_FOUND))
      } else if (error.message.includes('already has')) {
        res.status(StatusCodes.CONFLICT).json(ApiResponse.error(error.message, 'Conflict', StatusCodes.CONFLICT))
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
      }
    }
  }

  // DELETE /api/user-assignments/:userId/roles/:roleId - Remove role from user
  async removeRole(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      const roleId = Number(req.params.roleId)

      if (isNaN(userId) || isNaN(roleId)) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json(ApiResponse.error('Invalid user ID or role ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const auditContext = { userId: (req as any).user?.id }
      await this.userService.removeRole(userId, roleId, auditContext)

      res.status(StatusCodes.OK).json(ApiResponse.ok(null, 'Role removed successfully'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(StatusCodes.NOT_FOUND).json(ApiResponse.error(error.message, 'Not found', StatusCodes.NOT_FOUND))
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
      }
    }
  }

  // GET /api/user-assignments/:userId/roles - Get user roles
  async getUserRoles(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      if (isNaN(userId)) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json(ApiResponse.error('Invalid user ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const roles = await this.userService.getUserRoles(userId)
      res.status(StatusCodes.OK).json(ApiResponse.ok(roles, 'User roles retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/user-assignments/:userId/permissions - Assign direct permission to user
  async assignPermission(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      const { permissionId } = req.body

      if (isNaN(userId) || !permissionId) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json(ApiResponse.error('Invalid user ID or permission ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const auditContext = { userId: (req as any).user?.id }
      await this.userService.assignPermission(userId, Number(permissionId), auditContext)

      res.status(StatusCodes.OK).json(ApiResponse.ok(null, 'Permission assigned successfully'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(StatusCodes.NOT_FOUND).json(ApiResponse.error(error.message, 'Not found', StatusCodes.NOT_FOUND))
      } else if (error.message.includes('already has')) {
        res.status(StatusCodes.CONFLICT).json(ApiResponse.error(error.message, 'Conflict', StatusCodes.CONFLICT))
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
      }
    }
  }

  // DELETE /api/user-assignments/:userId/permissions/:permissionId - Remove direct permission from user
  async removePermission(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      const permissionId = Number(req.params.permissionId)

      if (isNaN(userId) || isNaN(permissionId)) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json(ApiResponse.error('Invalid user ID or permission ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const auditContext = { userId: (req as any).user?.id }
      await this.userService.removePermission(userId, permissionId, auditContext)

      res.status(StatusCodes.OK).json(ApiResponse.ok(null, 'Permission removed successfully'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(StatusCodes.NOT_FOUND).json(ApiResponse.error(error.message, 'Not found', StatusCodes.NOT_FOUND))
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
      }
    }
  }

  // GET /api/user-assignments/:userId/permissions - List direct permission assignments
  async listDirectPermissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      if (isNaN(userId)) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json(ApiResponse.error('Invalid user ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const permissions = await this.userService.listDirectPermissionsForUser(userId)
      res.status(StatusCodes.OK).json(ApiResponse.ok(permissions, 'User direct permissions retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/user-assignments/:userId/effective-permissions - List effective permissions (role + direct)
  async listEffectivePermissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      if (isNaN(userId)) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json(ApiResponse.error('Invalid user ID', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const permissions = await this.userService.listEffectivePermissionsForUser(userId)
      res.status(StatusCodes.OK).json(ApiResponse.ok(permissions, 'User effective permissions retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/user-assignments/search - Advanced user search with role/permission filters
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

      res.status(StatusCodes.OK).json(ApiResponse.ok(result, 'Users found successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/user-assignments/:userId/has-permission/:permissionKey - Check if user has specific permission
  async checkPermission(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)
      const { permissionKey } = req.params

      if (isNaN(userId) || !permissionKey) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json(ApiResponse.error('Invalid user ID or permission key', 'Bad request', StatusCodes.BAD_REQUEST))
        return
      }

      const hasPermission = await this.userService.hasPermission(userId, permissionKey)
      res.status(StatusCodes.OK).json(ApiResponse.ok({ hasPermission }, 'Permission check completed'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
