import { Router } from 'express'
import { ProductController } from './productController'
import { ProductService } from './productService'
import { ProductRepository } from './productRepository'
import { authenticate, requirePermissions } from '../../middlewares/authMiddleware'
import { upload } from '../../utils/upload'

const repository = new ProductRepository()
const service = new ProductService(repository)
const controller = new ProductController(service)

const router = Router()

// Public endpoints
/**
 * @openapi
 * /api/products:
 *   get:
 *     tags:
 *       - Products
 *     summary: Lấy danh sách sản phẩm
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         description: Số trang (mặc định 1)
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Số mục trên trang (mặc định 20)
 *       - in: query
 *         name: keyword
 *         schema: { type: string }
 *         description: Từ khóa tìm kiếm theo tên, mô tả, nội dung
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *         description: Lọc theo trạng thái active
 *     responses:
 *       200:
 *         description: Danh sách sản phẩm
 */
router.get('/', controller.getAll.bind(controller))

/**
 * @openapi
 * /api/products/slug/{slug}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Lấy sản phẩm theo slug (công khai)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         description: Slug của sản phẩm
 *     responses:
 *       200:
 *         description: Thông tin sản phẩm
 *       404:
 *         description: Không tìm thấy sản phẩm
 */
router.get('/slug/:slug', controller.getBySlug.bind(controller))

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Lấy sản phẩm theo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của sản phẩm
 *     responses:
 *       200:
 *         description: Thông tin sản phẩm
 *       404:
 *         description: Không tìm thấy sản phẩm
 */
router.get('/:id', authenticate, controller.getById.bind(controller))

// Protected
/**
 * @openapi
 * /api/products:
 *   post:
 *     tags:
 *       - Products
 *     summary: Tạo sản phẩm mới với hỗ trợ upload ảnh và SEO
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               details:
 *                 type: string
 *               icon:
 *                 type: string
 *                 format: binary
 *               priority:
 *                 type: integer
 *               isHighlighted:
 *                 type: boolean
 *               isFeatured:
 *                 type: boolean
 *               description:
 *                 type: string
 *               shortContent:
 *                 type: string
 *               content:
 *                 type: string
 *               price:
 *                 type: integer
 *               coverage:
 *                 type: integer
 *               term:
 *                 type: string
 *               targetLink:
 *                 type: string
 *               targetFile:
 *                 type: string
 *               isSaleOnline:
 *                 type: boolean
 *               active:
 *                 type: boolean
 *               isPromotion:
 *                 type: boolean
 *               promotionDetails:
 *                 type: string
 *               note:
 *                 type: string
 *               imgs:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               imgsKeep:
 *                 type: string
 *                 description: JSON array of existing images to keep and their order
 *               tags:
 *                 type: string
 *                 description: JSON array
 *               metaKeywords:
 *                 type: string
 *                 description: JSON array
 *               seoMeta:
 *                 type: object
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
 *         description: Sản phẩm được tạo thành công
 */
router.post(
  '/',
  authenticate,
  upload.fields([
    { name: 'imgs', maxCount: 10 },
    { name: 'icon', maxCount: 1 }
  ]),
  controller.create.bind(controller)
)

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     tags:
 *       - Products
 *     summary: Cập nhật sản phẩm với hỗ trợ upload ảnh và SEO
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               details:
 *                 type: string
 *               icon:
 *                 type: string
 *                 format: binary
 *               priority:
 *                 type: integer
 *               isHighlighted:
 *                 type: boolean
 *               isFeatured:
 *                 type: boolean
 *               description:
 *                 type: string
 *               content:
 *                 type: string
 *               price:
 *                 type: integer
 *               coverage:
 *                 type: integer
 *               term:
 *                 type: string
 *               targetLink:
 *                 type: string
 *               targetFile:
 *                 type: string
 *               isSaleOnline:
 *                 type: boolean
 *               active:
 *                 type: boolean
 *               isPromotion:
 *                 type: boolean
 *               promotionDetails:
 *                 type: string
 *               note:
 *                 type: string
 *               imgs:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               imgsKeep:
 *                 type: string
 *                 description: JSON array of existing images to keep and their order
 *               tags:
 *                 type: string
 *                 description: JSON array
 *               metaKeywords:
 *                 type: string
 *                 description: JSON array
 *               seoMeta:
 *                 type: object
 *     responses:
 *       200:
 *         description: Sản phẩm được cập nhật thành công
 */
router.put(
  '/:id',
  authenticate,
  upload.fields([
    { name: 'imgs', maxCount: 10 },
    { name: 'icon', maxCount: 1 }
  ]),
  controller.update.bind(controller)
)

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     tags:
 *       - Products
 *     summary: Xóa sản phẩm
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Sản phẩm đã được xóa
 */
router.delete('/:id', authenticate, controller.delete.bind(controller))

/**
 * @openapi
 * /api/products/batch/delete:
 *   post:
 *     tags:
 *       - Products
 *     summary: Xóa nhiều sản phẩm
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
 *         description: Xóa nhiều sản phẩm thành công
 */
router.post('/batch/delete', authenticate, controller.batchDelete.bind(controller))

/**
 * @openapi
 * /api/products/batch/active:
 *   post:
 *     tags:
 *       - Products
 *     summary: Kích hoạt/Hủy kích hoạt nhiều sản phẩm
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
 *         description: Cập nhật trạng thái nhiều sản phẩm thành công
 */
router.post('/batch/active', authenticate, controller.batchActive.bind(controller))

export default router
