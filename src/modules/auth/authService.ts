import { getSupabase } from '../../config/supabaseClient'
import { AuthRepository } from './authRepository'

export class AuthService {
  constructor(private authRepository: AuthRepository) {}

  async loginWithSupabase(email: string, password: string) {
    try {
      const supabase = getSupabase()

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return {
          error: error.message || 'Đăng nhập thất bại',
          code: error.status || 400
        }
      }

      if (!data.user || !data.session) {
        return {
          error: 'Không thể tạo session',
          code: 401
        }
      }

      // Get local user profile
      const localUser = await this.authRepository.findBySupabaseId(data.user.id)

      if (!localUser) {
        return {
          error: 'Tài khoản không tồn tại trong hệ thống',
          code: 404
        }
      }

      if (!localUser.active) {
        return {
          error: 'Tài khoản đã bị vô hiệu hóa',
          code: 403
        }
      }

      return {
        user: data.user,
        session: data.session,
        profile: localUser,
        token: data.session.access_token,
        message: 'Đăng nhập thành công'
      }
    } catch (error: any) {
      return {
        error: error.message || 'Lỗi đăng nhập',
        code: 500
      }
    }
  }

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
