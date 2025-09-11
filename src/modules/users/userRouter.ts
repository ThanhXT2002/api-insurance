import { Router } from 'express'
import { UserController } from './userController'
import { UserService } from './userService'
import { UserRepository } from './userRepository'
import { authenticate } from '../../middlewares/authMiddleware'
import { upload } from '../auth/authController'

const repo = new UserRepository()
const service = new UserService(repo)
const controller = new UserController(service)

const router = Router()

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: "Filter by active status (true/false)"
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
 *     summary: Get user by id with roles for update
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: "User ID"
 *         example: 1
 *     responses:
 *       200:
 *         description: User retrieved successfully with roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     avatarUrl:
 *                       type: string
 *                       example: "https://storage.example.com/avatars/123.jpg"
 *                     addresses:
 *                       type: string
 *                       example: "123 Main Street, City, Country"
 *                     active:
 *                       type: boolean
 *                       example: true
 *                     roleKeys:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["user", "customer"]
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           key:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                     roleAssignments:
 *                       type: array
 *                       items:
 *                         type: object
 *                 message:
 *                   type: string
 *                   example: "User retrieved successfully"
 *       404:
 *         description: User not found
 *       400:
 *         description: Invalid user ID
 */
router.get('/:id', authenticate, controller.getById.bind(controller))

/**
 * @openapi
 * /api/users/{id}/full-details:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user with full details (roles + permissions)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: "User ID"
 *         example: 1
 *     responses:
 *       200:
 *         description: User with full details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     roleKeys:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["user", "customer"]
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: object
 *                     directPermissions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           key:
 *                             type: string
 *                           name:
 *                             type: string
 *                           allowed:
 *                             type: boolean
 *                 message:
 *                   type: string
 *                   example: "User with full details retrieved successfully"
 *       404:
 *         description: User not found
 *       400:
 *         description: Invalid user ID
 */
router.get('/:id/full-details', authenticate, controller.getUserWithFullDetails.bind(controller))

/**
 * @openapi
 * /api/users/getUserById/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Alias - get user by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User retrieved successfully (alias)
 */
// Alias route requested: getUserById
router.get('/getUserById/:id', authenticate, controller.getById.bind(controller))

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *                 description: "Email address (required)"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "password123"
 *                 description: "Password (required, min 6 characters)"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *                 description: "Full name (optional)"
 *               addresses:
 *                 type: string
 *                 example: "123 Main St, City, Country"
 *                 description: "Address information (optional)"
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: "Avatar image file (optional, jpg/png)"
 *               roleKeys:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["user", "admin"]
 *                 description: "Array of role keys to assign (optional)"
 *               active:
 *                 type: boolean
 *                 default: true
 *                 description: "User active status (optional)"
 *             required:
 *               - email
 *               - password
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "password123"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               addresses:
 *                 type: string
 *                 example: "123 Main St, City, Country"
 *               roleKeys:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["user", "admin"]
 *               active:
 *                 type: boolean
 *                 default: true
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     avatarUrl:
 *                       type: string
 *                       example: "https://storage.example.com/avatars/123.jpg"
 *                     active:
 *                       type: boolean
 *                       example: true
 *                     roleAssignments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           role:
 *                             type: object
 *                             properties:
 *                               key:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                 message:
 *                   type: string
 *                   example: "User created"
 *       409:
 *         description: Email already exists
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
// Accept multipart/form-data with optional `avatar` file
router.post('/', authenticate, upload.single('avatar'), controller.create.bind(controller))

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: "User ID to update"
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe Updated"
 *                 description: "Full name (optional)"
 *               addresses:
 *                 type: string
 *                 example: "456 New Street, Updated City, Country"
 *                 description: "Address information (optional)"
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: "New avatar image file (optional, jpg/png)"
 *               roleKeys:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["user", "manager"]
 *                 description: "Array of role keys to assign (optional, replaces existing roles)"
 *               active:
 *                 type: boolean
 *                 example: true
 *                 description: "User active status (optional)"
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe Updated"
 *                 description: "Full name (optional)"
 *               addresses:
 *                 type: string
 *                 example: "456 New Street, Updated City, Country"
 *                 description: "Address information (optional)"
 *               roleKeys:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["user", "manager"]
 *                 description: "Array of role keys to assign (optional)"
 *               active:
 *                 type: boolean
 *                 example: true
 *                 description: "User active status (optional)"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     name:
 *                       type: string
 *                       example: "John Doe Updated"
 *                     avatarUrl:
 *                       type: string
 *                       example: "https://storage.example.com/avatars/123-updated.jpg"
 *                     addresses:
 *                       type: string
 *                       example: "456 New Street, Updated City, Country"
 *                     active:
 *                       type: boolean
 *                       example: true
 *                     roleAssignments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           role:
 *                             type: object
 *                             properties:
 *                               key:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                 message:
 *                   type: string
 *                   example: "User updated"
 *       404:
 *         description: User not found
 *       400:
 *         description: Invalid user ID
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, upload.single('avatar'), controller.update.bind(controller))

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete user (soft)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete('/:id', authenticate, controller.delete.bind(controller))

/**
 * @openapi
 * /api/users/delete-multiple:
 *   post:
 *     tags:
 *       - Users
 *     summary: Delete multiple users (soft)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Users deleted
 */
router.post('/delete-multiple', authenticate, controller.deleteMultiple.bind(controller))

/**
 * @openapi
 * /api/users/active-multiple:
 *   post:
 *     tags:
 *       - Users
 *     summary: Activate/Deactivate multiple users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Users updated
 */
router.post('/active-multiple', authenticate, controller.activeMultiple.bind(controller))

export default router
