import express, { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'

const app = express()

// Basic middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Simple request logger for dev
app.use((req: Request, _res: Response, next: NextFunction) => {
	// keep this lightweight so it can run in production too
	// eslint-disable-next-line no-console
	console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`)
	next()
})

// Health route
app.get('/health', (_req: Request, res: Response) => {
	res.status(StatusCodes.OK).send({ status: 'ok', uptime: process.uptime() })
})

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

// Start server when this file is run directly
if (require.main === module) {
	const port = Number(process.env.PORT) || 3000
	app.listen(port, () => {
		// eslint-disable-next-line no-console
		console.log(`Server listening on port ${port}`)
	})
}

export default app
