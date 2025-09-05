

import { PrismaClient } from '../../generated/prisma'

// Use a global variable to preserve the PrismaClient across module reloads in
// development (e.g. nodemon / ts-node-dev) to avoid creating many connections.
declare global {
	// allow attaching to globalThis
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Global {
		__prisma?: PrismaClient
	}
}

const globalAny: any = global
const prisma = globalAny.__prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalAny.__prisma = prisma

export default prisma

 