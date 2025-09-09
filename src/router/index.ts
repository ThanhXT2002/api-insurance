import { Express, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import authRouter from '../modules/auth/authRouter'
import postCategoryRouter from '../modules/postCategories/postCategoryRouter'
import permissionRouter from '../modules/permissions/permissionRouter'
import userRoleRouter from '../modules/userRoles/userRoleRouter'
import userAssignmentRouter from '../modules/userAssignments/userAssignmentRouter'
import userRouter from '../modules/users/userRouter'
import reportsRouter from '../modules/reports/reportsRouter'

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

  // Permission management routes
  app.use('/api/permissions', permissionRouter)
  app.use('/api/user-roles', userRoleRouter)
  // Debug: log types to detect invalid router import
  // eslint-disable-next-line no-console
  console.log('userAssignmentRouter type=', typeof userAssignmentRouter)
  // eslint-disable-next-line no-console
  console.log('userRouter type=', typeof userRouter)
  app.use('/api/user-assignments', userAssignmentRouter)
  app.use('/api/users', userRouter)
  app.use('/api/reports', reportsRouter)

  // TODO: Thêm các module khác với API prefix
  // app.use('/api/products', productRouter)
  // app.use('/api/orders', orderRouter)
}

export default registerRoutes
