import prisma from '../../config/prismaClient'
import { BaseRepository } from '../../bases/repositoryBase'

export class UserRepository extends BaseRepository<'user'> {
  constructor() {
    super('user')
  }

  // Find many with optional include (used by BaseService)
  async findManyWithRoles(args?: { skip?: number; take?: number; where?: any }) {
    // Include both role assignments and direct user permissions so callers can derive
    // roleKeys and permissionKeys without additional queries.
    return prisma.user.findMany({
      ...args,
      include: {
        roleAssignments: { include: { role: true } },
        userPermissions: { include: { permission: true } }
      }
    })
  }

  // Expose count (BaseRepository already has count but keep alias if needed)
}

export default UserRepository
