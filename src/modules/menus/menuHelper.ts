/**

 * Menu Helper - Utility functions dùng chung cho menu module

 * Tái sử dụng code và tránh duplicate
 */
export class MenuHelper {
  /**
   * Build tree structure từ flat array (O(n) complexity)
   * @param items - Flat array of menu items
   * @returns Tree structure
   */
  static buildTreeFromFlat(items: any[]): any[] {
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

  /**
   * Transform menu items sang PrimeNG TreeNode format
   */
  static transformToPrimeNGTree(items: any[]): any[] {
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
      children: item.children && item.children.length > 0 ? MenuHelper.transformToPrimeNGTree(item.children) : undefined
    }))
  }

  /**
   * Filter chỉ lấy active menu items (recursive)
   */
  static filterActiveMenuItems(items: any[]): any[] {
    return items
      .filter((item) => item.active)
      .map((item) => ({
        ...item,
        children: item.children ? MenuHelper.filterActiveMenuItems(item.children) : []
      }))
  }

  /**
   * Filter menu items theo active status (recursive)
   * @param items - Danh sách menu items
   * @param active - true = chỉ lấy active, false = chỉ lấy inactive
   */
  static filterMenuItemsByActive(items: any[], active: boolean): any[] {
    return items
      .filter((item) => item.active === active)
      .map((item) => ({
        ...item,
        children: item.children ? MenuHelper.filterMenuItemsByActive(item.children, active) : []
      }))
  }

  /**
   * Flatten menu tree thành flat array (recursive)
   * @param items - Menu items tree
   * @returns Flat array
   */
  static flattenMenuTree(items: any[]): any[] {
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
   * Loại bỏ thông tin nhạy cảm cho public API
   * Xóa: createdAt, updatedAt, createdBy, updatedBy
   */
  static cleanForPublic(data: any): any {
    const { createdAt, updatedAt, createdBy, updatedBy, ...cleanData } = data
    return cleanData
  }

  /**
   * Group menu items theo categoryId
   * @param items - Flat array of menu items
   * @returns Map<categoryId, menuItems[]>
   */
  static groupMenuItemsByCategory(items: any[]): Map<number, any[]> {
    const menusByCategory = new Map()

    items.forEach((item: any) => {
      if (!menusByCategory.has(item.categoryId)) {
        menusByCategory.set(item.categoryId, [])
      }
      menusByCategory.get(item.categoryId).push(item)
    })

    return menusByCategory
  }

  /**
   * Validate menu item data
   * @param data - Menu item data to validate
   * @returns validation result
   */
  static validateMenuItemData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.label || data.label.trim() === '') {
      errors.push('Label là bắt buộc')
    }

    if (!data.categoryId) {
      errors.push('CategoryId là bắt buộc')
    }

    if (data.order !== undefined && (isNaN(data.order) || data.order < 0)) {
      errors.push('Order phải là số không âm')
    }

    if (data.routerLink && data.url) {
      errors.push('Không thể có cả routerLink và url cùng lúc')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate menu category data
   * @param data - Menu category data to validate
   * @returns validation result
   */
  static validateMenuCategoryData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.key || data.key.trim() === '') {
      errors.push('Key là bắt buộc')
    }

    if (!data.name || data.name.trim() === '') {
      errors.push('Name là bắt buộc')
    }

    // Validate key format (kebab-case)
    if (data.key && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.key)) {
      errors.push('Key phải theo format kebab-case (ví dụ: menu-header)')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Sort menu items by order
   * @param items - Array of menu items
   * @returns Sorted array
   */
  static sortMenuItemsByOrder(items: any[]): any[] {
    return items.sort((a, b) => a.order - b.order)
  }

  /**
   * Find menu item by key in tree structure
   * @param items - Tree structure
   * @param key - Key to find
   * @returns Found item or null
   */
  static findMenuItemByKey(items: any[], key: string): any | null {
    for (const item of items) {
      if (item.key === key) {
        return item
      }

      if (item.children && item.children.length > 0) {
        const found = MenuHelper.findMenuItemByKey(item.children, key)
        if (found) {
          return found
        }
      }
    }
    return null
  }

  /**
   * Count total menu items in tree (including children)
   * @param items - Tree structure
   * @returns Total count
   */
  static countMenuItemsInTree(items: any[]): number {
    let count = items.length

    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        count += MenuHelper.countMenuItemsInTree(item.children)
      }
    })

    return count
  }

  /**
   * Get all parent IDs of a menu item (breadcrumb)
   * @param items - Flat array of menu items
   * @param itemId - ID of target item
   * @returns Array of parent IDs (from root to immediate parent)
   */
  static getMenuItemParentIds(items: any[], itemId: number): number[] {
    const parentIds: number[] = []
    const itemMap = new Map()

    // Create lookup map
    items.forEach((item) => {
      itemMap.set(item.id, item)
    })

    // Find target item and trace back to root
    let currentItem = itemMap.get(itemId)
    while (currentItem && currentItem.parentId !== null) {
      parentIds.unshift(currentItem.parentId)
      currentItem = itemMap.get(currentItem.parentId)
    }

    return parentIds
  }
}
