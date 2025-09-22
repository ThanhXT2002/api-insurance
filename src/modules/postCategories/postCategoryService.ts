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

  // Service xử lý nghiệp vụ liên quan tới PostCategory
  // - Bao gồm các thao tác CRUD với validation bổ sung
  // - Tương tác với repository và seoService

  // Override keyword search để search theo name/description - with audit transformation
  async getAll(params: any = {}) {
    const { keyword, ...otherParams } = params

    if (keyword) {
      // Tìm kiếm theo keyword (name/description)
      const results = await this.repo.search(keyword, this.getAuditInclude())
      const transformedResults = this.transformUserAuditFields(results)
      const total = transformedResults.length
      return { rows: transformedResults, total }
    }

    return super.getAll(otherParams)
  }

  // Lấy tree hierarchy - with audit transformation
  async getTree() {
    // Lấy cấu trúc cây phân cấp của danh mục
    const tree = await this.repo.findTree(this.getAuditInclude())
    return this.transformUserAuditFields(tree)
  }

  // Lấy root categories - with audit transformation
  async getRoots() {
    // Lấy các danh mục gốc (không có parent)
    const roots = await this.repo.findRoots(this.getAuditInclude())
    return this.transformUserAuditFields(roots)
  }

  // Lấy children của category - with audit transformation
  async getChildren(parentId: number) {
    // Lấy các con trực tiếp của parentId
    const children = await this.repo.findChildren(parentId, this.getAuditInclude())
    return this.transformUserAuditFields(children)
  }

  /**
   * Lấy một cây phân cấp bắt đầu từ `parentId` (nếu parentId === null trả về các root)
   * Thuật toán:
   *  - Thực hiện một lần truy vấn lấy tất cả các category (hoặc chỉ active nếu không yêu cầu inactive)
   *  - Xây dựng map id -> node và nối children vào parent trong bộ nhớ (O(n))
   *  - Trả về node tương ứng với parentId (kèm toàn bộ cây con). Nếu parentId là null trả về mảng root.
   *
   * Lý do: một truy vấn duy nhất và thao tác in-memory là nhanh nhất trong hầu hết các trường hợp so với nhiều lần truy vấn đệ quy.
   */
  // params may include: parentId, includeInactive, keyword
  async getAllNestedByParentId(params: any = {}) {
    // Parse params
    const parentId =
      typeof params.parentId === 'undefined' || params.parentId === null ? null : parseInt(params.parentId)
    const includeInactive = params.includeInactive === true || params.includeInactive === 'true'
    const keyword = params.keyword ? String(params.keyword).trim().toLowerCase() : null

    // Build where clause
    const where: any = {}
    if (!includeInactive) where.active = true

    // Fetch all candidate rows
    const rows: any[] = await this.repo.findMany({
      where,
      select: { id: true, name: true, slug: true, description: true, parentId: true, order: true, active: true }
    })

    // Build map id -> node (with children array)
    const map = new Map<number, any>()
    for (const r of rows) {
      map.set(r.id, { ...r, children: [] })
    }

    const roots: any[] = []

    // If keyword provided, compute includedIds: matching nodes + their ancestors
    let includedIds: Set<number> | null = null
    if (keyword) {
      includedIds = new Set<number>()
      for (const [id, node] of map.entries()) {
        const name = String(node.name || '').toLowerCase()
        const desc = String(node.description || '').toLowerCase()
        if (name.includes(keyword) || desc.includes(keyword)) {
          // add this node and bubble up ancestors
          let cur: any = node
          while (cur) {
            if (!includedIds.has(cur.id)) includedIds.add(cur.id)
            if (!cur.parentId) break
            cur = map.get(cur.parentId)
          }
        }
      }
    }

    for (const node of map.values()) {
      // Skip nodes that are not part of includedIds when keyword filtering
      if (includedIds && !includedIds.has(node.id)) continue

      if (node.parentId == null) {
        roots.push(node)
      } else {
        const parent = map.get(node.parentId)
        if (parent) {
          // Only attach if parent is included (or no keyword filtering)
          if (!includedIds || includedIds.has(parent.id)) parent.children.push(node)
          else roots.push(node)
        } else {
          // Parent not in the fetched set (maybe inactive or missing) => treat as root
          roots.push(node)
        }
      }
    }

    // Sorting function: by order asc (undefined -> 0) then name
    const cmp = (a: any, b: any) => {
      const oa = typeof a.order === 'number' ? a.order : 0
      const ob = typeof b.order === 'number' ? b.order : 0
      if (oa !== ob) return oa - ob
      return String(a.name || '').localeCompare(String(b.name || ''))
    }

    // Recursively sort children arrays (DFS)
    const sortRec = (nodes: any[]) => {
      nodes.sort(cmp)
      for (const n of nodes) {
        if (n.children && n.children.length > 0) sortRec(n.children)
      }
    }

    sortRec(roots)

    if (parentId === null) {
      return roots
    }

    const rootNode = map.get(parentId)
    if (!rootNode) return null
    return rootNode
  }

  // Tạo category mới với validation và SEO - with audit transformation
  async create(data: PostCategoryData, ctx?: { actorId?: number }) {
    return withRollback(async (rollbackManager) => {
      // Derive slug from name (frontend should not provide slug)
      const normalizedSlug = normalizeSlug(data.name)
      // Kiểm tra slug (được derive từ name) có bị trùng không
      const slugExists = await this.repo.slugExists(normalizedSlug)
      if (slugExists) {
        throw new Error('Đường dẫn (slug) đã tồn tại - Vui lòng chọn tên khác')
      }

      // Validate parentId nếu có: đảm bảo parent tồn tại
      if (data.parentId) {
        const parent = await this.repo.findById(data.parentId)
        if (!parent) {
          throw new Error('Không tìm thấy danh mục cha')
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
        throw new Error('Không tìm thấy danh mục')
      }

      // If name is being updated, derive slug from the new name and validate uniqueness
      // Nếu cập nhật tên, derive slug mới và kiểm tra trùng
      if (data.name) {
        const normalizedSlug = normalizeSlug(data.name)
        if (normalizedSlug !== existing.slug) {
          const slugExists = await this.repo.slugExists(normalizedSlug, id)
          if (slugExists) {
            throw new Error('Đường dẫn (slug) đã tồn tại - Vui lòng chọn tên khác')
          }
          // Use derived slug from name regardless of client-provided slug
          data.slug = normalizedSlug
        }
      }

      // Validate parentId để tránh circular reference (không cho phép tạo vòng)
      if (data.parentId) {
        if (data.parentId === id) {
          throw new Error('Danh mục không thể là cha của chính nó')
        }

        // Kiểm tra xem parent mới có nằm trong cây con của bản ghi hiện tại
        // hay không; nếu có thì sẽ tạo vòng lặp -> cấm
        const isDescendant = await this.isDescendant(data.parentId as number, id)
        if (isDescendant) {
          throw new Error('Không thể đặt cha là một danh mục con (tạo vòng lặp)')
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

  // Hard delete: remove category record and related SEO metadata.
  // If `force` is true the function will try to detach posts (set categoryId=null)
  // and cascade-delete children recursively. If `force` is false the same
  // validation as before will be applied and deletion will be blocked when
  // posts/children exist.
  async deleteById(id: number, ctx?: { actorId?: number }) {
    // Run inside a transaction to ensure SEO deletion and category removal are atomic
    return this.repo.runTransaction(async (tx) => {
      const category = await this.repo.findById(
        {
          where: { id },
          include: {
            posts: { select: { id: true } },
            children: { select: { id: true } }
          }
        },
        tx
      )

      if (!category) {
        throw new Error('Không tìm thấy danh mục')
      }

      // Always perform hard delete: detach posts to avoid FK constraint errors
      if (category.posts && category.posts.length > 0) {
        // set categoryId = null for posts belonging to this category
        await tx.post.updateMany({ where: { categoryId: id }, data: { categoryId: null, updatedBy: ctx?.actorId } })
      }

      // Delete children recursively (we'll delete direct children and rely on cascade or loop)
      if (category.children && category.children.length > 0) {
        const childIds = category.children.map((c: any) => c.id)
        // call deleteMultipleWithValidation within the same transaction
        await this.deleteMultipleWithValidation(childIds, { actorId: ctx?.actorId }, tx)
      }

      // Delete SEO metadata for this category inside the transaction
      // seoService has upsert/in-transaction helpers; use delete via prisma tx
      await tx.seoMeta.deleteMany({ where: { seoableType: SeoableType.POST_CATEGORY, seoableId: id } })

      // Finally delete the category row for real
      const deleted = await this.repo.delete({ id }, tx)
      return deleted
    })
  }

  // Xóa nhiều categories với transaction
  async deleteMultipleWithValidation(ids: number[], ctx?: { actorId?: number }, txClient?: any) {
    // Support optional transaction client so callers can reuse an existing tx.
    const perform = async (txClient: any) => {
      // Kiểm tra tất cả categories tồn tại
      const categories = await this.repo.findMany(
        {
          where: { id: { in: ids } },
          include: {
            posts: { select: { id: true } },
            children: { select: { id: true } }
          }
        },
        txClient
      )

      if (categories.length !== ids.length) {
        throw new Error('Một số danh mục không tồn tại')
      }

      // Always perform hard delete including descendants.
      // 1) expand to include all descendant categories
      const allIds = new Set<number>(ids)
      let queue = [...ids]
      while (queue.length > 0) {
        const children = await (txClient.postCategory as any).findMany({
          where: { parentId: { in: queue } },
          select: { id: true }
        })
        const newIds: number[] = []
        for (const c of children) {
          if (!allIds.has(c.id)) {
            allIds.add(c.id)
            newIds.push(c.id)
          }
        }
        queue = newIds
      }
      const finalIds = Array.from(allIds)

      // 2) detach posts belonging to these categories
      if (finalIds.length > 0) {
        await txClient.post.updateMany({
          where: { categoryId: { in: finalIds } },
          data: { categoryId: null, updatedBy: ctx?.actorId }
        })
      }

      // 3) delete SEO metadata for all these categories
      if (finalIds.length > 0) {
        await txClient.seoMeta.deleteMany({
          where: { seoableType: SeoableType.POST_CATEGORY, seoableId: { in: finalIds } }
        })
      }

      // 4) hard delete categories
      if (finalIds.length > 0) {
        return txClient.postCategory.deleteMany({ where: { id: { in: finalIds } } })
      }
      return { count: 0 }
    }

    if (txClient) {
      return perform(txClient)
    }
    return this.repo.runTransaction(async (tx) => perform(tx))
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
    console.log('seoMeta', seoMeta)

    return {
      ...this.transformUserAuditFields(category),
      seoMeta
    }
  }

  // Lấy category kèm SEO metadata
  async findByIdWithSeo(id: number) {
    const category = await this.repo.findById({ where: { id }, include: this.getAuditInclude() })
    if (!category) {
      return null
    }

    const seoMeta = await seoService.getSeoFor(SeoableType.POST_CATEGORY, id)

    console.log('seoMeta', seoMeta)

    return {
      ...this.transformUserAuditFields(category),
      seoMeta
    }
  }
}
