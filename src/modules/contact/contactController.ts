import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import ContactService from './contactService'
import { ApiResponse } from '~/bases/apiResponse'

export class ContactController {
  service: ContactService
  constructor(service: ContactService) {
    this.service = service
  }

  async submit(req: Request, res: Response) {
    try {
      const { name, phone, email, message } = req.body
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip
      const userAgent = req.headers['user-agent'] as string | undefined

      const result = await this.service.submit({ name, phone, email, message, ip, userAgent })

      return res.status(StatusCodes.OK).send(ApiResponse.ok(result, "Gửi liên hệ thành công"));
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Contact submit error', err)
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(ApiResponse.error(err.message,'Gửi liên hệ thất bại'));
    }
  }


  async getAll(req: Request, res: Response) {
    try {
      const params = { ...req.query }
      const result = await this.service.getAll(params)
      return res.status(StatusCodes.OK).send({ success: true, data: result })
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Contact getAll error', err)
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(ApiResponse.error(err.message,'Không thể lấy danh sách liên hệ'));
    }
  }

}

export default ContactController
