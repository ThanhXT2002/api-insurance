import { BaseRepository } from '../../bases/repositoryBase'

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
   * Lấy danh sách menu categories kèm menu items (tree structure)
   * @param active - undefined = all, true = active only, false = inactive only
   * @param includeItems - Có include menu items không
   */
  async findAllWithMenuItems(active?: boolean, includeItems = true, client?: any) {
    const where: any = {}

    // Filter by active status
    if (active !== undefined) {
      where.active = active
    }

    const include: any = {
      creator: { select: { id: true, name: true, email: true } },
      updater: { select: { id: true, name: true, email: true } }
    }

    if (includeItems) {
      include.menus = {
        where: { parentId: null }, // Chỉ lấy root items
        orderBy: { order: 'asc' },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          updater: { select: { id: true, name: true, email: true } },
          children: {
            orderBy: { order: 'asc' },
            include: {
              creator: { select: { id: true, name: true, email: true } },
              updater: { select: { id: true, name: true, email: true } },
              children: {
                orderBy: { order: 'asc' },
                include: {
                  creator: { select: { id: true, name: true, email: true } },
                  updater: { select: { id: true, name: true, email: true } },
                  children: {
                    include: {
                      creator: { select: { id: true, name: true, email: true } },
                      updater: { select: { id: true, name: true, email: true } }
                    }
                  } // Level 4 nếu cần
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
        orderBy: { createdAt: 'desc' }
      },
      client
    )
  }

  /**
   * Lấy một category kèm tất cả menu items theo cấu trúc tree
   */
  async findOneWithTree(categoryId: number, activeOnly = false, client?: any) {
    const menuWhere: any = { parentId: null }
    if (activeOnly) {
      menuWhere.active = true
    }

    return this.findUnique(
      {
        where: { id: categoryId },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          updater: { select: { id: true, name: true, email: true } },
          menus: {
            where: menuWhere,
            orderBy: { order: 'asc' },
            include: {
              creator: { select: { id: true, name: true, email: true } },
              updater: { select: { id: true, name: true, email: true } },
              children: {
                where: activeOnly ? { active: true } : undefined,
                orderBy: { order: 'asc' },
                include: {
                  creator: { select: { id: true, name: true, email: true } },
                  updater: { select: { id: true, name: true, email: true } },
                  children: {
                    where: activeOnly ? { active: true } : undefined,
                    orderBy: { order: 'asc' },
                    include: {
                      creator: { select: { id: true, name: true, email: true } },
                      updater: { select: { id: true, name: true, email: true } },
                      children: {
                        where: activeOnly ? { active: true } : undefined,
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
          }
        }
      },
      client
    )
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
}
