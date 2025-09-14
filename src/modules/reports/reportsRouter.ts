import { Router } from 'express'
import { ReportsController } from './reportsController'
import { ReportsService } from './reportsService'
import { ReportsRepository } from './reportsRepository'
import { authenticate } from '../../middlewares/authMiddleware'

// Initialize dependencies following the Repository-Service-Controller pattern
const repository = new ReportsRepository()
const service = new ReportsService(repository)
const controller = new ReportsController(service)

const router = Router()

/**
 * @openapi
 * /api/reports/permissions-summary:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Lấy thống kê tổng hợp quyền hạn
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thống kê quyền hạn thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPermissions:
 *                   type: integer
 *                 totalRoles:
 *                   type: integer
 *                 totalUsers:
 *                   type: integer
 *                 rolePermissionCount:
 *                   type: integer
 *                 userPermissionCount:
 *                   type: integer
 *                 userRoleAssignments:
 *                   type: integer
 *                 averagePermissionsPerRole:
 *                   type: number
 *                 averageRolesPerUser:
 *                   type: number
 */
router.get('/permissions-summary', authenticate, controller.getPermissionsSummary.bind(controller))

/**
 * @openapi
 * /api/reports/users-by-role:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Lấy số lượng người dùng theo vai trò với phần trăm
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thống kê người dùng theo vai trò thành công
 */
router.get('/users-by-role', authenticate, controller.getUsersByRole.bind(controller))

/**
 * @openapi
 * /api/reports/permissions-by-role:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Lấy số lượng quyền hạn theo vai trò
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thống kê quyền hạn theo vai trò thành công
 */
router.get('/permissions-by-role', authenticate, controller.getPermissionsByRole.bind(controller))

/**
 * @openapi
 * /api/reports/most-used-permissions:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Lấy các quyền sử dụng nhiều nhất và phân tích mức độ sử dụng
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách quyền sử dụng nhiều nhất thành công
 */
router.get('/most-used-permissions', authenticate, controller.getMostUsedPermissions.bind(controller))

/**
 * @openapi
 * /api/reports/users-with-multiple-roles:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Lấy người dùng có nhiều vai trò và phân tích độ phức tạp
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy người dùng có nhiều vai trò thành công
 */
router.get('/users-with-multiple-roles', authenticate, controller.getUsersWithMultipleRoles.bind(controller))

/**
 * @openapi
 * /api/reports/orphaned-permissions:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Lấy các quyền không được gán cho vai trò hoặc người dùng nào
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy các quyền không được gán thành công
 */
router.get('/orphaned-permissions', authenticate, controller.getOrphanedPermissions.bind(controller))

/**
 * @openapi
 * /api/reports/role-permission-matrix:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Lấy ma trận vai trò-quyền kèm thống kê bao phủ
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy ma trận vai trò-quyền thành công
 */
router.get('/role-permission-matrix', authenticate, controller.getRolePermissionMatrix.bind(controller))

/**
 * @openapi
 * /api/reports/user-access-audit/{userId}:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Lấy báo cáo kiểm toán quyền truy cập chi tiết của người dùng
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
 *         description: Lấy báo cáo kiểm toán người dùng thành công
 *       400:
 *         description: ID người dùng không hợp lệ
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.get('/user-access-audit/:userId', authenticate, controller.getUserAccessAudit.bind(controller))

export default router
