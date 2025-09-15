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
        },
        SeoDto: {
          type: 'object',
          description: 'Thông tin SEO cho bất kỳ tài nguyên nào',
          properties: {
            seoTitle: {
              type: 'string',
              description: 'Tiêu đề SEO (khuyến nghị tối đa 60 ký tự)',
              example: 'Chuyên mục Bảo hiểm Tốt nhất - Tên công ty'
            },
            metaDescription: {
              type: 'string',
              description: 'Mô tả Meta (khuyến nghị tối đa 160 ký tự)',
              example:
                'Khám phá chuyên mục bảo hiểm toàn diện với các gói bảo hiểm tốt nhất phù hợp với nhu cầu của bạn.'
            },
            canonicalUrl: {
              type: 'string',
              description: 'URL chính tắc (URL đầy đủ hoặc slug)',
              example: 'https://example.com/category/bao-hiem-suc-khoe'
            },
            focusKeyword: {
              type: 'string',
              description: 'Từ khóa SEO chính',
              example: 'bảo hiểm sức khỏe'
            },
            ogType: {
              type: 'string',
              description: 'Loại Open Graph',
              example: 'article',
              default: 'article'
            },
            noindex: {
              type: 'boolean',
              description: 'Ngăn công cụ tìm kiếm lập chỉ mục',
              example: false,
              default: false
            },
            nofollow: {
              type: 'boolean',
              description: 'Ngăn công cụ tìm kiếm theo dõi liên kết',
              example: false,
              default: false
            }
          }
        },
        // Module-specific schemas (permissions, roles, assignments) moved to their router files
        PostCategory: {
          type: 'object',
          description: 'Chuyên mục bài viết',
          properties: {
            id: {
              type: 'integer',
              description: 'ID chuyên mục',
              example: 1
            },
            name: {
              type: 'string',
              description: 'Tên chuyên mục',
              example: 'Bảo hiểm sức khỏe'
            },
            slug: {
              type: 'string',
              description: 'Slug chuyên mục',
              example: 'bao-hiem-suc-khoe'
            },
            description: {
              type: 'string',
              description: 'Mô tả chuyên mục',
              example: 'Chuyên mục về các sản phẩm bảo hiểm sức khỏe'
            },
            parentId: {
              type: 'integer',
              nullable: true,
              description: 'ID chuyên mục cha',
              example: null
            },
            active: {
              type: 'boolean',
              description: 'Trạng thái hoạt động',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Thời gian tạo',
              example: '2023-01-01T00:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Thời gian cập nhật',
              example: '2023-01-01T00:00:00.000Z'
            },
            creatorName: {
              type: 'string',
              description: 'Tên người tạo',
              example: 'Admin User'
            },
            updaterName: {
              type: 'string',
              description: 'Tên người cập nhật',
              example: 'Admin User'
            },
            parent: {
              $ref: '#/components/schemas/PostCategory',
              description: 'Chuyên mục cha'
            },
            children: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PostCategory'
              },
              description: 'Danh sách chuyên mục con'
            },
            posts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'integer'
                  },
                  title: {
                    type: 'string'
                  },
                  slug: {
                    type: 'string'
                  }
                }
              },
              description: 'Danh sách bài viết trong chuyên mục'
            },
            seoMeta: {
              $ref: '#/components/schemas/SeoDto',
              description: 'Thông tin SEO'
            }
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
    // Disable caching for swagger.json to ensure updates are reflected immediately
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.send(swaggerSpec)
  })

  // Custom Swagger UI HTML để tránh vấn đề với static files
  app.get('/docs', (_req, res) => {
    // Disable caching for docs page too
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
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
						url: '/swagger.json?t=' + Date.now(), // Cache-busting parameter
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
