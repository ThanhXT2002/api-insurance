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
 * OpenAPI schemas are centralized in `src/config/swagger.ts`.
 * Per-file `components` blocks were removed to avoid duplicate top-level keys.
 */

/**
 * @openapi
 * /api/post-categories:
 *   get:
 *     tags:
 *       - Post Categories
 *     summary: Lấy danh sách chuyên mục với phân trang và tìm kiếm
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng item trên mỗi trang
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái hoạt động
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: integer
 *         description: Lọc theo chuyên mục cha
 *     responses:
 *       200:
 *         description: Lấy danh sách chuyên mục thành công
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
 *     summary: Lấy cây phân cấp chuyên mục
 *     responses:
 *       200:
 *         description: Lấy cây chuyên mục thành công
 */
router.get('/tree', optionalAuthenticate, controller.getTree.bind(controller))

/**
 * @openapi
 * /api/post-categories/roots:
 *   get:
 *     tags:
 *       - Post Categories
 *     summary: Lấy các chuyên mục gốc (không có cha)
 *     responses:
 *       200:
 *         description: Lấy chuyên mục gốc thành công
 */
router.get('/roots', optionalAuthenticate, controller.getRoots.bind(controller))

/**
 * @openapi
 * /api/post-categories/slug/{slug}:
 *   get:
 *     tags:
 *       - Post Categories
 *     summary: Lấy chuyên mục theo slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug chuyên mục
 *     responses:
 *       200:
 *         description: Lấy chuyên mục thành công
 *       404:
 *         description: Không tìm thấy chuyên mục
 */
router.get('/slug/:slug', optionalAuthenticate, controller.getBySlug.bind(controller))

/**
 * @openapi
 * /api/post-categories/{id}:
 *   get:
 *     tags:
 *       - Post Categories
 *     summary: Lấy chuyên mục theo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID chuyên mục
 *     responses:
 *       200:
 *         description: Lấy chuyên mục thành công
 *       404:
 *         description: Không tìm thấy chuyên mục
 */
router.get('/:id', optionalAuthenticate, controller.getById.bind(controller))

/**
 * @openapi
 * /api/post-categories:
 *   post:
 *     tags:
 *       - Post Categories
 *     summary: Tạo chuyên mục mới với hỗ trợ SEO
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên chuyên mục
 *               slug:
 *                 type: string
 *                 description: Slug chuyên mục (duy nhất)
 *               description:
 *                 type: string
 *                 description: Mô tả chuyên mục
 *               parentId:
 *                 type: integer
 *                 description: ID chuyên mục cha
 *               seoMeta:
 *                 $ref: '#/components/schemas/SeoDto'
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               parentId:
 *                 type: integer
 *               seoMeta:
 *                 type: string
 *                 description: Chuỗi JSON chứa thông tin SEO
 *               seoImage:
 *                 type: string
 *                 format: binary
 *                 description: File ảnh SEO (khuyến nghị 1200x630)
 *     responses:
 *       201:
 *         description: Tạo chuyên mục thành công
 *       400:
 *         description: Lỗi xác thực dữ liệu
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không đủ quyền truy cập
 *       409:
 *         description: Slug đã tồn tại
 */
// Protected endpoints (require authentication and permissions)
router.post('/', authenticate, controller.create.bind(controller))

/**
 * @openapi
 * /api/post-categories/{id}:
 *   put:
 *     tags:
 *       - Post Categories
 *     summary: Cập nhật chuyên mục với hỗ trợ SEO
 *     security:
 *       - bearerAuth: []
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
 *               seoMeta:
 *                 $ref: '#/components/schemas/SeoDto'
 *         multipart/form-data:
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
 *               seoMeta:
 *                 type: string
 *                 description: Chuỗi JSON chứa thông tin SEO
 *               seoImage:
 *                 type: string
 *                 format: binary
 *                 description: File ảnh SEO (khuyến nghị 1200x630)
 *     responses:
 *       200:
 *         description: Cập nhật chuyên mục thành công
 *       400:
 *         description: Lỗi xác thực dữ liệu
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không đủ quyền truy cập
 *       404:
 *         description: Không tìm thấy chuyên mục
 */
router.put('/:id', authenticate, controller.update.bind(controller))

/**
 * @openapi
 * /api/post-categories/{id}:
 *   delete:
 *     tags:
 *       - Post Categories
 *     summary: Xóa chuyên mục (xóa mềm)
 *     security:
 *       - bearerAuth: []
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
 *         description: Ép buộc xóa ngay cả khi có bài viết/chuyên mục con
 *     responses:
 *       200:
 *         description: Xóa chuyên mục thành công
 *       400:
 *         description: Không thể xóa - có bài viết hoặc chuyên mục con
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không đủ quyền truy cập
 *       404:
 *         description: Không tìm thấy chuyên mục
 */
router.delete('/:id', authenticate, requirePermissions(['post_category.delete']), controller.delete.bind(controller))

/**
 * @openapi
 * /api/post-categories/batch/delete:
 *   post:
 *     tags:
 *       - Post Categories
 *     summary: Xóa nhiều chuyên mục cùng lúc
 *     security:
 *       - bearerAuth: []
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
 *                 description: Mảng ID các chuyên mục
 *               force:
 *                 type: boolean
 *                 description: Ép buộc xóa ngay cả khi có bài viết/chuyên mục con
 *     responses:
 *       200:
 *         description: Xóa các chuyên mục thành công
 *       400:
 *         description: Lỗi xác thực dữ liệu
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không đủ quyền truy cập
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
 *     summary: Kích hoạt/vô hiệu hóa nhiều chuyên mục cùng lúc
 *     security:
 *       - bearerAuth: []
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
 *                 description: Mảng ID các chuyên mục
 *               active:
 *                 type: boolean
 *                 description: Trạng thái hoạt động mới
 *     responses:
 *       200:
 *         description: Cập nhật các chuyên mục thành công
 *       400:
 *         description: Lỗi xác thực dữ liệu
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không đủ quyền truy cập
 */
router.post(
  '/batch/active',
  authenticate,
  requirePermissions(['post_category.edit']),
  controller.batchActive.bind(controller)
)

/**
 * @openapi
 * /api/post-categories/{id}/with-seo:
 *   get:
 *     tags:
 *       - Post Categories
 *     summary: Lấy chuyên mục theo ID kèm thông tin SEO
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID chuyên mục
 *     responses:
 *       200:
 *         description: Lấy chuyên mục với thông tin SEO thành công
 *       404:
 *         description: Không tìm thấy chuyên mục
 */
router.get('/:id/with-seo', optionalAuthenticate, controller.getByIdWithSeo.bind(controller))

/**
 * @openapi
 * /api/post-categories/slug/{slug}/with-seo:
 *   get:
 *     tags:
 *       - Post Categories
 *     summary: Lấy chuyên mục theo slug kèm thông tin SEO
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug chuyên mục
 *     responses:
 *       200:
 *         description: Lấy chuyên mục với thông tin SEO thành công
 *       404:
 *         description: Không tìm thấy chuyên mục
 */
router.get('/slug/:slug/with-seo', optionalAuthenticate, controller.getBySlugWithSeo.bind(controller))

export default router
