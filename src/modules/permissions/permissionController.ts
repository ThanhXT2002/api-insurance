import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiResponse } from '../../bases/apiResponse'
import { PermissionService } from './permissionService'
import { AuthUtils } from '../../middlewares/authUtils'

export class PermissionController {
  constructor(private service: PermissionService) {}

  // GET /api/permissions - Liệt kê tất cả permissions
  async getAll(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'permission.view')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền PERMISSION_VIEW', StatusCodes.FORBIDDEN))
      }

      const { page, limit, keyword } = req.query
      const result = await this.service.getAll({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        keyword: keyword as string
      })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy danh sách quyền thành công'))
    } catch (error: any) {
      console.error('Error in getAll permissions:', error)
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lấy danh sách quyền thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/permissions/:id - Chi tiết permission
  async getById(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'permission.view')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền PERMISSION_VIEW', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const permission = await this.service.getById(parseInt(id))

      if (!permission) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Không tìm thấy quyền', 'Không tìm thấy quyền', StatusCodes.NOT_FOUND))
      }

      // Get usage information
      const usage = await this.service.checkPermissionUsage(parseInt(id))

      res.status(StatusCodes.OK).send(
        ApiResponse.ok(
          {
            ...permission,
            usage
          },
          'Lấy chi tiết quyền thành công'
        )
      )
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to get permission', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/permissions - Tạo permission mới
  async create(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'permission.manage')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền PERMISSION_MANAGE', StatusCodes.FORBIDDEN))
      }

      const { key, name, description } = req.body

      // Validate required fields
      if (!key || !name) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Thiếu dữ liệu bắt buộc', 'Cần điền key và name', StatusCodes.BAD_REQUEST))
      }

      const auditContext = AuthUtils.getAuditContext(req)
      if (!auditContext.createdBy) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('Người dùng chưa xác thực', 'Cần đăng nhập', StatusCodes.UNAUTHORIZED))
      }

      const permission = await this.service.create({ key, name, description }, { actorId: auditContext.createdBy })

      res.status(StatusCodes.CREATED).send(ApiResponse.ok(permission, 'Tạo quyền thành công', StatusCodes.CREATED))
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return res
          .status(StatusCodes.CONFLICT)
          .send(ApiResponse.error(error.message, 'Trùng dữ liệu', StatusCodes.CONFLICT))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Tạo quyền thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // PUT /api/permissions/:id - Cập nhật permission
  async update(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'permission.manage')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền PERMISSION_MANAGE', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const { key, name, description } = req.body

      const auditContext = AuthUtils.getAuditContext(req)
      if (!auditContext.updatedBy) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('Người dùng chưa xác thực', 'Cần đăng nhập', StatusCodes.UNAUTHORIZED))
      }

      const permission = await this.service.update(
        { id: parseInt(id) },
        { key, name, description },
        { actorId: auditContext.updatedBy }
      )

      if (!permission) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Không tìm thấy quyền', 'Không tìm thấy quyền', StatusCodes.NOT_FOUND))
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(permission, 'Cập nhật quyền thành công'))
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return res
          .status(StatusCodes.CONFLICT)
          .send(ApiResponse.error(error.message, 'Trùng dữ liệu', StatusCodes.CONFLICT))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Cập nhật quyền thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // DELETE /api/permissions/:id - Xóa permission
  async delete(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'permission.manage')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền PERMISSION_MANAGE', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const permissionId = parseInt(id)

      // Check if permission is in use
      const usage = await this.service.checkPermissionUsage(permissionId)
      if (!usage.canDelete) {
        return res
          .status(StatusCodes.CONFLICT)
          .send(
            ApiResponse.error(
              'Quyền đang được sử dụng',
              `Không thể xóa quyền. Đang được ${usage.rolesUsing} role và ${usage.usersUsing} user sử dụng`,
              StatusCodes.CONFLICT
            )
          )
      }

      const deleted = await this.service.delete({ id: permissionId }, true) // Hard delete
      if (!deleted) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Không tìm thấy quyền', 'Không tìm thấy quyền', StatusCodes.NOT_FOUND))
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Xóa quyền thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Xóa quyền thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/permissions/:id/users - Xem users có permission này
  async getUsersWithPermission(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'permission.view')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền PERMISSION_VIEW', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const users = await this.service.getUsersWithPermission(parseInt(id))

      res.status(StatusCodes.OK).send(ApiResponse.ok(users, 'Lấy danh sách người dùng có quyền thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(
          ApiResponse.error(
            error.message,
            'Lấy danh sách người dùng có quyền thất bại',
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        )
    }
  }

  // GET /api/permissions/check - Check user có quyền không
  async checkPermission(req: Request, res: Response) {
    try {
      const { userId, permission } = req.query

      if (!userId || !permission) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Thiếu tham số', 'Cần userId và permission', StatusCodes.BAD_REQUEST))
      }

      // Only allow users to check their own permissions, or admins to check anyone's
      if (!AuthUtils.isAdmin(req) && req.user?.id !== parseInt(userId as string)) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Chỉ được kiểm tra quyền của chính mình', StatusCodes.FORBIDDEN))
      }

      const result = await this.service.checkUserPermission(parseInt(userId as string), permission as string)

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Kiểm tra quyền hoàn tất'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Kiểm tra quyền thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
