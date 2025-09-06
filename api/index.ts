import serverless from 'serverless-http'
import path from 'path'

// Try to import built app from dist (for production builds). If not present, import source for local dev.
let app: any
let handler: any

try {
  try {
    // Try common built locations in order:
    // 1. dist/index.js (when you prebuild to dist)
    // 2. ../index.js (when builder places compiled root file next to api/)
    // 3. ../dist/index.js (alternative)
    const tryPaths = [
      path.join(__dirname, '..', 'dist', 'index.js'),
      path.join(__dirname, '..', 'index.js'),
      path.join(__dirname, '..', 'dist', 'index.js')
    ]
    let loaded = false
    for (const p of tryPaths) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
        const mod = require(p)
        app = mod && mod.default ? mod.default : mod
        loaded = true
        break
      } catch (e) {
        const err: any = e
        // eslint-disable-next-line no-console
        console.debug(`api/index.ts: cannot require ${p}: ${err && err.code ? err.code : err}`)
      }
    }
    if (!loaded) {
      // fallback to trying to require source — but avoid on Vercel (will usually not exist)
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
      app = require(path.join(__dirname, '..', 'src', 'index.ts')).default
    }
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
