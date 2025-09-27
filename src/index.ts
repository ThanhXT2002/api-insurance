import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { StatusCodes } from 'http-status-codes'
import { setupSwagger } from './config/swagger'
import registerRoutes from './router'
import serverless from 'serverless-http'

const app = express()

// If the app is running behind a trusted proxy (Vercel, Cloudflare, Heroku, etc.)
// enable trust proxy so Express will respect X-Forwarded-* headers and req.ip
app.set('trust proxy', true)

// Basic middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS - enable before routes so preflight responses include required headers
// Support multiple origins via comma-separated CLIENT_ORIGIN env var
const clientOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // allow server-to-server or tools without origin
      if (!origin) return callback(null, true)
      if (clientOrigins.includes(origin)) return callback(null, true)
      return callback(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
  })
)

// Simple request logger for dev
app.use((req: Request, _res: Response, next: NextFunction) => {
  // keep this lightweight so it can run in production too
  // eslint-disable-next-line no-console
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`)
  next()
})

// Register swagger docs UI
setupSwagger(app)

// Register application routes (health + module routers)
registerRoutes(app)

// Example fallback route
app.use((_req: Request, res: Response) => {
  res.status(StatusCodes.NOT_FOUND).send({ error: 'Not Found' })
})

// Basic error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err)
  const status = err.status || StatusCodes.INTERNAL_SERVER_ERROR
  const message = err.message || 'Internal Server Error'
  res.status(status).send({ error: message })
})

// Start server when this file is run directly (for local development)
if (require.main === module) {
  const port = Number(process.env.PORT) || 3600
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${port}`)
  })
}

// Export for both local and serverless
export default app
export const handler = serverless(app)
