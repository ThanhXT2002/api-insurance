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

  async createDefaultRole() {
    // Tạo role 'user' mặc định nếu chưa tồn tại
    return prisma.userRole.upsert({
      where: { key: 'user' },
      update: {}, // Không update gì nếu đã tồn tại
      create: {
        key: 'user',
        name: 'User',
        description: 'Default user role with basic permissions'
      }
    })
  }

  async ensureDefaultRole() {
    // Đảm bảo role 'user' tồn tại, tạo nếu chưa có
    const existingRole = await this.findRoleByKey('user')
    if (!existingRole) {
      return this.createDefaultRole()
    }
    return existingRole
  }

  // Thêm phương thức updateById cho AuthRepository
  async updateById(id: number, data: any) {
    return prisma.user.update({
      where: { id },
      data,
      include: {
        roleAssignments: {
          include: { role: true }
        }
      }
    })
  }

  // Lấy user với role assignments (tối ưu cho profile)
  async findByIdWithRoles(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        supabaseId: true,
        email: true,
        name: true,
        phoneNumber: true,
        addresses: true,
        avatarUrl: true,
        active: true,
        updatedAt: true,
        roleAssignments: {
          select: {
            role: {
              select: {
                key: true
              }
            }
          }
        }
      }
    })
  }
}
