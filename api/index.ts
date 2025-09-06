import serverless from 'serverless-http'
import path from 'path'

// Try to import built app from dist (for production builds). If not present, import source for local dev.
let app: any
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  app = require(path.join(__dirname, '..', 'dist', 'index.js')).default
} catch (e) {
  // fallback to source (ts-node or tsx during dev)
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  app = require(path.join(__dirname, '..', 'src', 'index.ts')).default
}

const handler = serverless(app)

export default handler
