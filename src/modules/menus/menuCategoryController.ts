import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiResponse } from '../../bases/apiResponse'
import { MenuCategoryService } from './menuCategoryService'

/**
 * Controller xử lý HTTP requests cho MenuCategory
 */
export class MenuCategoryController {
  constructor(private service: MenuCategoryService) {}

  /**
   * POST /api/menus/categories - Tạo menu category mới
   */
  async create(req: Request, res: Response) {
    try {
      const actorId = (req as any).user?.id || 1
      const result = await this.service.create(req.body, { actorId })

      res.status(StatusCodes.CREATED).send(ApiResponse.ok(result, 'Tạo menu category thành công', StatusCodes.CREATED))
    } catch (error: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(error.message, 'Tạo menu category thất bại', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * PUT /api/menus/categories/:id - Cập nhật menu category
   */
  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      const actorId = (req as any).user?.id || 1
      const result = await this.service.update(id, req.body, { actorId })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Cập nhật menu category thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(error.message, 'Cập nhật menu category thất bại', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * DELETE /api/menus/categories/:id - Xóa menu category (cascade xóa menu items)
   */
  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      const hard = req.query.hard === 'true'

      await this.service.delete(id, hard)

      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Xóa menu category thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(error.message, 'Xóa menu category thất bại', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * GET /api/menus/categories/:id - Lấy chi tiết một menu category
   */
  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      const result = await this.service.getById(id)

      if (!result) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Không tìm thấy', 'Menu category không tồn tại', StatusCodes.NOT_FOUND))
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy chi tiết menu category thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lấy menu category thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  /**
   * GET /api/menus/categories - Lấy danh sách menu categories (có thể kèm menu items)
   */
  async getAll(req: Request, res: Response) {
    try {
      const { active, includeItems, activeItemsOnly } = req.query

      // Parse active param: undefined (all), true, false
      let activeFilter: boolean | undefined = undefined
      if (active === 'true') {
        activeFilter = true
      } else if (active === 'false') {
        activeFilter = false
      }

      // Parse activeItemsOnly param: undefined (all), true, false
      let activeItemsOnlyFilter: boolean | undefined = undefined
      if (activeItemsOnly === 'true') {
        activeItemsOnlyFilter = true
      } else if (activeItemsOnly === 'false') {
        activeItemsOnlyFilter = false
      }

      const result = await this.service.getAllWithMenuItems({
        active: activeFilter,
        includeItems: includeItems !== 'false', // Default true
        activeItemsOnly: activeItemsOnlyFilter
      })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy danh sách menu categories thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(
          ApiResponse.error(error.message, 'Lấy danh sách menu categories thất bại', StatusCodes.INTERNAL_SERVER_ERROR)
        )
    }
  }

  /**
   * GET /api/menus/categories/:id/tree - Lấy menu category kèm tree structure
   */
  async getTreeById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      const activeOnly = req.query.activeOnly === 'true'

      const result = await this.service.getOneWithTree(id, activeOnly)

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy menu tree thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(error.message, 'Lấy menu tree thất bại', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * POST /api/menus/categories/batch-active - Batch active/inactive nhiều categories
   */
  async batchActive(req: Request, res: Response) {
    try {
      const { ids, active } = req.body
      const actorId = (req as any).user?.id || 1

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('ids phải là mảng không rỗng', 'Dữ liệu không hợp lệ', StatusCodes.BAD_REQUEST))
      }

      if (typeof active !== 'boolean') {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('active phải là boolean', 'Dữ liệu không hợp lệ', StatusCodes.BAD_REQUEST))
      }

      const result = await this.service.activeMultiple(ids, active, { actorId })

      res
        .status(StatusCodes.OK)
        .send(ApiResponse.ok(result, `${active ? 'Kích hoạt' : 'Vô hiệu hóa'} menu categories thành công`))
    } catch (error: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(error.message, 'Batch active thất bại', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * GET /api/menus/public/:key - API public lấy menu theo key (chỉ active)
   */
  async getPublicMenuByKey(req: Request, res: Response) {
    try {
      const key = req.params.key
      const result = await this.service.getPublicMenuByKey(key)

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy menu thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.NOT_FOUND)
        .send(ApiResponse.error(error.message, 'Không tìm thấy menu', StatusCodes.NOT_FOUND))
    }
  }

  /**
   * GET /api/menus/categories/:id/count-items - Đếm số menu items trong category
   */
  async countMenuItems(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      const count = await this.service.countMenuItems(id)

      res.status(StatusCodes.OK).send(ApiResponse.ok({ count }, 'Đếm menu items thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Đếm menu items thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
