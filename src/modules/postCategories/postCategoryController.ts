import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiResponse } from '../../bases/apiResponse'
import { PostCategoryService } from './postCategoryService'
import { AuthUtils } from '../../middlewares/authUtils'

export class PostCategoryController {
  constructor(private service: PostCategoryService) {}

  // GET /api/post-categories - Lấy danh sách categories (có pagination, search)
  async getAll(req: Request, res: Response) {
    try {
      const { page, limit, keyword, active, parentId } = req.query
      const filters: any = {}

      if (typeof active === 'string') filters.active = active === 'true'
      if (parentId) filters.parentId = parseInt(parentId as string)

      const result = await this.service.getAll({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
        keyword: keyword as string,
        filters
      })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Categories retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to get categories', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/post-categories/tree - Lấy tree hierarchy
  async getTree(req: Request, res: Response) {
    try {
      const tree = await this.service.getTree()
      res.status(StatusCodes.OK).send(ApiResponse.ok(tree, 'Category tree retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to get category tree', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/post-categories/roots - Lấy root categories
  async getRoots(req: Request, res: Response) {
    try {
      const roots = await this.service.getRoots()
      res.status(StatusCodes.OK).send(ApiResponse.ok(roots, 'Root categories retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to get root categories', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/post-categories/:id - Lấy category theo ID
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const category = await this.service.getById(parseInt(id), {
        include: {
          children: true,
          parent: true,
          posts: { select: { id: true, title: true, slug: true } }
        }
      })

      if (!category) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Category not found', 'Category not found', StatusCodes.NOT_FOUND))
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(category, 'Category retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to get category', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/post-categories/slug/:slug - Lấy category theo slug
  async getBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params
      const category = await this.service.findBySlug(slug)

      if (!category) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Category not found', 'Category not found', StatusCodes.NOT_FOUND))
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(category, 'Category retrieved successfully'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to get category', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/post-categories - Tạo category mới
  async create(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post_category.create')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(
            ApiResponse.error(
              'Insufficient permissions',
              'POST_CATEGORY_CREATE permission required',
              StatusCodes.FORBIDDEN
            )
          )
      }

      const { name, slug, description, parentId } = req.body

      // Validate required fields
      if (!name || !slug) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Missing required fields', 'Name and slug are required', StatusCodes.BAD_REQUEST))
      }

      // Get user ID from auth context
      const auditContext = AuthUtils.getAuditContext(req)
      if (!auditContext.createdBy) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('User not authenticated', 'Authentication required', StatusCodes.UNAUTHORIZED))
      }

      const category = await this.service.create(
        {
          name,
          slug,
          description,
          parentId: parentId ? parseInt(parentId) : undefined
        },
        { actorId: auditContext.createdBy }
      )

      res
        .status(StatusCodes.CREATED)
        .send(ApiResponse.ok(category, 'Category created successfully', StatusCodes.CREATED))
    } catch (error: any) {
      console.log(error)
      if (error.message.includes('already exists')) {
        return res.status(StatusCodes.CONFLICT).send(ApiResponse.error(error.message, 'Conflict', StatusCodes.CONFLICT))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to create category', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // PUT /api/post-categories/:id - Cập nhật category
  async update(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post_category.edit')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(
            ApiResponse.error(
              'Insufficient permissions',
              'POST_CATEGORY_EDIT permission required',
              StatusCodes.FORBIDDEN
            )
          )
      }

      const { id } = req.params
      const { name, slug, description, parentId, active } = req.body

      const auditContext = AuthUtils.getAuditContext(req)
      if (!auditContext.updatedBy) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('User not authenticated', 'Authentication required', StatusCodes.UNAUTHORIZED))
      }

      const actorId = auditContext.updatedBy

      const category = await this.service.updateById(
        parseInt(id),
        {
          name,
          slug,
          description,
          parentId: parentId ? parseInt(parentId) : undefined,
          active
        },
        { actorId }
      )

      res.status(StatusCodes.OK).send(ApiResponse.ok(category, 'Category updated successfully'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error(error.message, 'Not found', StatusCodes.NOT_FOUND))
      }
      if (
        error.message.includes('already exists') ||
        error.message.includes('circular') ||
        error.message.includes('descendant')
      ) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error(error.message, 'Validation error', StatusCodes.BAD_REQUEST))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to update category', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // DELETE /api/post-categories/:id - Xóa category (soft delete)
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { force } = req.query

      const actorId = (req as any).user?.id || 1

      await this.service.deleteById(parseInt(id), force === 'true', { actorId })

      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Category deleted successfully'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error(error.message, 'Not found', StatusCodes.NOT_FOUND))
      }
      if (error.message.includes('Cannot delete')) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error(error.message, 'Validation error', StatusCodes.BAD_REQUEST))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to delete category', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/post-categories/batch/delete - Xóa nhiều categories
  async batchDelete(req: Request, res: Response) {
    try {
      const { ids, force } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Invalid IDs', 'IDs must be a non-empty array', StatusCodes.BAD_REQUEST))
      }

      const actorId = (req as any).user?.id || 1

      const result = await this.service.deleteMultipleWithValidation(
        ids.map((id: any) => parseInt(id)),
        force === true,
        { actorId }
      )

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, `${result.count} categories deleted successfully`))
    } catch (error: any) {
      if (
        error.message.includes('not found') ||
        error.message.includes('with posts') ||
        error.message.includes('with children')
      ) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error(error.message, 'Validation error', StatusCodes.BAD_REQUEST))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to delete categories', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/post-categories/batch/active - Active/inactive nhiều categories
  async batchActive(req: Request, res: Response) {
    try {
      const { ids, active } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Invalid IDs', 'IDs must be a non-empty array', StatusCodes.BAD_REQUEST))
      }

      if (typeof active !== 'boolean') {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Invalid active value', 'Active must be boolean', StatusCodes.BAD_REQUEST))
      }

      const actorId = (req as any).user?.id || 1

      const result = await this.service.activeMultiple(
        ids.map((id: any) => parseInt(id)),
        active,
        { actorId }
      )

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, `${result.count} categories updated successfully`))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to update categories', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
