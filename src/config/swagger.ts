import { Express } from 'express'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Insurance',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Document API Insurance '
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login'
        }
      },
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
    }
    // Remove global security - let each endpoint define its own
  },
  apis: [
    './src/**/*.ts', // Cho development
    './dist/**/*.js' // Cho production
  ]
}

const swaggerSpec = swaggerJsdoc(options)

export function setupSwagger(app: Express) {
  // Serve swagger.json
  app.get('/swagger.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })

  // Custom Swagger UI HTML để tránh vấn đề với static files
  app.get('/docs', (_req, res) => {
    const html = `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<title>API Insurance Documentation</title>
			<link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
			<style>
				html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
				*, *:before, *:after { box-sizing: inherit; }
				body { margin:0; background: #fafafa; }
			</style>
		</head>
		<body>
			<div id="swagger-ui"></div>
			<script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
			<script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
			<script>
				window.onload = function() {
					const ui = SwaggerUIBundle({
						url: '/swagger.json',
						dom_id: '#swagger-ui',
						deepLinking: true,
						presets: [
							SwaggerUIBundle.presets.apis,
							SwaggerUIStandalonePreset
						],
						plugins: [
							SwaggerUIBundle.plugins.DownloadUrl
						],
						layout: "StandaloneLayout"
					});
				};
			</script>
		</body>
		</html>
		`
    res.send(html)
  })
}

export default swaggerSpec
