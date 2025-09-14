import { Router } from 'express'
import { UserRoleController } from './userRoleController'
import { UserRoleService } from './userRoleService'
import { UserRoleRepository } from './userRoleRepository'
import { authenticate } from '../../middlewares/authMiddleware'

// Initialize dependencies
const repository = new UserRoleRepository()
const service = new UserRoleService(repository)
const controller = new UserRoleController(service)

const router = Router()

/**
 * @openapi
 * components:
 *   schemas:
 *     UserRole:
 *       type: object
 *       description: 'Vai trò người dùng'
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: 'Admin'
 *         key:
 *           type: string
 *           example: 'admin'
 *         description:
 *           type: string
 *           example: 'Vai trò quản trị hệ thống'
 *     CreateUserRoleRequest:
 *       type: object
 *       description: 'Yêu cầu tạo vai trò'
 *       required:
 *         - name
 *         - key
 *       properties:
 *         name:
 *           type: string
 *           description: 'Tên vai trò'
 *           example: 'Quản trị'
 *         key:
 *           type: string
 *           description: 'Key vai trò'
 *           example: 'admin'
 *         description:
 *           type: string
 *           description: 'Mô tả vai trò'
 *           example: 'Quyền quản trị hệ thống'
 *     AssignPermissionsRequest:
 *       type: object
 *       description: 'Yêu cầu gán danh sách permission cho vai trò'
 *       required:
 *         - permissionKeys
 *       properties:
 *         permissionKeys:
 *           type: array
 *           items:
 *             type: string
 *           description: 'Danh sách key quyền hạn, ví dụ: ["user.edit","user.view"]'
 */

/**
 * @openapi
 * /api/user-roles:
 *   get:
 *     tags:
 *       - User Roles
 *     summary: Lấy tất cả vai trò người dùng (hỗ trợ phân trang, lọc và sắp xếp)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: false
 *         description: 'Số trang (mặc định: 1)'
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: false
 *         description: 'Số item trên mỗi trang (mặc định: 10)'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: Từ khóa tìm kiếm theo tên hoặc key vai trò
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         required: false
 *         description: 'Biểu thức sắp xếp, ví dụ "name:asc" hoặc "createdAt:desc"'
 *     responses:
 *       200:
 *         description: Lấy danh sách vai trò người dùng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Tổng số vai trò
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserRole'
 *       400:
 *         description: Tham số truy vấn không hợp lệ
 *       401:
 *         description: Chưa xác thực
 */
router.get('/', authenticate, controller.getAll.bind(controller))

/**
 * @openapi
 * /api/user-roles/{id}:
 *   get:
 *     tags:
 *       - User Roles
 *     summary: Lấy vai trò theo ID kèm quyền hạn
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID vai trò
 *     responses:
 *       200:
 *         description: Lấy vai trò thành công
 *       404:
 *         description: Không tìm thấy vai trò
 */
router.get('/:id', authenticate, controller.getById.bind(controller))

/**
 * @openapi
 * /api/user-roles:
 *   post:
 *     tags:
 *       - User Roles
 *     summary: Tạo vai trò mới
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRoleRequest'
 *     responses:
 *       201:
 *         description: Tạo vai trò thành công
 *       400:
 *         description: Lỗi xác thực dữ liệu
 *       409:
 *         description: Key vai trò đã tồn tại
 */
router.post('/', authenticate, controller.create.bind(controller))

/**
 * @openapi
 * /api/user-roles/{id}:
 *   put:
 *     tags:
 *       - User Roles
 *     summary: Cập nhật vai trò
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID vai trò
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRoleRequest'
 *     responses:
 *       200:
 *         description: Cập nhật vai trò thành công
 *       404:
 *         description: Không tìm thấy vai trò
 *       409:
 *         description: Key vai trò đã tồn tại
 */
router.put('/:id', authenticate, controller.update.bind(controller))

/**
 * @openapi
 * /api/user-roles/{id}:
 *   delete:
 *     tags:
 *       - User Roles
 *     summary: Xóa vai trò
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID vai trò
 *     responses:
 *       200:
 *         description: Xóa vai trò thành công
 *       404:
 *         description: Không tìm thấy vai trò
 *       409:
 *         description: Vai trò đang được sử dụng
 */
router.delete('/:id', authenticate, controller.delete.bind(controller))

/**
 * @openapi
 * /api/user-roles/{roleId}/permissions:
 *   get:
 *     tags:
 *       - User Roles
 *     summary: Lấy quyền hạn của vai trò
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID vai trò
 *     responses:
 *       200:
 *         description: Lấy quyền hạn vai trò thành công
 */
router.get('/:roleId/permissions', authenticate, controller.getRolePermissions.bind(controller))

/**
 * @openapi
 * /api/user-roles/{roleId}/permissions:
 *   post:
 *     tags:
 *       - User Roles
 *     summary: Gán quyền hạn cho vai trò
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID vai trò
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignPermissionsRequest'
 *     responses:
 *       200:
 *         description: Gán quyền hạn thành công
 *       404:
 *         description: Không tìm thấy vai trò hoặc quyền hạn
 */
router.post('/:roleId/permissions', authenticate, controller.assignPermissions.bind(controller))

/**
 * @openapi
 * /api/user-roles/{roleId}/permissions/{permissionId}:
 *   delete:
 *     tags:
 *       - User Roles
 *     summary: Gỡ quyền khỏi vai trò
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID vai trò
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID quyền hạn
 *     responses:
 *       200:
 *         description: Gỡ quyền thành công
 *       404:
 *         description: Không tìm thấy vai trò hoặc quyền hạn
 */
router.delete('/:roleId/permissions/:permissionId', authenticate, controller.removePermission.bind(controller))

/**
 * @openapi
 * /api/user-roles/{roleId}/users:
 *   get:
 *     tags:
 *       - User Roles
 *     summary: Lấy người dùng có vai trò cụ thể
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID vai trò
 *     responses:
 *       200:
 *         description: Lấy danh sách người dùng của vai trò thành công
 */
router.get('/:roleId/users', authenticate, controller.getRoleUsers.bind(controller))

export default router
