import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiResponse } from '../../bases/apiResponse'
import { UserRoleService } from './userRoleService'
import { AuthUtils } from '../../middlewares/authUtils'

export class UserRoleController {
  constructor(private service: UserRoleService) {}

  // GET /api/user-roles - Liệt kê tất cả roles
  async getAll(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.view')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền ROLE_VIEW', StatusCodes.FORBIDDEN))
      }

      const { page, limit, keyword } = req.query
      const result = await this.service.getAll({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        keyword: keyword as string
      })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy danh sách role thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lấy danh sách role thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/user-roles/:id - Chi tiết role + permissions
  async getById(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.view')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền ROLE_VIEW', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const role = await this.service.getWithPermissions(parseInt(id))

      if (!role) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Không tìm thấy role', 'Không tìm thấy role', StatusCodes.NOT_FOUND))
      }

      // Get usage information
      const usage = await this.service.checkRoleUsage(parseInt(id))

      // Transform role permissions for easier frontend consumption
      const roleWithPermissions = {
        ...role,
        permissions: role.rolePermissions?.map((rp: any) => rp.permission) || [],
        usage
      }

      // Remove the raw rolePermissions array
      delete roleWithPermissions.rolePermissions

      res.status(StatusCodes.OK).send(ApiResponse.ok(roleWithPermissions, 'Lấy role thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to get role', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/user-roles - Tạo role mới
  async create(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.create')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền ROLE_CREATE', StatusCodes.FORBIDDEN))
      }

      const { key, name, description, permissionIds } = req.body

      // Validate required fields
      if (!key || !name) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Thiếu dữ liệu bắt buộc', 'Key và name là bắt buộc', StatusCodes.BAD_REQUEST))
      }

      const auditContext = AuthUtils.getAuditContext(req)
      if (!auditContext.createdBy) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('Người dùng chưa xác thực', 'Cần đăng nhập', StatusCodes.UNAUTHORIZED))
      }

      const role = await this.service.create(
        { key, name, description, permissionIds },
        { actorId: auditContext.createdBy }
      )

      res.status(StatusCodes.CREATED).send(ApiResponse.ok(role, 'Tạo role thành công', StatusCodes.CREATED))
    } catch (error: any) {
      console.error('Error creating role:', error)
      if (error.message.includes('already exists')) {
        return res
          .status(StatusCodes.CONFLICT)
          .send(ApiResponse.error(error.message, 'Trùng dữ liệu', StatusCodes.CONFLICT))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Tạo role thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // PUT /api/user-roles/:id - Cập nhật role
  async update(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.edit')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền ROLE_EDIT', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const { key, name, description, permissionIds } = req.body

      const auditContext = AuthUtils.getAuditContext(req)
      if (!auditContext.updatedBy) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('Người dùng chưa xác thực', 'Cần đăng nhập', StatusCodes.UNAUTHORIZED))
      }

      const role = await this.service.update(
        { id: parseInt(id) },
        { key, name, description, permissionIds },
        { actorId: auditContext.updatedBy }
      )

      if (!role) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Không tìm thấy role', 'Không tìm thấy role', StatusCodes.NOT_FOUND))
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(role, 'Cập nhật role thành công'))
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return res
          .status(StatusCodes.CONFLICT)
          .send(ApiResponse.error(error.message, 'Trùng dữ liệu', StatusCodes.CONFLICT))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Cập nhật role thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // DELETE /api/user-roles/:id - Xóa role
  async delete(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.delete')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền ROLE_DELETE', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const roleId = parseInt(id)

      await this.service.delete({ id: roleId }, true)

      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Xóa role thành công'))
    } catch (error: any) {
      if (error.message.includes('Cannot delete role')) {
        return res
          .status(StatusCodes.CONFLICT)
          .send(ApiResponse.error(error.message, 'Role đang được sử dụng', StatusCodes.CONFLICT))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Xóa role thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/user-roles/:roleId/permissions - Xem permissions của role
  async getRolePermissions(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.view')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền ROLE_VIEW', StatusCodes.FORBIDDEN))
      }

      const { roleId } = req.params
      const permissions = await this.service.getRolePermissions(parseInt(roleId))

      res.status(StatusCodes.OK).send(
        ApiResponse.ok(
          permissions.map((rp: any) => rp.permission),
          'Lấy permissions của role thành công'
        )
      )
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lấy permissions của role thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/user-roles/:roleId/permissions - Gán permissions cho role
  async assignPermissions(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.edit')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền ROLE_EDIT', StatusCodes.FORBIDDEN))
      }

      const { roleId } = req.params
      const { permissionIds } = req.body

      if (!Array.isArray(permissionIds)) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Yêu cầu không hợp lệ', 'permissionIds phải là một mảng', StatusCodes.BAD_REQUEST))
      }

      await this.service.assignPermissions(parseInt(roleId), permissionIds)

      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Gán permissions cho role thành công'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error(error.message, 'Không tìm thấy', StatusCodes.NOT_FOUND))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Gán permissions thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // DELETE /api/user-roles/:roleId/permissions/:permissionId - Xóa permission khỏi role
  async removePermission(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.edit')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền ROLE_EDIT', StatusCodes.FORBIDDEN))
      }

      const { roleId, permissionId } = req.params

      await this.service.removePermission(parseInt(roleId), parseInt(permissionId))

      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Xóa permission khỏi role thành công'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error(error.message, 'Không tìm thấy', StatusCodes.NOT_FOUND))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Xóa permission khỏi role thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/user-roles/:roleId/users - Xem users có role này
  async getRoleUsers(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.view')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền ROLE_VIEW', StatusCodes.FORBIDDEN))
      }

      const { roleId } = req.params
      const users = await this.service.getRoleUsers(parseInt(roleId))

      res.status(StatusCodes.OK).send(
        ApiResponse.ok(
          users.map((ra: any) => ra.user),
          'Lấy người dùng của role thành công'
        )
      )
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lấy người dùng của role thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
