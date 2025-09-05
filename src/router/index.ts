import { Express, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import authRouter from '../modules/auth/authRouter'

export function registerRoutes(app: Express) {
  // Health route (without API prefix for monitoring)
  /**
   * @openapi
   * /health:
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
  app.get('/health', (_req: Request, res: Response) => {
    res.status(StatusCodes.OK).send({ status: 'ok', uptime: process.uptime() })
  })
  
  app.use('/api/auth', authRouter)
  
  // TODO: Thêm các module khác với API prefix
  // app.use('/api/users', userRouter)
  // app.use('/api/products', productRouter)
  // app.use('/api/orders', orderRouter)
}

export default registerRoutes
 