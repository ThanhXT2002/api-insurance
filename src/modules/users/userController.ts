import { Request, Response } from 'express'
import { UserService } from './userService'
import { ApiResponse } from '../../bases/apiResponse'
import { StatusCodes } from 'http-status-codes'
import { upload } from '../auth/authController'

export class UserController {
  constructor(private userService: UserService) {}

  async getAll(req: Request, res: Response) {
    try {
      const { page, limit, keyword, active } = req.query

      // Parse active query param to boolean when provided (expect 'true' or 'false')
      let activeBool: boolean | undefined = undefined
      if (typeof active === 'string') {
        if (active.toLowerCase() === 'true') activeBool = true
        else if (active.toLowerCase() === 'false') activeBool = false
      }

      const result = await this.userService.getAll({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        keyword,
        // only include active when explicitly provided
        ...(typeof activeBool === 'boolean' ? { active: activeBool } : {})
      })
      res.status(StatusCodes.OK).json(ApiResponse.ok(result, 'Lấy danh sách người dùng thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(err.message, 'Lỗi máy chủ', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id)
      if (isNaN(id)) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(ApiResponse.error('Id không hợp lệ', 'Yêu cầu không hợp lệ', StatusCodes.BAD_REQUEST))
      }

      // Get user with roles for update operations (default behavior)
      const result = await this.userService.getUserWithFullDetails(id)
      if (!result) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json(ApiResponse.error('Không tìm thấy người dùng', 'Không tìm thấy', StatusCodes.NOT_FOUND))
      }

      res.status(StatusCodes.OK).json(ApiResponse.ok(result, 'Lấy người dùng thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(err.message, 'Lỗi máy chủ', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  async create(req: Request, res: Response) {
    try {
      // Support multipart/form-data with an avatar file
      const data = { ...(req.body || {}) }
      // Normalize boolean and array-like fields coming from form-data or JSON
      if (typeof data.active === 'string') {
        if (data.active.toLowerCase() === 'true') data.active = true
        else if (data.active.toLowerCase() === 'false') data.active = false
      }
      // roleKeys/permissionKeys may be sent as repeated form fields (array) or JSON string
      try {
        if (typeof data.roleKeys === 'string') data.roleKeys = JSON.parse(data.roleKeys)
      } catch (e) {
        // leave as-is (could be a single string)
      }
      try {
        if (typeof data.permissionKeys === 'string') data.permissionKeys = JSON.parse(data.permissionKeys)
      } catch (e) {
        // leave as-is
      }
      // Normalize single string values into arrays (common with form-data single fields)
      if (data.roleKeys != null && !Array.isArray(data.roleKeys)) {
        if (typeof data.roleKeys === 'string' && data.roleKeys.includes(',')) {
          data.roleKeys = data.roleKeys
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        } else {
          data.roleKeys = [data.roleKeys]
        }
      }
      if (data.permissionKeys != null && !Array.isArray(data.permissionKeys)) {
        if (typeof data.permissionKeys === 'string' && data.permissionKeys.includes(',')) {
          data.permissionKeys = data.permissionKeys
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        } else {
          data.permissionKeys = [data.permissionKeys]
        }
      }
      if ((req as any).file) {
        data.avatarFile = { buffer: (req as any).file.buffer, originalname: (req as any).file.originalname }
      }
      const actorId = (req as any).user?.id
      const result = await this.userService.createUser(data, { actorId })
      res.status(StatusCodes.CREATED).json(ApiResponse.ok(result, 'Tạo người dùng thành công', StatusCodes.CREATED))
    } catch (err: any) {
      if (err.message.includes('Unique')) {
        res.status(StatusCodes.CONFLICT).json(ApiResponse.error(err.message, 'Trùng dữ liệu', StatusCodes.CONFLICT))
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json(ApiResponse.error(err.message, 'Lỗi máy chủ', StatusCodes.INTERNAL_SERVER_ERROR))
      }
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id)
      if (isNaN(id)) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(ApiResponse.error('Id không hợp lệ', 'Yêu cầu không hợp lệ', StatusCodes.BAD_REQUEST))
      }

      // Support multipart/form-data with avatar file
      const data = { ...(req.body || {}) }

      // Normalize boolean and array-like fields
      if (typeof data.active === 'string') {
        if (data.active.toLowerCase() === 'true') data.active = true
        else if (data.active.toLowerCase() === 'false') data.active = false
      }
      try {
        if (typeof data.roleKeys === 'string') data.roleKeys = JSON.parse(data.roleKeys)
      } catch (e) {}
      try {
        if (typeof data.permissionKeys === 'string') data.permissionKeys = JSON.parse(data.permissionKeys)
      } catch (e) {}
      if (data.roleKeys != null && !Array.isArray(data.roleKeys)) {
        if (typeof data.roleKeys === 'string' && data.roleKeys.includes(',')) {
          data.roleKeys = data.roleKeys
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        } else {
          data.roleKeys = [data.roleKeys]
        }
      }
      if (data.permissionKeys != null && !Array.isArray(data.permissionKeys)) {
        if (typeof data.permissionKeys === 'string' && data.permissionKeys.includes(',')) {
          data.permissionKeys = data.permissionKeys
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        } else {
          data.permissionKeys = [data.permissionKeys]
        }
      }

      if ((req as any).file) {
        data.avatarFile = { buffer: (req as any).file.buffer, originalname: (req as any).file.originalname }
      }
      const actorId = (req as any).user?.id
      const result = await this.userService.updateById(id, data, { actorId })
      res.status(StatusCodes.OK).json(ApiResponse.ok(result, 'Cập nhật người dùng thành công'))
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(StatusCodes.NOT_FOUND).json(ApiResponse.error(err.message, 'Không tìm thấy', StatusCodes.NOT_FOUND))
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json(ApiResponse.error(err.message, 'Lỗi máy chủ', StatusCodes.INTERNAL_SERVER_ERROR))
      }
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id)
      if (isNaN(id)) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(ApiResponse.error('Id không hợp lệ', 'Yêu cầu không hợp lệ', StatusCodes.BAD_REQUEST))
      }

      const actorId = (req as any).user?.id
      await this.userService.deleteById(id, false, { actorId })
      res.status(StatusCodes.OK).json(ApiResponse.ok(null, 'Xóa người dùng thành công'))
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(StatusCodes.NOT_FOUND).json(ApiResponse.error(err.message, 'Không tìm thấy', StatusCodes.NOT_FOUND))
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json(ApiResponse.error(err.message, 'Lỗi máy chủ', StatusCodes.INTERNAL_SERVER_ERROR))
      }
    }
  }

  async deleteMultiple(req: Request, res: Response) {
    try {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(
            ApiResponse.error('Danh sách ids không hợp lệ hoặc rỗng', 'Yêu cầu không hợp lệ', StatusCodes.BAD_REQUEST)
          )
      }

      const actorId = (req as any).user?.id
      console.log('actorId', actorId)
      // Gọi deleteMultiple: ở mức module user luôn hard-delete, truyền ids như where
      await this.userService.deleteMultiple(ids, undefined, { actorId })
      res.status(StatusCodes.OK).json(ApiResponse.ok(null, 'Xóa người dùng thành công'))
    } catch (err: any) {
      console.error(err)
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(err.message, 'Internal server error', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  async activeMultiple(req: Request, res: Response) {
    try {
      const { ids, active } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(
            ApiResponse.error('Danh sách ids không hợp lệ hoặc rỗng', 'Yêu cầu không hợp lệ', StatusCodes.BAD_REQUEST)
          )
      }
      if (typeof active !== 'boolean') {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(ApiResponse.error('Trường active phải là boolean', 'Yêu cầu không hợp lệ', StatusCodes.BAD_REQUEST))
      }

      const actorId = (req as any).user?.id
      await this.userService.activeMultiple(ids, active, { actorId })
      res.status(StatusCodes.OK).json(ApiResponse.ok(null, 'Cập nhật người dùng thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(err.message, 'Lỗi máy chủ', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}

export default UserController
