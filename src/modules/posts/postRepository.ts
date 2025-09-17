import { BaseRepository } from '../../bases/repositoryBase'
import { PostStatus, PostType } from '../../../generated/prisma'

export class PostRepository extends BaseRepository<'post'> {
  constructor(logger?: { info?: (...args: any[]) => void; error?: (...args: any[]) => void }) {
    super('post', logger)
  }

  // Tìm post theo slug
  async findBySlug(slug: string, include?: any, client?: any) {
    return this.findUnique({ where: { slug }, include }, client)
  }

  // Tìm posts đã publish và không hết hạn
  async findPublished(
    options: {
      limit?: number
      skip?: number
      categoryId?: number
      postType?: PostType
      include?: any
    } = {},
    client?: any
  ) {
    const { limit, skip, categoryId, postType, include } = options
    const now = new Date()

    const where: any = {
      status: PostStatus.PUBLISHED,
      publishedAt: { lte: now },
      OR: [{ expiredAt: null }, { expiredAt: { gt: now } }]
    }

    if (categoryId) where.categoryId = categoryId
    if (postType) where.postType = postType

    return this.findMany(
      {
        where,
        include,
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip
      },
      client
    )
  }

  // Tìm posts theo category
  async findByCategory(
    categoryId: number,
    options: {
      limit?: number
      skip?: number
      status?: PostStatus
      include?: any
    } = {},
    client?: any
  ) {
    const { limit, skip, status, include } = options
    const where: any = { categoryId }

    if (status) where.status = status

    return this.findMany(
      {
        where,
        include,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      },
      client
    )
  }

  // Tìm posts featured/highlighted
  async findFeatured(
    options: {
      limit?: number
      isFeatured?: boolean
      isHighlighted?: boolean
      include?: any
    } = {},
    client?: any
  ) {
    const { limit, isFeatured, isHighlighted, include } = options
    const now = new Date()

    const where: any = {
      status: PostStatus.PUBLISHED,
      publishedAt: { lte: now },
      OR: [{ expiredAt: null }, { expiredAt: { gt: now } }]
    }

    if (isFeatured !== undefined) where.isFeatured = isFeatured
    if (isHighlighted !== undefined) where.isHighlighted = isHighlighted

    return this.findMany(
      {
        where,
        include,
        orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
        take: limit
      },
      client
    )
  }

  // Tìm posts cần auto-publish (scheduled posts)
  async findScheduledForPublish(client?: any) {
    const now = new Date()

    return this.findMany(
      {
        where: {
          status: PostStatus.DRAFT,
          scheduledAt: { lte: now },
          publishedAt: null
        }
      },
      client
    )
  }

  // Tìm posts hết hạn cần archive
  async findExpiredPosts(client?: any) {
    const now = new Date()

    return this.findMany(
      {
        where: {
          status: PostStatus.PUBLISHED,
          expiredAt: { lte: now }
        }
      },
      client
    )
  }

  // Tìm kiếm theo keyword trong title, excerpt, content
  async search(
    keyword: string,
    options: {
      limit?: number
      skip?: number
      status?: PostStatus
      categoryId?: number
      postType?: PostType
      include?: any
    } = {},
    client?: any
  ) {
    const { limit, skip, status, categoryId, postType, include } = options

    const where: any = {
      OR: [
        { title: { contains: keyword, mode: 'insensitive' } },
        { excerpt: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } }
      ]
    }

    if (status) where.status = status
    if (categoryId) where.categoryId = categoryId
    if (postType) where.postType = postType

    return this.findMany(
      {
        where,
        include,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      },
      client
    )
  }

  // Kiểm tra slug có tồn tại không
  async slugExists(slug: string, excludeId?: number, client?: any) {
    const where: any = { slug }
    if (excludeId) where.id = { not: excludeId }

    const existing = await this.findUnique({ where }, client)
    return !!existing
  }

  // Đếm posts theo status
  async countByStatus(status: PostStatus, client?: any) {
    return this.count({ where: { status } }, client)
  }

  // Đếm posts theo category
  async countByCategory(categoryId: number, status?: PostStatus, client?: any) {
    const where: any = { categoryId }
    if (status) where.status = status

    return this.count({ where }, client)
  }

  // Lấy posts liên quan (cùng category, loại trừ current post)
  async findRelated(
    postId: number,
    categoryId?: number,
    options: {
      limit?: number
      postType?: PostType
      include?: any
    } = {},
    client?: any
  ) {
    const { limit = 5, postType, include } = options
    const now = new Date()

    const where: any = {
      id: { not: postId },
      status: PostStatus.PUBLISHED,
      publishedAt: { lte: now },
      OR: [{ expiredAt: null }, { expiredAt: { gt: now } }]
    }

    if (categoryId) where.categoryId = categoryId
    if (postType) where.postType = postType

    return this.findMany(
      {
        where,
        include,
        orderBy: { publishedAt: 'desc' },
        take: limit
      },
      client
    )
  }

  // Update post với tagged categories (many-to-many)
  async updateWithCategories(id: number, data: any, categoryIds: number[] = [], client?: any) {
    const updateData = { ...data }

    // Handle tagged categories relationship
    if (categoryIds.length > 0) {
      updateData.taggedCategories = {
        set: categoryIds.map((catId) => ({ id: catId }))
      }
    }

    return this.update({ where: { id } }, updateData, client)
  }

  // Batch update posts status
  async updateManyStatus(ids: number[], status: PostStatus, additionalData: any = {}, client?: any) {
    const updateData = {
      status,
      ...additionalData
    }

    // Auto-set publishedAt when publishing
    if (status === PostStatus.PUBLISHED && !additionalData.publishedAt) {
      updateData.publishedAt = new Date()
    }

    return this.updateMany({ where: { id: { in: ids } } }, updateData, client)
  }
}
