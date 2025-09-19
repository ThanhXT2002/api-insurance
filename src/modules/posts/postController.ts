import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiResponse } from '../../bases/apiResponse'
import { PostService } from './postService'
import { fileUploadService } from '../../services/fileUploadService'
import { AuthUtils } from '../../middlewares/authUtils'
import { SeoDto } from '../../services/seoService'
import { PostStatus, PostType } from '../../../generated/prisma'

export class PostController {
  constructor(private service: PostService) {}

  // Helper: parse SEO DTO from JSON body
  private parseSeoMetaFromRequest(req: Request): SeoDto | undefined {
    const body: any = req.body || {}

    // Prefer grouped `seoMeta` object from client
    if (body.seoMeta && typeof body.seoMeta === 'object') {
      return body.seoMeta as SeoDto
    }

    // If client sent seoMeta as a JSON string (common with multipart/form-data), try to parse it
    if (body.seoMeta && typeof body.seoMeta === 'string') {
      try {
        const parsed = JSON.parse(body.seoMeta)
        if (parsed && typeof parsed === 'object') return parsed as SeoDto
      } catch (e) {
        // If parse fails, ignore and fallback to flat fields
      }
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

  // Helper: parse array fields from form data
  private parseArrayField(value: any): string[] | number[] | undefined {
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

  // GET /api/posts - Lấy danh sách posts (có pagination, search, filters)
  async getAll(req: Request, res: Response) {
    try {
      const { page, limit, keyword, status, categoryId, postType, isFeatured, isHighlighted } = req.query
      const filters: any = {}

      // Parse filters
      if (status) filters.status = status
      if (categoryId) filters.categoryId = categoryId
      if (postType) filters.postType = postType
      if (typeof isFeatured !== 'undefined') filters.isFeatured = isFeatured === 'true'
      if (typeof isHighlighted !== 'undefined') filters.isHighlighted = isHighlighted === 'true'

      const pageNum = parseInt(page as string) || 1
      const limitNum = parseInt(limit as string) || 10

      const result = await this.service.getAll({
        page: pageNum,
        limit: limitNum,
        keyword,
        ...filters
      })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy danh sách bài viết thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi lấy bài viết', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/posts/published - Lấy danh sách posts đã publish (public endpoint)
  async getPublished(req: Request, res: Response) {
    try {
      const { page, limit, categoryId, postType } = req.query

      const pageNum = parseInt(page as string) || 1
      const limitNum = parseInt(limit as string) || 10

      const result = await this.service.getPublished({
        page: pageNum,
        limit: limitNum,
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        postType: postType as PostType
      })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy danh sách bài viết đã xuất bản thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi lấy bài viết đã xuất bản', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/posts/featured - Lấy posts nổi bật
  async getFeatured(req: Request, res: Response) {
    try {
      const { limit, isFeatured, isHighlighted } = req.query

      const result = await this.service.getFeatured({
        limit: limit ? parseInt(limit as string) : undefined,
        isFeatured: typeof isFeatured !== 'undefined' ? isFeatured === 'true' : undefined,
        isHighlighted: typeof isHighlighted !== 'undefined' ? isHighlighted === 'true' : undefined
      })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy danh sách bài viết nổi bật thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi lấy bài viết nổi bật', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/posts/statistics - Lấy thống kê posts
  async getStatistics(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post.view')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền POST_VIEW', StatusCodes.FORBIDDEN))
      }

      const result = await this.service.getStatistics()

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy thống kê bài viết thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi lấy thống kê bài viết', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/posts/:id - Lấy post theo ID
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      // Use service.getByIdWithRelations to return the same transformed shape as getBySlug
      const post = await this.service.getByIdWithRelations(parseInt(id))

      if (!post) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Không tìm thấy bài viết', 'Không tìm thấy bài viết', StatusCodes.NOT_FOUND))
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(post, 'Lấy bài viết thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi lấy bài viết', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/posts/slug/:slug - Lấy post theo slug (public endpoint)
  async getBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params
      const post = await this.service.findBySlug(slug)

      if (!post) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Không tìm thấy bài viết', 'Không tìm thấy bài viết', StatusCodes.NOT_FOUND))
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(post, 'Lấy bài viết với SEO thành công'))
    } catch (error: any) {
      console.error('Error fetching post by slug:', error)
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi lấy bài viết với SEO', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/posts/:id/related - Lấy posts liên quan
  async getRelated(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { limit, categoryId, postType } = req.query

      const result = await this.service.getRelated(parseInt(id), {
        limit: limit ? parseInt(limit as string) : undefined,
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        postType: postType as PostType
      })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lấy danh sách bài viết liên quan thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi lấy bài viết liên quan', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/posts - Tạo post mới với SEO support và file upload
  async create(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post.create')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền POST_CREATE', StatusCodes.FORBIDDEN))
      }

      const body: any = req.body || {}
      const {
        title,
        excerpt,
        shortContent,
        content,
        status,
        videoUrl,
        note,
        priority,
        isHighlighted,
        isFeatured,
        scheduledAt,
        expiredAt,
        categoryId,
        postType,
        albumImages,
        targetAudience,
        relatedProductIds,
        metaKeywords,
        taggedCategoryIds
      } = body

      // Validate required fields
      if (!title || !content) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Thiếu dữ liệu bắt buộc', 'Tiêu đề và nội dung là bắt buộc', StatusCodes.BAD_REQUEST))
      }

      // Get user ID from auth context
      const auditContext = AuthUtils.getAuditContext(req)
      if (!auditContext.createdBy) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('Người dùng chưa xác thực', 'Cần đăng nhập', StatusCodes.UNAUTHORIZED))
      }

      // Collect uploaded file buffers (do NOT perform uploads here) - service will handle uploading and rollback
      let featuredFileInput: { buffer: Buffer; originalName: string } | undefined
      if (req.files && (req.files as any).featuredImage) {
        const file = (req.files as any).featuredImage[0]
        featuredFileInput = { buffer: file.buffer, originalName: file.originalname }
      }

      // Collect album files to pass to service (service will call uploadMultipleFiles)
      let albumFilesInput: Array<{ buffer: Buffer; originalName: string }> | undefined
      if (req.files && (req.files as any).albumImages) {
        const albumFiles = (req.files as any).albumImages
        const filesArray = Array.isArray(albumFiles) ? albumFiles : [albumFiles]
        albumFilesInput = filesArray.map((f: any) => ({ buffer: f.buffer, originalName: f.originalname }))
      }

      // Parse SEO metadata
      const processedSeoMeta = this.parseSeoMetaFromRequest(req)

      // Prepare post data
      // Validate and normalize postType to match Prisma enum values
      let parsedPostType: PostType = PostType.ARTICLE
      if (postType !== undefined && postType !== null) {
        const candidate = String(postType).toUpperCase()
        if ((Object.values(PostType) as string[]).includes(candidate)) {
          parsedPostType = candidate as PostType
        } else {
          return res
            .status(StatusCodes.BAD_REQUEST)
            .send(ApiResponse.error('postType không hợp lệ', 'Giá trị postType không hợp lệ', StatusCodes.BAD_REQUEST))
        }
      }

      const postData: any = {
        title,
        excerpt,
        shortContent,
        content,
        // featuredImage and albumImages will be created by service after uploading files
        status: status || PostStatus.DRAFT,
        videoUrl,
        note,
        priority: priority ? parseInt(priority) : 0,
        isHighlighted: isHighlighted === 'true',
        isFeatured: isFeatured === 'true',
        scheduledAt,
        expiredAt,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        postType: parsedPostType,
        albumImages: this.parseArrayField(albumImages),
        targetAudience: this.parseArrayField(targetAudience),
        relatedProductIds: this.parseArrayField(relatedProductIds)?.map((id: any) => parseInt(id)),
        metaKeywords: this.parseArrayField(metaKeywords),
        taggedCategoryIds: this.parseArrayField(taggedCategoryIds)?.map((id: any) => parseInt(id)),
        seoMeta: processedSeoMeta
      }

      // Attach raw file inputs so service can upload and register rollback
      if (featuredFileInput) postData.featuredFile = featuredFileInput
      if (albumFilesInput) postData.albumFiles = albumFilesInput

      const post = await this.service.create(postData, { actorId: auditContext.createdBy })

      res.status(StatusCodes.CREATED).send(ApiResponse.ok(post, 'Tạo bài viết thành công'))
    } catch (error: any) {
      console.error('Error creating post:', error)
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi tạo bài viết', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // PUT /api/posts/:id - Cập nhật post với SEO support
  async update(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post.update')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền POST_UPDATE', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const body: any = req.body || {}
      const {
        title,
        excerpt,
        shortContent,
        content,
        status,
        videoUrl,
        note,
        priority,
        isHighlighted,
        isFeatured,
        scheduledAt,
        expiredAt,
        categoryId,
        postType,
        albumImages,
        targetAudience,
        relatedProductIds,
        metaKeywords,
        taggedCategoryIds
      } = body

      // Get user ID from auth context
      const auditContext = AuthUtils.getAuditContext(req)

      // Handle file upload for featuredImage
      // Collect featured file input for service to upload
      let featuredFileInput: { buffer: Buffer; originalName: string } | undefined
      if (req.files && (req.files as any).featuredImage) {
        const file = (req.files as any).featuredImage[0]
        featuredFileInput = { buffer: file.buffer, originalName: file.originalname }
      }

      // Collect album files for service to upload
      let albumFilesInput: Array<{ buffer: Buffer; originalName: string }> | undefined
      if (req.files && (req.files as any).albumImages) {
        const albumFiles = (req.files as any).albumImages
        const filesArray = Array.isArray(albumFiles) ? albumFiles : [albumFiles]
        albumFilesInput = filesArray.map((f: any) => ({ buffer: f.buffer, originalName: f.originalname }))
      }

      // Parse SEO metadata
      const processedSeoMeta = this.parseSeoMetaFromRequest(req)

      // Prepare update data (only include provided fields)
      const updateData: any = {}

      if (title !== undefined) updateData.title = title
      if (excerpt !== undefined) updateData.excerpt = excerpt
      if (shortContent !== undefined) updateData.shortContent = shortContent
      if (content !== undefined) updateData.content = content
      if (featuredFileInput !== undefined) updateData.featuredFile = featuredFileInput
      if (status !== undefined) updateData.status = status
      if (videoUrl !== undefined) updateData.videoUrl = videoUrl
      if (note !== undefined) updateData.note = note
      if (priority !== undefined) updateData.priority = parseInt(priority)
      if (isHighlighted !== undefined) updateData.isHighlighted = isHighlighted === 'true'
      if (isFeatured !== undefined) updateData.isFeatured = isFeatured === 'true'
      if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt
      if (expiredAt !== undefined) updateData.expiredAt = expiredAt
      if (categoryId !== undefined) updateData.categoryId = categoryId ? parseInt(categoryId) : null
      if (postType !== undefined) {
        const candidate = String(postType).toUpperCase()
        if ((Object.values(PostType) as string[]).includes(candidate)) {
          updateData.postType = candidate as PostType
        } else {
          return res
            .status(StatusCodes.BAD_REQUEST)
            .send(ApiResponse.error('postType không hợp lệ', 'Giá trị postType không hợp lệ', StatusCodes.BAD_REQUEST))
        }
      }

      // Handle array fields
      if (albumFilesInput !== undefined) updateData.albumFiles = albumFilesInput
      else if (albumImages !== undefined) updateData.albumImages = this.parseArrayField(albumImages)

      if (targetAudience !== undefined) updateData.targetAudience = this.parseArrayField(targetAudience)
      if (relatedProductIds !== undefined)
        // normalize legacy input to `relatedProductIds` for the service
        updateData.relatedProductIds = this.parseArrayField(relatedProductIds)?.map((id: any) => parseInt(id))
      if (metaKeywords !== undefined) updateData.metaKeywords = this.parseArrayField(metaKeywords)
      if (taggedCategoryIds !== undefined)
        updateData.taggedCategoryIds = this.parseArrayField(taggedCategoryIds)?.map((id: any) => parseInt(id))
      if (processedSeoMeta !== undefined) updateData.seoMeta = processedSeoMeta

      const post = await this.service.update(parseInt(id), updateData, { actorId: auditContext.updatedBy })

      res.status(StatusCodes.OK).send(ApiResponse.ok(post, 'Cập nhật bài viết thành công'))
    } catch (error: any) {
      console.error('Error updating post:', error)
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi cập nhật bài viết', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // PUT /api/posts/:id/publish - Publish post
  async publish(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post.update')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền POST_UPDATE', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const auditContext = AuthUtils.getAuditContext(req)

      const post = await this.service.publish(parseInt(id), { actorId: auditContext.updatedBy })

      res.status(StatusCodes.OK).send(ApiResponse.ok(post, 'Xuất bản bài viết thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi xuất bản bài viết', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // PUT /api/posts/:id/unpublish - Unpublish post
  async unpublish(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post.update')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền POST_UPDATE', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const auditContext = AuthUtils.getAuditContext(req)

      const post = await this.service.unpublish(parseInt(id), { actorId: auditContext.updatedBy })

      res.status(StatusCodes.OK).send(ApiResponse.ok(post, 'Gỡ xuất bản bài viết thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi gỡ xuất bản bài viết', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // PUT /api/posts/:id/archive - Archive post
  async archive(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post.update')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền POST_UPDATE', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      const auditContext = AuthUtils.getAuditContext(req)

      const post = await this.service.archive(parseInt(id), { actorId: auditContext.updatedBy })

      res.status(StatusCodes.OK).send(ApiResponse.ok(post, 'Lưu trữ bài viết thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi lưu trữ bài viết', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/posts/batch/publish - Batch publish posts
  async batchPublish(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post.update')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền POST_UPDATE', StatusCodes.FORBIDDEN))
      }

      const { ids } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Thiếu dữ liệu', 'Danh sách ID là bắt buộc', StatusCodes.BAD_REQUEST))
      }

      const auditContext = AuthUtils.getAuditContext(req)
      const result = await this.service.publishMultiple(ids, { actorId: auditContext.updatedBy })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Xuất bản nhiều bài viết thành công'))
    } catch (error: any) {
      console.error('Error batch publishing posts:', error)
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi xuất bản nhiều bài viết', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/posts/batch/unpublish - Batch unpublish posts
  async batchUnpublish(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post.update')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền POST_UPDATE', StatusCodes.FORBIDDEN))
      }

      const { ids } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Thiếu dữ liệu', 'Danh sách ID là bắt buộc', StatusCodes.BAD_REQUEST))
      }

      const auditContext = AuthUtils.getAuditContext(req)
      const result = await this.service.unpublishMultiple(ids, { actorId: auditContext.updatedBy })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Gỡ xuất bản nhiều bài viết thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi gỡ xuất bản nhiều bài viết', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/posts/batch/archive - Batch archive posts
  async batchArchive(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post.update')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền POST_UPDATE', StatusCodes.FORBIDDEN))
      }

      const { ids } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Thiếu dữ liệu', 'Danh sách ID là bắt buộc', StatusCodes.BAD_REQUEST))
      }

      const auditContext = AuthUtils.getAuditContext(req)
      const result = await this.service.archiveMultiple(ids, { actorId: auditContext.updatedBy })

      res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Lưu trữ nhiều bài viết thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi lưu trữ nhiều bài viết', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // DELETE /api/posts/:id - Xóa post
  async delete(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post.delete')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền POST_DELETE', StatusCodes.FORBIDDEN))
      }

      const { id } = req.params
      await this.service.delete(parseInt(id))

      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Xóa bài viết thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi xóa bài viết', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // POST /api/posts/batch/delete - Batch delete posts
  async batchDelete(req: Request, res: Response) {
    try {
      // Check permissions
      if (!AuthUtils.hasPermission(req, 'post.delete')) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .send(ApiResponse.error('Không đủ quyền', 'Yêu cầu quyền POST_DELETE', StatusCodes.FORBIDDEN))
      }

      const { ids } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Thiếu dữ liệu', 'Danh sách ID là bắt buộc', StatusCodes.BAD_REQUEST))
      }

      await this.service.deleteMultiple(ids)

      res.status(StatusCodes.OK).send(ApiResponse.ok(null, 'Xóa nhiều bài viết thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Lỗi xóa nhiều bài viết', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
