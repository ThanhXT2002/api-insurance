import { BaseService } from '../../bases/baseService'
import { PostRepository } from './postRepository'
import { seoService, SeoDto } from '../../services/seoService'
import { fileUploadService } from '../../services/fileUploadService'
import { normalizeSlug } from '../../utils/urlHelper'
import { PostStatus, PostType, SeoableType } from '../../../generated/prisma'
import { withRollback } from '../../utils/rollbackHelper'
import prisma from '../../config/prismaClient'

interface PostData {
  title: string
  slug?: string
  excerpt?: string
  shortContent?: string
  content: string
  featuredImage?: string
  status?: PostStatus
  albumImages?: string[]
  videoUrl?: string
  note?: string
  priority?: number
  isHighlighted?: boolean
  isFeatured?: boolean
  scheduledAt?: Date | string
  expiredAt?: Date | string
  publishedAt?: Date | string
  targetAudience?: string[]
  // Use relatedProductIds to reference products (explicit join model `PostProduct`)
  relatedProductIds?: number[]
  metaKeywords?: string[]
  categoryId?: number
  postType?: PostType
  taggedCategoryIds?: number[]
  seoMeta?: SeoDto
}

export class PostService extends BaseService {
  constructor(protected repo: PostRepository) {
    super(repo)
  }

  // ---------- Helper methods chung (tất cả tiếng Việt) ----------
  private tryParseJson(val: any) {
    if (val === undefined || val === null) return undefined
    if (Array.isArray(val) || typeof val === 'object') return val
    if (typeof val === 'string') {
      try {
        return JSON.parse(val)
      } catch {
        return val
      }
    }
    return val
  }

  private normalizeJsonFields(target: any) {
    if (!target || typeof target !== 'object') return
    if (target.albumImages) target.albumImages = this.tryParseJson(target.albumImages)
    if (target.targetAudience) target.targetAudience = this.tryParseJson(target.targetAudience)
    if (target.relatedProductIds) {
      const parsed = this.tryParseJson(target.relatedProductIds)
      target.relatedProductIds = Array.isArray(parsed) ? parsed.map((p: any) => Number(p)) : parsed
    }
    if (target.metaKeywords) target.metaKeywords = this.tryParseJson(target.metaKeywords)
  }

  private normalizeDates(target: any) {
    if (!target || typeof target !== 'object') return
    if (target.scheduledAt && typeof target.scheduledAt === 'string') target.scheduledAt = new Date(target.scheduledAt)
    if (target.expiredAt && typeof target.expiredAt === 'string') target.expiredAt = new Date(target.expiredAt)
    if (target.publishedAt && typeof target.publishedAt === 'string') target.publishedAt = new Date(target.publishedAt)
  }

  private stripTransientFields(target: any) {
    if (!target || typeof target !== 'object') return
    if ('featuredFile' in target) delete target.featuredFile
    if ('albumFiles' in target) delete target.albumFiles
  }

  private async validateCategoryIfPresent(data: any) {
    if (data.categoryId !== undefined && data.categoryId !== null) {
      const categoryIdNum = Number(data.categoryId)
      if (Number.isNaN(categoryIdNum)) {
        throw new Error('categoryId không hợp lệ')
      }
      const categoryExists = await prisma.postCategory.count({ where: { id: categoryIdNum } })
      if (categoryExists === 0) {
        throw new Error('Không tìm thấy danh mục')
      }
      data.categoryId = categoryIdNum
    }
  }

  private async uploadFeaturedIfPresent(prismaObj: any, rollbackManager: any) {
    if (!prismaObj.featuredFile) return
    try {
      const f = prismaObj.featuredFile as { buffer: Buffer; originalName: string }
      const uploaded = await fileUploadService.uploadSingleFile(f.buffer, f.originalName, {
        folderName: 'project-insurance/posts'
      })
      rollbackManager.addFileDeleteAction(uploaded.url)
      prismaObj.featuredImage = uploaded.url
    } catch (err: any) {
      throw new Error(`Lỗi tải ảnh đại diện: ${err?.message || err}`)
    }
  }

  private async uploadAlbumsIfPresent(prismaObj: any, rollbackManager: any, mergeWithExistingForId?: number) {
    if (!prismaObj.albumFiles || !Array.isArray(prismaObj.albumFiles)) return
    try {
      const inputs = prismaObj.albumFiles as Array<{ buffer: Buffer; originalName: string }>
      const uploaded = await fileUploadService.uploadMultipleFiles(inputs, {
        folderName: 'project-insurance/posts/albums'
      })
      const urls = uploaded.map((u) => u.url)
      rollbackManager.addFileDeleteAction(urls)

      if (mergeWithExistingForId) {
        // load existing album images and merge
        // Thay đổi: khi cập nhật, ta KHÔNG merge để tránh tăng dần albumImages.
        // Thay vào đó ghi đè albumImages bằng danh sách mới (urls).
        // Nếu muốn giữ hành vi merge (thêm ảnh mới), có thể thêm tuỳ chọn sau.
        prismaObj.albumImages = urls
      } else {
        prismaObj.albumImages = urls
      }
    } catch (err: any) {
      throw new Error(`Lỗi tải ảnh album: ${err?.message || err}`)
    }
  }

  private async upsertSeoInTransactionSafe(
    tx: any,
    seoMeta: SeoDto,
    id: number,
    actorId?: number,
    action = 'cập nhật'
  ) {
    try {
      await seoService.upsertSeoInTransaction(tx, SeoableType.POST, id, seoMeta, actorId)
    } catch (err: any) {
      throw new Error(`Lỗi ${action} SEO: ${err?.message || err}`)
    }
  }

  // ---------- End helpers ----------

  // Override keyword search để search theo title/excerpt/content - with audit transformation
  async getAll(params: any = {}) {
    // Accept common pagination and filter params here; coerce simple types defensively
    const {
      keyword,
      status,
      categoryId,
      postType,
      isFeatured,
      isHighlighted,
      page = 1,
      limit = 10,
      ...otherParams
    } = params

    const safePage = Math.max(1, Number(page) || 1)
    const safeLimit = Math.max(1, Number(limit) || 10)

    // Normalize flags
    const featuredFlag = typeof isFeatured === 'string' ? isFeatured === 'true' : !!isFeatured
    const highlightedFlag = typeof isHighlighted === 'string' ? isHighlighted === 'true' : !!isHighlighted

    // Minimal select for public list endpoints
    const listSelect = {
      id: true,
      title: true,
      featuredImage: true,
      publishedAt: true,
      category: { select: { id: true, name: true, slug: true } }
    }

    if (keyword) {
      // Tìm kiếm theo keyword (title/excerpt/content) - support pagination and other filters
      const results = await this.repo.search(keyword, {
        status,
        categoryId: categoryId ? Number(categoryId) : undefined,
        postType,
        isFeatured: typeof isFeatured !== 'undefined' ? featuredFlag : undefined,
        isHighlighted: typeof isHighlighted !== 'undefined' ? highlightedFlag : undefined,
        skip: (safePage - 1) * safeLimit,
        limit: safeLimit,
        select: listSelect
      })

      // repo.search returns { rows, total } or array depending on implementation; normalize
      if (results && typeof results === 'object' && 'rows' in results && 'total' in results) {
        const transformed = this.transformUserAuditFields(results.rows)
        return { rows: transformed, total: results.total }
      }

      const transformedResults = this.transformUserAuditFields(results)
      const total = Array.isArray(transformedResults) ? transformedResults.length : 0
      return { rows: transformedResults, total }
    }

    // Apply filters if provided
    const filters: any = {}
    if (status) filters.status = status
    if (categoryId) filters.categoryId = Number(categoryId)
    if (postType) filters.postType = postType
    if (typeof isFeatured !== 'undefined') filters.isFeatured = featuredFlag
    if (typeof isHighlighted !== 'undefined') filters.isHighlighted = highlightedFlag

    // Non-keyword path: use count + findMany with minimal select and category include for pagination
    const skip = (safePage - 1) * safeLimit
    const [total, rows] = await Promise.all([
      this.repo.count({ where: filters }),
      this.repo.findMany({
        where: filters,
        select: listSelect,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: safeLimit
      })
    ])

    return {
      rows: this.transformUserAuditFields(rows),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    }
  }

  // Lấy posts đã publish với pagination - with audit transformation
  async getPublished(
    params: {
      page?: number
      limit?: number
      categoryId?: number
      postType?: PostType
    } = {}
  ) {
    const { page = 1, limit = 10, categoryId, postType } = params
    const skip = (page - 1) * limit

    // Use minimal select for list endpoint to improve performance
    const posts = await this.repo.findPublishedMinimal({
      limit,
      skip,
      categoryId,
      postType,
      select: this.getPostListSelect()
    })

    // No heavy relations included here; transform if needed
    const transformedPosts = this.transformUserAuditFields(posts)

    // Get total count for pagination
    const totalWhere: any = {
      status: PostStatus.PUBLISHED,
      publishedAt: { lte: new Date() }
    }
    if (categoryId) totalWhere.categoryId = categoryId
    if (postType) totalWhere.postType = postType

    const total = await this.repo.count({ where: totalWhere })

    return {
      rows: transformedPosts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  // Lấy posts featured - with audit transformation
  async getFeatured(
    params: {
      limit?: number
      isFeatured?: boolean
      isHighlighted?: boolean
    } = {}
  ) {
    const posts = await this.repo.findFeaturedMinimal({
      ...params,
      select: this.getPostListSelect()
    })

    return this.transformUserAuditFields(posts)
  }

  // Lấy posts liên quan - with audit transformation
  async getRelated(
    postId: number,
    params: {
      limit?: number
      categoryId?: number
      postType?: PostType
    } = {}
  ) {
    const posts = await this.repo.findRelatedMinimal(postId, params.categoryId, {
      limit: params.limit,
      postType: params.postType,
      select: this.getPostListSelect()
    })

    return this.transformUserAuditFields(posts)
  }

  // Tìm post theo slug với SEO - with audit transformation
  async findBySlug(slug: string) {
    // For public slug endpoint, only return posts that are actually published
    // Use an explicit `select` to avoid returning admin/heavy fields to FE.
    const select = {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      shortContent: true,
      content: true,
      featuredImage: true,
      videoUrl: true,
      publishedAt: true,
      targetAudience: true,
      metaKeywords: true,
      // relations useful for public page
      category: { select: { id: true, name: true, slug: true } },
      taggedCategoryTags: { select: { category: { select: { id: true, name: true, slug: true } } } },
      postProductLinks: { select: { product: { select: { id: true, name: true, slug: true, price: true } } } },
      _count: { select: { comments: true } }
    }

    const post = await this.repo.findPublishedBySlug(slug, { select })
    if (!post) return null

    // seo metadata stored in polymorphic seoMeta table; fetch separately
    try {
      const seo = await seoService.getSeoFor(SeoableType.POST, post.id)
      if (seo) (post as any).seoMeta = seo
    } catch (err: any) {
      console.error('Failed to load seo for post', post.id, err?.message || err)
    }

    return this.transformUserAuditFields([post])[0]
  }

  // Get post by id with full relations and SEO (returns same shape as findBySlug)
  async getByIdWithRelations(id: number) {
    const post = await this.repo.findById({ where: { id }, include: this.getPostIncludeWithSeo() })
    if (!post) return null

    // seo metadata stored in polymorphic seoMeta table; fetch separately
    try {
      const seo = await seoService.getSeoFor(SeoableType.POST, post.id)
      if (seo) (post as any).seoMeta = seo
    } catch (err: any) {
      console.error('Failed to load seo for post', post.id, err?.message || err)
    }

    return this.transformUserAuditFields([post])[0]
  }

  // Minimal select object for list endpoints to reduce payload and speed up queries
  private getPostListSelect() {
    return {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      featuredImage: true,
      priority: true,
      publishedAt: true
    }
  }

  // Tạo post mới với validation và SEO - with audit transformation
  async create(data: PostData, ctx?: { actorId?: number }) {
    return withRollback(async (rollbackManager) => {
      // Derive slug from title (frontend should not provide slug)
      const normalizedSlug = normalizeSlug(data.title)

      // Kiểm tra slug có bị trùng không
      const slugExists = await this.repo.slugExists(normalizedSlug)
      if (slugExists) {
        throw new Error('Đường dẫn (slug) đã tồn tại - Vui lòng chọn tiêu đề khác')
      }

      // Validate categoryId nếu có
      await this.validateCategoryIfPresent(data)

      // Prepare post data
      const { seoMeta, taggedCategoryIds = [], ...postData } = data
      postData.slug = normalizedSlug

      // Create a copy for Prisma and normalize JSON/date fields
      const prismaData: any = { ...postData }
      this.normalizeJsonFields(prismaData)
      this.normalizeDates(prismaData)

      // Auto-set publishedAt if status is PUBLISHED
      if (prismaData.status === PostStatus.PUBLISHED && !prismaData.publishedAt) {
        prismaData.publishedAt = new Date()
      }

      // Build Prisma payload (will fill featuredImage/albumImages after uploads)
      const prismaPayload: any = {
        ...prismaData,
        ...(ctx?.actorId && {
          createdBy: ctx.actorId,
          updatedBy: ctx.actorId
        })
      }

      // Ensure categoryId is provided as scalar (Prisma client expects categoryId for this schema)
      if (prismaData.categoryId !== undefined && prismaData.categoryId !== null) {
        prismaPayload.categoryId = Number(prismaData.categoryId)
      }

      // Connect to tagged categories if specified
      if (taggedCategoryIds.length > 0) {
        // Use the explicit join model PostCategoryTag to create links
        prismaPayload.taggedCategoryTags = {
          create: taggedCategoryIds.map((id) => ({ category: { connect: { id } } }))
        }
      }

      // Connect related products via explicit PostProduct join model
      if (
        prismaData.relatedProductIds &&
        Array.isArray(prismaData.relatedProductIds) &&
        prismaData.relatedProductIds.length > 0
      ) {
        prismaPayload.postProductLinks = {
          create: prismaData.relatedProductIds.map((id: number) => ({ product: { connect: { id } } }))
        }
      }

      // Perform file uploads before starting DB transaction to avoid long-running work inside transaction
      // Keep uploads inside withRollback so rollbackManager can delete uploaded files if DB ops fail
      // Upload files (if any) before transaction. Parallelize uploads to reduce latency when both featured and album files exist.
      await Promise.all([
        this.uploadFeaturedIfPresent(prismaData, rollbackManager),
        this.uploadAlbumsIfPresent(prismaData, rollbackManager)
      ])

      // Ensure uploaded image URLs are copied into the Prisma payload so they get persisted.
      // (prismaPayload was created before uploads above; update it with results from prismaData)
      if (prismaData.featuredImage) prismaPayload.featuredImage = prismaData.featuredImage
      if (prismaData.albumImages) prismaPayload.albumImages = prismaData.albumImages

      // Create post trong transaction and upsert SEO inside same transaction for atomicity
      const post = await this.repo.runTransaction(async (tx) => {
        // Remove transient file buffer fields so Prisma won't receive unknown args
        this.stripTransientFields(prismaPayload)
        // Remove transient helper field relatedProductIds which is not a Post model field
        if ('relatedProductIds' in prismaPayload) delete prismaPayload.relatedProductIds

        const createdPost = await tx.post.create({
          data: prismaPayload,
          include: this.getPostInclude()
        })

        // Upsert SEO metadata inside the same transaction to ensure atomicity (Option B)
        if (seoMeta && Object.keys(seoMeta).length > 0) {
          await this.upsertSeoInTransactionSafe(tx, seoMeta, createdPost.id, ctx?.actorId, 'tạo')
        }

        return createdPost
      })

      return this.transformUserAuditFields([post])[0]
    })
  }

  // Cập nhật post với SEO - with audit transformation
  async update(id: number, data: PostData, ctx?: { actorId?: number }) {
    return withRollback(async (rollbackManager) => {
      // Kiểm tra post tồn tại
      const existingPost = await this.repo.findById(id)
      if (!existingPost) {
        throw new Error('Không tìm thấy bài viết')
      }

      // Validate slug nếu title thay đổi
      let normalizedSlug = existingPost.slug
      if (data.title && data.title !== existingPost.title) {
        normalizedSlug = normalizeSlug(data.title)
        const slugExists = await this.repo.slugExists(normalizedSlug, id)
        if (slugExists) {
          throw new Error('Đường dẫn (slug) đã tồn tại - Vui lòng chọn tiêu đề khác')
        }
      }

      // Validate categoryId nếu có
      await this.validateCategoryIfPresent(data)

      const { seoMeta, taggedCategoryIds, ...postData } = data
      if (data.title) postData.slug = normalizedSlug

      // Create a copy for Prisma and normalize JSON/date fields
      const prismaData: any = { ...postData }
      this.normalizeJsonFields(prismaData)
      this.normalizeDates(prismaData)

      // Handle status change logic
      if (prismaData.status) {
        if (prismaData.status === PostStatus.PUBLISHED && existingPost.status !== PostStatus.PUBLISHED) {
          // Publishing for first time or republishing
          if (!prismaData.publishedAt) {
            prismaData.publishedAt = new Date()
          }
        } else if (prismaData.status !== PostStatus.PUBLISHED && existingPost.status === PostStatus.PUBLISHED) {
          // Unpublishing - keep publishedAt for history
          // prismaPostData.publishedAt = null // Uncomment if you want to clear history
        }
      }

      // Perform uploads before starting DB transaction. Parallelize to reduce total upload time.
      await Promise.all([
        this.uploadFeaturedIfPresent(prismaData, rollbackManager),
        this.uploadAlbumsIfPresent(prismaData, rollbackManager, id)
      ])

      // Ensure transient file buffer fields are removed before entering transaction
      this.stripTransientFields(prismaData)

      // Make a cleaned copy for Prisma update operations (defensive copy)
      const prismaUpdateData: any = { ...prismaData }
      this.stripTransientFields(prismaUpdateData)

      // Update post trong transaction and upsert SEO inside it for atomicity (Option B)
      const post = await this.repo.runTransaction(async (tx) => {
        let updatedPost

        // Normalize categoryId into nested relation for Prisma update
        if ('categoryId' in prismaUpdateData) {
          const catVal = prismaUpdateData.categoryId
          if (catVal === null) {
            // clear relation
            prismaUpdateData.category = { disconnect: true }
          } else {
            prismaUpdateData.category = { connect: { id: Number(catVal) } }
          }
          delete prismaUpdateData.categoryId
        }

        // Build sanitized data object to ensure Prisma receives only valid fields
        const sanitizedData: any = { ...prismaUpdateData }
        // Remove transient file buffer fields
        if ('featuredFile' in sanitizedData) delete sanitizedData.featuredFile
        if ('albumFiles' in sanitizedData) delete sanitizedData.albumFiles
        // Remove helper/transient fields that are not part of Post model
        if ('relatedProductIds' in sanitizedData) delete sanitizedData.relatedProductIds
        if ('taggedCategories' in sanitizedData) delete sanitizedData.taggedCategories
        if ('taggedCategoryIds' in sanitizedData) delete sanitizedData.taggedCategoryIds

        if (taggedCategoryIds !== undefined) {
          // Use updateWithCategories if tagged categories are being updated
          updatedPost = await this.repo.updateWithCategories(
            id,
            {
              ...sanitizedData,
              ...(ctx?.actorId && { updater: { connect: { id: ctx.actorId } } })
            },
            taggedCategoryIds,
            tx
          )
        } else {
          // Regular update using sanitized payload
          updatedPost = await this.repo.update(
            { id },
            {
              ...sanitizedData,
              ...(ctx?.actorId && { updater: { connect: { id: ctx.actorId } } })
            },
            tx
          )
        }

        // If relatedProductIds provided, replace product links inside the same transaction
        if ((prismaData.relatedProductIds as any) !== undefined) {
          // Replace post-product links
          await this.repo.updateWithProducts(id, prismaData.relatedProductIds || [], tx)
        }

        // Upsert SEO metadata inside the same transaction to ensure atomicity
        if (seoMeta && Object.keys(seoMeta).length > 0) {
          try {
            await seoService.upsertSeoInTransaction(tx, SeoableType.POST, id, seoMeta, ctx?.actorId)
          } catch (seoError: any) {
            // Throw to rollback transaction and trigger withRollback cleanup
            throw new Error(`Lỗi cập nhật SEO: ${seoError.message}`)
          }
        }

        return updatedPost
      })

      // Get updated post with relations
      const finalPost = await this.repo.findById({ where: { id }, include: this.getPostInclude() }, prisma)

      // CLEANUP: delete replaced/removed images from storage asynchronously.
      // Determine images that were removed by comparing existingPost and finalPost.
      try {
        const urlsToDelete: string[] = []

        // If featured image changed, delete the old one
        if (existingPost.featuredImage && finalPost && finalPost.featuredImage !== existingPost.featuredImage) {
          urlsToDelete.push(existingPost.featuredImage)
        }

        // For album images: find items that existed before but are no longer present
        const prevAlbum: string[] = Array.isArray(existingPost.albumImages) ? existingPost.albumImages : []
        const newAlbum: string[] = finalPost && Array.isArray(finalPost.albumImages) ? finalPost.albumImages : []
        for (const u of prevAlbum) {
          if (!newAlbum.includes(u)) urlsToDelete.push(u)
        }

        if (urlsToDelete.length > 0) {
          // fire-and-forget but still attempt and ignore errors
          try {
            await fileUploadService.deleteFilesByUrls(urlsToDelete)
          } catch (err: any) {
            // Ignore deletion errors - DB update already succeeded
            console.error('Failed to delete old post images after update:', err?.message || err)
          }
        }
      } catch (err: any) {
        // Defensive: do not block success if cleanup logic fails
        console.error('Unexpected error during post image cleanup:', err?.message || err)
      }

      return this.transformUserAuditFields([finalPost])[0]
    })
  }

  // Hard delete post and its SEO metadata inside a transaction
  async deleteById(id: number, ctx?: { actorId?: number }) {
    return this.repo.runTransaction(async (tx) => {
      const existing = await this.repo.findById(
        {
          where: { id },
          include: {
            /* keep minimal */
          }
        },
        tx
      )
      if (!existing) throw new Error('Không tìm thấy bài viết')

      // Delete SEO metadata for this post inside the transaction
      await tx.seoMeta.deleteMany({ where: { seoableType: SeoableType.POST, seoableId: id } })

      // Finally delete the post row
      const deleted = await this.repo.delete({ id }, tx)

      // After successful DB deletion, attempt to delete files from storage but don't fail the operation if deletion fails
      ;(async () => {
        try {
          const urls: string[] = []
          if (existing.featuredImage) urls.push(existing.featuredImage)
          if (existing.albumImages && Array.isArray(existing.albumImages)) urls.push(...existing.albumImages)
          if (urls.length > 0) {
            await fileUploadService.deleteFilesByUrls(urls)
          }
        } catch (err: any) {
          console.error('Failed to delete post images after deleteById:', err?.message || err)
        }
      })()
      return deleted
    })
  }

  // Override BaseService.delete to ensure storage cleanup is performed
  // `where` may be an id number or an object; support both for controller convenience
  async delete(where: any) {
    // If caller passed an id number, delegate to deleteById
    if (typeof where === 'number') {
      return this.deleteById(where)
    }

    // If where is an object with id, extract it
    if (where && typeof where === 'object' && where.id) {
      return this.deleteById(where.id)
    }

    // Fallback to BaseService behavior for other shapes
    return super.delete(where)
  }

  // Delete multiple posts (override BaseService.deleteMultiple behavior) and cleanup images after DB operation
  async deleteMultiple(where: any) {
    // Accept either:
    // - an array of ids (common from controller calls)
    // - a where filter object
    let whereFilter: any = where
    if (Array.isArray(where)) {
      whereFilter = { id: { in: where } }
    }

    // We'll run inside a transaction to remove SEO metadata and posts atomically,
    // but file deletions will be attempted after DB success and won't block the operation.
    return this.repo.runTransaction(async (tx) => {
      // Find posts to delete (include image fields)
      const candidates = await this.repo.findMany(
        { where: whereFilter, select: { id: true, featuredImage: true, albumImages: true } },
        tx
      )

      if (!candidates || candidates.length === 0) return { count: 0 }

      const ids = candidates.map((c: any) => c.id)

      // Delete SEO metadata for these posts
      await tx.seoMeta.deleteMany({ where: { seoableType: SeoableType.POST, seoableId: { in: ids } } })

      // Delete posts (hard delete)
      const res = await tx.post.deleteMany({ where: { id: { in: ids } } })

      // After successful DB deletion, attempt to delete files for all posts - ignore errors
      ;(async () => {
        try {
          const urls: string[] = []
          for (const c of candidates) {
            if (c.featuredImage) urls.push(c.featuredImage)
            if (c.albumImages && Array.isArray(c.albumImages)) urls.push(...c.albumImages)
          }
          if (urls.length > 0) await fileUploadService.deleteFilesByUrls(urls)
        } catch (err: any) {
          console.error('Failed to delete post images after deleteMultiple:', err?.message || err)
        }
      })()

      return res
    })
  }

  // Publish post (change status to PUBLISHED)
  async publish(id: number, ctx?: { actorId?: number }) {
    const updateData: any = {
      status: PostStatus.PUBLISHED,
      publishedAt: new Date()
    }

    return this.update(id, updateData, ctx)
  }

  // Unpublish post (change status to DRAFT)
  async unpublish(id: number, ctx?: { actorId?: number }) {
    const updateData: any = {
      status: PostStatus.DRAFT
      // Keep publishedAt for history
    }

    return this.update(id, updateData, ctx)
  }

  // Archive post
  async archive(id: number, ctx?: { actorId?: number }) {
    const updateData: any = {
      status: PostStatus.ARCHIVED
    }

    return this.update(id, updateData, ctx)
  }

  // Batch operations
  async publishMultiple(ids: number[], ctx?: { actorId?: number }) {
    return this.repo.updateManyStatus(ids, PostStatus.PUBLISHED, {
      publishedAt: new Date(),
      ...(ctx?.actorId && { updatedBy: ctx.actorId })
    })
  }

  async unpublishMultiple(ids: number[], ctx?: { actorId?: number }) {
    return this.repo.updateManyStatus(ids, PostStatus.DRAFT, {
      ...(ctx?.actorId && { updatedBy: ctx.actorId })
    })
  }

  async archiveMultiple(ids: number[], ctx?: { actorId?: number }) {
    return this.repo.updateManyStatus(ids, PostStatus.ARCHIVED, {
      ...(ctx?.actorId && { updatedBy: ctx.actorId })
    })
  }

  // Auto-publish scheduled posts (for cron job)
  async autoPublishScheduledPosts() {
    const scheduledPosts = await this.repo.findScheduledForPublish()

    if (scheduledPosts.length === 0) return { published: 0, posts: [] }

    const publishedIds = scheduledPosts.map((post: any) => post.id)
    await this.repo.updateManyStatus(publishedIds, PostStatus.PUBLISHED, {
      publishedAt: new Date()
    })

    return {
      published: publishedIds.length,
      posts: publishedIds
    }
  }

  // Auto-archive expired posts (for cron job)
  async autoArchiveExpiredPosts() {
    const expiredPosts = await this.repo.findExpiredPosts()

    if (expiredPosts.length === 0) return { archived: 0, posts: [] }

    const expiredIds = expiredPosts.map((post: any) => post.id)
    await this.repo.updateManyStatus(expiredIds, PostStatus.ARCHIVED)

    return {
      archived: expiredIds.length,
      posts: expiredIds
    }
  }

  // Get posts statistics
  async getStatistics() {
    const [totalPosts, publishedCount, draftCount, archivedCount, scheduledCount, expiredCount] = await Promise.all([
      this.repo.count({}),
      this.repo.countByStatus(PostStatus.PUBLISHED),
      this.repo.countByStatus(PostStatus.DRAFT),
      this.repo.countByStatus(PostStatus.ARCHIVED),
      this.repo.count({
        where: {
          status: PostStatus.DRAFT,
          scheduledAt: { not: null },
          publishedAt: null
        }
      }),
      this.repo.count({
        where: {
          status: PostStatus.PUBLISHED,
          expiredAt: { lte: new Date() }
        }
      })
    ])

    return {
      total: totalPosts,
      published: publishedCount,
      draft: draftCount,
      archived: archivedCount,
      scheduled: scheduledCount,
      expired: expiredCount
    }
  }

  // Helper: Get include object for posts with relations
  private getPostInclude() {
    return {
      category: {
        select: { id: true, name: true, slug: true }
      },
      // Include join entities and their related target objects so we can transform them for the API
      taggedCategoryTags: {
        select: { category: { select: { id: true, name: true, slug: true } } }
      },
      postProductLinks: {
        select: { product: { select: { id: true, name: true, slug: true, price: true } } }
      },
      creator: {
        select: { id: true, name: true, email: true }
      },
      updater: {
        select: { id: true, name: true, email: true }
      },
      _count: {
        select: { comments: true }
      }
    }
  }

  private getPostCateInclude() {
    return {
      category: {
        select: { id: true, name: true, slug: true }
      }
    }
  }

  // Helper: Get include object for posts with SEO
  private getPostIncludeWithSeo() {
    // Seo metadata is not a direct Prisma relation on Post; include only the standard relations
    return {
      ...this.getPostInclude()
    }
  }

  // Transform JSON fields back to arrays/objects for frontend
  protected transformUserAuditFields(data: any): any {
    const transformed = super.transformUserAuditFields(data)

    if (Array.isArray(transformed)) {
      return transformed.map(this.transformPostJsonFields)
    }

    return this.transformPostJsonFields(transformed)
  }

  private transformPostJsonFields = (post: any) => {
    if (!post) return post

    // Transform JSON fields back to arrays/objects
    try {
      if (typeof post.albumImages === 'string') {
        post.albumImages = JSON.parse(post.albumImages)
      }
      if (typeof post.targetAudience === 'string') {
        post.targetAudience = JSON.parse(post.targetAudience)
      }
      // For the new explicit relations, flatten join rows into helpful arrays
      if (Array.isArray(post.taggedCategoryTags)) {
        // Expose category objects only; do not expose id arrays
        post.taggedCategories = post.taggedCategoryTags.map((t: any) => t.category)
        delete post.taggedCategoryTags
      }

      if (Array.isArray(post.postProductLinks)) {
        // Expose product objects only; do not expose id arrays
        post.relatedProducts = post.postProductLinks.map((l: any) => l.product)
        delete post.postProductLinks
      }
      if (typeof post.metaKeywords === 'string') {
        post.metaKeywords = JSON.parse(post.metaKeywords)
      }

      // If we already included the category object, remove the scalar categoryId
      if (post && post.category) {
        if ('categoryId' in post) delete post.categoryId
      }
    } catch (e) {
      // Keep as string if JSON parsing fails
    }

    return post
  }
}
