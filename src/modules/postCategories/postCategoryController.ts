import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiResponse } from '../../bases/apiResponse'
import { PostCategoryService } from './postCategoryService'
import { AuthUtils } from '../../middlewares/authUtils'
import { SeoDto } from '../../services/seoService'

export class PostCategoryController {
  constructor(private service: PostCategoryService) {}

  // Helper: parse SEO DTO from JSON body. We no longer accept file uploads for SEO here.
  private parseSeoMetaFromRequest(req: Request): SeoDto | undefined {
    const body: any = req.body || {}

    // Prefer grouped `seoMeta` object from client
    if (body.seoMeta && typeof body.seoMeta === 'object') {
      return body.seoMeta as SeoDto
    }

    // Fallback to legacy flat fields for backward compatibility
    const { seoTitle, metaDescription, canonicalUrl, focusKeyword, ogType, noindex, nofollow } = body as any
    const hasSeoFields =
      seoTitle ||
      metaDescription ||
      canonicalUrl ||
      focusKeyword ||
      ogType ||
      typeof noindex !== 'undefined' ||
      typeof nofollow !== 'undefined'
    if (!hasSeoFields) return undefined

    const processed: any = {}
    if (seoTitle) processed.seoTitle = seoTitle
    if (metaDescription) processed.metaDescription = metaDescription
    if (canonicalUrl) processed.canonicalUrl = canonicalUrl
    if (focusKeyword) processed.focusKeyword = focusKeyword
    if (ogType) processed.ogType = ogType
    if (typeof noindex !== 'undefined') processed.noindex = typeof noindex === 'string' ? noindex === 'true' : !!noindex
    if (typeof nofollow !== 'undefined')
      processed.nofollow = typeof nofollow === 'string' ? nofollow === 'true' : !!nofollow

    return processed as SeoDto
  }

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

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy danh sách chuyên mục thành công'))
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
      res.status(StatusCodes.OK).send(ApiResponse.ok(tree, 'Lấy cây chuyên mục thành công'))
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
      res.status(StatusCodes.OK).send(ApiResponse.ok(roots, 'Lấy chuyên mục gốc thành công'))
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
      const category = await this.service.findByIdWithSeo(parseInt(id))

      if (!category) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Không tìm thấy chuyên mục', 'Không tìm thấy chuyên mục', StatusCodes.NOT_FOUND))
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(category, 'Lấy chuyên mục thành công'))
    } catch (error: any) {
      console.error(error)
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
          .send(ApiResponse.error('Không tìm thấy chuyên mục', 'Không tìm thấy chuyên mục', StatusCodes.NOT_FOUND))
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(category, 'Lấy chuyên mục với SEO thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to get category with SEO', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/post-categories - Tạo category mới với SEO support
  async create(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post_category.create')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền POST_CATEGORY_CREATE', StatusCodes.FORBIDDEN))
      }

      // req.body may be undefined when multipart/form-data is used without multer
      const body: any = req.body || {}
      const { name, slug, description, parentId, order } = body

      // Validate required fields - slug is generated by service, so only require name here
      if (!name) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Thiếu dữ liệu bắt buộc', 'Tên là bắt buộc', StatusCodes.BAD_REQUEST))
      }

      // Get user ID from auth context
      const auditContext = AuthUtils.getAuditContext(req)
      if (!auditContext.createdBy) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('Người dùng chưa xác thực', 'Cần đăng nhập', StatusCodes.UNAUTHORIZED))
      }

      // Use helper to parse SEO payload from multipart/form-data
      const processedSeoMeta = this.parseSeoMetaFromRequest(req)

      const category = await this.service.create(
        {
          name,
          // slug will be generated by the service from name when not provided
          slug,
          description,
          parentId: parentId ? parseInt(parentId) : undefined,
          order: typeof order !== 'undefined' ? parseInt(order) : undefined,
          seoMeta: processedSeoMeta
        },
        { actorId: auditContext.createdBy }
      )

      res.status(StatusCodes.CREATED).send(ApiResponse.ok(category, 'Tạo chuyên mục thành công', StatusCodes.CREATED))
    } catch (error: any) {
      console.log(error)
      if (error.message.includes('already exists')) {
        return res
          .status(StatusCodes.CONFLICT)
          .send(ApiResponse.error(error.message, 'Trùng dữ liệu', StatusCodes.CONFLICT))
      }
      if (error.message.includes('Invalid canonical URL')) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error(error.message, 'Dữ liệu không hợp lệ', StatusCodes.BAD_REQUEST))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Tạo chuyên mục thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // PUT /api/post-categories/:id - Cập nhật category với SEO support
  async update(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post_category.edit')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền POST_CATEGORY_EDIT', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const body: any = req.body || {}
      const { name, slug, description, parentId, active, order } = body

      const auditContext = AuthUtils.getAuditContext(req)
      if (!auditContext.updatedBy) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('Người dùng chưa xác thực', 'Cần đăng nhập', StatusCodes.UNAUTHORIZED))
      }

      const actorId = auditContext.updatedBy

      // Use helper to parse SEO payload from multipart/form-data
      const processedSeoMeta = this.parseSeoMetaFromRequest(req)

      const category = await this.service.updateById(
        parseInt(id),
        {
          name,
          slug,
          description,
          parentId: parentId ? parseInt(parentId) : undefined,
          active: typeof active === 'string' ? active === 'true' : active,
          order: typeof order !== 'undefined' ? parseInt(order) : undefined,
          seoMeta: processedSeoMeta
        },
        { actorId }
      )

      res.status(StatusCodes.OK).send(ApiResponse.ok(category, 'Cập nhật chuyên mục thành công'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error(error.message, 'Không tìm thấy', StatusCodes.NOT_FOUND))
      }
      if (
        error.message.includes('already exists') ||
        error.message.includes('circular') ||
        error.message.includes('descendant')
      ) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error(error.message, 'Lỗi xác thực dữ liệu', StatusCodes.BAD_REQUEST))
      }
      if (error.message.includes('Invalid canonical URL')) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error(error.message, 'Dữ liệu không hợp lệ', StatusCodes.BAD_REQUEST))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Cập nhật chuyên mục thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // DELETE /api/post-categories/:id - Xóa category (hard delete)
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params

      const actorId = (req as any).user?.id || 1

      // Service now performs hard delete by default and accepts ctx as second arg
      await this.service.deleteById(parseInt(id), { actorId })

      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Xóa chuyên mục thành công'))
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error(error.message, 'Không tìm thấy', StatusCodes.NOT_FOUND))
      }
      if (error.message.includes('Cannot delete')) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error(error.message, 'Lỗi xác thực dữ liệu', StatusCodes.BAD_REQUEST))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Xóa chuyên mục thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/post-categories/batch/delete - Xóa nhiều categories
  async batchDelete(req: Request, res: Response) {
    try {
      const { ids } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('ID không hợp lệ', 'IDs phải là mảng không rỗng', StatusCodes.BAD_REQUEST))
      }

      const actorId = (req as any).user?.id || 1

      const result = await this.service.deleteMultipleWithValidation(
        ids.map((id: any) => parseInt(id)),
        { actorId }
      )

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, `${result.count} chuyên mục đã được xóa thành công`))
    } catch (error: any) {
      if (
        error.message.includes('not found') ||
        error.message.includes('with posts') ||
        error.message.includes('with children')
      ) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error(error.message, 'Lỗi xác thực dữ liệu', StatusCodes.BAD_REQUEST))
      }

      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Xóa các chuyên mục thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/post-categories/batch/active - Active/inactive nhiều categories
  async batchActive(req: Request, res: Response) {
    try {
      const { ids, active } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('ID không hợp lệ', 'IDs phải là mảng không rỗng', StatusCodes.BAD_REQUEST))
      }

      if (typeof active !== 'boolean') {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Giá trị active không hợp lệ', 'Active phải là boolean', StatusCodes.BAD_REQUEST))
      }

      const actorId = (req as any).user?.id || 1

      const result = await this.service.activeMultiple(
        ids.map((id: any) => parseInt(id)),
        active,
        { actorId }
      )

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, `${result.count} chuyên mục đã được cập nhật thành công`))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Cập nhật chuyên mục thất bại', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
