import { Router } from 'express'
import { AuthController, upload } from './authController'
import { authenticate } from '../../middlewares/authMiddleware'

const authController = new AuthController()

const router = Router()

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Đăng ký user mới
 *     description: Tạo tài khoản mới với email verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 */
router.post('/register', authController.register.bind(authController))

/**
 * @openapi
 * /api/auth/profile:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Lấy thông tin profile
 *     description: Lấy thông tin profile của user hiện tại
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin profile thành công
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticate, authController.getProfile.bind(authController))

/**
 * @openapi
 * /api/auth/profile:
 *   put:
 *     tags:
 *       - Authentication
 *     summary: Cập nhật profile
 *     description: Cập nhật thông tin profile của user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               phoneNumber:
 *                 type: string
 *                 example: "0123456789"
 *               addresses:
 *                 type: string
 *                 example: "123 Đường ABC, Quận 1, TP.HCM"
 *     responses:
 *       200:
 *         description: Cập nhật profile thành công
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', authenticate, authController.updateProfile.bind(authController))

/**
 * @openapi
 * /api/auth/avatar:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Upload và cập nhật avatar
 *     description: Upload file ảnh và cập nhật avatar cho user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File ảnh avatar (max 5MB)
 *     responses:
 *       200:
 *         description: Upload avatar thành công
 *       400:
 *         description: File không hợp lệ
 *       401:
 *         description: Unauthorized
 */
router.post('/avatar', authenticate, upload.single('file'), authController.updateAvatarUrl.bind(authController))

export default router
