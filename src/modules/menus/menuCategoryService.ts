import { BaseService } from '../../bases/baseService'
import { MenuCategoryRepository } from './menuCategoryRepository'
import prisma from '../../config/prismaClient'
import { MenuHelper } from './menuHelper'

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
          menus: cat.menus ? MenuHelper.filterMenuItemsByActive(cat.menus, true) : []
        }))
      } else if (activeItemsOnly === false) {
        // Chỉ lấy inactive items
        result = categories.map((cat: any) => ({
          ...cat,
          menus: cat.menus ? MenuHelper.filterMenuItemsByActive(cat.menus, false) : []
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
      menus: category.menus ? MenuHelper.transformToPrimeNGTree(category.menus) : []
    }
    // Map tên user cho các trường createdBy/updatedBy
    return this.transformUserAuditFields(result)
  }

  /**
   * API public: Lấy menu items theo category key (chỉ active)
   * Dùng cho frontend public - Tối ưu performance
   */
  async getPublicMenuByKey(categoryKey: string) {
    // Bước 1: Lấy category info (không include menus)
    const category = await this.repo.findByKey(categoryKey, {})

    if (!category || !category.active) {
      throw new Error('Menu category không tồn tại hoặc đã bị vô hiệu hóa')
    }

    // Bước 2: Lấy tất cả menu items của category trong 1 query duy nhất
    const allMenuItems = await prisma.menuItem.findMany({
      where: {
        categoryId: category.id,
        active: true
      },
      select: {
        id: true,
        key: true,
        label: true,
        icon: true,
        url: true,
        routerLink: true,
        command: true,
        isBlank: true,
        active: true,
        order: true,
        expanded: true,
        parentId: true
      },
      orderBy: { order: 'asc' }
    })

    // Bước 3: Build tree structure từ flat array
    const menuTree = MenuHelper.buildTreeFromFlat(allMenuItems)

    // Bước 4: Transform sang PrimeNG format
    const result = {
      ...category,
      menus: MenuHelper.transformToPrimeNGTree(menuTree)
    }

    // Loại bỏ thông tin nhạy cảm cho public API
    return MenuHelper.cleanForPublic(result)
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
    const flatItems = MenuHelper.flattenMenuTree(category.menus || [])

    // Map tên user cho các trường createdBy/updatedBy
    return this.transformUserAuditFields(flatItems)
  }

  /**
   * Đếm số menu items trong category
   */
  async countMenuItems(categoryId: number): Promise<number> {
    return this.repo.countMenuItems(categoryId)
  }
}
