import { Router } from 'express'
import { PermissionController } from './permissionController'
import { PermissionService } from './permissionService'
import { PermissionRepository } from './permissionRepository'
import { authenticate } from '../../middlewares/authMiddleware'

// Initialize dependencies
const repository = new PermissionRepository()
const service = new PermissionService(repository)
const controller = new PermissionController(service)

const router = Router()

/**
 * @openapi
 * components:
 *   schemas:
 *     CreatePermissionRequest:
 *       type: object
 *       description: 'Yêu cầu tạo quyền hạn'
 *       required:
 *         - name
 *         - key
 *       properties:
 *         name:
 *           type: string
 *           description: 'Tên quyền hạn'
 *           example: 'Quản lý người dùng'
 *         key:
 *           type: string
 *           description: 'Key quyền hạn, chữ thường và dùng dấu chấm phân tách (ví dụ: "user.edit")'
 *           example: 'user.edit'
 *         description:
 *           type: string
 *           description: 'Mô tả quyền hạn'
 *           example: 'Cho phép chỉnh sửa thông tin người dùng'
 */

/**
 * @openapi
 * /api/permissions:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Lấy tất cả quyền hạn
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số item trên mỗi trang
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *     responses:
 *       200:
 *         description: Lấy danh sách quyền hạn thành công
 *       403:
 *         description: Không đủ quyền truy cập
 */
router.get('/', authenticate, controller.getAll.bind(controller))

/**
 * @openapi
 * /api/permissions/{id}:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Lấy quyền hạn theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID quyền hạn
 *     responses:
 *       200:
 *         description: Lấy quyền hạn thành công
 *       404:
 *         description: Không tìm thấy quyền hạn
 */
router.get('/:id', authenticate, controller.getById.bind(controller))

/**
 * @openapi
 * /api/permissions:
 *   post:
 *     tags:
 *       - Permissions
 *     summary: Tạo quyền hạn mới
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePermissionRequest'
 *     responses:
 *       201:
 *         description: Tạo quyền hạn thành công
 *       400:
 *         description: Lỗi xác thực dữ liệu
 *       409:
 *         description: Key quyền hạn đã tồn tại
 */
router.post('/', authenticate, controller.create.bind(controller))

/**
 * @openapi
 * /api/permissions/{id}:
 *   put:
 *     tags:
 *       - Permissions
 *     summary: Cập nhật quyền hạn
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID quyền hạn
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePermissionRequest'
 *     responses:
 *       200:
 *         description: Cập nhật quyền hạn thành công
 *       404:
 *         description: Không tìm thấy quyền hạn
 *       409:
 *         description: Key quyền hạn đã tồn tại
 */
router.put('/:id', authenticate, controller.update.bind(controller))

/**
 * @openapi
 * /api/permissions/{id}:
 *   delete:
 *     tags:
 *       - Permissions
 *     summary: Xóa quyền hạn
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID quyền hạn
 *     responses:
 *       200:
 *         description: Xóa quyền hạn thành công
 *       404:
 *         description: Không tìm thấy quyền hạn
 *       409:
 *         description: Quyền hạn đang được sử dụng
 */
router.delete('/:id', authenticate, controller.delete.bind(controller))

/**
 * @openapi
 * /api/permissions/{id}/users:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Lấy người dùng có quyền hạn cụ thể
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID quyền hạn
 *     responses:
 *       200:
 *         description: Lấy danh sách người dùng thành công
 */
router.get('/:id/users', authenticate, controller.getUsersWithPermission.bind(controller))

/**
 * @openapi
 * /api/permissions/check:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Kiểm tra người dùng có quyền hạn cụ thể
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID người dùng
 *       - in: query
 *         name: permission
 *         required: true
 *         schema:
 *           type: string
 *         description: Key quyền hạn
 *     responses:
 *       200:
 *         description: Kiểm tra quyền hạn thành công
 *       400:
 *         description: Thiếu tham số
 */
router.get('/check', authenticate, controller.checkPermission.bind(controller))

export default router
