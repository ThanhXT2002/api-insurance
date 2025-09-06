import { getSupabase } from '../../config/supabaseClient'
import { AuthRepository } from './authRepository'

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
}
