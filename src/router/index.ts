import { Express, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import authRouter from '../modules/auth/authRouter'
import postCategoryRouter from '../modules/postCategories/postCategoryRouter'
import postRouter from '../modules/posts/postRouter'
import productRouter from '../modules/products/productRouter'
import permissionRouter from '../modules/permissions/permissionRouter'
import userRoleRouter from '../modules/userRoles/userRoleRouter'
import userAssignmentRouter from '../modules/userAssignments/userAssignmentRouter'
import userRouter from '../modules/users/userRouter'
import reportsRouter from '../modules/reports/reportsRouter'
import contactRouter from '../modules/contact/contactRouter'
import menuRouter from '../modules/menus/menuRouter'
import vehicleTypeRouter from '../modules/vehicleTypes/vehicleTypeRouter'

export function registerRoutes(app: Express) {
  // Health route (without API prefix for monitoring)
  /**
   * @openapi
   * /api/health:
   *   get:
   *     tags:
   *       - System
   *     summary: Health check
   *     description: Kiểm tra trạng thái hoạt động của server
   *     responses:
   *       200:
   *         description: Server đang hoạt động bình thường
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: "ok"
   *                 uptime:
   *                   type: number
   *                   description: Thời gian server đã chạy (giây)
   *                   example: 12345.67
   */
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(StatusCodes.OK).send({ status: 'ok', uptime: process.uptime() })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/post-categories', postCategoryRouter)
  app.use('/api/posts', postRouter)
  app.use('/api/products', productRouter)

  // Permission management routes
  app.use('/api/permissions', permissionRouter)
  app.use('/api/user-roles', userRoleRouter)

  app.use('/api/user-assignments', userAssignmentRouter)
  app.use('/api/users', userRouter)
  app.use('/api/reports', reportsRouter)

  // Contact form endpoint
  app.use('/api/contact', contactRouter)

  // Menu management routes
  app.use('/api/menus', menuRouter)

  // Vehicle type management routes
  app.use('/api/vehicle-types', vehicleTypeRouter)

  // TODO: Thêm các module khác với API prefix
  // app.use('/api/orders', orderRouter)
}

export default registerRoutes
