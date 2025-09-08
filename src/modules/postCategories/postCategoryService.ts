import { BaseService } from '../../bases/baseService'
import { PostCategoryRepository } from './postCategoryRepository'

interface CreateCategoryData {
  name: string
  slug: string
  description?: string
  parentId?: number
}

interface UpdateCategoryData {
  name?: string
  slug?: string
  description?: string
  parentId?: number
  active?: boolean
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

  // Tạo category mới với validation - with audit transformation
  async create(data: CreateCategoryData, ctx?: { actorId?: number }) {
    // Validate slug unique
    const slugExists = await this.repo.slugExists(data.slug)
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

    const result = await super.create(data, ctx)
    return this.transformUserAuditFields(result)
  }

  // Update category với validation - with audit transformation
  async updateById(id: number, data: UpdateCategoryData, ctx?: { actorId?: number }) {
    const existing = await this.repo.findById(id)
    if (!existing) {
      throw new Error('Category not found')
    }

    // Validate slug unique nếu thay đổi
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await this.repo.slugExists(data.slug, id)
      if (slugExists) {
        throw new Error('Slug already exists')
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

    const result = await super.update({ id }, data, ctx)
    return this.transformUserAuditFields(result)
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
    const result = await this.repo.findBySlug(slug, this.getAuditInclude())
    return this.transformUserAuditFields(result)
  }
}
