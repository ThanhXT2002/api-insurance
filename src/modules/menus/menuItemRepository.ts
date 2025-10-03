import { BaseRepository } from '../../bases/repositoryBase'

/**
 * Repository xử lý CRUD cho MenuItem
 */
export class MenuItemRepository extends BaseRepository<'menuItem'> {
  constructor(logger?: { info?: (...args: any[]) => void; error?: (...args: any[]) => void }) {
    super('menuItem', logger)
  }

  /**
   * Tìm tất cả menu items theo categoryId
   */
  async findByCategoryId(
    categoryId: number,
    options?: { activeOnly?: boolean; includeChildren?: boolean },
    client?: any
  ) {
    const where: any = { categoryId, parentId: null }
    if (options?.activeOnly) {
      where.active = true
    }

    const include: any = {
      creator: { select: { id: true, name: true, email: true } },
      updater: { select: { id: true, name: true, email: true } }
    }

    if (options?.includeChildren) {
      include.children = {
        where: options?.activeOnly ? { active: true } : undefined,
        orderBy: { order: 'asc' },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          updater: { select: { id: true, name: true, email: true } },
          children: {
            where: options?.activeOnly ? { active: true } : undefined,
            orderBy: { order: 'asc' },
            include: {
              creator: { select: { id: true, name: true, email: true } },
              updater: { select: { id: true, name: true, email: true } },
              children: {
                where: options?.activeOnly ? { active: true } : undefined,
                orderBy: { order: 'asc' },
                include: {
                  creator: { select: { id: true, name: true, email: true } },
                  updater: { select: { id: true, name: true, email: true } }
                }
              }
            }
          }
        }
      }
    }

    return this.findMany(
      {
        where,
        include,
        orderBy: { order: 'asc' }
      },
      client
    )
  }

  /**
   * Tìm menu item theo key trong category
   */
  async findByKey(categoryId: number, key: string, client?: any) {
    return this.findUnique(
      {
        where: {
          categoryId_key: { categoryId, key }
        }
      },
      client
    )
  }

  /**
   * Tìm tất cả children của một menu item
   * @param activeOnly - true: chỉ lấy active items, false: chỉ lấy inactive items, undefined: lấy tất cả
   */
  async findChildren(parentId: number, activeOnly?: boolean, client?: any) {
    const where: any = { parentId }
    if (activeOnly === true) where.active = true
    if (activeOnly === false) where.active = false

    return this.findMany(
      {
        where,
        include: {
          creator: { select: { id: true, name: true, email: true } },
          updater: { select: { id: true, name: true, email: true } }
        },
        orderBy: { order: 'asc' }
      },
      client
    )
  }

  /**
   * Kiểm tra key đã tồn tại trong category chưa
   */
  async keyExistsInCategory(categoryId: number, key: string, excludeId?: number, client?: any) {
    const where: any = { categoryId, key }
    if (excludeId) where.id = { not: excludeId }

    const count = await this.count(where, client)
    return count > 0
  }

  /**
   * Lấy order cao nhất trong cùng cấp (để tự động tăng)
   */
  async getMaxOrder(categoryId: number, parentId: number | null, client?: any) {
    const where: any = { categoryId, parentId }

    const items = await this.findMany(
      {
        where,
        orderBy: { order: 'desc' },
        take: 1
      },
      client
    )

    return items.length > 0 ? items[0].order : -1
  }

  /**
   * Reorder menu items (sau khi drag-drop)
   * @param updates - Array of { id, order, parentId }
   */
  async reorderItems(
    updates: Array<{ id: number; order: number; parentId: number | null }>,
    updatedBy: number,
    client?: any
  ) {
    const delegate = this.delegate(client)

    // Update từng item
    const promises = updates.map((item) =>
      delegate.update({
        where: { id: item.id },
        data: {
          order: item.order,
          parentId: item.parentId,
          updatedBy
        }
      })
    )

    return Promise.all(promises)
  }

  /**
   * Update order cho nhiều items cùng lúc
   */
  async batchUpdateOrder(items: Array<{ id: number; order: number }>, updatedBy: number, client?: any) {
    const delegate = this.delegate(client)

    const promises = items.map((item) =>
      delegate.update({
        where: { id: item.id },
        data: { order: item.order, updatedBy }
      })
    )

    return Promise.all(promises)
  }

  /**
   * Xóa menu item và tất cả children (cascade)
   */
  async deleteWithChildren(id: number, client?: any) {
    // Prisma sẽ tự động cascade delete children (onDelete: Cascade trong schema)
    return this.delete({ id }, client)
  }

  /**
   * Đếm số children của một menu item
   */
  async countChildren(parentId: number, client?: any) {
    const result = await this.delegate(client).findUnique({
      where: { id: parentId },
      select: { _count: { select: { children: true } } }
    })
    return result?._count?.children || 0
  }

  /**
   * Generate key tự động cho menu item mới
   * Key format: "0", "0-0", "0-0-1", etc.
   */
  async generateKey(categoryId: number, parentId: number | null, client?: any) {
    if (!parentId) {
      // Root level - tìm key cao nhất
      const items = await this.findMany(
        {
          where: { categoryId, parentId: null },
          orderBy: { key: 'desc' },
          take: 1
        },
        client
      )

      if (items.length === 0) return '0'

      const lastKey = items[0].key
      const lastNumber = parseInt(lastKey)
      return String(lastNumber + 1)
    } else {
      // Child level - lấy key của parent và thêm index
      const parent = await this.findById(parentId, client)
      if (!parent) throw new Error('Parent menu item không tồn tại')

      const siblings = await this.findChildren(parentId, false, client)
      return `${parent.key}-${siblings.length}`
    }
  }
}
