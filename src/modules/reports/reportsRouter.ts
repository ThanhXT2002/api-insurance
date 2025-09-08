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
 *     summary: Get permissions summary statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permissions summary retrieved successfully
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
 *     summary: Get user count by role with percentages
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User count by role retrieved successfully
 */
router.get('/users-by-role', authenticate, controller.getUsersByRole.bind(controller))

/**
 * @openapi
 * /api/reports/permissions-by-role:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Get permission count by role
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permission count by role retrieved successfully
 */
router.get('/permissions-by-role', authenticate, controller.getPermissionsByRole.bind(controller))

/**
 * @openapi
 * /api/reports/most-used-permissions:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Get most used permissions with usage analysis
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Most used permissions retrieved successfully
 */
router.get('/most-used-permissions', authenticate, controller.getMostUsedPermissions.bind(controller))

/**
 * @openapi
 * /api/reports/users-with-multiple-roles:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Get users with multiple roles and complexity analysis
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users with multiple roles retrieved successfully
 */
router.get('/users-with-multiple-roles', authenticate, controller.getUsersWithMultipleRoles.bind(controller))

/**
 * @openapi
 * /api/reports/orphaned-permissions:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Get permissions not assigned to any role or user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orphaned permissions retrieved successfully
 */
router.get('/orphaned-permissions', authenticate, controller.getOrphanedPermissions.bind(controller))

/**
 * @openapi
 * /api/reports/role-permission-matrix:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Get role-permission matrix with coverage statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Role-permission matrix retrieved successfully
 */
router.get('/role-permission-matrix', authenticate, controller.getRolePermissionMatrix.bind(controller))

/**
 * @openapi
 * /api/reports/user-access-audit/{userId}:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Get comprehensive access audit for a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User access audit retrieved successfully
 *       400:
 *         description: Invalid user ID
 *       404:
 *         description: User not found
 */
router.get('/user-access-audit/:userId', authenticate, controller.getUserAccessAudit.bind(controller))

export default router
