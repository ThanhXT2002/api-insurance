import { Router } from 'express'
import { PostCategoryController } from './postCategoryController'
import { PostCategoryService } from './postCategoryService'
import { PostCategoryRepository } from './postCategoryRepository'
import { authenticate, optionalAuthenticate, requirePermissions } from '../../middlewares/authMiddleware'

// Initialize dependencies
const repository = new PostCategoryRepository()
const service = new PostCategoryService(repository)
const controller = new PostCategoryController(service)

const router = Router()

/**
 * @openapi
 * components:
 *   schemas:
 *     PostCategory:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Category ID
 *         name:
 *           type: string
 *           description: Category name
 *         slug:
 *           type: string
 *           description: URL-friendly slug
 *         description:
 *           type: string
 *           description: Category description
 *         parentId:
 *           type: integer
 *           nullable: true
 *           description: Parent category ID
 *         active:
 *           type: boolean
 *           description: Whether category is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         createdBy:
 *           type: integer
 *         updatedBy:
 *           type: integer
 *     CreateCategoryRequest:
 *       type: object
 *       required:
 *         - name
 *         - slug
 *       properties:
 *         name:
 *           type: string
 *           description: Category name
 *         slug:
 *           type: string
 *           description: URL-friendly slug
 *         description:
 *           type: string
 *           description: Category description
 *         parentId:
 *           type: integer
 *           description: Parent category ID
 */

/**
 * @openapi
 * /api/post-categories:
 *   get:
 *     tags:
 *       - Post Categories
 *     summary: Get all categories with pagination and search
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search keyword
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: integer
 *         description: Filter by parent category
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     rows:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PostCategory'
 *                     total:
 *                       type: integer
 */
// Public endpoints (no auth required)
router.get('/', optionalAuthenticate, controller.getAll.bind(controller))

/**
 * @openapi
 * /api/post-categories/tree:
 *   get:
 *     tags:
 *       - Post Categories
 *     summary: Get category tree hierarchy
 *     responses:
 *       200:
 *         description: Category tree retrieved successfully
 */
router.get('/tree', optionalAuthenticate, controller.getTree.bind(controller))

/**
 * @openapi
 * /api/post-categories/roots:
 *   get:
 *     tags:
 *       - Post Categories
 *     summary: Get root categories (no parent)
 *     responses:
 *       200:
 *         description: Root categories retrieved successfully
 */
router.get('/roots', optionalAuthenticate, controller.getRoots.bind(controller))

/**
 * @openapi
 * /api/post-categories/slug/{slug}:
 *   get:
 *     tags:
 *       - Post Categories
 *     summary: Get category by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Category slug
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get('/slug/:slug', optionalAuthenticate, controller.getBySlug.bind(controller))

/**
 * @openapi
 * /api/post-categories/{id}:
 *   get:
 *     tags:
 *       - Post Categories
 *     summary: Get category by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get('/:id', optionalAuthenticate, controller.getById.bind(controller))

/**
 * @openapi
 * /api/post-categories:
 *   post:
 *     tags:
 *       - Post Categories
 *     summary: Create new category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryRequest'
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Bad request - validation error
 *       409:
 *         description: Conflict - slug already exists
 */
// Protected endpoints (require authentication and permissions)
router.post('/', authenticate, controller.create.bind(controller))

/**
 * @openapi
 * /api/post-categories/{id}:
 *   put:
 *     tags:
 *       - Post Categories
 *     summary: Update category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               parentId:
 *                 type: integer
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: Category not found
 */
router.put('/:id', authenticate, controller.update.bind(controller))

/**
 * @openapi
 * /api/post-categories/{id}:
 *   delete:
 *     tags:
 *       - Post Categories
 *     summary: Delete category (soft delete)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *         description: Force delete even if has posts/children
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete - has posts or children
 *       404:
 *         description: Category not found
 */
router.delete('/:id', authenticate, requirePermissions(['post_category.delete']), controller.delete.bind(controller))

/**
 * @openapi
 * /api/post-categories/batch/delete:
 *   post:
 *     tags:
 *       - Post Categories
 *     summary: Delete multiple categories
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of category IDs
 *               force:
 *                 type: boolean
 *                 description: Force delete even if has posts/children
 *     responses:
 *       200:
 *         description: Categories deleted successfully
 *       400:
 *         description: Validation error
 */
// Admin-only batch operations
router.post(
  '/batch/delete',
  authenticate,
  requirePermissions(['post_category.delete']),
  controller.batchDelete.bind(controller)
)

/**
 * @openapi
 * /api/post-categories/batch/active:
 *   post:
 *     tags:
 *       - Post Categories
 *     summary: Activate/deactivate multiple categories
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *               - active
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of category IDs
 *               active:
 *                 type: boolean
 *                 description: New active status
 *     responses:
 *       200:
 *         description: Categories updated successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/batch/active',
  authenticate,
  requirePermissions(['post_category.edit']),
  controller.batchActive.bind(controller)
)

export default router
