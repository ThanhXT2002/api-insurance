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
  relatedProducts?: number[]
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

  // Override keyword search để search theo title/excerpt/content - with audit transformation
  async getAll(params: any = {}) {
    const { keyword, status, categoryId, postType, ...otherParams } = params

    if (keyword) {
      // Tìm kiếm theo keyword (title/excerpt/content)
      const results = await this.repo.search(keyword, {
        status,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        postType,
        include: this.getAuditInclude()
      })
      const transformedResults = this.transformUserAuditFields(results)
      const total = transformedResults.length
      return { rows: transformedResults, total }
    }

    // Apply filters if provided
    const filters: any = {}
    if (status) filters.status = status
    if (categoryId) filters.categoryId = parseInt(categoryId)
    if (postType) filters.postType = postType

    return super.getAll({ ...otherParams, ...filters })
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

    const posts = await this.repo.findPublished({
      limit,
      skip,
      categoryId,
      postType,
      include: this.getPostInclude()
    })

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
    const posts = await this.repo.findFeatured({
      ...params,
      include: this.getPostInclude()
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
    const posts = await this.repo.findRelated(postId, params.categoryId, {
      limit: params.limit,
      postType: params.postType,
      include: this.getPostInclude()
    })
    return this.transformUserAuditFields(posts)
  }

  // Tìm post theo slug với SEO - with audit transformation
  async findBySlug(slug: string) {
    const post = await this.repo.findBySlug(slug, this.getPostIncludeWithSeo())
    return post ? this.transformUserAuditFields([post])[0] : null
  }

  // Tạo post mới với validation và SEO - with audit transformation
  async create(data: PostData, ctx?: { actorId?: number }) {
    return withRollback(async (rollbackManager) => {
      // Derive slug from title (frontend should not provide slug)
      const normalizedSlug = normalizeSlug(data.title)

      // Kiểm tra slug có bị trùng không
      const slugExists = await this.repo.slugExists(normalizedSlug)
      if (slugExists) {
        throw new Error('Đường dẫn (slug) đã tồn tại')
      }

      // Validate categoryId nếu có (use postCategory model)
      if (data.categoryId !== undefined && data.categoryId !== null) {
        const categoryIdNum = Number(data.categoryId)
        if (Number.isNaN(categoryIdNum)) {
          throw new Error('categoryId không hợp lệ')
        }
        // Use prisma.postCategory.count to check existence
        const categoryExists = await prisma.postCategory.count({ where: { id: categoryIdNum } })
        if (categoryExists === 0) {
          throw new Error('Không tìm thấy danh mục')
        }
        // normalize to number for downstream
        data.categoryId = categoryIdNum
      }

      // Prepare post data
      const { seoMeta, taggedCategoryIds = [], ...postData } = data
      postData.slug = normalizedSlug

      // Create a copy for Prisma and normalize JSON fields to proper JS objects/arrays
      const prismaData: any = { ...postData }

      // Normalize JSON fields: accept stringified JSON or arrays/objects and convert to native JS types
      const tryParseJson = (val: any) => {
        if (val === undefined || val === null) return undefined
        if (Array.isArray(val) || typeof val === 'object') return val
        if (typeof val === 'string') {
          try {
            return JSON.parse(val)
          } catch {
            // If it's a plain string (not JSON), return as single-element array for albumImages/targetAudience/metaKeywords
            return val
          }
        }
        return val
      }

      if (prismaData.albumImages) {
        prismaData.albumImages = tryParseJson(prismaData.albumImages)
      }
      if (prismaData.targetAudience) {
        prismaData.targetAudience = tryParseJson(prismaData.targetAudience)
      }
      if (prismaData.relatedProducts) {
        const parsed = tryParseJson(prismaData.relatedProducts)
        // Ensure relatedProducts is array of numbers
        if (Array.isArray(parsed)) prismaData.relatedProducts = parsed.map((p: any) => Number(p))
        else prismaData.relatedProducts = parsed
      }
      if (prismaData.metaKeywords) {
        prismaData.metaKeywords = tryParseJson(prismaData.metaKeywords)
      }

      // Handle dates
      if (prismaData.scheduledAt && typeof prismaData.scheduledAt === 'string') {
        prismaData.scheduledAt = new Date(prismaData.scheduledAt)
      }
      if (prismaData.expiredAt && typeof prismaData.expiredAt === 'string') {
        prismaData.expiredAt = new Date(prismaData.expiredAt)
      }
      if (prismaData.publishedAt && typeof prismaData.publishedAt === 'string') {
        prismaData.publishedAt = new Date(prismaData.publishedAt)
      }

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
        prismaPayload.taggedCategories = {
          connect: taggedCategoryIds.map((id) => ({ id }))
        }
      }

      // Perform file uploads before starting DB transaction to avoid long-running work inside transaction
      // Keep uploads inside withRollback so rollbackManager can delete uploaded files if DB ops fail
      if (prismaData.featuredFile) {
        try {
          const f = prismaData.featuredFile as { buffer: Buffer; originalName: string }
          const uploaded = await fileUploadService.uploadSingleFile(f.buffer, f.originalName, {
            folderName: 'project-insurance/posts'
          })
          // register rollback
          rollbackManager.addFileDeleteAction(uploaded.url)
          prismaPayload.featuredImage = uploaded.url
        } catch (err: any) {
          throw new Error(`Lỗi upload featured image: ${err.message}`)
        }
      }

      if (prismaData.albumFiles && Array.isArray(prismaData.albumFiles)) {
        try {
          const inputs = prismaData.albumFiles as Array<{ buffer: Buffer; originalName: string }>
          const uploaded = await fileUploadService.uploadMultipleFiles(inputs, {
            folderName: 'project-insurance/posts/albums'
          })
          const urls = uploaded.map((u) => u.url)
          rollbackManager.addFileDeleteAction(urls)
          prismaPayload.albumImages = urls
        } catch (err: any) {
          throw new Error(`Lỗi upload album images: ${err.message}`)
        }
      }

      // Create post trong transaction and upsert SEO inside same transaction for atomicity
      const post = await this.repo.runTransaction(async (tx) => {
        // Remove transient file buffer fields so Prisma won't receive unknown args
        if ('featuredFile' in prismaPayload) delete prismaPayload.featuredFile
        if ('albumFiles' in prismaPayload) delete prismaPayload.albumFiles

        const createdPost = await tx.post.create({
          data: prismaPayload,
          include: this.getPostInclude()
        })

        // Upsert SEO metadata inside the same transaction to ensure atomicity (Option B)
        if (seoMeta && Object.keys(seoMeta).length > 0) {
          try {
            await seoService.upsertSeoInTransaction(tx, SeoableType.POST, createdPost.id, seoMeta, ctx?.actorId)
          } catch (seoError: any) {
            // Throwing here will cause the transaction to rollback, and withRollback will run rollback actions (e.g., delete uploaded files)
            throw new Error(`Lỗi tạo SEO: ${seoError.message}`)
          }
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
          throw new Error('Đường dẫn (slug) đã tồn tại')
        }
      }

      // Validate categoryId nếu có (normalize and check)
      if (data.categoryId !== undefined && data.categoryId !== null) {
        const categoryIdNum = Number(data.categoryId)
        if (Number.isNaN(categoryIdNum)) {
          throw new Error('categoryId không hợp lệ')
        }
        const categoryExists = await prisma.postCategory.count({ where: { id: categoryIdNum } })
        if (categoryExists === 0) {
          throw new Error('Không tìm thấy danh mục')
        }
        // ensure normalized for update flow
        data.categoryId = categoryIdNum
      }

      const { seoMeta, taggedCategoryIds, ...postData } = data
      if (data.title) postData.slug = normalizedSlug

      // Create a copy for Prisma and normalize JSON fields to proper JS objects/arrays
      const prismaData: any = { ...postData }

      const tryParseJson = (val: any) => {
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

      if (prismaData.albumImages) {
        prismaData.albumImages = tryParseJson(prismaData.albumImages)
      }
      if (prismaData.targetAudience) {
        prismaData.targetAudience = tryParseJson(prismaData.targetAudience)
      }
      if (prismaData.relatedProducts) {
        const parsed = tryParseJson(prismaData.relatedProducts)
        if (Array.isArray(parsed)) prismaData.relatedProducts = parsed.map((p: any) => Number(p))
        else prismaData.relatedProducts = parsed
      }
      if (prismaData.metaKeywords) {
        prismaData.metaKeywords = tryParseJson(prismaData.metaKeywords)
      }

      // Handle dates
      if (prismaData.scheduledAt && typeof prismaData.scheduledAt === 'string') {
        prismaData.scheduledAt = new Date(prismaData.scheduledAt)
      }
      if (prismaData.expiredAt && typeof prismaData.expiredAt === 'string') {
        prismaData.expiredAt = new Date(prismaData.expiredAt)
      }
      if (prismaData.publishedAt && typeof prismaData.publishedAt === 'string') {
        prismaData.publishedAt = new Date(prismaData.publishedAt)
      }

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

      // Perform uploads before starting DB transaction to avoid holding transaction open
      if (prismaData.featuredFile) {
        try {
          const f = prismaData.featuredFile as { buffer: Buffer; originalName: string }
          const uploaded = await fileUploadService.uploadSingleFile(f.buffer, f.originalName, {
            folderName: 'project-insurance/posts'
          })
          rollbackManager.addFileDeleteAction(uploaded.url)
          prismaData.featuredImage = uploaded.url
        } catch (err: any) {
          throw new Error(`Lỗi upload featured image: ${err.message}`)
        }
      }

      if (prismaData.albumFiles && Array.isArray(prismaData.albumFiles)) {
        try {
          const inputs = prismaData.albumFiles as Array<{ buffer: Buffer; originalName: string }>
          const uploaded = await fileUploadService.uploadMultipleFiles(inputs, {
            folderName: 'project-insurance/posts/albums'
          })
          const urls = uploaded.map((u) => u.url)
          rollbackManager.addFileDeleteAction(urls)

          // Merge with existing albumImages if any
          const existing = await this.repo.findById(id, prisma)
          const existingAlbum = existing?.albumImages || []
          prismaData.albumImages = Array.isArray(existingAlbum) ? [...existingAlbum, ...urls] : urls
        } catch (err: any) {
          throw new Error(`Lỗi upload album images: ${err.message}`)
        }
      }

      // Ensure transient file buffer fields are removed before entering transaction
      if ('featuredFile' in prismaData) delete prismaData.featuredFile
      if ('albumFiles' in prismaData) delete prismaData.albumFiles

      // Make a cleaned copy for Prisma update operations to be absolutely sure no transient
      // buffer fields are passed into Prisma (defensive copy)
      const prismaUpdateData: any = { ...prismaData }
      if ('featuredFile' in prismaUpdateData) delete prismaUpdateData.featuredFile
      if ('albumFiles' in prismaUpdateData) delete prismaUpdateData.albumFiles

      // Update post trong transaction and upsert SEO inside it for atomicity (Option B)
      const post = await this.repo.runTransaction(async (tx) => {
        let updatedPost

        if (taggedCategoryIds !== undefined) {
          // Use updateWithCategories if tagged categories are being updated
          updatedPost = await this.repo.updateWithCategories(
            id,
            {
              ...prismaUpdateData,
              ...(ctx?.actorId && { updatedBy: ctx.actorId })
            },
            taggedCategoryIds,
            tx
          )
        } else {
          // Regular update
          // Ensure transient file fields are not passed to Prisma
          if ('featuredFile' in prismaUpdateData) delete prismaUpdateData.featuredFile
          if ('albumFiles' in prismaUpdateData) delete prismaUpdateData.albumFiles

          updatedPost = await this.repo.update(
            { id },
            {
              ...prismaUpdateData,
              ...(ctx?.actorId && { updatedBy: ctx.actorId })
            },
            tx
          )
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
      return deleted
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
      taggedCategories: {
        select: { id: true, name: true, slug: true }
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

  // Helper: Get include object for posts with SEO
  private getPostIncludeWithSeo() {
    return {
      ...this.getPostInclude(),
      seoMeta: true // This will be handled by polymorphic relation in application layer
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
      if (typeof post.relatedProducts === 'string') {
        post.relatedProducts = JSON.parse(post.relatedProducts)
      }
      if (typeof post.metaKeywords === 'string') {
        post.metaKeywords = JSON.parse(post.metaKeywords)
      }
    } catch (e) {
      // Keep as string if JSON parsing fails
    }

    return post
  }
}
