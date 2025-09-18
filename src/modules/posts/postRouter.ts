import { Router } from 'express'
import { PostController } from './postController'
import { PostService } from './postService'
import { PostRepository } from './postRepository'
import { authenticate, optionalAuthenticate, requirePermissions } from '../../middlewares/authMiddleware'
import { upload } from '../../utils/upload'

// Initialize dependencies
const repository = new PostRepository()
const service = new PostService(repository)
const controller = new PostController(service)

const router = Router()

/**
 * OpenAPI schemas are centralized in `src/config/swagger.ts`.
 * Per-file `components` blocks were removed to avoid duplicate top-level keys.
 */

// Public endpoints (no auth required)
/**
 * @openapi
 * /api/posts/published:
 *   get:
 *     tags:
 *       - Posts
 *     summary: Lấy danh sách bài viết đã xuất bản (công khai)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         description: Số trang (mặc định 1)
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Số mục trên trang (mặc định 10)
 *       - in: query
 *         name: categoryId
 *         schema: { type: integer }
 *         description: Lọc theo ID danh mục
 *       - in: query
 *         name: postType
 *         schema:
 *           type: string
 *           enum: [ARTICLE, GUIDE, NEWS, PRODUCT, FAQ]
 *         description: Lọc theo loại bài viết
 *     responses:
 *       200:
 *         description: Danh sách bài viết đã xuất bản
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedPostsResponse'
 */
router.get('/published', controller.getPublished.bind(controller))

/**
 * @openapi
 * /api/posts/featured:
 *   get:
 *     tags:
 *       - Posts
 *     summary: Lấy danh sách bài viết nổi bật (công khai)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Giới hạn số bài viết trả về
 *       - in: query
 *         name: isFeatured
 *         schema: { type: boolean }
 *         description: Lọc theo bài viết được đánh dấu featured
 *       - in: query
 *         name: isHighlighted
 *         schema: { type: boolean }
 *         description: Lọc theo bài viết được đánh dấu highlighted
 *     responses:
 *       200:
 *         description: Danh sách bài viết nổi bật
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostListResponse'
 */
router.get('/featured', controller.getFeatured.bind(controller))

/**
 * @openapi
 * /api/posts/slug/{slug}:
 *   get:
 *     tags:
 *       - Posts
 *     summary: Lấy bài viết theo slug (công khai)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         description: Slug của bài viết
 *     responses:
 *       200:
 *         description: Thông tin bài viết
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostDetailResponse'
 *       404:
 *         description: Không tìm thấy bài viết
 */
router.get('/slug/:slug', controller.getBySlug.bind(controller))

/**
 * @openapi
 * /api/posts/{id}/related:
 *   get:
 *     tags:
 *       - Posts
 *     summary: Lấy danh sách bài viết liên quan (công khai)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của bài viết
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Giới hạn số bài viết liên quan (mặc định 5)
 *       - in: query
 *         name: categoryId
 *         schema: { type: integer }
 *         description: Lọc theo ID danh mục
 *       - in: query
 *         name: postType
 *         schema:
 *           type: string
 *           enum: [ARTICLE, GUIDE, NEWS, PRODUCT, FAQ]
 *         description: Lọc theo loại bài viết
 *     responses:
 *       200:
 *         description: Danh sách bài viết liên quan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostListResponse'
 */
router.get('/:id/related', controller.getRelated.bind(controller))

// Protected endpoints (require authentication)
/**
 * @openapi
 * /api/posts:
 *   get:
 *     tags:
 *       - Posts
 *     summary: Lấy danh sách tất cả bài viết (có phân quyền)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         description: Số trang (mặc định 1)
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Số mục trên trang (mặc định 10)
 *       - in: query
 *         name: keyword
 *         schema: { type: string }
 *         description: Từ khóa tìm kiếm theo tiêu đề, mô tả, nội dung
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, ARCHIVED]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: categoryId
 *         schema: { type: integer }
 *         description: Lọc theo ID danh mục
 *       - in: query
 *         name: postType
 *         schema:
 *           type: string
 *           enum: [ARTICLE, GUIDE, NEWS, PRODUCT, FAQ]
 *         description: Lọc theo loại bài viết
 *       - in: query
 *         name: isFeatured
 *         schema: { type: boolean }
 *         description: Lọc theo bài viết featured
 *       - in: query
 *         name: isHighlighted
 *         schema: { type: boolean }
 *         description: Lọc theo bài viết highlighted
 *     responses:
 *       200:
 *         description: Danh sách bài viết
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedPostsResponse'
 *       403:
 *         description: Không đủ quyền truy cập
 */
router.get('/', authenticate, controller.getAll.bind(controller))

/**
 * @openapi
 * /api/posts/statistics:
 *   get:
 *     tags:
 *       - Posts
 *     summary: Lấy thống kê bài viết
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê bài viết
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     published:
 *                       type: integer
 *                     draft:
 *                       type: integer
 *                     archived:
 *                       type: integer
 *                     scheduled:
 *                       type: integer
 *                     expired:
 *                       type: integer
 *       403:
 *         description: Không đủ quyền truy cập
 */
router.get('/statistics', authenticate, controller.getStatistics.bind(controller))

/**
 * @openapi
 * /api/posts/{id}:
 *   get:
 *     tags:
 *       - Posts
 *     summary: Lấy bài viết theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của bài viết
 *     responses:
 *       200:
 *         description: Thông tin bài viết
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostDetailResponse'
 *       404:
 *         description: Không tìm thấy bài viết
 *       403:
 *         description: Không đủ quyền truy cập
 */
router.get('/:id', authenticate, controller.getById.bind(controller))

/**
 * @openapi
 * /api/posts:
 *   post:
 *     tags:
 *       - Posts
 *     summary: Tạo bài viết mới với hỗ trợ upload file và SEO
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 description: Tiêu đề bài viết
 *               excerpt:
 *                 type: string
 *                 description: Tóm tắt bài viết
 *               shortContent:
 *                 type: string
 *                 description: Nội dung ngắn bài viết
 *               content:
 *                 type: string
 *                 description: Nội dung bài viết
 *               featuredImage:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh đại diện
 *               albumImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Album ảnh
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, ARCHIVED]
 *                 description: Trạng thái bài viết
 *               postType:
 *                 type: string
 *                 enum: [ARTICLE, GUIDE, NEWS, PRODUCT, FAQ]
 *                 description: Loại bài viết
 *               categoryId:
 *                 type: integer
 *                 description: ID danh mục chính
 *               taggedCategoryIds:
 *                 type: string
 *                 description: JSON array các ID danh mục gắn thẻ
 *               videoUrl:
 *                 type: string
 *                 description: URL video YouTube/Vimeo
 *               note:
 *                 type: string
 *                 description: Ghi chú nội bộ
 *               priority:
 *                 type: integer
 *                 description: Độ ưu tiên (0=normal, 1=high, 2=urgent)
 *               isHighlighted:
 *                 type: boolean
 *                 description: Bài viết nổi bật
 *               isFeatured:
 *                 type: boolean
 *                 description: Hiển thị ở homepage
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian đăng theo lịch
 *               expiredAt:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian hết hạn
 *               targetAudience:
 *                 type: string
 *                 description: JSON array đối tượng mục tiêu
 *               relatedProducts:
 *                 type: string
 *                 description: JSON array ID sản phẩm liên quan
 *               metaKeywords:
 *                 type: string
 *                 description: JSON array từ khóa meta
 *               seoMeta:
 *                 type: object
 *                 description: Thông tin SEO
 *                 properties:
 *                   seoTitle:
 *                     type: string
 *                   metaDescription:
 *                     type: string
 *                   canonicalUrl:
 *                     type: string
 *                   focusKeyword:
 *                     type: string
 *                   ogType:
 *                     type: string
 *                   noindex:
 *                     type: boolean
 *                   nofollow:
 *                     type: boolean
 *     responses:
 *       201:
 *         description: Bài viết được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostDetailResponse'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không đủ quyền tạo
 */
router.post(
  '/',
  authenticate,
  upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'albumImages', maxCount: 10 }
  ]),
  controller.create.bind(controller)
)

/**
 * @openapi
 * /api/posts/{id}:
 *   put:
 *     tags:
 *       - Posts
 *     summary: Cập nhật bài viết với hỗ trợ upload file và SEO
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của bài viết
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Tiêu đề bài viết
 *               excerpt:
 *                 type: string
 *                 description: Tóm tắt bài viết
 *               shortContent:
 *                 type: string
 *                 description: Nội dung ngắn bài viết
 *               content:
 *                 type: string
 *                 description: Nội dung bài viết
 *               featuredImage:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh đại diện mới
 *               albumImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Album ảnh mới
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, ARCHIVED]
 *                 description: Trạng thái bài viết
 *               postType:
 *                 type: string
 *                 enum: [ARTICLE, GUIDE, NEWS, PRODUCT, FAQ]
 *                 description: Loại bài viết
 *               categoryId:
 *                 type: integer
 *                 description: ID danh mục chính
 *               taggedCategoryIds:
 *                 type: string
 *                 description: JSON array các ID danh mục gắn thẻ
 *               videoUrl:
 *                 type: string
 *                 description: URL video YouTube/Vimeo
 *               note:
 *                 type: string
 *                 description: Ghi chú nội bộ
 *               priority:
 *                 type: integer
 *                 description: Độ ưu tiên (0=normal, 1=high, 2=urgent)
 *               isHighlighted:
 *                 type: boolean
 *                 description: Bài viết nổi bật
 *               isFeatured:
 *                 type: boolean
 *                 description: Hiển thị ở homepage
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian đăng theo lịch
 *               expiredAt:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian hết hạn
 *               targetAudience:
 *                 type: string
 *                 description: JSON array đối tượng mục tiêu
 *               relatedProducts:
 *                 type: string
 *                 description: JSON array ID sản phẩm liên quan
 *               metaKeywords:
 *                 type: string
 *                 description: JSON array từ khóa meta
 *               seoMeta:
 *                 type: object
 *                 description: Thông tin SEO
 *                 properties:
 *                   seoTitle:
 *                     type: string
 *                   metaDescription:
 *                     type: string
 *                   canonicalUrl:
 *                     type: string
 *                   focusKeyword:
 *                     type: string
 *                   ogType:
 *                     type: string
 *                   noindex:
 *                     type: boolean
 *                   nofollow:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Bài viết được cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostDetailResponse'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy bài viết
 *       403:
 *         description: Không đủ quyền cập nhật
 */
router.put(
  '/:id',
  authenticate,
  upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'albumImages', maxCount: 10 }
  ]),
  controller.update.bind(controller)
)

/**
 * @openapi
 * /api/posts/{id}/publish:
 *   put:
 *     tags:
 *       - Posts
 *     summary: Xuất bản bài viết
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của bài viết
 *     responses:
 *       200:
 *         description: Bài viết đã được xuất bản
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostDetailResponse'
 *       404:
 *         description: Không tìm thấy bài viết
 *       403:
 *         description: Không đủ quyền xuất bản
 */
router.put('/:id/publish', authenticate, controller.publish.bind(controller))

/**
 * @openapi
 * /api/posts/{id}/unpublish:
 *   put:
 *     tags:
 *       - Posts
 *     summary: Gỡ xuất bản bài viết
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của bài viết
 *     responses:
 *       200:
 *         description: Bài viết đã được gỡ xuất bản
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostDetailResponse'
 *       404:
 *         description: Không tìm thấy bài viết
 *       403:
 *         description: Không đủ quyền gỡ xuất bản
 */
router.put('/:id/unpublish', authenticate, controller.unpublish.bind(controller))

/**
 * @openapi
 * /api/posts/{id}/archive:
 *   put:
 *     tags:
 *       - Posts
 *     summary: Lưu trữ bài viết
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của bài viết
 *     responses:
 *       200:
 *         description: Bài viết đã được lưu trữ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostDetailResponse'
 *       404:
 *         description: Không tìm thấy bài viết
 *       403:
 *         description: Không đủ quyền lưu trữ
 */
router.put('/:id/archive', authenticate, controller.archive.bind(controller))

/**
 * @openapi
 * /api/posts/batch/publish:
 *   post:
 *     tags:
 *       - Posts
 *     summary: Xuất bản nhiều bài viết
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
 *                 description: Danh sách ID bài viết cần xuất bản
 *     responses:
 *       200:
 *         description: Xuất bản nhiều bài viết thành công
 *       400:
 *         description: Danh sách ID không hợp lệ
 *       403:
 *         description: Không đủ quyền xuất bản
 */
router.post('/batch/publish', authenticate, controller.batchPublish.bind(controller))

/**
 * @openapi
 * /api/posts/batch/unpublish:
 *   post:
 *     tags:
 *       - Posts
 *     summary: Gỡ xuất bản nhiều bài viết
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
 *                 description: Danh sách ID bài viết cần gỡ xuất bản
 *     responses:
 *       200:
 *         description: Gỡ xuất bản nhiều bài viết thành công
 *       400:
 *         description: Danh sách ID không hợp lệ
 *       403:
 *         description: Không đủ quyền gỡ xuất bản
 */
router.post('/batch/unpublish', authenticate, controller.batchUnpublish.bind(controller))

/**
 * @openapi
 * /api/posts/batch/archive:
 *   post:
 *     tags:
 *       - Posts
 *     summary: Lưu trữ nhiều bài viết
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
 *                 description: Danh sách ID bài viết cần lưu trữ
 *     responses:
 *       200:
 *         description: Lưu trữ nhiều bài viết thành công
 *       400:
 *         description: Danh sách ID không hợp lệ
 *       403:
 *         description: Không đủ quyền lưu trữ
 */
router.post('/batch/archive', authenticate, controller.batchArchive.bind(controller))

/**
 * @openapi
 * /api/posts/{id}:
 *   delete:
 *     tags:
 *       - Posts
 *     summary: Xóa bài viết
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của bài viết
 *     responses:
 *       200:
 *         description: Bài viết đã được xóa
 *       404:
 *         description: Không tìm thấy bài viết
 *       403:
 *         description: Không đủ quyền xóa
 */
router.delete('/:id', authenticate, controller.delete.bind(controller))

/**
 * @openapi
 * /api/posts/batch/delete:
 *   post:
 *     tags:
 *       - Posts
 *     summary: Xóa nhiều bài viết
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
 *                 description: Danh sách ID bài viết cần xóa
 *     responses:
 *       200:
 *         description: Xóa nhiều bài viết thành công
 *       400:
 *         description: Danh sách ID không hợp lệ
 *       403:
 *         description: Không đủ quyền xóa
 */
router.post('/batch/delete', authenticate, controller.batchDelete.bind(controller))

export default router
