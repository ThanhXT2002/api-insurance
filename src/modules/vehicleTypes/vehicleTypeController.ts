import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiResponse } from '../../bases/apiResponse'
import { VehicleTypeService } from './vehicleTypeService'
import { AuthUtils } from '../../middlewares/authUtils'
import { UsageType, UsagePurpose } from '../../../generated/prisma'

export class VehicleTypeController {
  constructor(private service: VehicleTypeService) {}

  /**
   * Lấy danh sách tất cả loại phương tiện
   */
  async getAll(req: Request, res: Response) {
    try {
      const { page, limit, keyword, active, usageType, usagePurpose } = req.query
      const pageNum = parseInt(page as string) || 1
      const limitNum = parseInt(limit as string) || 20
      const act = typeof active !== 'undefined' ? active === 'true' : undefined

      const params = {
        page: pageNum,
        limit: limitNum,
        keyword: keyword as string,
        active: act,
        usageType: usageType as UsageType,
        usagePurpose: usagePurpose as UsagePurpose
      }

      const result = await this.service.getAll(params)
      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy danh sách loại phương tiện thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi lấy danh sách loại phương tiện', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  /**
   * Lấy loại phương tiện theo ID
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const vehicleType = await this.service.getById(parseInt(id))

      if (!vehicleType) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(
            ApiResponse.error(
              'Không tìm thấy loại phương tiện',
              'Không tìm thấy loại phương tiện',
              StatusCodes.NOT_FOUND
            )
          )
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(vehicleType, 'Lấy loại phương tiện thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi lấy loại phương tiện', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  /**
   * Lấy loại phương tiện theo mã code
   */
  async getByCode(req: Request, res: Response) {
    try {
      const { code } = req.params
      const vehicleType = await this.service.findByCode(code)

      if (!vehicleType) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(
            ApiResponse.error(
              'Không tìm thấy loại phương tiện',
              'Không tìm thấy loại phương tiện',
              StatusCodes.NOT_FOUND
            )
          )
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(vehicleType, 'Lấy loại phương tiện thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi lấy loại phương tiện', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  /**
   * Lấy danh sách loại phương tiện theo loại sử dụng (chỉ active = true)
   */
  async getByUsageType(req: Request, res: Response) {
    try {
      const { usageType } = req.params

      // Mặc định chỉ lấy các loại phương tiện đang hoạt động
      const vehicleTypes = await this.service.findByUsageType(usageType as UsageType, true)
      res.status(StatusCodes.OK).send(ApiResponse.ok(vehicleTypes, 'Lấy danh sách loại phương tiện thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi lấy danh sách loại phương tiện', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  /**
   * Lấy danh sách loại phương tiện theo mục đích sử dụng (chỉ active = true)
   */
  async getByUsagePurpose(req: Request, res: Response) {
    try {
      const { usagePurpose } = req.params

      // Mặc định chỉ lấy các loại phương tiện đang hoạt động
      const vehicleTypes = await this.service.findByUsagePurpose(usagePurpose as UsagePurpose, true)
      res.status(StatusCodes.OK).send(ApiResponse.ok(vehicleTypes, 'Lấy danh sách loại phương tiện thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi lấy danh sách loại phương tiện', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  /**
   * Lấy thống kê loại phương tiện
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const statistics = await this.service.getStatistics()
      res.status(StatusCodes.OK).send(ApiResponse.ok(statistics, 'Lấy thống kê thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi lấy thống kê', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  /**
   * Tạo mới loại phương tiện
   */
  async create(req: Request, res: Response) {
    try {
      const actorId = (req as any).user?.id || 1
      const vehicleTypeData = req.body

      const result = await this.service.create(vehicleTypeData, { actorId })
      res
        .status(StatusCodes.CREATED)
        .send(ApiResponse.ok(result, 'Tạo loại phương tiện thành công', StatusCodes.CREATED))
    } catch (err: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(err.message, 'Lỗi tạo loại phương tiện', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * Cập nhật loại phương tiện
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const actorId = (req as any).user?.id || 1
      const updateData = req.body

      const result = await this.service.update({ id: parseInt(id) }, updateData, { actorId })
      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Cập nhật loại phương tiện thành công'))
    } catch (err: any) {
      if (err.message === 'Không tìm thấy loại phương tiện') {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error(err.message, 'Không tìm thấy loại phương tiện', StatusCodes.NOT_FOUND))
      }
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(err.message, 'Lỗi cập nhật loại phương tiện', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * Xóa mềm loại phương tiện (soft delete)
   */
  async softDelete(req: Request, res: Response) {
    try {
      const { id } = req.params
      const actorId = (req as any).user?.id || 1

      await this.service.update({ id: parseInt(id) }, { active: false }, { actorId })
      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Vô hiệu hóa loại phương tiện thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi vô hiệu hóa loại phương tiện', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  /**
   * Xóa cứng loại phương tiện (hard delete)
   */
  async hardDelete(req: Request, res: Response) {
    try {
      const { id } = req.params

      await this.service.delete({ id: parseInt(id) })
      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Xóa loại phương tiện thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi xóa loại phương tiện', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  /**
   * Kích hoạt/vô hiệu hóa nhiều loại phương tiện
   */
  async toggleMultiple(req: Request, res: Response) {
    try {
      const { ids, active } = req.body
      const actorId = (req as any).user?.id || 1

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Danh sách ID không hợp lệ', 'Danh sách ID không hợp lệ', StatusCodes.BAD_REQUEST))
      }

      if (typeof active !== 'boolean') {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(
            ApiResponse.error(
              'Trạng thái active không hợp lệ',
              'Trạng thái active không hợp lệ',
              StatusCodes.BAD_REQUEST
            )
          )
      }

      await this.service.toggleMultiple(ids, active, { actorId })
      const message = active ? 'Kích hoạt loại phương tiện thành công' : 'Vô hiệu hóa loại phương tiện thành công'
      res.status(StatusCodes.OK).send(ApiResponse.ok(null, message))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(
          ApiResponse.error(err.message, 'Lỗi cập nhật trạng thái loại phương tiện', StatusCodes.INTERNAL_SERVER_ERROR)
        )
    }
  }

  /**
   * Xóa nhiều loại phương tiện (batch delete)
   */
  async deleteMultiple(req: Request, res: Response) {
    try {
      const { ids, hard } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Danh sách ID không hợp lệ', 'Danh sách ID không hợp lệ', StatusCodes.BAD_REQUEST))
      }

      if (hard) {
        // Hard delete - xóa vĩnh viễn
        await this.service.deleteMultiple({ id: { in: ids } })
      } else {
        // Soft delete - set active = false
        const actorId = (req as any).user?.id || 1
        await this.service.activeMultiple({ id: { in: ids } }, false, { actorId })
      }

      const message = hard ? 'Xóa loại phương tiện thành công' : 'Vô hiệu hóa loại phương tiện thành công'
      res.status(StatusCodes.OK).send(ApiResponse.ok(null, message))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi xóa loại phương tiện', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
