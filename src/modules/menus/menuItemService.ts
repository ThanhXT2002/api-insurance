import { BaseService } from '../../bases/baseService'
import { MenuItemRepository } from './menuItemRepository'

/**
 * Service xử lý business logic cho MenuItem
 */
export class MenuItemService extends BaseService {
  constructor(protected repo: MenuItemRepository) {
    super(repo)
  }

  /**
   * Tạo menu item mới
   */
  async create(data: any, ctx?: { actorId?: number }) {
    const { categoryId, parentId, label, icon, url, routerLink, command, order, isBlank, expanded, active } = data

    const actorId = ctx?.actorId || 1

    // Generate key tự động nếu không có
    const key = data.key || (await this.repo.generateKey(categoryId, parentId || null))

    // Kiểm tra key unique trong category
    const keyExists = await this.repo.keyExistsInCategory(categoryId, key)
    if (keyExists) {
      throw new Error(`Menu item với key "${key}" đã tồn tại trong category`)
    }

    // Tự động set order nếu không có
    let finalOrder = order
    if (finalOrder === undefined || finalOrder === null) {
      const maxOrder = await this.repo.getMaxOrder(categoryId, parentId || null)
      finalOrder = maxOrder + 1
    }

    return this.repo.create({
      categoryId,
      parentId: parentId || null,
      key,
      label,
      icon,
      url,
      routerLink,
      command,
      order: finalOrder,
      isBlank: isBlank ?? false,
      expanded: expanded ?? false,
      active: active ?? true,
      createdBy: actorId,
      updatedBy: actorId
    })
  }

  /**
   * Cập nhật menu item
   */
  async update(id: number, data: any, ctx?: { actorId?: number }) {
    const actorId = ctx?.actorId || 1

    // Kiểm tra item tồn tại
    const existing = await this.repo.findById(id)
    if (!existing) {
      throw new Error('Menu item không tồn tại')
    }

    // Validate key unique nếu thay đổi
    if (data.key && data.key !== existing.key) {
      const keyExists = await this.repo.keyExistsInCategory(existing.categoryId, data.key, id)
      if (keyExists) {
        throw new Error(`Menu item với key "${data.key}" đã tồn tại trong category`)
      }
    }

    const updateData: any = { updatedBy: actorId }

    // Map các fields
    const fields = [
      'key',
      'label',
      'icon',
      'url',
      'routerLink',
      'command',
      'order',
      'parentId',
      'isBlank',
      'expanded',
      'active'
    ]

    fields.forEach((field) => {
      if (data[field] !== undefined) {
        updateData[field] = data[field]
      }
    })

    return this.repo.update({ id }, updateData)
  }

  /**
   * Xóa menu item (cascade xóa children)
   */
  async delete(id: number, hard = true) {
    const existing = await this.repo.findById(id)
    if (!existing) {
      throw new Error('Menu item không tồn tại')
    }

    if (hard) {
      // Hard delete - Prisma tự động cascade
      return this.repo.deleteWithChildren(id)
    } else {
      // Soft delete - set active = false
      return this.repo.update({ id }, { active: false })
    }
  }

  /**
   * Batch active/inactive menu items
   */
  async activeMultiple(ids: number[], active: boolean, ctx?: { actorId?: number }) {
    const actorId = ctx?.actorId || 1

    return this.repo.updateMany({ id: { in: ids } }, { active, updatedBy: actorId })
  }

  /**
   * Lấy danh sách menu items theo category (tree structure)
   */
  async getItemsByCategoryId(categoryId: number, options?: { activeOnly?: boolean; includeChildren?: boolean }) {
    const items = await this.repo.findByCategoryId(categoryId, options)
    // Map tên user cho các trường createdBy/updatedBy
    return this.transformUserAuditFields(items)
  }

  /**
   * Reorder menu items (sau drag-drop)
   * @param updates - Array of { id, order, parentId }
   */
  async reorderItems(
    updates: Array<{ id: number; order: number; parentId: number | null }>,
    ctx?: { actorId?: number }
  ) {
    const actorId = ctx?.actorId || 1

    // Validate tất cả ids tồn tại
    const ids = updates.map((u) => u.id)
    const items = await this.repo.findMany({ where: { id: { in: ids } } })

    if (items.length !== ids.length) {
      throw new Error('Một số menu items không tồn tại')
    }

    // Thực hiện reorder
    return this.repo.reorderItems(updates, actorId)
  }

  /**
   * Batch update order cho nhiều items
   */
  async batchUpdateOrder(items: Array<{ id: number; order: number }>, ctx?: { actorId?: number }) {
    const actorId = ctx?.actorId || 1

    return this.repo.batchUpdateOrder(items, actorId)
  }

  /**
   * Di chuyển menu item sang parent khác
   */
  async moveItem(id: number, newParentId: number | null, newOrder?: number, ctx?: { actorId?: number }) {
    const actorId = ctx?.actorId || 1

    const item = await this.repo.findById(id)
    if (!item) {
      throw new Error('Menu item không tồn tại')
    }

    // Tự động tính order nếu không cung cấp
    let finalOrder = newOrder
    if (finalOrder === undefined) {
      const maxOrder = await this.repo.getMaxOrder(item.categoryId, newParentId)
      finalOrder = maxOrder + 1
    }

    return this.repo.update(
      { id },
      {
        parentId: newParentId,
        order: finalOrder,
        updatedBy: actorId
      }
    )
  }

  /**
   * Duplicate menu item (copy)
   */
  async duplicateItem(id: number, ctx?: { actorId?: number }) {
    const actorId = ctx?.actorId || 1

    const item = await this.repo.findById(id)
    if (!item) {
      throw new Error('Menu item không tồn tại')
    }

    // Generate key mới
    const newKey = await this.repo.generateKey(item.categoryId, item.parentId)

    // Tạo item mới với dữ liệu copy
    return this.repo.create({
      categoryId: item.categoryId,
      parentId: item.parentId,
      key: newKey,
      label: `${item.label} (Copy)`,
      icon: item.icon,
      url: item.url,
      routerLink: item.routerLink,
      command: item.command,
      order: item.order + 1,
      isBlank: item.isBlank,
      expanded: item.expanded,
      active: item.active,
      createdBy: actorId,
      updatedBy: actorId
    })
  }

  /**
   * Đếm số children của menu item
   */
  async countChildren(id: number): Promise<number> {
    return this.repo.countChildren(id)
  }

  /**
   * Lấy tất cả children của menu item
   */
  async getChildren(parentId: number, activeOnly?: boolean) {
    const children = await this.repo.findChildren(parentId, activeOnly)
    // Map tên user cho các trường createdBy/updatedBy
    return this.transformUserAuditFields(children)
  }
}
