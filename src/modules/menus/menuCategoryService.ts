import { BaseService } from '../../bases/baseService'
import { MenuCategoryRepository } from './menuCategoryRepository'
import prisma from '../../config/prismaClient'

/**
 * Service xử lý business logic cho MenuCategory
 */
export class MenuCategoryService extends BaseService {
  constructor(protected repo: MenuCategoryRepository) {
    super(repo)
  }

  /**
   * Tạo menu category mới
   */
  async create(data: any, ctx?: { actorId?: number }) {
    const { key, name, description, position, active } = data
    const actorId = ctx?.actorId || 1

    // Validate key unique
    const exists = await this.repo.keyExists(key)
    if (exists) {
      throw new Error(`Menu category với key "${key}" đã tồn tại`)
    }

    return this.repo.create({
      key,
      name,
      description,
      position,
      active: active ?? true,
      createdBy: actorId,
      updatedBy: actorId
    })
  }

  /**
   * Cập nhật menu category
   */
  async update(id: number, data: any, ctx?: { actorId?: number }) {
    const { key, name, description, position, active } = data
    const actorId = ctx?.actorId || 1

    // Kiểm tra category tồn tại
    const existing = await this.repo.findById(id)
    if (!existing) {
      throw new Error('Menu category không tồn tại')
    }

    // Validate key unique nếu thay đổi
    if (key && key !== existing.key) {
      const exists = await this.repo.keyExists(key, id)
      if (exists) {
        throw new Error(`Menu category với key "${key}" đã tồn tại`)
      }
    }

    const updateData: any = { updatedBy: actorId }
    if (key !== undefined) updateData.key = key
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (position !== undefined) updateData.position = position
    if (active !== undefined) updateData.active = active

    return this.repo.update({ id }, updateData)
  }

  /**
   * Xóa menu category (cascade xóa tất cả menu items)
   */
  async delete(id: number, hard = true) {
    // Kiểm tra category tồn tại
    const existing = await this.repo.findById(id)
    if (!existing) {
      throw new Error('Menu category không tồn tại')
    }

    if (hard) {
      // Hard delete - Prisma sẽ tự động cascade delete menu items (onDelete: Cascade trong schema)
      return this.repo.delete({ id })
    } else {
      // Soft delete - set active = false
      return this.repo.update({ id }, { active: false })
    }
  }

  /**
   * Batch active/inactive menu categories
   */
  async activeMultiple(ids: number[], active: boolean, ctx?: { actorId?: number }) {
    const actorId = ctx?.actorId || 1

    return this.repo.updateMany({ id: { in: ids } }, { active, updatedBy: actorId })
  }

  /**
   * Lấy danh sách menu categories (có thể kèm menu items)
   */
  async getAllWithMenuItems(
    params: {
      active?: boolean // undefined = all, true = active only, false = inactive only
      includeItems?: boolean
      activeItemsOnly?: boolean // undefined = all, true = active only, false = inactive only
    } = {}
  ) {
    const { active, includeItems = true, activeItemsOnly } = params

    const categories = await this.repo.findAllWithMenuItems(active, includeItems)

    let result = categories

    // Filter menu items theo active status nếu được chỉ định
    if (includeItems && activeItemsOnly !== undefined && categories) {
      if (activeItemsOnly === true) {
        // Chỉ lấy active items
        result = categories.map((cat: any) => ({
          ...cat,
          menus: cat.menus ? this.filterMenuItemsByActive(cat.menus, true) : []
        }))
      } else if (activeItemsOnly === false) {
        // Chỉ lấy inactive items
        result = categories.map((cat: any) => ({
          ...cat,
          menus: cat.menus ? this.filterMenuItemsByActive(cat.menus, false) : []
        }))
      }
      // Nếu undefined thì giữ nguyên tất cả
    }

    // Map tên user cho các trường createdBy/updatedBy
    return this.transformUserAuditFields(result)
  }

  /**
   * Lấy một category kèm tree structure của menu items (cho PrimeNG)
   */
  async getOneWithTree(categoryId: number, activeOnly = false) {
    const category = await this.repo.findOneWithTree(categoryId, activeOnly)

    if (!category) {
      throw new Error('Menu category không tồn tại')
    }

    // Transform sang format PrimeNG TreeNode
    const result = {
      ...category,
      menus: category.menus ? this.transformToPrimeNGTree(category.menus) : []
    }
    // Map tên user cho các trường createdBy/updatedBy
    return this.transformUserAuditFields(result)
  }

  /**
   * API public: Lấy menu items theo category key (chỉ active)
   * Dùng cho frontend public
   */
  async getPublicMenuByKey(categoryKey: string) {
    // Lấy category theo key, phải active
    const category = await this.repo.findByKey(categoryKey, {
      creator: { select: { id: true, name: true, email: true } },
      updater: { select: { id: true, name: true, email: true } },
      menus: {
        where: { parentId: null, active: true },
        orderBy: { order: 'asc' },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          updater: { select: { id: true, name: true, email: true } },
          children: {
            where: { active: true },
            orderBy: { order: 'asc' },
            include: {
              creator: { select: { id: true, name: true, email: true } },
              updater: { select: { id: true, name: true, email: true } },
              children: {
                where: { active: true },
                orderBy: { order: 'asc' },
                include: {
                  creator: { select: { id: true, name: true, email: true } },
                  updater: { select: { id: true, name: true, email: true } },
                  children: {
                    where: { active: true },
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
    })

    if (!category || !category.active) {
      throw new Error('Menu category không tồn tại hoặc đã bị vô hiệu hóa')
    }

    const result = {
      ...category,
      menus: category.menus ? this.transformToPrimeNGTree(category.menus) : []
    }
    // Map tên user cho các trường createdBy/updatedBy
    return this.transformUserAuditFields(result)
  }

  /**
   * Transform menu items sang PrimeNG TreeNode format
   */
  private transformToPrimeNGTree(items: any[]): any[] {
    return items.map((item) => ({
      key: item.key,
      label: item.label,
      data: {
        id: item.id,
        icon: item.icon,
        url: item.url,
        routerLink: item.routerLink,
        command: item.command,
        isBlank: item.isBlank,
        active: item.active,
        order: item.order
      },
      icon: item.icon,
      expanded: item.expanded,
      children: item.children && item.children.length > 0 ? this.transformToPrimeNGTree(item.children) : undefined
    }))
  }

  /**
   * Filter chỉ lấy active menu items (recursive)
   */
  private filterActiveMenuItems(items: any[]): any[] {
    return items
      .filter((item) => item.active)
      .map((item) => ({
        ...item,
        children: item.children ? this.filterActiveMenuItems(item.children) : []
      }))
  }

  /**
   * Filter menu items theo active status (recursive)
   * @param items - Danh sách menu items
   * @param active - true = chỉ lấy active, false = chỉ lấy inactive
   */
  private filterMenuItemsByActive(items: any[], active: boolean): any[] {
    return items
      .filter((item) => item.active === active)
      .map((item) => ({
        ...item,
        children: item.children ? this.filterMenuItemsByActive(item.children, active) : []
      }))
  }

  /**
   * Lấy tất cả menu items trong category dạng flat list (không phân biệt cha con)
   * @param categoryId - ID của menu category
   * @param activeOnly - Chỉ lấy items active (default: undefined = tất cả)
   * @returns Flat array of menu items
   */
  async getAllItemsFlat(categoryId: number, activeOnly?: boolean) {
    // Lấy category với tất cả menu items (tree structure)
    const category = await this.repo.findOneWithTree(categoryId, activeOnly)

    if (!category) {
      throw new Error('Menu category không tồn tại')
    }

    // Flatten tree thành flat list
    const flatItems = this.flattenMenuTree(category.menus || [])

    // Map tên user cho các trường createdBy/updatedBy
    return this.transformUserAuditFields(flatItems)
  }

  /**
   * Flatten menu tree thành flat array (recursive)
   * @param items - Menu items tree
   * @returns Flat array
   */
  private flattenMenuTree(items: any[]): any[] {
    const result: any[] = []

    const flatten = (items: any[]) => {
      items.forEach((item) => {
        // Add item hiện tại (không bao gồm children trong output)
        const { children, ...itemWithoutChildren } = item
        result.push(itemWithoutChildren)

        // Recursively flatten children
        if (children && children.length > 0) {
          flatten(children)
        }
      })
    }

    flatten(items)
    return result
  }

  /**
   * Đếm số menu items trong category
   */
  async countMenuItems(categoryId: number): Promise<number> {
    return this.repo.countMenuItems(categoryId)
  }
}
