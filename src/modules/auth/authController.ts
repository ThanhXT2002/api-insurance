import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiResponse } from '../../bases/apiResponse'
import { AuthService } from './authService'
import { AuthRepository } from './authRepository'

export class AuthController {
  private authService: AuthService

  constructor() {
    this.authService = new AuthService(new AuthRepository())
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body

    if (!email || !password) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error('Email và password là bắt buộc', 'Dữ liệu không hợp lệ', StatusCodes.BAD_REQUEST))
    }

    try {
      const result = await this.authService.loginWithSupabase(email, password)

      if (result.error) {
        console.error('Login failed:', result.error)
        return res
          .status(result.code || StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error(result.error, 'Lỗi đăng nhập', result.code || StatusCodes.BAD_REQUEST))
      }

      return res.status(StatusCodes.OK).send(
        ApiResponse.ok(
          {
            user: {
              id: result.profile.id,
              email: result.user?.email,
              name: result.profile.name,
              avatarUrl: result.profile.avatarUrl
            },
            token: result.token,
            expiresAt: result.session?.expires_at
          },
          result.message,
          StatusCodes.OK
        )
      )
    } catch (err: any) {
      console.error('Login error:', err)
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message || 'Lỗi server', 'Lỗi', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  async register(req: Request, res: Response) {
    const { email, password } = req.body
    if (!email || !password) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error('Email và password là bắt buộc', 'Dữ liệu không hợp lệ', StatusCodes.BAD_REQUEST))
    }

    try {
      const result = await this.authService.createUserWithSupabase(email, password)

      if ((result as any).error) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error((result as any).error, 'Lỗi đăng ký', StatusCodes.BAD_REQUEST))
      }

      return res.status(StatusCodes.CREATED).send(
        ApiResponse.ok(
          {
            id: (result as any).profile.id,
            email: (result as any).user.email,
            emailConfirmed: !!(result as any).user.email_confirmed_at
          },
          (result as any).message,
          StatusCodes.CREATED
        )
      )
    } catch (err: any) {
      console.error(err)
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message || 'Lỗi server', 'Lỗi', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
