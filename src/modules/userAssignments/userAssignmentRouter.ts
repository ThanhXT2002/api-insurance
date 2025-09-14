import { Router } from 'express'
import { UserAssignmentController } from './userAssignmentController'
import { UserAssignmentService } from './userAssignmentService'
import { UserAssignmentRepository } from './userAssignmentRepository'
import { authenticate } from '../../middlewares/authMiddleware'

// Initialize dependencies
const repository = new UserAssignmentRepository()
const service = new UserAssignmentService(repository)
const controller = new UserAssignmentController(service)

const router = Router()

/**
 * @openapi
 * components:
 *   schemas:
 *     AssignRoleRequest:
 *       type: object
 *       description: 'Yêu cầu gán vai trò cho người dùng'
 *       required:
 *         - roleId
 *       properties:
 *         roleId:
 *           type: integer
 *           description: 'ID vai trò'
 *           example: 2
 *     AssignPermissionRequest:
 *       type: object
 *       description: 'Yêu cầu gán quyền trực tiếp cho người dùng'
 *       required:
 *         - permissionKey
 *       properties:
 *         permissionKey:
 *           type: string
 *           description: 'Key quyền hạn, ví dụ: "user.edit"'
 *           example: 'user.edit'
 *     UserAssignmentSearchRequest:
 *       type: object
 *       description: 'Yêu cầu tìm kiếm nâng cao người dùng theo vai trò/quyền'
 *       properties:
 *         roleKeys:
 *           type: array
 *           items:
 *             type: string
 *         permissionKeys:
 *           type: array
 *           items:
 *             type: string
 *         keyword:
 *           type: string
 *         page:
 *           type: integer
 *         pageSize:
 *           type: integer
 */

/**
 * @openapi
 * /api/user-assignments:
 *   get:
 *     tags:
 *       - User Assignments
 *     summary: Lấy tất cả phân quyền người dùng với thông tin vai trò cơ bản
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
 *         description: Lấy phân quyền người dùng thành công
 */
router.get('/', authenticate, controller.getAll.bind(controller))

/**
 * @openapi
 * /api/user-assignments/{id}:
 *   get:
 *     tags:
 *       - User Assignments
 *     summary: Lấy người dùng với chi tiết quyền hạn đầy đủ
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID người dùng
 *     responses:
 *       200:
 *         description: Lấy người dùng thành công
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.get('/:id', authenticate, controller.getById.bind(controller))

/**
 * @openapi
 * /api/user-assignments/{userId}/roles:
 *   get:
 *     tags:
 *       - User Assignments
 *     summary: Lấy vai trò của người dùng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID người dùng
 *     responses:
 *       200:
 *         description: Lấy vai trò người dùng thành công
 *   post:
 *     tags:
 *       - User Assignments
 *     summary: Gán vai trò cho người dùng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignRoleRequest'
 *     responses:
 *       200:
 *         description: Gán vai trò thành công
 *       404:
 *         description: Không tìm thấy người dùng hoặc vai trò
 *       409:
 *         description: Người dùng đã có vai trò này
 */
router.get('/:userId/roles', authenticate, controller.getUserRoles.bind(controller))
router.post('/:userId/roles', authenticate, controller.assignRole.bind(controller))

/**
 * @openapi
 * /api/user-assignments/{userId}/roles/{roleId}:
 *   delete:
 *     tags:
 *       - User Assignments
 *     summary: Gỡ vai trò khỏi người dùng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID người dùng
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID vai trò
 *     responses:
 *       200:
 *         description: Xóa vai trò thành công
 *       404:
 *         description: Không tìm thấy phân quyền vai trò
 */
router.delete('/:userId/roles/:roleId', authenticate, controller.removeRole.bind(controller))

/**
 * @openapi
 * /api/user-assignments/{userId}/permissions:
 *   get:
 *     tags:
 *       - User Assignments
 *     summary: Liệt kê các quyền trực tiếp đã gán cho người dùng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID người dùng
 *     responses:
 *       200:
 *         description: Lấy quyền trực tiếp của người dùng thành công
 *   post:
 *     tags:
 *       - User Assignments
 *     summary: Gán quyền trực tiếp cho người dùng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignPermissionRequest'
 *     responses:
 *       200:
 *         description: Gán quyền thành công
 *       404:
 *         description: Không tìm thấy người dùng hoặc quyền
 *       409:
 *         description: Người dùng đã có quyền này
 */
router.get('/:userId/permissions', authenticate, controller.listDirectPermissions.bind(controller))
router.post('/:userId/permissions', authenticate, controller.assignPermission.bind(controller))

/**
 * @openapi
 * /api/user-assignments/{userId}/permissions/{permissionId}:
 *   delete:
 *     tags:
 *       - User Assignments
 *     summary: Xóa quyền trực tiếp khỏi người dùng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID người dùng
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID quyền
 *     responses:
 *       200:
 *         description: Xóa quyền thành công
 *       404:
 *         description: Không tìm thấy phân quyền
 */
router.delete('/:userId/permissions/:permissionId', authenticate, controller.removePermission.bind(controller))

/**
 * @openapi
 * /api/user-assignments/{userId}/effective-permissions:
 *   get:
 *     tags:
 *       - User Assignments
 *     summary: Liệt kê quyền hiệu lực của người dùng (từ vai trò và quyền trực tiếp)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID người dùng
 *     responses:
 *       200:
 *         description: Lấy quyền hiệu lực của người dùng thành công
 */
router.get('/:userId/effective-permissions', authenticate, controller.listEffectivePermissions.bind(controller))

/**
 * @openapi
 * /api/user-assignments/{userId}/has-permission/{permissionKey}:
 *   get:
 *     tags:
 *       - User Assignments
 *     summary: Kiểm tra người dùng có quyền cụ thể hay không
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID người dùng
 *       - in: path
 *         name: permissionKey
 *         required: true
 *         schema:
 *           type: string
 *         description: 'Khóa quyền (ví dụ: "user.edit")'
 *     responses:
 *       200:
 *         description: Hoàn tất kiểm tra quyền
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasPermission:
 *                   type: boolean
 */
router.get('/:userId/has-permission/:permissionKey', authenticate, controller.checkPermission.bind(controller))

/**
 * @openapi
 * /api/user-assignments/search:
 *   post:
 *     tags:
 *       - User Assignments
 *     summary: Tìm kiếm nâng cao người dùng với bộ lọc vai trò/quyền
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserAssignmentSearchRequest'
 *     responses:
 *       200:
 *         description: Tìm thấy phân quyền người dùng thành công
 */
router.post('/search', authenticate, controller.searchUsers.bind(controller))

export default router
