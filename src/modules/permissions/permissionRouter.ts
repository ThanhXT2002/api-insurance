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
 *     Permission:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Permission ID
 *         key:
 *           type: string
 *           description: Permission key (e.g., "post.create")
 *         name:
 *           type: string
 *           description: Human-readable permission name
 *         description:
 *           type: string
 *           description: Permission description
 *     CreatePermissionRequest:
 *       type: object
 *       required:
 *         - key
 *         - name
 *       properties:
 *         key:
 *           type: string
 *           description: Permission key (lowercase with dots)
 *         name:
 *           type: string
 *           description: Human-readable permission name
 *         description:
 *           type: string
 *           description: Permission description
 */

/**
 * @openapi
 * /api/permissions:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get all permissions
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
 *         description: Permissions retrieved successfully
 *       403:
 *         description: Insufficient permissions
 */
router.get('/', authenticate, controller.getAll.bind(controller))

/**
 * @openapi
 * /api/permissions/{id}:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get permission by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Permission ID
 *     responses:
 *       200:
 *         description: Permission retrieved successfully
 *       404:
 *         description: Permission not found
 */
router.get('/:id', authenticate, controller.getById.bind(controller))

/**
 * @openapi
 * /api/permissions:
 *   post:
 *     tags:
 *       - Permissions
 *     summary: Create new permission
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
 *         description: Permission created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Permission key already exists
 */
router.post('/', authenticate, controller.create.bind(controller))

/**
 * @openapi
 * /api/permissions/{id}:
 *   put:
 *     tags:
 *       - Permissions
 *     summary: Update permission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Permission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePermissionRequest'
 *     responses:
 *       200:
 *         description: Permission updated successfully
 *       404:
 *         description: Permission not found
 *       409:
 *         description: Permission key already exists
 */
router.put('/:id', authenticate, controller.update.bind(controller))

/**
 * @openapi
 * /api/permissions/{id}:
 *   delete:
 *     tags:
 *       - Permissions
 *     summary: Delete permission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Permission ID
 *     responses:
 *       200:
 *         description: Permission deleted successfully
 *       404:
 *         description: Permission not found
 *       409:
 *         description: Permission is in use
 */
router.delete('/:id', authenticate, controller.delete.bind(controller))

/**
 * @openapi
 * /api/permissions/{id}/users:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get users with specific permission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Permission ID
 *     responses:
 *       200:
 *         description: Users with permission retrieved successfully
 */
router.get('/:id/users', authenticate, controller.getUsersWithPermission.bind(controller))

/**
 * @openapi
 * /api/permissions/check:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Check if user has specific permission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: query
 *         name: permission
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission key
 *     responses:
 *       200:
 *         description: Permission check completed
 *       400:
 *         description: Missing parameters
 */
router.get('/check', authenticate, controller.checkPermission.bind(controller))

export default router
