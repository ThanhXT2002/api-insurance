import { BaseRepository } from '../../bases/repositoryBase'
import { PostStatus, PostType } from '../../../generated/prisma'
import prisma from '../../config/prismaClient'

export class PostRepository extends BaseRepository<'post'> {
  constructor(logger?: { info?: (...args: any[]) => void; error?: (...args: any[]) => void }) {
    super('post', logger)
  }

  // Tìm post theo slug
  // Accept options so callers can provide `select` or `include`.
  async findBySlug(slug: string, options: { select?: any; include?: any } = {}, client?: any) {
    const defaultSelect = {
      // include most public-facing fields but exclude admin / heavy fields
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
      // relations useful for public pages
      category: { select: { id: true, name: true, slug: true } },
      taggedCategoryTags: { select: { category: { select: { id: true, name: true, slug: true } } } },
      postProductLinks: { select: { product: { select: { id: true, name: true, slug: true, price: true } } } },
      _count: { select: { comments: true } }
    }

    const { select, include } = options
    // Avoid passing both `select` and `include` to Prisma at the same time.
    const queryShape = include ? { include } : { select: select ?? defaultSelect }
    return this.findUnique({ where: { slug }, ...queryShape }, client)
  }

  // Tìm post đã publish theo slug (áp dụng rule publishedAt <= now và chưa expired)
  // Accept options with `select` so callers can ask for a lightweight shape.
  async findPublishedBySlug(slug: string, options: { select?: any; include?: any } = {}, client?: any) {
    const now = new Date()
    const where: any = {
      slug,
      status: PostStatus.PUBLISHED,
      publishedAt: { lte: now },
      OR: [{ expiredAt: null }, { expiredAt: { gt: now } }]
    }

    const defaultSelect = {
      // intentionally exclude the heavy/admin fields requested by the user
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
      // relations useful on public page
      category: { select: { id: true, name: true, slug: true } },
      taggedCategoryTags: { select: { category: { select: { id: true, name: true, slug: true } } } },
      postProductLinks: { select: { product: { select: { id: true, name: true, slug: true, price: true } } } },
      _count: { select: { comments: true } }
    }

    const { select, include } = options

    // Avoid passing both `select` and `include` to Prisma at the same time.
    const queryShape = include ? { include } : { select: select ?? defaultSelect }

    // Use findMany with take:1 since BaseRepository doesn't expose findFirst
    const results = await this.findMany({ where, ...queryShape, take: 1 }, client)
    return Array.isArray(results) && results.length > 0 ? results[0] : null
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

  // Minimal variant: select only fields needed for lists to improve performance
  async findPublishedMinimal(
    options: {
      limit?: number
      skip?: number
      categoryId?: number
      postType?: PostType
      select?: any
    } = {},
    client?: any
  ) {
    const { limit, skip, categoryId, postType } = options
    const now = new Date()

    const where: any = {
      status: PostStatus.PUBLISHED,
      publishedAt: { lte: now },
      OR: [{ expiredAt: null }, { expiredAt: { gt: now } }]
    }

    if (categoryId) where.categoryId = categoryId
    if (postType) where.postType = postType

    const select = options.select ?? {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      featuredImage: true,
      priority: true,
      publishedAt: true
    }

    return this.findMany(
      {
        where,
        select,
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

  // Minimal variant for featured posts
  async findFeaturedMinimal(
    options: {
      limit?: number
      isFeatured?: boolean
      isHighlighted?: boolean
      select?: any
    } = {},
    client?: any
  ) {
    const { limit, isFeatured, isHighlighted } = options
    const now = new Date()

    const where: any = {
      status: PostStatus.PUBLISHED,
      publishedAt: { lte: now },
      OR: [{ expiredAt: null }, { expiredAt: { gt: now } }]
    }
    if (isFeatured !== undefined) where.isFeatured = isFeatured
    if (isHighlighted !== undefined) where.isHighlighted = isHighlighted

    const select = options.select ?? {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      featuredImage: true,
      priority: true,
      publishedAt: true
    }

    return this.findMany(
      {
        where,
        select,
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
      isFeatured?: boolean
      isHighlighted?: boolean
      include?: any
    } = {},
    client?: any
  ) {
    const { limit, skip, status, categoryId, postType, isFeatured, isHighlighted, include } = options

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
    if (isFeatured !== undefined) where.isFeatured = isFeatured
    if (isHighlighted !== undefined) where.isHighlighted = isHighlighted

    const findQuery: any = {
      where,
      orderBy: { publishedAt: 'desc' }
    }

    if (skip) findQuery.skip = skip
    if (limit) findQuery.take = limit
    if (include) findQuery.include = include

    // Use provided transaction client when available, otherwise fall back to global prisma
    const db = client ?? prisma

    // Run count and findMany in parallel for accurate pagination
    const countPromise = db.post.count({ where })
    const rowsPromise = db.post.findMany(findQuery)

    const [total, rows] = await Promise.all([countPromise, rowsPromise])

    return { rows, total }
  }

  // Kiểm tra slug có tồn tại không
  async slugExists(slug: string, excludeId?: number, client?: any) {
    const where: any = { slug }
    if (excludeId) where.id = { not: excludeId }

    // Use count which accepts complex filters (excludeId via not) and is efficient
    const existingCount = await this.count({ where }, client)
    return existingCount > 0
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

  // Minimal variant for related posts
  async findRelatedMinimal(
    postId: number,
    categoryId?: number,
    options: {
      limit?: number
      postType?: PostType
      select?: any
    } = {},
    client?: any
  ) {
    const { limit = 5, postType } = options
    const now = new Date()

    const where: any = {
      id: { not: postId },
      status: PostStatus.PUBLISHED,
      publishedAt: { lte: now },
      OR: [{ expiredAt: null }, { expiredAt: { gt: now } }]
    }

    if (categoryId) where.categoryId = categoryId
    if (postType) where.postType = postType

    const select = options.select ?? {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      featuredImage: true,
      priority: true,
      publishedAt: true
    }

    return this.findMany(
      {
        where,
        select,
        orderBy: { publishedAt: 'desc' },
        take: limit
      },
      client
    )
  }

  // Update post với tagged categories (many-to-many)
  async updateWithCategories(id: number, data: any, categoryIds: number[] = [], client?: any) {
    // We'll perform two steps:
    // 1) update the post row with `data`
    // 2) replace the join rows in `post_category_tags` for the given post
    // If a transaction client is provided, use it for both steps so it's atomic.

    // Step 1: update post
    if (client) {
      // Use the provided transaction client to update the post
      await client.post.update({ where: { id }, data })

      // Step 2: replace join rows inside the same transaction
      await client.postCategoryTag.deleteMany({ where: { postId: id } })
      if (categoryIds.length === 0) return await client.post.findUnique({ where: { id } })

      const createData = categoryIds.map((catId) => ({ postId: id, categoryId: catId }))
      try {
        await client.postCategoryTag.createMany({ data: createData, skipDuplicates: true })
      } catch (e) {
        for (const d of createData) await client.postCategoryTag.create({ data: d })
      }

      return await client.post.findUnique({ where: { id } })
    }

    // Non-transactional fallback: update post, then replace tags using global prisma
    const updated = await this.update({ id }, data)
    // Delete existing tags
    await prisma.postCategoryTag.deleteMany({ where: { postId: id } })
    if (categoryIds.length === 0) return updated
    const createData = categoryIds.map((catId) => ({ postId: id, categoryId: catId }))
    try {
      await prisma.postCategoryTag.createMany({ data: createData, skipDuplicates: true })
    } catch (e) {
      for (const d of createData) await prisma.postCategoryTag.create({ data: d })
    }

    return updated
  }

  // Update post -> products links by replacing existing join rows
  async updateWithProducts(id: number, productIds: number[] = [], client?: any) {
    // In transaction: delete existing post_products for this post and recreate
    const tx = client ?? (await (async () => null)())
    // We expect caller to pass a transaction client when using this inside a transaction.
    // If no client provided, perform deleteMany/createMany using global client.
    if (!client) {
      // Non-transactional fallback
      await (this as any).model.deleteMany({ where: { postId: id } })
      if (productIds.length === 0) return
      const createData = productIds.map((pid) => ({ postId: id, productId: pid }))
      // Use createMany with skipDuplicates if available
      try {
        await (this as any).model.createMany({ data: createData, skipDuplicates: true })
      } catch (e) {
        // fallback to individual creates
        for (const d of createData) await (this as any).model.create({ data: d })
      }
      return
    }

    // When running inside a Prisma transaction, client is the full prisma client
    await client.postProduct.deleteMany({ where: { postId: id } })
    if (productIds.length === 0) return
    const createData = productIds.map((pid) => ({ postId: id, productId: pid }))
    try {
      await client.postProduct.createMany({ data: createData, skipDuplicates: true })
    } catch (e) {
      for (const d of createData) await client.postProduct.create({ data: d })
    }
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

    // Pass the where filter directly to BaseRepository.updateMany (BaseRepository will wrap it)
    return this.updateMany({ id: { in: ids } }, updateData, client)
  }
}
