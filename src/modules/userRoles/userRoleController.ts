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
          .send(ApiResponse.error('Insufficient permissions', 'ROLE_VIEW permission required', StatusCodes.FORBIDDEN))
      }

      const { page, limit, keyword } = req.query
      const result = await this.service.getAll({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        keyword: keyword as string
      })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Roles retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to get roles', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/user-roles/:id - Chi tiết role + permissions
  async getById(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.view')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Insufficient permissions', 'ROLE_VIEW permission required', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const role = await this.service.getWithPermissions(parseInt(id))

      if (!role) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Role not found', 'Role not found', StatusCodes.NOT_FOUND))
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

      res.status(StatusCodes.OK).send(ApiResponse.ok(roleWithPermissions, 'Role retrieved successfully'))
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
          .send(ApiResponse.error('Insufficient permissions', 'ROLE_CREATE permission required', StatusCodes.FORBIDDEN))
      }

      const { key, name, description } = req.body

      // Validate required fields
      if (!key || !name) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Missing required fields', 'Key and name are required', StatusCodes.BAD_REQUEST))
      }

      const auditContext = AuthUtils.getAuditContext(req)
      if (!auditContext.createdBy) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('User not authenticated', 'Authentication required', StatusCodes.UNAUTHORIZED))
      }

      const role = await this.service.create({ key, name, description }, { actorId: auditContext.createdBy })

      res.status(StatusCodes.CREATED).send(ApiResponse.ok(role, 'Role created successfully', StatusCodes.CREATED))
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return res.status(StatusCodes.CONFLICT).send(ApiResponse.error(error.message, 'Conflict', StatusCodes.CONFLICT))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to create role', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // PUT /api/user-roles/:id - Cập nhật role
  async update(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.edit')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Insufficient permissions', 'ROLE_EDIT permission required', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const { key, name, description } = req.body

      const auditContext = AuthUtils.getAuditContext(req)
      if (!auditContext.updatedBy) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('User not authenticated', 'Authentication required', StatusCodes.UNAUTHORIZED))
      }

      const role = await this.service.update(
        { id: parseInt(id) },
        { key, name, description },
        { actorId: auditContext.updatedBy }
      )

      if (!role) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Role not found', 'Role not found', StatusCodes.NOT_FOUND))
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(role, 'Role updated successfully'))
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return res.status(StatusCodes.CONFLICT).send(ApiResponse.error(error.message, 'Conflict', StatusCodes.CONFLICT))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to update role', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // DELETE /api/user-roles/:id - Xóa role
  async delete(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.delete')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Insufficient permissions', 'ROLE_DELETE permission required', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const roleId = parseInt(id)

      await this.service.delete({ id: roleId }, true)

      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Role deleted successfully'))
    } catch (error: any) {
      if (error.message.includes('Cannot delete role')) {
        return res
          .status(StatusCodes.CONFLICT)
          .send(ApiResponse.error(error.message, 'Role in use', StatusCodes.CONFLICT))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to delete role', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/user-roles/:roleId/permissions - Xem permissions của role
  async getRolePermissions(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.view')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Insufficient permissions', 'ROLE_VIEW permission required', StatusCodes.FORBIDDEN))
      }

      const { roleId } = req.params
      const permissions = await this.service.getRolePermissions(parseInt(roleId))

      res.status(StatusCodes.OK).send(
        ApiResponse.ok(
          permissions.map((rp: any) => rp.permission),
          'Role permissions retrieved successfully'
        )
      )
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to get role permissions', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/user-roles/:roleId/permissions - Gán permissions cho role
  async assignPermissions(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.edit')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Insufficient permissions', 'ROLE_EDIT permission required', StatusCodes.FORBIDDEN))
      }

      const { roleId } = req.params
      const { permissionIds } = req.body

      if (!Array.isArray(permissionIds)) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Invalid request', 'permissionIds must be an array', StatusCodes.BAD_REQUEST))
      }

      await this.service.assignPermissions(parseInt(roleId), permissionIds)

      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Permissions assigned to role successfully'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error(error.message, 'Not found', StatusCodes.NOT_FOUND))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to assign permissions', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // DELETE /api/user-roles/:roleId/permissions/:permissionId - Xóa permission khỏi role
  async removePermission(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.edit')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Insufficient permissions', 'ROLE_EDIT permission required', StatusCodes.FORBIDDEN))
      }

      const { roleId, permissionId } = req.params

      await this.service.removePermission(parseInt(roleId), parseInt(permissionId))

      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Permission removed from role successfully'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error(error.message, 'Not found', StatusCodes.NOT_FOUND))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to remove permission', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/user-roles/:roleId/users - Xem users có role này
  async getRoleUsers(req: Request, res: Response) {
    try {
      // Check permission
      if (!AuthUtils.hasPermission(req, 'role.view')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Insufficient permissions', 'ROLE_VIEW permission required', StatusCodes.FORBIDDEN))
      }

      const { roleId } = req.params
      const users = await this.service.getRoleUsers(parseInt(roleId))

      res.status(StatusCodes.OK).send(
        ApiResponse.ok(
          users.map((ra: any) => ra.user),
          'Role users retrieved successfully'
        )
      )
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to get role users', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
