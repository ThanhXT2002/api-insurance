import { Request, Response } from 'express'
import { ReportsService } from './reportsService'
import { ApiResponse } from '../../bases/apiResponse'
import { StatusCodes } from 'http-status-codes'

export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  // GET /api/reports/permissions-summary
  async getPermissionsSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await this.reportsService.getPermissionsSummary()
      res.status(StatusCodes.OK).json(ApiResponse.ok(summary, 'Permissions summary retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(error.message, 'Failed to retrieve permissions summary', StatusCodes.INTERNAL_SERVER_ERROR)
        )
    }
  }

  // GET /api/reports/users-by-role
  async getUsersByRole(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.reportsService.getUsersByRole()
      res.status(StatusCodes.OK).json(ApiResponse.ok(data, 'User count by role retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error.message, 'Failed to retrieve users by role', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/reports/permissions-by-role
  async getPermissionsByRole(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.reportsService.getPermissionsByRole()
      res.status(StatusCodes.OK).json(ApiResponse.ok(data, 'Permission count by role retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(error.message, 'Failed to retrieve permissions by role', StatusCodes.INTERNAL_SERVER_ERROR)
        )
    }
  }

  // GET /api/reports/most-used-permissions
  async getMostUsedPermissions(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.reportsService.getMostUsedPermissions()
      res.status(StatusCodes.OK).json(ApiResponse.ok(data, 'Most used permissions retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(
            error.message,
            'Failed to retrieve most used permissions',
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        )
    }
  }

  // GET /api/reports/users-with-multiple-roles
  async getUsersWithMultipleRoles(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.reportsService.getUsersWithMultipleRoles()
      res.status(StatusCodes.OK).json(ApiResponse.ok(data, 'Users with multiple roles retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(
            error.message,
            'Failed to retrieve users with multiple roles',
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        )
    }
  }

  // GET /api/reports/orphaned-permissions
  async getOrphanedPermissions(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.reportsService.getOrphanedPermissions()
      res.status(StatusCodes.OK).json(ApiResponse.ok(data, 'Orphaned permissions retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(error.message, 'Failed to retrieve orphaned permissions', StatusCodes.INTERNAL_SERVER_ERROR)
        )
    }
  }

  // GET /api/reports/role-permission-matrix
  async getRolePermissionMatrix(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.reportsService.getRolePermissionMatrix()
      res.status(StatusCodes.OK).json(ApiResponse.ok(data, 'Role-permission matrix retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(
            error.message,
            'Failed to retrieve role-permission matrix',
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        )
    }
  }

  // GET /api/reports/user-access-audit/:userId
  async getUserAccessAudit(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.userId)

      if (isNaN(userId)) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json(ApiResponse.error('Invalid user ID', 'User ID must be a valid number', StatusCodes.BAD_REQUEST))
        return
      }

      const audit = await this.reportsService.getUserAccessAudit(userId)

      if (!audit) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json(ApiResponse.error('User not found', 'User with specified ID does not exist', StatusCodes.NOT_FOUND))
        return
      }

      res.status(StatusCodes.OK).json(ApiResponse.ok(audit, 'User access audit retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(error.message, 'Failed to retrieve user access audit', StatusCodes.INTERNAL_SERVER_ERROR)
        )
    }
  }
}
