import { BaseRepository } from '../../bases/repositoryBase'
import prisma from '../../config/prismaClient'

export class AuthRepository extends BaseRepository<'user'> {
  constructor() {
    super('user')
  }

  async findByEmail(email: string) {
    return this.findUnique({ where: { email } })
  }

  async findBySupabaseId(supabaseId: string) {
    return this.findUnique({ where: { supabaseId } })
  }

  async createProfile(data: object) {
    return this.create(data)
  }

  // Methods for AuthService
  async findRoleByKey(key: string) {
    return prisma.userRole.findUnique({ where: { key } })
  }

  async createRoleAssignment(userId: number, roleId: number, scope?: string) {
    return prisma.userRoleAssignment.create({
      data: { userId, roleId, scope }
    })
  }
}
