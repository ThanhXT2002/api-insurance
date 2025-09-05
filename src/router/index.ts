import { Express, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

export function registerRoutes(app: Express) {
  // Health route
  /**
   * @openapi
   * /health:
   *   get:
   *     summary: Health check
   *     responses:
   *       200:
   *         description: OK
   */
  app.get('/health', (_req: Request, res: Response) => {
    res.status(StatusCodes.OK).send({ status: 'ok', uptime: process.uptime() })
  })

  // TODO: import and mount other module routers here, e.g.
  // const userRouter = createUserRouter()
  // app.use('/users', userRouter)
}

export default registerRoutes
 