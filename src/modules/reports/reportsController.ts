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
      res.status(StatusCodes.OK).json(ApiResponse.ok(summary, 'Lấy báo cáo tổng quan quyền thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(error.message, 'Lấy báo cáo tổng quan quyền thất bại', StatusCodes.INTERNAL_SERVER_ERROR)
        )
    }
  }

  // GET /api/reports/users-by-role
  async getUsersByRole(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.reportsService.getUsersByRole()
      res.status(StatusCodes.OK).json(ApiResponse.ok(data, 'Lấy số lượng người dùng theo role thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(
            error.message,
            'Lấy số lượng người dùng theo role thất bại',
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        )
    }
  }

  // GET /api/reports/permissions-by-role
  async getPermissionsByRole(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.reportsService.getPermissionsByRole()
      res.status(StatusCodes.OK).json(ApiResponse.ok(data, 'Lấy số lượng quyền theo role thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(error.message, 'Lấy số lượng quyền theo role thất bại', StatusCodes.INTERNAL_SERVER_ERROR)
        )
    }
  }

  // GET /api/reports/most-used-permissions
  async getMostUsedPermissions(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.reportsService.getMostUsedPermissions()
      res.status(StatusCodes.OK).json(ApiResponse.ok(data, 'Lấy các quyền được sử dụng nhiều nhất thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(
            error.message,
            'Lấy các quyền được sử dụng nhiều nhất thất bại',
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        )
    }
  }

  // GET /api/reports/users-with-multiple-roles
  async getUsersWithMultipleRoles(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.reportsService.getUsersWithMultipleRoles()
      res.status(StatusCodes.OK).json(ApiResponse.ok(data, 'Lấy người dùng có nhiều role thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(error.message, 'Lấy người dùng có nhiều role thất bại', StatusCodes.INTERNAL_SERVER_ERROR)
        )
    }
  }

  // GET /api/reports/orphaned-permissions
  async getOrphanedPermissions(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.reportsService.getOrphanedPermissions()
      res.status(StatusCodes.OK).json(ApiResponse.ok(data, 'Lấy danh sách quyền không có liên kết thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(
            error.message,
            'Lấy danh sách quyền không có liên kết thất bại',
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        )
    }
  }

  // GET /api/reports/role-permission-matrix
  async getRolePermissionMatrix(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.reportsService.getRolePermissionMatrix()
      res.status(StatusCodes.OK).json(ApiResponse.ok(data, 'Lấy ma trận role-permission thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(error.message, 'Lấy ma trận role-permission thất bại', StatusCodes.INTERNAL_SERVER_ERROR)
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
          .json(
            ApiResponse.error('ID người dùng không hợp lệ', 'ID người dùng phải là số hợp lệ', StatusCodes.BAD_REQUEST)
          )
        return
      }

      const audit = await this.reportsService.getUserAccessAudit(userId)

      if (!audit) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json(
            ApiResponse.error(
              'Không tìm thấy người dùng',
              'Người dùng với ID được chỉ định không tồn tại',
              StatusCodes.NOT_FOUND
            )
          )
        return
      }

      res.status(StatusCodes.OK).json(ApiResponse.ok(audit, 'Lấy thông tin truy cập người dùng thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(
            error.message,
            'Lấy thông tin truy cập người dùng thất bại',
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        )
    }
  }
}
