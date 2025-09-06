import serverless from 'serverless-http'
import path from 'path'

// Try to import built app from dist (for production builds). If not present, import source for local dev.
let app: any
let handler: any

try {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    app = require(path.join(__dirname, '..', 'dist', 'index.js')).default
  } catch (e) {
    // fallback to source (ts-node or tsx during dev)
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    app = require(path.join(__dirname, '..', 'src', 'index.ts')).default
  }

  handler = serverless(app)
} catch (initErr) {
  // Initialization failed (e.g. missing env, prisma init error). Log full stack so Vercel shows details.
  // eslint-disable-next-line no-console
  console.error('Server initialization failed in api/index.ts:', initErr)

  // Export a fallback handler so invocations return 500 and logs preserve the original error.
  handler = async (req: any, res: any) => {
    // eslint-disable-next-line no-console
    console.error('Invocation after failed init:', initErr)
    res.status(500).send('Server initialization failed. Check logs for details.')
  }
}

export default handler
