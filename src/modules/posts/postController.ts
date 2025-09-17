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
        .send(ApiResponse.error(error.message, 'Failed to get posts', StatusCodes.INTERNAL_SERVER_ERROR))
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
        .send(ApiResponse.error(error.message, 'Failed to get published posts', StatusCodes.INTERNAL_SERVER_ERROR))
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
        .send(ApiResponse.error(error.message, 'Failed to get featured posts', StatusCodes.INTERNAL_SERVER_ERROR))
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
        .send(ApiResponse.error(error.message, 'Failed to get post statistics', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // GET /api/posts/:id - Lấy post theo ID
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const post = await this.service.getById(parseInt(id))

      if (!post) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .send(ApiResponse.error('Không tìm thấy bài viết', 'Không tìm thấy bài viết', StatusCodes.NOT_FOUND))
      }

      res.status(StatusCodes.OK).send(ApiResponse.ok(post, 'Lấy bài viết thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to get post', StatusCodes.INTERNAL_SERVER_ERROR))
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
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to get post with SEO', StatusCodes.INTERNAL_SERVER_ERROR))
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
        .send(ApiResponse.error(error.message, 'Failed to get related posts', StatusCodes.INTERNAL_SERVER_ERROR))
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
        relatedProducts,
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

      // Handle file upload for featuredImage
      let featuredImageUrl: string | undefined
      if (req.files && (req.files as any).featuredImage) {
        try {
          const file = (req.files as any).featuredImage[0]
          const uploadedFile = await fileUploadService.uploadSingleFile(file.buffer, file.originalname, {
            folderName: 'project-insurance/posts'
          })
          featuredImageUrl = uploadedFile.url
        } catch (uploadError: any) {
          return res
            .status(StatusCodes.BAD_REQUEST)
            .send(ApiResponse.error('Lỗi upload ảnh', uploadError.message, StatusCodes.BAD_REQUEST))
        }
      }

      // Handle album images upload
      let albumImagesUrls: string[] = []
      if (req.files && (req.files as any).albumImages) {
        try {
          const albumFiles = (req.files as any).albumImages
          const filesArray = Array.isArray(albumFiles) ? albumFiles : [albumFiles]

          for (const file of filesArray) {
            const uploadedFile = await fileUploadService.uploadSingleFile(file.buffer, file.originalname, {
              folderName: 'project-insurance/posts/albums'
            })
            albumImagesUrls.push(uploadedFile.url)
          }
        } catch (uploadError: any) {
          return res
            .status(StatusCodes.BAD_REQUEST)
            .send(ApiResponse.error('Lỗi upload ảnh album', uploadError.message, StatusCodes.BAD_REQUEST))
        }
      }

      // Parse SEO metadata
      const processedSeoMeta = this.parseSeoMetaFromRequest(req)

      // Prepare post data
      const postData: any = {
        title,
        excerpt,
        content,
        featuredImage: featuredImageUrl,
        status: status || PostStatus.DRAFT,
        videoUrl,
        note,
        priority: priority ? parseInt(priority) : 0,
        isHighlighted: isHighlighted === 'true',
        isFeatured: isFeatured === 'true',
        scheduledAt,
        expiredAt,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        postType: postType || PostType.ARTICLE,
        albumImages: albumImagesUrls.length > 0 ? albumImagesUrls : this.parseArrayField(albumImages),
        targetAudience: this.parseArrayField(targetAudience),
        relatedProducts: this.parseArrayField(relatedProducts)?.map((id: any) => parseInt(id)),
        metaKeywords: this.parseArrayField(metaKeywords),
        taggedCategoryIds: this.parseArrayField(taggedCategoryIds)?.map((id: any) => parseInt(id)),
        seoMeta: processedSeoMeta
      }

      const post = await this.service.create(postData, { actorId: auditContext.createdBy })

      res.status(StatusCodes.CREATED).send(ApiResponse.ok(post, 'Tạo bài viết thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to create post', StatusCodes.INTERNAL_SERVER_ERROR))
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
        relatedProducts,
        metaKeywords,
        taggedCategoryIds
      } = body

      // Get user ID from auth context
      const auditContext = AuthUtils.getAuditContext(req)

      // Handle file upload for featuredImage
      let featuredImageUrl: string | undefined
      if (req.files && (req.files as any).featuredImage) {
        try {
          const file = (req.files as any).featuredImage[0]
          const uploadedFile = await fileUploadService.uploadSingleFile(file.buffer, file.originalname, {
            folderName: 'project-insurance/posts'
          })
          featuredImageUrl = uploadedFile.url
        } catch (uploadError: any) {
          return res
            .status(StatusCodes.BAD_REQUEST)
            .send(ApiResponse.error('Lỗi upload ảnh', uploadError.message, StatusCodes.BAD_REQUEST))
        }
      }

      // Handle album images upload
      let albumImagesUrls: string[] = []
      if (req.files && (req.files as any).albumImages) {
        try {
          const albumFiles = (req.files as any).albumImages
          const filesArray = Array.isArray(albumFiles) ? albumFiles : [albumFiles]

          for (const file of filesArray) {
            const uploadedFile = await fileUploadService.uploadSingleFile(file.buffer, file.originalname, {
              folderName: 'project-insurance/posts/albums'
            })
            albumImagesUrls.push(uploadedFile.url)
          }
        } catch (uploadError: any) {
          return res
            .status(StatusCodes.BAD_REQUEST)
            .send(ApiResponse.error('Lỗi upload ảnh album', uploadError.message, StatusCodes.BAD_REQUEST))
        }
      }

      // Parse SEO metadata
      const processedSeoMeta = this.parseSeoMetaFromRequest(req)

      // Prepare update data (only include provided fields)
      const updateData: any = {}

      if (title !== undefined) updateData.title = title
      if (excerpt !== undefined) updateData.excerpt = excerpt
      if (content !== undefined) updateData.content = content
      if (featuredImageUrl !== undefined) updateData.featuredImage = featuredImageUrl
      if (status !== undefined) updateData.status = status
      if (videoUrl !== undefined) updateData.videoUrl = videoUrl
      if (note !== undefined) updateData.note = note
      if (priority !== undefined) updateData.priority = parseInt(priority)
      if (isHighlighted !== undefined) updateData.isHighlighted = isHighlighted === 'true'
      if (isFeatured !== undefined) updateData.isFeatured = isFeatured === 'true'
      if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt
      if (expiredAt !== undefined) updateData.expiredAt = expiredAt
      if (categoryId !== undefined) updateData.categoryId = categoryId ? parseInt(categoryId) : null
      if (postType !== undefined) updateData.postType = postType

      // Handle array fields
      if (albumImagesUrls.length > 0) {
        updateData.albumImages = albumImagesUrls
      } else if (albumImages !== undefined) {
        updateData.albumImages = this.parseArrayField(albumImages)
      }

      if (targetAudience !== undefined) updateData.targetAudience = this.parseArrayField(targetAudience)
      if (relatedProducts !== undefined)
        updateData.relatedProducts = this.parseArrayField(relatedProducts)?.map((id: any) => parseInt(id))
      if (metaKeywords !== undefined) updateData.metaKeywords = this.parseArrayField(metaKeywords)
      if (taggedCategoryIds !== undefined)
        updateData.taggedCategoryIds = this.parseArrayField(taggedCategoryIds)?.map((id: any) => parseInt(id))
      if (processedSeoMeta !== undefined) updateData.seoMeta = processedSeoMeta

      const post = await this.service.update(parseInt(id), updateData, { actorId: auditContext.updatedBy })

      res.status(StatusCodes.OK).send(ApiResponse.ok(post, 'Cập nhật bài viết thành công'))
    } catch (error: any) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to update post', StatusCodes.INTERNAL_SERVER_ERROR))
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
        .send(ApiResponse.error(error.message, 'Failed to publish post', StatusCodes.INTERNAL_SERVER_ERROR))
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
        .send(ApiResponse.error(error.message, 'Failed to unpublish post', StatusCodes.INTERNAL_SERVER_ERROR))
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
        .send(ApiResponse.error(error.message, 'Failed to archive post', StatusCodes.INTERNAL_SERVER_ERROR))
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
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(error.message, 'Failed to batch publish posts', StatusCodes.INTERNAL_SERVER_ERROR))
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
        .send(ApiResponse.error(error.message, 'Failed to batch unpublish posts', StatusCodes.INTERNAL_SERVER_ERROR))
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
        .send(ApiResponse.error(error.message, 'Failed to batch archive posts', StatusCodes.INTERNAL_SERVER_ERROR))
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
        .send(ApiResponse.error(error.message, 'Failed to delete post', StatusCodes.INTERNAL_SERVER_ERROR))
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
        .send(ApiResponse.error(error.message, 'Failed to batch delete posts', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
