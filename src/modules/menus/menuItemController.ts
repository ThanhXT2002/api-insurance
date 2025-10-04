import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiResponse } from '../../bases/apiResponse'
import { MenuItemService } from './menuItemService'

/**
 * Controller xử lý HTTP requests cho MenuItem
 */
export class MenuItemController {
  constructor(private service: MenuItemService) {}

  /**
   * POST /api/menus/items - Tạo menu item mới
   */
  async create(req: Request, res: Response) {
    try {
      const actorId = (req as any).user?.id || 1
      const result = await this.service.create(req.body, { actorId })

      res.status(StatusCodes.CREATED).send(ApiResponse.ok(result, 'Tạo menu item thành công', StatusCodes.CREATED))
    } catch (error: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(error.message, 'Tạo menu item thất bại', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * PUT /api/menus/items/:id - Cập nhật menu item
   */
  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      const actorId = (req as any).user?.id || 1
      const result = await this.service.update(id, req.body, { actorId })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Cập nhật menu item thành công'))
    } catch (error: any) {
      console.log('Error updating menu item:', error)
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(error.message, 'Cập nhật menu item thất bại', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * DELETE /api/menus/items/:id - Xóa menu item (cascade children)
   */
  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      const hard = req.query.hard === 'true'

      await this.service.delete(id, hard)

      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Xóa menu item thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(error.message, 'Xóa menu item thất bại', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * GET /api/menus/items/:id - Lấy chi tiết menu item
   */
  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      const result = await this.service.getById(id)

      if (!result) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Không tìm thấy', 'Menu item không tồn tại', StatusCodes.NOT_FOUND))
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy chi tiết menu item thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lấy menu item thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  /**
   * GET /api/menus/items/category/:categoryId - Lấy menu items theo category (tree)
   */
  async getByCategory(req: Request, res: Response) {
    try {
      const categoryId = parseInt(req.params.categoryId)
      const { active, includeChildren } = req.query

      // Parse active: 'true' -> true, 'false' -> false, undefined -> undefined
      const activeFilter = active === 'true' ? true : active === 'false' ? false : undefined

      const result = await this.service.getItemsByCategoryId(categoryId, {
        active: activeFilter,
        includeChildren: includeChildren !== 'false' // Default true
      })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy menu items thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lấy menu items thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  /**
   * POST /api/menus/items/batch-active - Batch active/inactive menu items
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
        .send(ApiResponse.ok(result, `${active ? 'Kích hoạt' : 'Vô hiệu hóa'} menu items thành công`))
    } catch (error: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(error.message, 'Batch active thất bại', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * POST /api/menus/items/reorder - Reorder menu items (drag-drop)
   */
  async reorder(req: Request, res: Response) {
    try {
      const { updates } = req.body // Array of { id, order, parentId }
      const actorId = (req as any).user?.id || 1

      if (!Array.isArray(updates) || updates.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('updates phải là mảng không rỗng', 'Dữ liệu không hợp lệ', StatusCodes.BAD_REQUEST))
      }

      const result = await this.service.reorderItems(updates, { actorId })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Reorder menu items thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(error.message, 'Reorder menu items thất bại', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * POST /api/menus/items/batch-update-order - Batch update order
   */
  async batchUpdateOrder(req: Request, res: Response) {
    try {
      const { items } = req.body // Array of { id, order }
      const actorId = (req as any).user?.id || 1

      if (!Array.isArray(items) || items.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('items phải là mảng không rỗng', 'Dữ liệu không hợp lệ', StatusCodes.BAD_REQUEST))
      }

      const result = await this.service.batchUpdateOrder(items, { actorId })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Cập nhật order thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(error.message, 'Cập nhật order thất bại', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * POST /api/menus/items/:id/move - Di chuyển menu item sang parent khác
   */
  async moveItem(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      const { parentId, order } = req.body
      const actorId = (req as any).user?.id || 1

      const result = await this.service.moveItem(id, parentId || null, order, { actorId })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Di chuyển menu item thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(error.message, 'Di chuyển menu item thất bại', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * POST /api/menus/items/:id/duplicate - Duplicate (copy) menu item
   */
  async duplicate(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      const actorId = (req as any).user?.id || 1

      const result = await this.service.duplicateItem(id, { actorId })

      res
        .status(StatusCodes.CREATED)
        .send(ApiResponse.ok(result, 'Duplicate menu item thành công', StatusCodes.CREATED))
    } catch (error: any) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error(error.message, 'Duplicate menu item thất bại', StatusCodes.BAD_REQUEST))
    }
  }

  /**
   * GET /api/menus/items/:id/children - Lấy tất cả children của menu item
   */
  async getChildren(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      // Parse activeOnly: 'true' -> true, 'false' -> false, undefined/missing -> undefined
      const activeOnly = req.query.activeOnly === 'true' ? true : req.query.activeOnly === 'false' ? false : undefined

      const result = await this.service.getChildren(id, activeOnly)

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy children thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lấy children thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  /**
   * GET /api/menus/items/:id/count-children - Đếm số children
   */
  async countChildren(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id)
      const count = await this.service.countChildren(id)

      res.status(StatusCodes.OK).send(ApiResponse.ok({ count }, 'Đếm children thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Đếm children thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
