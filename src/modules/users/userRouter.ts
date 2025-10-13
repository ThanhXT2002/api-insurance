import { Router } from 'express'
import { UserController } from './userController'
import { UserService } from './userService'
import { UserRepository } from './userRepository'
import { authenticate } from '../../middlewares/authMiddleware'
import { upload } from '../../utils/upload'

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
 *     summary: Lấy danh sách người dùng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 'Số trang (mặc định: 1)'
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 'Số lượng bản ghi mỗi trang (mặc định: 20)'
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 'Từ khóa tìm kiếm theo email hoặc tên'
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: 'Lọc theo trạng thái hoạt động (true/false)'
 *     responses:
 *       200:
 *         description: Lấy danh sách người dùng thành công
 */
router.get('/', authenticate, controller.getAll.bind(controller))

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Lấy thông tin người dùng theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 'ID người dùng'
 *         example: 1
 *     responses:
 *       200:
 *         description: Lấy thông tin người dùng thành công
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
 *                     phoneNumber:
 *                       type: string
 *                       example: "0123456789"
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
 *                     permissionKeys:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["post_category.view"]
 *                 message:
 *                   type: string
 *                   example: "Lấy thông tin người dùng thành công"
 *
 */
router.get('/:id', authenticate, controller.getById.bind(controller))

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Tạo người dùng mới
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
 *                 description: 'Địa chỉ email (bắt buộc)'
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "password123"
 *                 description: 'Mật khẩu (bắt buộc, tối thiểu 6 ký tự)'
 *               name:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *                 description: 'Họ và tên (không bắt buộc)'
 *               phoneNumber:
 *                 type: string
 *                 example: "0123456789"
 *                 description: 'Số điện thoại (không bắt buộc)'
 *               addresses:
 *                 type: string
 *                 example: "123 Đường ABC, Quận 1, TP.HCM"
 *                 description: 'Địa chỉ (không bắt buộc)'
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: 'File ảnh đại diện (không bắt buộc, jpg/png)'
 *               roleKeys:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["super_admin", "editor"]
 *                 description: 'Mảng các key vai trò cần gán (không bắt buộc)'
 *               permissionKeys:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["comment.delete","comment.view"]
 *                 description: 'Mảng các key quyền hạn trực tiếp (không bắt buộc)'
 *               active:
 *                 type: boolean
 *                 default: true
 *                 description: 'Trạng thái hoạt động của người dùng (không bắt buộc)'
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Tạo người dùng thành công
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
 *                     phoneNumber:
 *                       type: string
 *                       example: "0123456789"
 *                     avatarUrl:
 *                       type: string
 *                       example: "https://storage.example.com/avatars/123.jpg"
 *                     active:
 *                       type: boolean
 *                       example: true
 *                     roleKeys:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["user", "admin"]
 *                     permissionKeys:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["perm_read", "perm_write"]
 *                 message:
 *                   type: string
 *                   example: "Tạo người dùng thành công"
 *       409:
 *         description: Email đã tồn tại
 *       400:
 *         description: Lỗi xác thực dữ liệu
 *       500:
 *         description: Lỗi máy chủ nội bộ
 */
// Accept multipart/form-data with optional `avatar` file
router.post('/', authenticate, upload.single('avatar'), controller.create.bind(controller))

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Cập nhật thông tin người dùng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 'ID người dùng cần cập nhật'
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
 *                 example: "Trần Xuân Thành"
 *                 description: 'Họ và tên (không bắt buộc)'
 *               phoneNumber:
 *                 type: string
 *                 example: "0123456789"
 *                 description: 'Số điện thoại (không bắt buộc)'
 *               addresses:
 *                 type: string
 *                 example: "456 Đường XYZ, Quận 3, TP.HCM"
 *                 description: 'Địa chỉ (không bắt buộc)'
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: 'File ảnh đại diện mới (không bắt buộc, jpg/png)'
 *               roleKeys:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["super_admin", "editor"]
 *                 description: 'Mảng các key vai trò cần gán (không bắt buộc, thay thế vai trò hiện có)'
 *               permissionKeys:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["comment.delete","comment.moderate","comment.view"]
 *                 description: 'Mảng các key quyền hạn trực tiếp (không bắt buộc)'
 *               active:
 *                 type: boolean
 *                 example: true
 *                 description: 'Trạng thái hoạt động của người dùng (không bắt buộc)'
 *     responses:
 *       200:
 *         description: Cập nhật người dùng thành công
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
 *                     phoneNumber:
 *                       type: string
 *                       example: "0123456789"
 *                     avatarUrl:
 *                       type: string
 *                       example: "https://storage.example.com/avatars/123-updated.jpg"
 *                     addresses:
 *                       type: string
 *                       example: "456 New Street, Updated City, Country"
 *                     active:
 *                       type: boolean
 *                       example: true
 *                     roleKeys:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["super_admin", "editor"]
 *                     permissionKeys:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["comment.delete", "comment.moderate","comment.view"]
 *                 message:
 *                   type: string
 *                   example: "Cập nhật người dùng thành công"
 *       404:
 *         description: Không tìm thấy người dùng
 *       400:
 *         description: ID người dùng không hợp lệ
 *       500:
 *         description: Lỗi máy chủ nội bộ
 */
router.put('/:id', authenticate, upload.single('avatar'), controller.update.bind(controller))

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Xóa người dùng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 'ID người dùng cần xóa'
 *     responses:
 *       200:
 *         description: Xóa người dùng thành công
 */
router.delete('/:id', authenticate, controller.delete.bind(controller))

/**
 * @openapi
 * /api/users/delete-multiple:
 *   post:
 *     tags:
 *       - Users
 *     summary: Xóa nhiều người dùng
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
 *                 description: 'Mảng các ID người dùng cần xóa'
 *     responses:
 *       200:
 *         description: Xóa người dùng thành công
 */
router.post('/delete-multiple', authenticate, controller.deleteMultiple.bind(controller))

/**
 * @openapi
 * /api/users/active-multiple:
 *   post:
 *     tags:
 *       - Users
 *     summary: Kích hoạt/Vô hiệu hóa nhiều người dùng
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
 *                 description: 'Mảng các ID người dùng'
 *               active:
 *                 type: boolean
 *                 description: 'Trạng thái hoạt động (true: kích hoạt, false: vô hiệu hóa)'
 *     responses:
 *       200:
 *         description: Cập nhật người dùng thành công
 */
router.post('/active-multiple', authenticate, controller.activeMultiple.bind(controller))

/**
 * @openapi
 * /api/users/refresh-matview:
 *   get:
 *     tags:
 *       - Users
 *     summary: Trigger refresh of user_permissions_mat materialized view
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đã gửi yêu cầu refresh materialized view
 */
router.get('/refresh-matview', authenticate, controller.refreshMatView.bind(controller))

export default router
