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

  async register(req: Request, res: Response) {
    const { email, password, name } = req.body
    if (!email || !password) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send(ApiResponse.error('Email và password là bắt buộc', 'Dữ liệu không hợp lệ', StatusCodes.BAD_REQUEST))
    }

    try {
      const user = await this.authService.createUserWithSupabase(email, password, name)
      return res
        .status(StatusCodes.CREATED)
        .send(
          ApiResponse.ok(
            { id: (user as any).id, email: (user as any).email },
            'Tạo user thành công',
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