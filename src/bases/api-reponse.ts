import { StatusCodes, getReasonPhrase } from 'http-status-codes'

export const ApiResponseKey = {
  STATUS: 'status',
  CODE: 'code',
  DATA: 'data',
  MESSAGE: 'message',
  TIMESTAMP: 'timestamp',
  ERRORS: 'errors'
} as const

export type ApiResponseOk<T = unknown> = {
  status: true
  code: number
  data: T | string
  message: string
  timestamp: string
}

export type ApiResponseError = {
  status: false
  code: number
  errors: string | object
  message: string
  timestamp: string
}

export type ApiResponseMessage = {
  status: boolean
  code: number
  message: string
  timestamp: string
}

export class ApiResponse {
  static getTimestamp(): string {
    return new Date().toISOString()
  }

  static ok<T = unknown>(data: T, message = '', httpStatus: number = StatusCodes.OK): ApiResponseOk<T> {
    return {
      [ApiResponseKey.STATUS]: true,
      [ApiResponseKey.CODE]: httpStatus,
      [ApiResponseKey.DATA]: typeof data === 'bigint' ? data.toString() : data,
      [ApiResponseKey.MESSAGE]: message || getReasonPhrase(httpStatus),
      [ApiResponseKey.TIMESTAMP]: this.getTimestamp()
    }
  }

  static error(
    errors: string | object,
    message: string,
    httpStatus: number = StatusCodes.INTERNAL_SERVER_ERROR
  ): ApiResponseError {
    return {
      [ApiResponseKey.STATUS]: false,
      [ApiResponseKey.CODE]: httpStatus,
      [ApiResponseKey.ERRORS]: errors,
      [ApiResponseKey.MESSAGE]: message || getReasonPhrase(httpStatus),
      [ApiResponseKey.TIMESTAMP]: this.getTimestamp()
    }
  }

  static message(message: string, httpStatus: number = StatusCodes.INTERNAL_SERVER_ERROR): ApiResponseMessage {
    return {
      [ApiResponseKey.STATUS]: httpStatus === StatusCodes.OK || httpStatus === StatusCodes.CREATED ? true : false,
      [ApiResponseKey.MESSAGE]: message || getReasonPhrase(httpStatus),
      [ApiResponseKey.TIMESTAMP]: this.getTimestamp(),
      [ApiResponseKey.CODE]: httpStatus
    }
  }
}
