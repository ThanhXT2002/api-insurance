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
      // common locations for compiled output
      path.join(__dirname, '..', 'dist', 'index.js'),
      path.join(__dirname, '..', 'index.js'),
      // some builders keep compiled sources under src
      path.join(__dirname, '..', 'src', 'index.js'),
      // fallback to process.cwd() which in serverless runtime is often /var/task
      path.join(process.cwd(), 'index.js'),
      path.join(process.cwd(), 'src', 'index.js')
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
      // No compiled JS entry found. Don't require TypeScript source in production —
      // on Vercel the TS files are not present at runtime which causes the crash
      // observed in logs (Cannot find module '/var/task/src/index.ts').
      throw new Error('No compiled JS entry found for the app')
    }
  } catch (e) {
    // If we're here, either a tryPaths require failed or we're in a dev environment
    // where a runtime transpiler is available. Attempt to require compiled JS under
    // src (some environments compile in-place) and otherwise rethrow so the outer
    // catch produces a fallback handler that logs the root cause.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
      app = require(path.join(__dirname, '..', 'src', 'index.js')).default
    } catch (inner) {
      // rethrow original so outer catch will create the fallback handler
      throw e
    }
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
