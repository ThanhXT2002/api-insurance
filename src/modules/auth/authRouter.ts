import { Router } from 'express'
import { AuthController } from './authController'

const authController = new AuthController()

const router = Router()

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Đăng ký user mới bằng Supabase (server-side create)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đã tạo user
 */
router.post('/register', (req, res) => authController.register(req, res))

export default router
