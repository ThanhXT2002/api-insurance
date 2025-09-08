import { Router } from 'express'
import { UserController } from './userController'
import { UserService } from './userService'
import { UserRepository } from './userRepository'
import { authenticate } from '../../middlewares/authMiddleware'

// Initialize dependencies
const repository = new UserRepository()
const service = new UserService(repository)
const controller = new UserController(service)

const router = Router()

/**
 * @openapi
 * components:
 *   schemas:
 *     UserWithRoles:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         email:
 *           type: string
 *         name:
 *           type: string
 *         roleAssignments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               role:
 *                 $ref: '#/components/schemas/UserRole'
 *     AssignRoleRequest:
 *       type: object
 *       required:
 *         - roleId
 *       properties:
 *         roleId:
 *           type: integer
 *           description: Role ID to assign
 *     AssignPermissionRequest:
 *       type: object
 *       required:
 *         - permissionId
 *       properties:
 *         permissionId:
 *           type: integer
 *           description: Permission ID to assign
 *     UserSearchRequest:
 *       type: object
 *       properties:
 *         keyword:
 *           type: string
 *           description: Search keyword for email/name
 *         roleIds:
 *           type: array
 *           items:
 *             type: integer
 *           description: Filter by role IDs
 *         permissionIds:
 *           type: array
 *           items:
 *             type: integer
 *           description: Filter by permission IDs
 *         page:
 *           type: integer
 *           default: 1
 *         limit:
 *           type: integer
 *           default: 20
 */

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users with basic role information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search keyword
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/', authenticate, controller.getAll.bind(controller))

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user with full permission details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/:id', authenticate, controller.getById.bind(controller))

/**
 * @openapi
 * /api/users/{userId}/roles:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user roles
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
 *         description: User roles retrieved successfully
 *   post:
 *     tags:
 *       - Users
 *     summary: Assign role to user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignRoleRequest'
 *     responses:
 *       200:
 *         description: Role assigned successfully
 *       404:
 *         description: User or role not found
 *       409:
 *         description: User already has this role
 */
router.get('/:userId/roles', authenticate, controller.getUserRoles.bind(controller))
router.post('/:userId/roles', authenticate, controller.assignRole.bind(controller))

/**
 * @openapi
 * /api/users/{userId}/roles/{roleId}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Remove role from user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role removed successfully
 *       404:
 *         description: Role assignment not found
 */
router.delete('/:userId/roles/:roleId', authenticate, controller.removeRole.bind(controller))

/**
 * @openapi
 * /api/users/{userId}/permissions:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user direct permissions
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
 *         description: User direct permissions retrieved successfully
 *   post:
 *     tags:
 *       - Users
 *     summary: Assign direct permission to user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignPermissionRequest'
 *     responses:
 *       200:
 *         description: Permission assigned successfully
 *       404:
 *         description: User or permission not found
 *       409:
 *         description: User already has this permission
 */
router.get('/:userId/permissions', authenticate, controller.getUserDirectPermissions.bind(controller))
router.post('/:userId/permissions', authenticate, controller.assignPermission.bind(controller))

/**
 * @openapi
 * /api/users/{userId}/permissions/{permissionId}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Remove direct permission from user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Permission ID
 *     responses:
 *       200:
 *         description: Permission removed successfully
 *       404:
 *         description: Permission assignment not found
 */
router.delete('/:userId/permissions/:permissionId', authenticate, controller.removePermission.bind(controller))

/**
 * @openapi
 * /api/users/{userId}/effective-permissions:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user effective permissions (role + direct)
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
 *         description: User effective permissions retrieved successfully
 */
router.get('/:userId/effective-permissions', authenticate, controller.getUserEffectivePermissions.bind(controller))

/**
 * @openapi
 * /api/users/{userId}/has-permission/{permissionKey}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Check if user has specific permission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: path
 *         name: permissionKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission key (e.g., "user.edit")
 *     responses:
 *       200:
 *         description: Permission check completed
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
 * /api/users/search:
 *   post:
 *     tags:
 *       - Users
 *     summary: Advanced user search with role/permission filters
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSearchRequest'
 *     responses:
 *       200:
 *         description: Users found successfully
 */
router.post('/search', authenticate, controller.searchUsers.bind(controller))

export default router
