import { Router } from 'express'
import { MenuCategoryController } from './menuCategoryController'
import { MenuCategoryService } from './menuCategoryService'
import { MenuCategoryRepository } from './menuCategoryRepository'
import { MenuItemController } from './menuItemController'
import { MenuItemService } from './menuItemService'
import { MenuItemRepository } from './menuItemRepository'
import { authenticate, optionalAuthenticate, requirePermissions } from '../../middlewares/authMiddleware'

// Initialize MenuCategory dependencies
const categoryRepository = new MenuCategoryRepository()
const categoryService = new MenuCategoryService(categoryRepository)
const categoryController = new MenuCategoryController(categoryService)

// Initialize MenuItem dependencies
const itemRepository = new MenuItemRepository()
const itemService = new MenuItemService(itemRepository)
const itemController = new MenuItemController(itemService)

const router = Router()

// ==================== PUBLIC ENDPOINTS ====================

/**
 * @openapi
 * /api/menus/public/{key}:
 *   get:
 *     tags:
 *       - Menus (Public)
 *     summary: Lấy menu tree theo key (chỉ active) - Public API
 *     description: API công khai để lấy menu cho frontend, chỉ trả về menu items active
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *         description: Key của menu category (vd menu-header, menu-footer)
 *     responses:
 *       200:
 *         description: Menu tree
 *       404:
 *         description: Không tìm thấy menu
 */
router.get('/public/:key', categoryController.getPublicMenuByKey.bind(categoryController))

// ==================== MENU CATEGORY ENDPOINTS ====================

/**
 * @openapi
 * /api/menus/categories:
 *   get:
 *     tags:
 *       - Menu Categories
 *     summary: Lấy danh sách menu categories
 *     description: Lấy tất cả menu categories với tùy chọn filter và include menu items
 *     parameters:
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *         description: Chỉ lấy categories active
 *       - in: query
 *         name: includeItems
 *         schema: { type: boolean }
 *         description: Include menu items (mặc định true)
 *       - in: query
 *         name: activeItemsOnly
 *         schema: { type: boolean }
 *         description: Chỉ lấy menu items active
 *     responses:
 *       200:
 *         description: Danh sách menu categories
 *     security:
 *       - bearerAuth: []
 */
router.get('/categories', authenticate, categoryController.getAll.bind(categoryController))

/**
 * @openapi
 * /api/menus/categories/{id}:
 *   get:
 *     tags:
 *       - Menu Categories
 *     summary: Lấy chi tiết menu category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Chi tiết menu category
 *       404:
 *         description: Không tìm thấy
 *     security:
 *       - bearerAuth: []
 */
router.get('/categories/:id', authenticate, categoryController.getById.bind(categoryController))

/**
 * @openapi
 * /api/menus/categories/{id}/tree:
 *   get:
 *     tags:
 *       - Menu Categories
 *     summary: Lấy menu category kèm tree structure
 *     description: Lấy menu category với tất cả menu items theo cấu trúc tree (PrimeNG format)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: activeOnly
 *         schema: { type: boolean }
 *         description: Chỉ lấy menu items active
 *     responses:
 *       200:
 *         description: Menu category với tree structure
 *     security:
 *       - bearerAuth: []
 */
router.get('/categories/:id/tree', authenticate, categoryController.getTreeById.bind(categoryController))

/**
 * @openapi
 * /api/menus/categories/{id}/count-items:
 *   get:
 *     tags:
 *       - Menu Categories
 *     summary: Đếm số menu items trong category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Số lượng menu items
 *     security:
 *       - bearerAuth: []
 */
router.get('/categories/:id/count-items', authenticate, categoryController.countMenuItems.bind(categoryController))

/**
 * @openapi
 * /api/menus/categories/{id}/items-flat:
 *   get:
 *     tags:
 *       - Menu Categories
 *     summary: Lấy tất cả menu items dạng flat list (không phân biệt cha con)
 *     description: Trả về danh sách phẳng tất cả menu items trong category, không có cấu trúc tree
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của menu category
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter theo active status (true = chỉ active, false = chỉ inactive, không truyền = tất cả)
 *     responses:
 *       200:
 *         description: Danh sách menu items (flat array)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   key:
 *                     type: string
 *                   label:
 *                     type: string
 *                   icon:
 *                     type: string
 *                   url:
 *                     type: string
 *                   routerLink:
 *                     type: string
 *                   parentId:
 *                     type: integer
 *                     nullable: true
 *                   categoryId:
 *                     type: integer
 *                   active:
 *                     type: boolean
 *                   order:
 *                     type: integer
 *       404:
 *         description: Không tìm thấy category
 *     security:
 *       - bearerAuth: []
 */
router.get('/categories/:id/items-flat', authenticate, categoryController.getItemsFlat.bind(categoryController))

/**
 * @openapi
 * /api/menus/categories:
 *   post:
 *     tags:
 *       - Menu Categories
 *     summary: Tạo menu category mới
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, name]
 *             properties:
 *               key:
 *                 type: string
 *                 description: Key unique (vd menu-header)
 *               name:
 *                 type: string
 *                 description: Tên menu category
 *               description:
 *                 type: string
 *               position:
 *                 type: string
 *                 description: Vị trí (header, footer, sidebar)
 *               active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Tạo thành công
 *     security:
 *       - bearerAuth: []
 */
router.post('/categories', authenticate, categoryController.create.bind(categoryController))

/**
 * @openapi
 * /api/menus/categories/{id}:
 *   put:
 *     tags:
 *       - Menu Categories
 *     summary: Cập nhật menu category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               position:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *     security:
 *       - bearerAuth: []
 */
router.put('/categories/:id', authenticate, categoryController.update.bind(categoryController))

/**
 * @openapi
 * /api/menus/categories/{id}:
 *   delete:
 *     tags:
 *       - Menu Categories
 *     summary: Xóa menu category (cascade xóa menu items)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: hard
 *         schema: { type: boolean }
 *         description: Hard delete (true) hoặc soft delete (false)
 *     responses:
 *       200:
 *         description: Xóa thành công
 *     security:
 *       - bearerAuth: []
 */
router.delete('/categories/:id', authenticate, categoryController.delete.bind(categoryController))

/**
 * @openapi
 * /api/menus/categories/batch-active:
 *   post:
 *     tags:
 *       - Menu Categories
 *     summary: Batch active/inactive nhiều categories
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids, active]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: integer }
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Batch active thành công
 *     security:
 *       - bearerAuth: []
 */
router.post('/categories/batch-active', authenticate, categoryController.batchActive.bind(categoryController))

// ==================== MENU ITEM ENDPOINTS ====================

/**
 * @openapi
 * /api/menus/items:
 *   post:
 *     tags:
 *       - Menu Items
 *     summary: Tạo menu item mới
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, label]
 *             properties:
 *               categoryId:
 *                 type: integer
 *                 description: ID của menu category
 *               parentId:
 *                 type: integer
 *                 nullable: true
 *                 description: ID của parent item (null nếu là root)
 *               key:
 *                 type: string
 *                 description: Key unique (tự động generate nếu không cung cấp)
 *               label:
 *                 type: string
 *                 description: Tên hiển thị của menu
 *               icon:
 *                 type: string
 *                 description: Icon class (pi pi-home, pi pi-user...)
 *               url:
 *                 type: string
 *                 description: URL đích
 *               routerLink:
 *                 type: string
 *                 description: Angular router link
 *               command:
 *                 type: string
 *                 description: JavaScript command
 *               order:
 *                 type: integer
 *                 description: Thứ tự hiển thị (tự động tính nếu không cung cấp)
 *               isBlank:
 *                 type: boolean
 *                 default: false
 *                 description: Mở link trong tab mới
 *               expanded:
 *                 type: boolean
 *                 default: false
 *                 description: Mặc định expand hay collapse
 *               active:
 *                 type: boolean
 *                 default: true
 *                 description: Trạng thái active
 *     responses:
 *       201:
 *         description: Tạo menu item thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *     security:
 *       - bearerAuth: []
 */
router.post('/items', authenticate, itemController.create.bind(itemController))

/**
 * @openapi
 * /api/menus/items/{id}:
 *   get:
 *     tags:
 *       - Menu Items
 *     summary: Lấy chi tiết menu item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Chi tiết menu item
 *     security:
 *       - bearerAuth: []
 */
router.get('/items/:id', authenticate, itemController.getById.bind(itemController))

/**
 * @openapi
 * /api/menus/items/{id}:
 *   put:
 *     tags:
 *       - Menu Items
 *     summary: Cập nhật menu item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *                 description: Key unique
 *               label:
 *                 type: string
 *                 description: Tên hiển thị
 *               icon:
 *                 type: string
 *                 description: Icon class
 *               url:
 *                 type: string
 *                 description: URL đích
 *               routerLink:
 *                 type: string
 *                 description: Angular router link
 *               command:
 *                 type: string
 *                 description: JavaScript command
 *               order:
 *                 type: integer
 *                 description: Thứ tự hiển thị
 *               parentId:
 *                 type: integer
 *                 nullable: true
 *                 description: ID parent mới (di chuyển item)
 *               isBlank:
 *                 type: boolean
 *                 description: Mở link trong tab mới
 *               expanded:
 *                 type: boolean
 *                 description: Expand/collapse
 *               active:
 *                 type: boolean
 *                 description: Trạng thái active
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy menu item
 *     security:
 *       - bearerAuth: []
 */
router.put('/items/:id', authenticate, itemController.update.bind(itemController))

/**
 * @openapi
 * /api/menus/items/{id}:
 *   delete:
 *     tags:
 *       - Menu Items
 *     summary: Xóa menu item (cascade xóa children)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: hard
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Xóa thành công
 *     security:
 *       - bearerAuth: []
 */
router.delete('/items/:id', authenticate, itemController.delete.bind(itemController))

/**
 * @openapi
 * /api/menus/items/category/{categoryId}:
 *   get:
 *     tags:
 *       - Menu Items
 *     summary: Lấy menu items theo category (tree structure)
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *       - in: query
 *         name: includeChildren
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Menu items tree
 *     security:
 *       - bearerAuth: []
 */
router.get('/items/category/:categoryId', authenticate, itemController.getByCategory.bind(itemController))

/**
 * @openapi
 * /api/menus/items/batch-active:
 *   post:
 *     tags:
 *       - Menu Items
 *     summary: Batch active/inactive menu items
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids, active]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: integer }
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Batch active thành công
 *     security:
 *       - bearerAuth: []
 */
router.post('/items/batch-active', authenticate, itemController.batchActive.bind(itemController))

/**
 * @openapi
 * /api/menus/items/reorder:
 *   post:
 *     tags:
 *       - Menu Items
 *     summary: Reorder menu items (sau drag-drop)
 *     description: Cập nhật thứ tự và parent của nhiều menu items sau khi drag-drop
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [updates]
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, order]
 *                   properties:
 *                     id:
 *                       type: integer
 *                     order:
 *                       type: integer
 *                     parentId:
 *                       type: integer
 *                       nullable: true
 *     responses:
 *       200:
 *         description: Reorder thành công
 *     security:
 *       - bearerAuth: []
 */
router.post('/items/reorder', authenticate, itemController.reorder.bind(itemController))

/**
 * @openapi
 * /api/menus/items/batch-update-order:
 *   post:
 *     tags:
 *       - Menu Items
 *     summary: Batch update order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, order]
 *                   properties:
 *                     id:
 *                       type: integer
 *                     order:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Cập nhật order thành công
 *     security:
 *       - bearerAuth: []
 */
router.post('/items/batch-update-order', authenticate, itemController.batchUpdateOrder.bind(itemController))

/**
 * @openapi
 * /api/menus/items/{id}/move:
 *   post:
 *     tags:
 *       - Menu Items
 *     summary: Di chuyển menu item sang parent khác
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               parentId:
 *                 type: integer
 *                 nullable: true
 *               order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Di chuyển thành công
 *     security:
 *       - bearerAuth: []
 */
router.post('/items/:id/move', authenticate, itemController.moveItem.bind(itemController))

/**
 * @openapi
 * /api/menus/items/{id}/duplicate:
 *   post:
 *     tags:
 *       - Menu Items
 *     summary: Duplicate (copy) menu item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201:
 *         description: Duplicate thành công
 *     security:
 *       - bearerAuth: []
 */
router.post('/items/:id/duplicate', authenticate, itemController.duplicate.bind(itemController))

/**
 * @openapi
 * /api/menus/items/{id}/children:
 *   get:
 *     tags:
 *       - Menu Items
 *     summary: Lấy tất cả children của menu item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: activeOnly
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Danh sách children
 *     security:
 *       - bearerAuth: []
 */
router.get('/items/:id/children', authenticate, itemController.getChildren.bind(itemController))

/**
 * @openapi
 * /api/menus/items/{id}/count-children:
 *   get:
 *     tags:
 *       - Menu Items
 *     summary: Đếm số children của menu item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Số lượng children
 *     security:
 *       - bearerAuth: []
 */
router.get('/items/:id/count-children', authenticate, itemController.countChildren.bind(itemController))

export default router
