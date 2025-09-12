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
 * OpenAPI schemas are centralized in `src/config/swagger.ts`.
 * Per-file `components` blocks were removed to avoid duplicate top-level keys.
 */

/**
 * @openapi
 * /api/user-roles:
 *   get:
 *     tags:
 *       - User Roles
 *     summary: Get all user roles (supports pagination, filtering and sorting)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: false
 *         description: 'Page number (default: 1)'
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: false
 *         description: 'Items per page (default: 10)'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: Keyword to search by role name or key
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         required: false
 *         description: 'Sort expression, e.g. "name:asc" or "createdAt:desc"'
 *     responses:
 *       200:
 *         description: List of user roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of roles
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserRole'
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, controller.getAll.bind(controller))

/**
 * @openapi
 * /api/user-roles/{id}:
 *   get:
 *     tags:
 *       - User Roles
 *     summary: Get role by ID with permissions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *       404:
 *         description: Role not found
 */
router.get('/:id', authenticate, controller.getById.bind(controller))

/**
 * @openapi
 * /api/user-roles:
 *   post:
 *     tags:
 *       - User Roles
 *     summary: Create new role
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
 *         description: Role created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Role key already exists
 */
router.post('/', authenticate, controller.create.bind(controller))

/**
 * @openapi
 * /api/user-roles/{id}:
 *   put:
 *     tags:
 *       - User Roles
 *     summary: Update role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRoleRequest'
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       404:
 *         description: Role not found
 *       409:
 *         description: Role key already exists
 */
router.put('/:id', authenticate, controller.update.bind(controller))

/**
 * @openapi
 * /api/user-roles/{id}:
 *   delete:
 *     tags:
 *       - User Roles
 *     summary: Delete role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       404:
 *         description: Role not found
 *       409:
 *         description: Role is in use
 */
router.delete('/:id', authenticate, controller.delete.bind(controller))

/**
 * @openapi
 * /api/user-roles/{roleId}/permissions:
 *   get:
 *     tags:
 *       - User Roles
 *     summary: Get role permissions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role permissions retrieved successfully
 */
router.get('/:roleId/permissions', authenticate, controller.getRolePermissions.bind(controller))

/**
 * @openapi
 * /api/user-roles/{roleId}/permissions:
 *   post:
 *     tags:
 *       - User Roles
 *     summary: Assign permissions to role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignPermissionsRequest'
 *     responses:
 *       200:
 *         description: Permissions assigned successfully
 *       404:
 *         description: Role or permission not found
 */
router.post('/:roleId/permissions', authenticate, controller.assignPermissions.bind(controller))

/**
 * @openapi
 * /api/user-roles/{roleId}/permissions/{permissionId}:
 *   delete:
 *     tags:
 *       - User Roles
 *     summary: Remove permission from role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
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
 *         description: Role or permission not found
 */
router.delete('/:roleId/permissions/:permissionId', authenticate, controller.removePermission.bind(controller))

/**
 * @openapi
 * /api/user-roles/{roleId}/users:
 *   get:
 *     tags:
 *       - User Roles
 *     summary: Get users with specific role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role users retrieved successfully
 */
router.get('/:roleId/users', authenticate, controller.getRoleUsers.bind(controller))

export default router
