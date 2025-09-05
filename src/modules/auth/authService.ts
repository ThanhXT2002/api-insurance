import { supabaseAdmin } from '../../config/supabaseClient'
import { AuthRepository } from './authRepository'

export class AuthService {
  constructor(private authRepository: AuthRepository) {}

  async createUserWithSupabase(email: string, password: string, name?: string) {
    // Create user in Supabase (server-side)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name }
    })
    if (error) throw error

    // the response contains a `user` object
    const supabaseId = (data as any).user?.id

    // Create DB profile using repository
    const user = await this.authRepository.createProfile({
      supabaseId,
      email,
      name,
      active: true
    })

    // Assign default role using repository
    const role = await this.authRepository.findRoleByKey('user')
    if (role) {
      await this.authRepository.createRoleAssignment((user as any).id, role.id)
    }

    return user
  }
}
