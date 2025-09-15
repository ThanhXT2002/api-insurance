import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiResponse } from '../../bases/apiResponse'
import { AuthService } from './authService'
import { AuthRepository } from './authRepository'
import { upload } from '../../utils/upload'

export class AuthController {
  private authService: AuthService

  constructor() {
    this.authService = new AuthService(new AuthRepository())
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

  // Lấy thông tin profile
  async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id
      if (!userId) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('Không tìm thấy thông tin user', 'Unauthorized', StatusCodes.UNAUTHORIZED))
      }

      const profile = await this.authService.getProfile(userId)
      return res.status(StatusCodes.OK).send(ApiResponse.ok(profile, 'Lấy thông tin profile thành công'))
    } catch (err: any) {
      console.error(err)
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message || 'Lỗi server', 'Lỗi', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // Cập nhật profile
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id
      if (!userId) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('Không tìm thấy thông tin user', 'Unauthorized', StatusCodes.UNAUTHORIZED))
      }

      const { name, phoneNumber, addresses } = req.body
      const updatedProfile = await this.authService.updateProfile(userId, { name, phoneNumber, addresses })

      return res.status(StatusCodes.OK).send(ApiResponse.ok(updatedProfile, 'Cập nhật profile thành công'))
    } catch (err: any) {
      console.error(err)
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message || 'Lỗi server', 'Lỗi', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }

  // Upload và cập nhật avatar
  async updateAvatarUrl(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id
      if (!userId) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .send(ApiResponse.error('Không tìm thấy thông tin user', 'Unauthorized', StatusCodes.UNAUTHORIZED))
      }

      if (!req.file) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .send(ApiResponse.error('Không có file được upload', 'File không hợp lệ', StatusCodes.BAD_REQUEST))
      }

      const result = await this.authService.updateAvatarUrl(userId, req.file.buffer, req.file.originalname)

      return res.status(StatusCodes.OK).send(ApiResponse.ok(result, 'Cập nhật avatar thành công'))
    } catch (err: any) {
      console.error(err)
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(ApiResponse.error(err.message || 'Lỗi server', 'Lỗi', StatusCodes.INTERNAL_SERVER_ERROR))
    }
  }
}
