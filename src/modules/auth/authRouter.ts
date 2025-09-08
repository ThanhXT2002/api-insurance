import { Router } from 'express'
import { AuthController } from './authController'

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
router.post(
  '/register',
  /**
   * #swagger.tags = ['Authentication']
   * #swagger.summary = 'Đăng ký tài khoản mới'
   * #swagger.description = 'Tạo tài khoản mới cho người dùng'
   * #swagger.parameters['body'] = {
   *   in: 'body',
   *   description: 'Thông tin đăng ký',
   *   required: true,
   *   type: 'object',
   *   schema: {
   *     email: 'user@example.com',
   *     password: 'password123',
   *     name: 'Nguyễn Văn A'
   *   }
   * }
   * #swagger.responses[201] = {
   *   description: 'Đăng ký thành công',
   *   schema: {
   *     success: true,
   *     data: {
   *       user: { id: 1, email: 'user@example.com', name: 'Nguyễn Văn A' },
   *       token: 'jwt_token_here'
   *     },
   *     message: 'Đăng ký thành công'
   *   }
   * }
   */
  authController.register.bind(authController)
)

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Đăng nhập
 *     description: Đăng nhập vào hệ thống để lấy JWT token
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
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                     token:
 *                       type: string
 *                       description: JWT access token
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *       401:
 *         description: Email hoặc mật khẩu không đúng
 */
router.post(
  '/login',
  /**
   * #swagger.tags = ['Authentication']
   * #swagger.summary = 'Đăng nhập'
   * #swagger.description = 'Đăng nhập vào hệ thống để lấy JWT token'
   * #swagger.parameters['body'] = {
   *   in: 'body',
   *   description: 'Thông tin đăng nhập',
   *   required: true,
   *   type: 'object',
   *   schema: {
   *     email: 'user@example.com',
   *     password: 'password123'
   *   }
   * }
   * #swagger.responses[200] = {
   *   description: 'Đăng nhập thành công',
   *   schema: {
   *     success: true,
   *     data: {
   *       user: { id: 1, email: 'user@example.com', name: 'Nguyễn Văn A' },
   *       token: 'jwt_token_here',
   *       expiresAt: '2024-12-31T23:59:59Z'
   *     },
   *     message: 'Đăng nhập thành công'
   *   }
   * }
   * #swagger.responses[400] = {
   *   description: 'Thông tin đăng nhập không hợp lệ'
   * }
   * #swagger.responses[401] = {
   *   description: 'Email hoặc mật khẩu không đúng'
   * }
   */
  authController.login.bind(authController)
)

export default router
