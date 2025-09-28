import { Router } from 'express'
import ContactController from './contactController'
import ContactService from './contactService'
import ContactRepository from './contactRepository'
import { StatusCodes } from 'http-status-codes'
import { authenticate, requirePermissions } from '../../middlewares/authMiddleware'
import rateLimitMiddleware from '../../middlewares/rateLimit'

const repo = new ContactRepository()
const service = new ContactService(repo)
const controller = new ContactController(service)

const router = Router()

/**
 * @openapi
 * /api/contact:
 *   post:
 *     tags:
 *       - Contact
 *     summary: Gửi liên hệ từ phía khách
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Gửi liên hệ thành công
 */
router.post('/', rateLimitMiddleware, controller.submit.bind(controller))

/**
 * @openapi
 * /api/contact:
 *   get:
 *     tags:
 *       - Contact
 *     summary: Admin - tìm kiếm và phân trang các liên hệ
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
 *         description: Từ khóa tìm kiếm theo tên, email hoặc nội dung
 *     responses:
 *       200:
 *         description: Trả về danh sách liên hệ và tổng số
 */
// Use getAll which supports keyword search and pagination (admin)
router.get('/', authenticate, requirePermissions(['contact.view']), controller.getAll.bind(controller))

export default router
