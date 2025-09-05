import { Express } from 'express'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Insurance',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Document API Insurance ',
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer'
        }
      }
      ,
      schemas: {
        ApiResponseOk: {
          type: 'object',
          description: 'Response khi thành công - chuẩn hoá: status=true, chứa data và message',
          properties: {
            status: { type: 'boolean', example: true },
            code: { type: 'integer', example: 200 },
            data: { type: 'object', example: { id: 1, name: 'Nguyen' } },
            message: { type: 'string', example: 'Thành công' },
            timestamp: { type: 'string', format: 'date-time', example: new Date().toISOString() }
          }
        },
        ApiResponseError: {
          type: 'object',
          description: 'Response khi có lỗi - chuẩn hoá: status=false, chứa errors và message',
          properties: {
            status: { type: 'boolean', example: false },
            code: { type: 'integer', example: 400 },
            errors: { type: 'object', example: { field: 'email', message: 'Email không hợp lệ' } },
            message: { type: 'string', example: 'Email không hợp lệ' },
            timestamp: { type: 'string', format: 'date-time', example: new Date().toISOString() }
          }
        },
        ApiResponseMessage: {
          type: 'object',
          description: 'Response dạng thông điệp tổng quát: chỉ trả message + code + status',
          properties: {
            status: { type: 'boolean', example: true },
            code: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'Hoạt động thành công' },
            timestamp: { type: 'string', format: 'date-time', example: new Date().toISOString() }
          }
        }
      }
    },
    security: [{ BearerAuth: [] }]
  },
  apis: ['./src/**/*.ts']
}

const swaggerSpec = swaggerJsdoc(options)

export function setupSwagger(app: Express) {
	app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}

export default swaggerSpec
