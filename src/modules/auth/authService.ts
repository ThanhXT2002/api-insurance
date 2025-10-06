import { getSupabase } from '../../config/supabaseClient'
import { AuthRepository } from './authRepository'
import { fileUploadService, UploadedFile } from '../../services/fileUploadService'
import { withRollback } from '../../utils/rollbackHelper'
import UploadHelpers from '../../services/uploadHelpers'
import { UserProfileSafe } from '~/types/userType'

export class AuthService {
  constructor(private authRepository: AuthRepository) {}

  async createUserWithSupabase(email: string, password: string) {
    // Create user with email verification required
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    if (error) throw error

    const user = data.user
    if (!user) throw new Error('Không tạo được người dùng Supabase')

    // Tạo profile trong DB chỉ với email
    try {
      const userProfile = await this.authRepository.createProfile({
        supabaseId: user.id,
        email,
        active: true
      })

      // Ensure default role exists and assign to user
      const role = await this.authRepository.ensureDefaultRole()
      await this.authRepository.createRoleAssignment((userProfile as any).id, role.id)

      return {
        user,
        profile: userProfile,
        message: user.email_confirmed_at
          ? 'Đăng ký thành công'
          : 'Đăng ký thành công, vui lòng kiểm tra email để xác thực'
      }
    } catch (err: any) {
      // Nếu tạo profile failed, có thể rollback Supabase user nếu cần
      if (err.code === 'P2002') {
        return {
          error: { code: 'P2002', message: 'Email đã tồn tại, vui lòng thử phương thức đăng ký khác!', meta: err.meta }
        }
      }
      throw err
    }
  }

  // Lấy thông tin profile user từ middleware (tối ưu, không cần query DB)
  getProfileFromUser(user: any): UserProfileSafe {
    return {
      email: user.email,
      name: user.name ?? null,
      phoneNumber: user.phoneNumber ?? null,
      avatarUrl: user.avatarUrl ?? null,
      active: user.active,
      updatedAt: user.updatedAt ?? null,
      addresses: user.addresses ?? null,
      roles: user.roles?.map((r: any) => r.key) ?? []
    }
  }

  // Lấy thông tin profile user đầy đủ từ DB (chỉ dùng khi cần thiết)
  async getProfile(userId: number) {
    const user = await this.authRepository.findByIdWithRoles(userId)
    if (!user) {
      throw new Error('Không tìm thấy người dùng')
    }

    return this.toSafeProfile(user)
  }

  // Cập nhật thông tin profile
  async updateProfile(userId: number, data: { name?: string; phoneNumber?: string; addresses?: string }) {
    const existingUser = await this.authRepository.findById({ where: { id: userId } })
    if (!existingUser) throw new Error('Không tìm thấy người dùng')

    const updatedUser = await this.authRepository.updateById(userId, {
      ...data,
      updatedAt: new Date()
    })

    // Clear cache để lần sau load lại data mới (lazy import to avoid circular dependency)
    const { authMiddleware } = await import('../../middlewares/authMiddleware.js')
    authMiddleware.clearUserCache(userId)

    return this.toSafeProfile(updatedUser)
  }

  async updateAvatarUrl(userId: number, file: Buffer, originalName: string) {
    const existingUser = await this.authRepository.findById({ where: { id: userId } })
    if (!existingUser) throw new Error('Không tìm thấy người dùng')

    const { result: updatedUser, uploadedFile } = await UploadHelpers.updateFileWithCleanup(
      () => fileUploadService.uploadAvatar(file, originalName),
      async (newFileUrl: string) => {
        return await this.authRepository.updateById(userId, {
          avatarUrl: newFileUrl,
          updatedAt: new Date()
        })
      },
      existingUser.avatarUrl
    )

    // Clear cache để lần sau load lại data mới (lazy import to avoid circular dependency)
    const { authMiddleware } = await import('../../middlewares/authMiddleware.js')
    authMiddleware.clearUserCache(userId)

    return {
      user: this.toSafeProfile(updatedUser),
      uploadInfo: {
        id: uploadedFile.id,
        originalName: uploadedFile.originalName,
        url: uploadedFile.url,
        size: uploadedFile.size,
        fileType: uploadedFile.fileType
      }
    }
  }

  // Chuyển object user từ DB sang định dạng an toàn trả về FE
  private toSafeProfile(user: any): UserProfileSafe {
    const roles = (user?.roleAssignments || []).map((assignment: any) => assignment.role.key)
    const {
      roleAssignments,
      id, // sensitive
      supabaseId, // sensitive
      ...profile
    } = user || {}

    return {
      email: profile.email,
      name: profile.name ?? null,
      phoneNumber: profile.phoneNumber ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      active: !!profile.active,
      updatedAt: profile.updatedAt ?? null,
      addresses: profile.addresses ?? null,
      roles
    }
  }
}
