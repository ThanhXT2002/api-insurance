import { Router } from 'express'
import { AuthController } from './authController'

const authController = new AuthController()

const router = Router()

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Đăng ký user mới với email verification
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
 *                 description: Email của user
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Mật khẩu (tối thiểu 6 ký tự)
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 */
router.post('/register', (req, res) => authController.register(req, res))

export default router
