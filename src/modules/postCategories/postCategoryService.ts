import { BaseService } from '../../bases/baseService'
import { PostCategoryRepository } from './postCategoryRepository'
import { seoService, SeoDto } from '../../services/seoService'
import { normalizeSlug } from '../../utils/urlHelper'
import { SeoableType } from '../../../generated/prisma'
import { withRollback } from '../../utils/rollbackHelper'

interface PostCategoryData {
  name: string
  slug?: string
  description?: string
  parentId?: number
  active?: boolean
  order?: number
  seoMeta?: SeoDto
}


export class PostCategoryService extends BaseService {
  constructor(protected repo: PostCategoryRepository) {
    super(repo)
  }

  // Override keyword search để search theo name/description - with audit transformation
  async getAll(params: any = {}) {
    const { keyword, ...otherParams } = params

    if (keyword) {
      const results = await this.repo.search(keyword, this.getAuditInclude())
      const transformedResults = this.transformUserAuditFields(results)
      const total = transformedResults.length
      return { rows: transformedResults, total }
    }

    return super.getAll(otherParams)
  }

  // Lấy tree hierarchy - with audit transformation
  async getTree() {
    const tree = await this.repo.findTree(this.getAuditInclude())
    return this.transformUserAuditFields(tree)
  }

  // Lấy root categories - with audit transformation
  async getRoots() {
    const roots = await this.repo.findRoots(this.getAuditInclude())
    return this.transformUserAuditFields(roots)
  }

  // Lấy children của category - with audit transformation
  async getChildren(parentId: number) {
    const children = await this.repo.findChildren(parentId, this.getAuditInclude())
    return this.transformUserAuditFields(children)
  }

  // Tạo category mới với validation và SEO - with audit transformation
  async create(data: PostCategoryData, ctx?: { actorId?: number }) {
    return withRollback(async (rollbackManager) => {
      // Derive slug from name (frontend should not provide slug)
      const normalizedSlug = normalizeSlug(data.name)
      // Validate slug unique
      const slugExists = await this.repo.slugExists(normalizedSlug)
      if (slugExists) {
        throw new Error('Slug already exists')
      }

      // Validate parentId nếu có
      if (data.parentId) {
        const parent = await this.repo.findById(data.parentId)
        if (!parent) {
          throw new Error('Parent category not found')
        }
      }

      // Tạo category trước (gán slug được tạo từ name)
      const { seoMeta, ...categoryData } = data
      // Ensure slug is taken from name, ignore any client-provided slug
      categoryData.slug = normalizedSlug

      // Prisma nested relation: translate parentId => parent.connect
      if (categoryData.parentId !== undefined && categoryData.parentId !== null) {
        // connect to existing parent by id
        ;(categoryData as any).parent = { connect: { id: categoryData.parentId } }
      }
      // Remove scalar parentId so Prisma client receives relation object
      delete (categoryData as any).parentId

      // Build explicit payload for Prisma to avoid accidental scalar fields
      const prismaPayload: any = {
        name: categoryData.name,
        slug: categoryData.slug,
        description: categoryData.description,
        active: categoryData.active,
        order: (categoryData as any).order
      }
      if ((categoryData as any).parent) prismaPayload.parent = (categoryData as any).parent

      const result = await super.create(prismaPayload, ctx)

      // Tạo SEO metadata nếu có
      if (seoMeta) {
        try {
          await seoService.upsertSeoFor(SeoableType.POST_CATEGORY, result.id, seoMeta, {
            actorId: ctx?.actorId,
            rollback: rollbackManager
          })
        } catch (error) {
          // Add rollback action to delete created category if SEO fails
          rollbackManager.addAsyncAction(async () => {
            await this.repo.delete({ id: result.id })
          })
          throw error
        }
      }
      return this.transformUserAuditFields(result)
    })
  }

  // Update category với validation và SEO - with audit transformation
  async updateById(id: number, data: PostCategoryData, ctx?: { actorId?: number }) {
    return withRollback(async (rollbackManager) => {
      const existing = await this.repo.findById(id)
      if (!existing) {
        throw new Error('Category not found')
      }

      // If name is being updated, derive slug from the new name and validate uniqueness
      if (data.name) {
        const normalizedSlug = normalizeSlug(data.name)
        if (normalizedSlug !== existing.slug) {
          const slugExists = await this.repo.slugExists(normalizedSlug, id)
          if (slugExists) {
            throw new Error('Slug already exists')
          }
          // Use derived slug from name regardless of client-provided slug
          data.slug = normalizedSlug
        }
      }

      // Validate parentId để tránh circular reference
      if (data.parentId) {
        if (data.parentId === id) {
          throw new Error('Category cannot be parent of itself')
        }

        // Kiểm tra có phải descendant không
        const isDescendant = await this.isDescendant(id, data.parentId)
        if (isDescendant) {
          throw new Error('Cannot set parent to descendant category')
        }
      }

      // Update category trước (gắn slug đã chuẩn hoá nếu có)
      const { seoMeta, ...categoryData } = data
      if (data.slug) {
        categoryData.slug = data.slug
      }

      // Handle parent update via relation operations
      if ((data as any).parentId !== undefined) {
        if ((data as any).parentId === null) {
          // disconnect parent
          ;(categoryData as any).parent = { disconnect: true }
        } else {
          // connect to another parent
          ;(categoryData as any).parent = { connect: { id: (data as any).parentId } }
        }
        delete (categoryData as any).parentId
      }

      // Build explicit payload for update to avoid passing scalar parentId
      const updatePayload: any = {}
      if (categoryData.name !== undefined) updatePayload.name = categoryData.name
      if ((categoryData as any).slug !== undefined) updatePayload.slug = (categoryData as any).slug
      if (categoryData.description !== undefined) updatePayload.description = categoryData.description
      if ((categoryData as any).active !== undefined) updatePayload.active = (categoryData as any).active
      if ((categoryData as any).parent !== undefined) updatePayload.parent = (categoryData as any).parent
  if ((categoryData as any).order !== undefined) updatePayload.order = (categoryData as any).order

      const result = await super.update({ id }, updatePayload, ctx)

      // Update SEO metadata nếu có
      if (seoMeta) {
        await seoService.upsertSeoFor(SeoableType.POST_CATEGORY, id, seoMeta, {
          actorId: ctx?.actorId,
          rollback: rollbackManager
        })
      }

      return this.transformUserAuditFields(result)
    })
  }

  // Kiểm tra category A có phải là descendant của B không
  private async isDescendant(categoryId: number, potentialAncestor: number): Promise<boolean> {
    const children = await this.repo.findChildren(potentialAncestor)

    for (const child of children) {
      if (child.id === categoryId) return true
      if (await this.isDescendant(categoryId, child.id)) return true
    }

    return false
  }

  // Soft delete với kiểm tra có posts/children không
  async deleteById(id: number, force = false, ctx?: { actorId?: number }) {
    const category = await this.repo.findById(id, {
      include: {
        posts: { select: { id: true } },
        children: { select: { id: true } }
      }
    })

    if (!category) {
      throw new Error('Category not found')
    }

    if (!force) {
      if (category.posts?.length > 0) {
        throw new Error('Cannot delete category with posts. Move posts first or use force=true')
      }
      if (category.children?.length > 0) {
        throw new Error('Cannot delete category with children. Delete children first or use force=true')
      }
    }

    return super.update({ id }, { active: false }, ctx)
  }

  // Xóa nhiều categories với transaction
  async deleteMultipleWithValidation(ids: number[], force = false, ctx?: { actorId?: number }) {
    return this.repo.runTransaction(async (tx) => {
      // Kiểm tra tất cả categories tồn tại
      const categories = await this.repo.findMany(
        {
          where: { id: { in: ids } },
          include: {
            posts: { select: { id: true } },
            children: { select: { id: true } }
          }
        },
        tx
      )

      if (categories.length !== ids.length) {
        throw new Error('Some categories not found')
      }

      if (!force) {
        // Kiểm tra có posts/children không
        const withPosts = categories.filter((c: any) => c.posts?.length > 0)
        const withChildren = categories.filter((c: any) => c.children?.length > 0)

        if (withPosts.length > 0) {
          throw new Error(`Categories with posts: ${withPosts.map((c: any) => c.name).join(', ')}`)
        }
        if (withChildren.length > 0) {
          throw new Error(`Categories with children: ${withChildren.map((c: any) => c.name).join(', ')}`)
        }
      }

      // Soft delete tất cả
      return this.repo.updateMany({ id: { in: ids } }, { active: false, updatedBy: ctx?.actorId }, tx)
    })
  }

  // Active/inactive nhiều categories
  async activeMultiple(ids: number[], active: boolean, ctx?: { actorId?: number }) {
    return this.repo.updateMany({ id: { in: ids } }, { active, updatedBy: ctx?.actorId })
  }

  // Lấy theo slug - with audit transformation
  async findBySlug(slug: string) {
    const category = await this.repo.findBySlug(slug, this.getAuditInclude())
    if (!category) {
      return null
    }

    const seoMeta = await seoService.getSeoFor(SeoableType.POST_CATEGORY, category.id)

    return {
      ...this.transformUserAuditFields(category),
      seoMeta
    }
  }

  // Lấy category kèm SEO metadata
  async findByIdWithSeo(id: number) {
    const category = await this.repo.findById(id, this.getAuditInclude())
    if (!category) {
      return null
    }

    const seoMeta = await seoService.getSeoFor(SeoableType.POST_CATEGORY, id)

    return {
      ...this.transformUserAuditFields(category),
      seoMeta
    }
  }

  
}
