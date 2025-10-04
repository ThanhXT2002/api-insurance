import { BaseRepository } from '../../bases/repositoryBase'
import prisma from '../../config/prismaClient'

/**
 * Repository xử lý CRUD cho MenuCategory
 */
export class MenuCategoryRepository extends BaseRepository<'menuCategory'> {
  constructor(logger?: { info?: (...args: any[]) => void; error?: (...args: any[]) => void }) {
    super('menuCategory', logger)
  }

  /**
   * Tìm menu category theo key
   */
  async findByKey(key: string, include?: any, client?: any) {
    return this.findUnique({ where: { key }, include }, client)
  }

  /**
   * Lấy danh sách menu categories kèm menu items (tree structure) - Tối ưu performance
   * @param active - undefined = all, true = active only, false = inactive only
   * @param includeItems - Có include menu items không
   */
  async findAllWithMenuItems(active?: boolean, includeItems = true, client?: any) {
    const where: any = {}

    // Filter by active status
    if (active !== undefined) {
      where.active = active
    }

    // Bước 1: Lấy categories (không include menus)
    const categories = await this.findMany(
      {
        where,
        include: {
          creator: { select: { id: true, name: true, email: true } },
          updater: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      },
      client
    )

    if (!includeItems || categories.length === 0) {
      return categories
    }

    // Bước 2: Lấy tất cả menu items của các categories trong 1 query
    const categoryIds = categories.map((cat: any) => cat.id)
    const allMenuItems = await prisma.menuItem.findMany({
      where: {
        categoryId: { in: categoryIds }
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        updater: { select: { id: true, name: true, email: true } }
      },
      orderBy: { order: 'asc' }
    })

    // Bước 3: Group menu items theo categoryId và build tree
    const menusByCategory = new Map()

    allMenuItems.forEach((item: any) => {
      if (!menusByCategory.has(item.categoryId)) {
        menusByCategory.set(item.categoryId, [])
      }
      menusByCategory.get(item.categoryId).push(item)
    })

    // Bước 4: Build tree cho mỗi category
    return categories.map((category: any) => ({
      ...category,
      menus: this.buildTreeFromFlat(menusByCategory.get(category.id) || [])
    }))
  }

  /**
   * Lấy một category kèm tất cả menu items theo cấu trúc tree - Tối ưu performance
   */
  async findOneWithTree(categoryId: number, activeOnly = false, client?: any) {
    // Bước 1: Lấy category info (không include menus)
    const category = await this.findUnique(
      {
        where: { id: categoryId },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          updater: { select: { id: true, name: true, email: true } }
        }
      },
      client
    )

    if (!category) {
      return null
    }

    // Bước 2: Lấy tất cả menu items của category trong 1 query
    const menuWhere: any = { categoryId }
    if (activeOnly) {
      menuWhere.active = true
    }

    const allMenuItems = await prisma.menuItem.findMany({
      where: menuWhere,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        updater: { select: { id: true, name: true, email: true } }
      },
      orderBy: { order: 'asc' }
    })

    // Bước 3: Build tree structure từ flat array
    return {
      ...category,
      menus: this.buildTreeFromFlat(allMenuItems)
    }
  }

  /**
   * Kiểm tra key đã tồn tại chưa
   */
  async keyExists(key: string, excludeId?: number, client?: any) {
    const where: any = { key }
    if (excludeId) where.id = { not: excludeId }

    const count = await this.count(where, client)
    return count > 0
  }

  /**
   * Đếm số menu items thuộc category
   */
  async countMenuItems(categoryId: number, client?: any) {
    const result = await this.delegate(client).findUnique({
      where: { id: categoryId },
      select: { _count: { select: { menus: true } } }
    })
    return result?._count?.menus || 0
  }

  /**
   * Build tree structure từ flat array (O(n) complexity)
   * @param items - Flat array of menu items
   * @returns Tree structure
   */
  private buildTreeFromFlat(items: any[]): any[] {
    const itemMap = new Map()
    const roots: any[] = []

    // Bước 1: Tạo map và khởi tạo children array
    items.forEach((item: any) => {
      itemMap.set(item.id, { ...item, children: [] })
    })

    // Bước 2: Build tree structure
    items.forEach((item: any) => {
      const treeItem = itemMap.get(item.id)

      if (item.parentId === null) {
        // Root item
        roots.push(treeItem)
      } else {
        // Child item - add to parent's children
        const parent = itemMap.get(item.parentId)
        if (parent) {
          parent.children.push(treeItem)
        }
      }
    })

    // Bước 3: Sắp xếp children theo order (recursive)
    const sortChildren = (items: any[]) => {
      items.forEach((item: any) => {
        if (item.children.length > 0) {
          item.children.sort((a: any, b: any) => a.order - b.order)
          sortChildren(item.children)
        }
      })
    }

    roots.sort((a, b) => a.order - b.order)
    sortChildren(roots)

    return roots
  }
}
