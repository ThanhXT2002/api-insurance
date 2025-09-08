import { getSupabase } from '../../config/supabaseClient'
import { AuthRepository } from './authRepository'
import { fileUploadService, UploadedFile } from '../../services/fileUploadService'

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
    if (!user) throw new Error('Supabase user not created')

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
        return { error: { code: 'P2002', message: 'Tài khoản đã tồn tại', meta: err.meta } }
      }
      throw err
    }
  }

  // Lấy thông tin profile user
  async getProfile(userId: number) {
    const user = await this.authRepository.findById({ where: { id: userId } })
    if (!user) {
      throw new Error('User not found')
    }

    // Loại bỏ các thông tin nhạy cảm nếu có
    const { ...profile } = user
    return profile
  } // Cập nhật thông tin profile
  async updateProfile(userId: number, data: { name?: string; addresses?: string }) {
    const existingUser = await this.authRepository.findById({ where: { id: userId } })
    if (!existingUser) {
      throw new Error('User not found')
    }

    const updatedUser = await this.authRepository.updateById(userId, {
      ...data,
      updatedAt: new Date()
    })

    return updatedUser
  }

  // Upload avatar và cập nhật avatarUrl
  async updateAvatarUrl(userId: number, file: Buffer, originalName: string) {
    try {
      // Kiểm tra user tồn tại
      const existingUser = await this.authRepository.findById({ where: { id: userId } })
      if (!existingUser) {
        throw new Error('User not found')
      }

      // Upload file sử dụng FileUploadService
      const uploadedFile: UploadedFile = await fileUploadService.uploadAvatar(file, originalName)

      // Cập nhật avatarUrl trong database
      const updatedUser = await this.authRepository.updateById(userId, {
        avatarUrl: uploadedFile.url,
        updatedAt: new Date()
      })

      return {
        user: updatedUser,
        uploadInfo: {
          id: uploadedFile.id,
          originalName: uploadedFile.originalName,
          url: uploadedFile.url,
          size: uploadedFile.size,
          fileType: uploadedFile.fileType
        }
      }
    } catch (error: any) {
      // Xử lý lỗi upload
      throw new Error(`Upload avatar failed: ${error.message}`)
    }
  }
}
