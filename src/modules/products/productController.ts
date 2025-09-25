import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiResponse } from '../../bases/apiResponse'
import { ProductService } from './productService'
import { fileUploadService } from '../../services/fileUploadService'
import { AuthUtils } from '../../middlewares/authUtils'
import { SeoDto } from '../../services/seoService'

export class ProductController {
  constructor(private service: ProductService) {}

  private parseSeoMetaFromRequest(req: Request): SeoDto | undefined {
    const body: any = req.body || {}
    if (body.seoMeta && typeof body.seoMeta === 'object') return body.seoMeta as SeoDto
    if (body.seoMeta && typeof body.seoMeta === 'string') {
      try {
        const parsed = JSON.parse(body.seoMeta)
        if (parsed && typeof parsed === 'object') return parsed as SeoDto
      } catch {}
    }
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

  private parseArrayField(value: any): any[] | undefined {
    if (!value) return undefined
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : [value]
      } catch {
        return [value]
      }
    }
    return [value]
  }

  async getAll(req: Request, res: Response) {
    try {
      const { page, limit, keyword, active } = req.query
      const pageNum = parseInt(page as string) || 1
      const limitNum = parseInt(limit as string) || 20
      const act = typeof active !== 'undefined' ? active === 'true' : undefined

      const result = await this.service.getAll({ page: pageNum, limit: limitNum, keyword, active: act })
      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy danh sách sản phẩm thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi lấy sản phẩm', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const product = await this.service.getByIdWithRelations(parseInt(id))
      if (!product)
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Không tìm thấy sản phẩm', 'Không tìm thấy sản phẩm', StatusCodes.NOT_FOUND))
      res.status(StatusCodes.OK).send(ApiResponse.ok(product, 'Lấy sản phẩm thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi lấy sản phẩm', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  async getBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params
      const product = await this.service.findBySlug(slug)
      if (!product)
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Không tìm thấy sản phẩm', 'Không tìm thấy sản phẩm', StatusCodes.NOT_FOUND))
      res.status(StatusCodes.OK).send(ApiResponse.ok(product, 'Lấy sản phẩm thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi lấy sản phẩm', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  async create(req: Request, res: Response) {
    try {
      if (!AuthUtils.hasPermission(req, 'product.create')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền PRODUCT_CREATE', StatusCodes.FORBIDDEN))
      }

      const body: any = req.body || {}
      const {
        name,
        description,
        shortContent,
        content,
        price,
        coverage,
        term,
        targetLink,
        targetFile,
        details,
        icon,
        priority,
        isHighlighted,
        isFeatured,
        isSaleOnline,
        active,
        tags,
        isPromotion,
        promotionDetails,
        metaKeywords,
        note
      } = body

      if (!name)
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Tên sản phẩm là bắt buộc', 'Tên sản phẩm là bắt buộc', StatusCodes.BAD_REQUEST))

      // collect uploaded imgs files
      let imgsFilesInput: Array<{ buffer: Buffer; originalName: string }> | undefined
      if (req.files && (req.files as any).imgs) {
        const files = (req.files as any).imgs
        const arr = Array.isArray(files) ? files : [files]
        imgsFilesInput = arr.map((f: any) => ({ buffer: f.buffer, originalName: f.originalname }))
      }

      // collect uploaded icon file (single)
      let iconFileInput: { buffer: Buffer; originalName: string } | undefined
      if (req.files && (req.files as any).icon) {
        const iconArr = Array.isArray((req.files as any).icon) ? (req.files as any).icon : [(req.files as any).icon]
        const f = iconArr[0]
        if (f) iconFileInput = { buffer: f.buffer, originalName: f.originalname }
      }

      const processedSeo = this.parseSeoMetaFromRequest(req)

      const productData: any = {
        name,
        description,
        shortContent,
        content,
        price: price ? parseInt(price) : undefined,
        coverage,
        term,
        targetLink,
        targetFile,
        details,
        // icon will be handled as uploaded file when provided; keep original icon string when not uploading
        icon,
        priority: typeof priority !== 'undefined' ? parseInt(priority) : undefined,
        isHighlighted: typeof isHighlighted !== 'undefined' ? isHighlighted === 'true' : undefined,
        isFeatured: typeof isFeatured !== 'undefined' ? isFeatured === 'true' : undefined,
        isSaleOnline: typeof isSaleOnline !== 'undefined' ? isSaleOnline === 'true' : undefined,
        active: typeof active !== 'undefined' ? active === 'true' : undefined,
        tags: this.parseArrayField(tags),
        isPromotion: typeof isPromotion !== 'undefined' ? isPromotion === 'true' : undefined,
        promotionDetails,
        metaKeywords: this.parseArrayField(metaKeywords),
        note,
        seoMeta: processedSeo
      }

      if (imgsFilesInput) productData.imgsFiles = imgsFilesInput
      if (iconFileInput) productData.iconFile = iconFileInput

      // icon is required for create - enforce uploaded file present
      if (!iconFileInput) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(
            ApiResponse.error(
              'Icon là bắt buộc và phải là file ảnh',
              'Icon không được để trống',
              StatusCodes.BAD_REQUEST
            )
          )
      }

      const audit = AuthUtils.getAuditContext(req)
      if (!audit.createdBy)
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('Người dùng chưa xác thực', 'Cần đăng nhập', StatusCodes.UNAUTHORIZED))

      const product = await this.service.create(productData, { actorId: audit.createdBy })
      res.status(StatusCodes.CREATED).send(ApiResponse.ok(product, 'Tạo sản phẩm thành công'))
    } catch (err: any) {
      console.error('Error creating product:', err)
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi tạo sản phẩm', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  async update(req: Request, res: Response) {
    try {
      if (!AuthUtils.hasPermission(req, 'product.update')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền PRODUCT_UPDATE', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const body: any = req.body || {}

      const processedSeo = this.parseSeoMetaFromRequest(req)

      // collect imgs files
      let imgsFilesInput: Array<{ buffer: Buffer; originalName: string }> | undefined
      if (req.files && (req.files as any).imgs) {
        const files = (req.files as any).imgs
        const arr = Array.isArray(files) ? files : [files]
        imgsFilesInput = arr.map((f: any) => ({ buffer: f.buffer, originalName: f.originalname }))
      }

      // collect uploaded icon file (single)
      let iconFileInput: { buffer: Buffer; originalName: string } | undefined
      if (req.files && (req.files as any).icon) {
        const iconArr = Array.isArray((req.files as any).icon) ? (req.files as any).icon : [(req.files as any).icon]
        const f = iconArr[0]
        if (f) iconFileInput = { buffer: f.buffer, originalName: f.originalname }
      }

      const updateData: any = {}
      // SKU is generated server-side; clients should not send or update SKU
      if (body.name !== undefined) updateData.name = body.name
      if (body.description !== undefined) updateData.description = body.description
      if (body.shortContent !== undefined) updateData.shortContent = body.shortContent
      if (body.content !== undefined) updateData.content = body.content
      if (body.price !== undefined) updateData.price = parseInt(body.price)
      if (body.coverage !== undefined) updateData.coverage = body.coverage
      if (body.details !== undefined) updateData.details = body.details
      // icon must be updated via uploaded file only. If client provided icon in body without file, reject.
      if (body.icon !== undefined && !iconFileInput) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(
            ApiResponse.error(
              'Cập nhật icon phải gửi kèm file ảnh',
              'Icon phải được cập nhật thông qua file upload',
              StatusCodes.BAD_REQUEST
            )
          )
      }
      if (body.priority !== undefined) updateData.priority = parseInt(body.priority)
      if (body.isHighlighted !== undefined) updateData.isHighlighted = body.isHighlighted === 'true'
      if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured === 'true'
      if (body.term !== undefined) updateData.term = body.term
      if (body.targetLink !== undefined) updateData.targetLink = body.targetLink
      if (body.targetFile !== undefined) updateData.targetFile = body.targetFile
      if (body.isSaleOnline !== undefined) updateData.isSaleOnline = body.isSaleOnline === 'true'
      if (body.active !== undefined) updateData.active = body.active === 'true'
      if (body.tags !== undefined) updateData.tags = this.parseArrayField(body.tags)
      if (body.isPromotion !== undefined) updateData.isPromotion = body.isPromotion === 'true'
      if (body.promotionDetails !== undefined) updateData.promotionDetails = body.promotionDetails
      if (body.metaKeywords !== undefined) updateData.metaKeywords = this.parseArrayField(body.metaKeywords)
      if (body.note !== undefined) updateData.note = body.note
      if (imgsFilesInput) updateData.imgsFiles = imgsFilesInput
      if (iconFileInput) updateData.iconFile = iconFileInput
      if (processedSeo !== undefined) updateData.seoMeta = processedSeo

      const audit = AuthUtils.getAuditContext(req)
      const product = await this.service.update(parseInt(id), updateData, { actorId: audit.updatedBy })
      res.status(StatusCodes.OK).send(ApiResponse.ok(product, 'Cập nhật sản phẩm thành công'))
    } catch (err: any) {
      console.error('Error updating product:', err)
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi cập nhật sản phẩm', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  async delete(req: Request, res: Response) {
    try {
      if (!AuthUtils.hasPermission(req, 'product.delete')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền PRODUCT_DELETE', StatusCodes.FORBIDDEN))
      }
      const { id } = req.params
      await this.service.deleteById(parseInt(id))
      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Xóa sản phẩm thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi xóa sản phẩm', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/products/batch/delete
  async batchDelete(req: Request, res: Response) {
    try {
      if (!AuthUtils.hasPermission(req, 'product.delete')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền PRODUCT_DELETE', StatusCodes.FORBIDDEN))
      }

      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Thiếu dữ liệu', 'Danh sách ID là bắt buộc', StatusCodes.BAD_REQUEST))
      }

      await this.service.deleteMultiple(ids)
      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Xóa nhiều sản phẩm thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi xóa nhiều sản phẩm', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/products/batch/activate
  async batchActivate(req: Request, res: Response) {
    try {
      if (!AuthUtils.hasPermission(req, 'product.update')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền PRODUCT_UPDATE', StatusCodes.FORBIDDEN))
      }

      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Thiếu dữ liệu', 'Danh sách ID là bắt buộc', StatusCodes.BAD_REQUEST))
      }

      const audit = AuthUtils.getAuditContext(req)
      await this.service.activeMultiple(ids, true, { actorId: audit.updatedBy })
      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Kích hoạt nhiều sản phẩm thành công'))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi kích hoạt nhiều sản phẩm', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/products/batch/active
  async batchActive(req: Request, res: Response) {
    try {
      if (!AuthUtils.hasPermission(req, 'product.update')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền PRODUCT_UPDATE', StatusCodes.FORBIDDEN))
      }

      const { ids, active } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Thiếu dữ liệu', 'Danh sách ID là bắt buộc', StatusCodes.BAD_REQUEST))
      }

      if (typeof active !== 'boolean') {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Giá trị active không hợp lệ', 'Active phải là boolean', StatusCodes.BAD_REQUEST))
      }

      const audit = AuthUtils.getAuditContext(req)
      const result = await this.service.activeMultiple(
        ids.map((id: any) => parseInt(id)),
        active,
        {
          actorId: audit.updatedBy
        }
      )

      res
        .status(StatusCodes.OK)
        .send(ApiResponse.ok(result, `${(result && (result as any).count) || 0} sản phẩm đã được cập nhật thành công`))
    } catch (err: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message, 'Lỗi cập nhật trạng thái sản phẩm', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
