import prisma from '../../config/prismaClient'
import { BaseRepository } from '../../bases/repositoryBase'

export class UserRepository extends BaseRepository<'user'> {
  constructor() {
    super('user')
  }

  // Find many with optional include (used by BaseService)
  async findManyWithRoles(args?: { skip?: number; take?: number; where?: any }) {
    // NOTE (vi): Thay vì chỉ include roleAssignments như trước, hàm này hiện
    // include cả `userPermissions` (với relation `permission`) để các layer phía
    // trên (service/controller) có thể suy ra trực tiếp `roleKeys` và
    // `permissionKeys` mà không cần thực hiện thêm query cho từng user.
    //
    // Lợi ích:
    // - Giảm số lần query (fetch nhiều bản ghi 1 lần có include nested relations)
    // - Cho phép trả về response "phẳng" hơn (roleKeys/permissionKeys là mảng
    //   string) giúp frontend dễ dùng hơn.
    //
    // Lưu ý:
    // - Nếu dataset rất lớn, include nested relations có thể tăng payload size.
    //   Ở đây chúng ta chỉ include permission object (thường nhỏ) để đổi lấy
    //   sự tiện lợi khi trả về các key.
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
