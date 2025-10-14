# API Insurance - Backend REST API

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.1.0-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.15.0-2D3748.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-316192.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-ISC-green.svg)](LICENSE)

**API Insurance** là backend REST API cho hệ thống quản lý bảo hiểm, được xây dựng với Node.js, Express, TypeScript và Prisma ORM. API cung cấp đầy đủ chức năng cho website bảo hiểm bao gồm authentication, quản lý sản phẩm, bài viết, menu động, upload files, và hệ thống phân quyền chi tiết.

---

## 📋 Mục Lục

- [Tính năng chính](#-tính-năng-chính)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt](#-cài-đặt)
- [Cấu hình](#-cấu-hình)
- [Chạy ứng dụng](#-chạy-ứng-dụng)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Modules](#-modules)
- [Authentication & Authorization](#-authentication--authorization)
- [File Upload](#-file-upload)
- [Testing](#-testing)
- [Deploy](#-deploy)
- [Tác giả](#-tác-giả)

---

## 🚀 Tính năng chính

### ✅ **Authentication & Authorization**

- **JWT Authentication**: Đăng nhập, đăng ký, refresh token
- **Role-Based Access Control (RBAC)**: 5 roles (super_admin, admin, editor, author, user)
- **Permission System**: 31 permissions chi tiết cho từng chức năng
- **Database-driven Permissions**: Quản lý roles/permissions qua database, không hard-code
- **User Assignment**: Gán roles và permissions cho user linh hoạt

### ✅ **Content Management**

- **Posts (Blog)**: CRUD posts với SEO, scheduling, featured, highlighted
- **Post Categories**: Category tree với parent-child relationships
- **Products**: Quản lý 17+ loại bảo hiểm với đầy đủ thông tin
- **Product Reviews**: Đánh giá sản phẩm từ khách hàng
- **Comments**: Hệ thống comment cho posts
- **SEO Meta**: Quản lý SEO metadata cho posts/products

### ✅ **Dynamic Menu System**

- **Menu Categories**: Phân loại menu (header, footer, product menu)
- **Menu Items**: CRUD menu items với nested structure
- **Public API**: Lấy menu theo category key cho frontend

### ✅ **Vehicle Types Management**

- Quản lý loại xe (motorcycle, car, truck, etc.)
- Hỗ trợ tính phí bảo hiểm xe
- CRUD API với validation

### ✅ **File Upload & Image Processing**

- **Integration**: Tích hợp với File Upload Service external
- **Multiple File Types**: Avatar, documents, post images, insurance docs
- **Image Optimization**: Resize, compress với Sharp
- **Folder Management**: Tự động phân loại files theo folders
- **Validation**: Kiểm tra file size, type

### ✅ **User Management**

- CRUD users với avatar upload
- Quản lý profile, addresses, phone
- Active/Inactive status
- Role/Permission assignment

### ✅ **Contact Form**

- Submit contact form từ frontend
- Email validation
- Store contact requests

### ✅ **Monitoring & Reports**

- Health check endpoint
- System uptime
- Database statistics (pending implementation)

### ✅ **API Documentation**

- **Swagger UI**: Interactive API docs tại `/docs`
- **OpenAPI 3.0**: Chuẩn OpenAPI specification
- **JWT Authentication**: Test API trực tiếp với token

---

## 🛠️ Công nghệ sử dụng

### **Backend Framework**

- **Node.js 22.x**: JavaScript runtime
- **Express 5.1.0**: Web framework
- **TypeScript 5.9.2**: Type-safe development
- **Serverless HTTP 4.0.0**: Deploy trên Vercel serverless

### **Database & ORM**

- **PostgreSQL**: Relational database (Supabase)
- **Prisma 6.15.0**: Modern ORM cho TypeScript
- **Prisma Client**: Type-safe database queries
- **Migrations**: Database schema versioning

### **Authentication & Security**

- **JWT (jsonwebtoken 9.0.2)**: Token-based authentication
- **bcryptjs 3.0.2**: Password hashing
- **CORS 2.8.5**: Cross-Origin Resource Sharing
- **Rate Limiting**: Bảo vệ API khỏi abuse (custom middleware)

### **File Upload & Processing**

- **Multer 2.0.2**: Handle multipart/form-data
- **Sharp 0.34.3**: Image processing và optimization
- **Axios 1.11.0**: HTTP client cho external file service
- **Form-Data 4.0.4**: Gửi files đến upload service

### **API Documentation**

- **Swagger JSDoc 6.2.8**: Generate OpenAPI từ JSDoc comments
- **Swagger UI Express 5.0.1**: Interactive API documentation UI

### **Utilities**

- **Slugify 1.6.6**: Tạo URL-friendly slugs
- **dotenv 17.2.2**: Environment variables management
- **http-status-codes 2.3.0**: HTTP status constants

### **Development Tools**

- **Nodemon 3.1.10**: Auto-restart server khi dev
- **ESLint 9.34.0**: Linting
- **Prettier 3.6.2**: Code formatter
- **TypeScript ESLint 8.42.0**: TypeScript linting rules
- **tsc-alias 1.8.16**: Resolve TypeScript path aliases
- **rimraf 6.0.1**: Cross-platform rm -rf

---

## 📦 Yêu cầu hệ thống

- **Node.js**: >= 22.x (required by engines in package.json)
- **npm**: >= 9.x hoặc **yarn** / **pnpm**
- **PostgreSQL**: >= 14.x (hoặc Supabase)
- **RAM**: Tối thiểu 2GB (khuyến nghị 4GB)
- **Disk Space**: ~200MB cho node_modules

---

## 📥 Cài đặt

### 1. Clone Repository

```bash
git clone https://github.com/your-username/api-insurance.git
cd api-insurance
```

### 2. Cài đặt Dependencies

```bash
npm install
# hoặc
yarn install
```

### 3. Setup Database

Tạo database PostgreSQL (local hoặc Supabase):

```sql
CREATE DATABASE insurance_db;
```

### 4. Cấu hình Environment

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Điền thông tin vào `.env` (xem phần [Cấu hình](#-cấu-hình) bên dưới).

### 5. Chạy Migrations

```bash
npx prisma migrate dev
```

### 6. Seed Database (Optional)

```bash
# Seed roles & permissions
npm run seed:roles

# Tạo admin user mặc định
npm run create:admin

# Hoặc seed tất cả
npx prisma db seed
```

---

## ⚙️ Cấu hình

Tạo file `.env` trong thư mục gốc:

```env
# Server Configuration
PORT=3600
NODE_ENV=development

# Database (PostgreSQL - Supabase hoặc local)
DATABASE_URL="postgresql://user:password@host:5432/insurance_db?schema=public"

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_REFRESH_SECRET=your_refresh_token_secret_here
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS - Frontend URLs (comma-separated)
CLIENT_ORIGIN=http://localhost:4600,https://xtbh.tranxuanthanhtxt.com

# File Upload Service (External)
FILE_UPLOAD_BASE_URL=https://file-fastify.tranxuanthanhtxt.com/api/files
IMAGE_UPLOAD_KEY=your_upload_service_api_key

# Supabase (Optional - nếu dùng Supabase Auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email Service (Optional - cho future features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Lưu ý quan trọng**:

- File `.env` đã được thêm vào `.gitignore`, **KHÔNG commit lên Git**
- Đổi `JWT_SECRET` và `JWT_REFRESH_SECRET` trong production
- `DATABASE_URL`: Lấy từ Supabase hoặc PostgreSQL local
- `IMAGE_UPLOAD_KEY`: API key từ file upload service

---

## 🎯 Chạy ứng dụng

### **Development Mode**

```bash
npm run dev
```

Server chạy trên `http://localhost:3600` (hoặc PORT trong .env)

Nodemon sẽ tự động restart khi có thay đổi code.

---

### **Production Mode**

#### 1. Build

```bash
npm run build
```

Output: `dist/` folder với compiled JavaScript.

#### 2. Start Production Server

```bash
npm start
```

---

### **Database Commands**

#### Prisma Migrations

```bash
# Tạo migration mới
npx prisma migrate dev --name your_migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (⚠️ XÓA TẤT CẢ DỮ LIỆU)
npx prisma migrate reset
```

#### Prisma Studio (Database GUI)

```bash
npx prisma studio
```

Mở trình duyệt tại `http://localhost:5555` để quản lý database trực quan.

#### Generate Prisma Client

```bash
npx prisma generate
```

---

### **Seed & Setup Commands**

```bash
# Setup authentication system
npm run setup:auth

# Seed roles & permissions
npm run seed:roles

# Tạo admin user mặc định
npm run create:admin
```

---

### **Linting & Formatting**

```bash
# Kiểm tra ESLint
npm run lint

# Auto-fix ESLint errors
npm run lint:fix

# Kiểm tra Prettier
npm run prettier

# Auto-format với Prettier
npm run prettier:fix
```

---

## 📚 API Documentation

### **Swagger UI (Interactive Docs)**

**URL**: [https://api-insurance.tranxuanthanhtxt.com/docs](https://api-insurance.tranxuanthanhtxt.com/docs)

Swagger UI cung cấp:

- Danh sách tất cả endpoints
- Request/Response schemas
- Thử nghiệm API trực tiếp với JWT token
- Examples cho mỗi endpoint

### **Sử dụng Swagger UI:**

1. Mở [/docs](https://api-insurance.tranxuanthanhtxt.com/docs)
2. Click **"Authorize"** button (🔓 icon)
3. Nhập JWT token: `Bearer <your_token_here>`
4. Click **"Authorize"** để lưu
5. Test các endpoints bằng cách click **"Try it out"**

### **Lấy JWT Token:**

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}

# Response:
{
  "status": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "user": { ... }
  }
}
```

Copy `accessToken` và dùng trong Swagger UI.

---

## 🗄️ Database Schema

### **Core Models**

#### **User**

- `id`, `email`, `name`, `avatarUrl`, `phoneNumber`, `addresses`
- `active`, `supabaseId` (optional)
- Relationships: roles, permissions, created posts/products

#### **UserRole**

- `id`, `key`, `name`, `description`
- Pre-defined: `super_admin`, `admin`, `editor`, `author`, `user`

#### **Permission**

- `id`, `key`, `name`, `description`
- 31 permissions: post._, user._, role._, admin._, content._, seo._, comment.\*

#### **UserRoleAssignment**

- Links User ↔ UserRole
- Supports `scope` for fine-grained permissions

#### **UserPermission**

- Direct user-level permissions (override role permissions)
- `allowed` flag (true/false)

### **Content Models**

#### **Post**

- `id`, `title`, `slug`, `content`, `excerpt`, `featuredImage`
- `status` (DRAFT, PUBLISHED, ARCHIVED)
- `isHighlighted`, `isFeatured`, `priority`
- `scheduledAt`, `publishedAt`, `expiredAt`
- `albumImages` (JSON), `videoUrl`
- SEO: via `SeoMeta` relation

#### **PostCategory**

- `id`, `name`, `slug`, `description`, `parentId`
- Tree structure với parent-child
- `order`, `active`

#### **Product**

- `id`, `name`, `slug`, `description`, `shortDescription`
- `price`, `originalPrice`, `currency`
- `featuredImage`, `galleryImages` (JSON)
- `stock`, `sku`, `featured`, `newArrival`
- `categoryId`, `tags` (JSON)

#### **ProductReview**

- `id`, `productId`, `userId`, `rating`, `comment`
- `verified`, `helpful`

#### **PostComment**

- `id`, `postId`, `userId`, `content`, `parentId`
- Tree structure cho nested comments
- `approved`

#### **SeoMeta**

- `id`, `seoableType`, `seoableId`
- `seoTitle`, `metaDescription`, `canonicalUrl`
- `focusKeyword`, `ogType`
- `noindex`, `nofollow`

### **Menu System**

#### **MenuCategory**

- `id`, `name`, `key`, `description`
- Examples: `menu-header`, `menu-footer`, `menu-product`

#### **MenuItem**

- `id`, `categoryId`, `label`, `url`, `icon`
- `parentId` (tree structure), `order`, `target`
- `active`

### **Vehicle Types**

#### **VehicleType**

- `id`, `name`, `description`, `categoryKey`
- `order`, `active`
- Examples: motorcycle, car, truck, bus

### **Contact**

#### **Contact**

- `id`, `name`, `email`, `phoneNumber`, `subject`, `message`
- `status`, `note`, `priority`

---

## 🧩 Modules

API được tổ chức thành **13 modules** chính:

### **1. Auth Module** (`/api/auth`)

| Endpoint    | Method | Mô tả                        |
| ----------- | ------ | ---------------------------- |
| `/login`    | POST   | Đăng nhập (email + password) |
| `/register` | POST   | Đăng ký tài khoản mới        |
| `/refresh`  | POST   | Refresh access token         |
| `/logout`   | POST   | Đăng xuất                    |
| `/profile`  | GET    | Lấy thông tin user hiện tại  |

### **2. Users Module** (`/api/users`)

| Endpoint | Method | Mô tả                    | Permission    |
| -------- | ------ | ------------------------ | ------------- |
| `/`      | GET    | List users               | `user.view`   |
| `/`      | POST   | Create user (với avatar) | `user.create` |
| `/:id`   | GET    | Get user by ID           | `user.view`   |
| `/:id`   | PATCH  | Update user              | `user.edit`   |
| `/:id`   | DELETE | Delete user              | `user.delete` |

### **3. Posts Module** (`/api/posts`)

| Endpoint       | Method | Mô tả               | Permission     |
| -------------- | ------ | ------------------- | -------------- |
| `/`            | GET    | List posts (public) | -              |
| `/`            | POST   | Create post         | `post.create`  |
| `/:id`         | GET    | Get post by ID      | -              |
| `/slug/:slug`  | GET    | Get post by slug    | -              |
| `/:id`         | PATCH  | Update post         | `post.edit`    |
| `/:id`         | DELETE | Delete post         | `post.delete`  |
| `/:id/publish` | POST   | Publish post        | `post.publish` |

### **4. Post Categories Module** (`/api/post-categories`)

| Endpoint | Method | Mô tả                  | Permission             |
| -------- | ------ | ---------------------- | ---------------------- |
| `/`      | GET    | List categories (tree) | -                      |
| `/`      | POST   | Create category        | `post_category.create` |
| `/:id`   | PATCH  | Update category        | `post_category.edit`   |
| `/:id`   | DELETE | Delete category        | `post_category.delete` |

### **5. Products Module** (`/api/products`)

| Endpoint      | Method | Mô tả                          |
| ------------- | ------ | ------------------------------ |
| `/`           | GET    | List products                  |
| `/sorted`     | GET    | List products with pagination  |
| `/home`       | GET    | Featured products for homepage |
| `/:id`        | GET    | Get product by ID              |
| `/slug/:slug` | GET    | Get product by slug            |
| `/:id`        | PATCH  | Update product                 |
| `/:id`        | DELETE | Delete product                 |

### **6. Menus Module** (`/api/menus`)

| Endpoint       | Method | Mô tả                           |
| -------------- | ------ | ------------------------------- |
| `/categories`  | GET    | List menu categories            |
| `/categories`  | POST   | Create menu category            |
| `/public/:key` | GET    | Get public menu by category key |
| `/items`       | GET    | List menu items                 |
| `/items`       | POST   | Create menu item                |
| `/items/:id`   | PATCH  | Update menu item                |
| `/items/:id`   | DELETE | Delete menu item                |

### **7. Vehicle Types Module** (`/api/vehicle-types`)

| Endpoint | Method | Mô tả               |
| -------- | ------ | ------------------- |
| `/`      | GET    | List vehicle types  |
| `/`      | POST   | Create vehicle type |
| `/:id`   | PATCH  | Update vehicle type |
| `/:id`   | DELETE | Delete vehicle type |

### **8. Permissions Module** (`/api/permissions`)

| Endpoint | Method | Mô tả             | Permission          |
| -------- | ------ | ----------------- | ------------------- |
| `/`      | GET    | List permissions  | `permission.view`   |
| `/`      | POST   | Create permission | `permission.manage` |

### **9. User Roles Module** (`/api/user-roles`)

| Endpoint           | Method | Mô tả                | Permission    |
| ------------------ | ------ | -------------------- | ------------- |
| `/`                | GET    | List roles           | `role.view`   |
| `/`                | POST   | Create role          | `role.create` |
| `/:id/permissions` | GET    | Get role permissions | `role.view`   |

### **10. User Assignments Module** (`/api/user-assignments`)

| Endpoint               | Method | Mô tả                |
| ---------------------- | ------ | -------------------- |
| `/`                    | POST   | Assign role to user  |
| `/:userId/roles`       | GET    | Get user roles       |
| `/:userId/permissions` | GET    | Get user permissions |

### **11. Contact Module** (`/api/contact`)

| Endpoint | Method | Mô tả                      |
| -------- | ------ | -------------------------- |
| `/`      | POST   | Submit contact form        |
| `/`      | GET    | List contacts (admin only) |

### **12. Reports Module** (`/api/reports`)

| Endpoint | Method | Mô tả                           |
| -------- | ------ | ------------------------------- |
| `/`      | GET    | Get system statistics (pending) |

### **13. Monitoring** (`/api/health`)

| Endpoint  | Method | Mô tả                          |
| --------- | ------ | ------------------------------ |
| `/health` | GET    | Health check (status + uptime) |

---

## 🔐 Authentication & Authorization

### **JWT Authentication Flow**

1. **Login**: User gửi email + password → Server trả về `accessToken` và `refreshToken`
2. **Authenticated Requests**: Frontend gửi `Authorization: Bearer <accessToken>` trong headers
3. **Token Expiration**: Khi `accessToken` hết hạn (15 phút), dùng `refreshToken` để lấy token mới
4. **Logout**: Xóa tokens khỏi client

### **Role-Based Access Control (RBAC)**

#### **5 Roles mặc định:**

| Role          | Permissions          | Mô tả                             |
| ------------- | -------------------- | --------------------------------- |
| `super_admin` | 31 permissions (ALL) | Toàn quyền hệ thống               |
| `admin`       | 21 permissions       | Quản lý content + users           |
| `editor`      | 16 permissions       | Quản lý content (posts, products) |
| `author`      | 6 permissions        | Tạo/sửa posts của mình            |
| `user`        | 3 permissions        | Xem nội dung, comment             |

#### **31 Permissions:**

**Post Category**: `post_category.view`, `post_category.create`, `post_category.edit`, `post_category.delete`, `post_category.manage`

**Post**: `post.view`, `post.create`, `post.edit`, `post.delete`, `post.publish`, `post.manage`

**User**: `user.view`, `user.create`, `user.edit`, `user.delete`, `user.manage`

**Role**: `role.view`, `role.create`, `role.edit`, `role.delete`, `role.manage`

**System**: `admin.access`, `system.config`, `permission.view`, `permission.manage`

**Content**: `content.moderate`, `content.publish`, `seo.manage`

**Comment**: `comment.view`, `comment.moderate`, `comment.delete`

### **Middleware Sử Dụng:**

```typescript
// authMiddleware.ts
export const authenticate = (req, res, next) => { ... }
export const requirePermission = (permission: string) => { ... }
export const requireRole = (roles: string[]) => { ... }

// Sử dụng trong routes:
router.post('/posts',
  authenticate,
  requirePermission('post.create'),
  createPost
)
```

---

## 📤 File Upload

### **Architecture**

API tích hợp với **External File Upload Service** (không tự host files):

```
Client → API → File Upload Service (file-fastify.tranxuanthanhtxt.com)
```

### **Upload Flow**

1. Client gửi file qua multipart/form-data đến API
2. API sử dụng Multer để parse file
3. API forward file đến Upload Service qua Axios
4. Upload Service xử lý, optimize, lưu file, trả về URL
5. API lưu URL vào database (avatarUrl, featuredImage, etc.)

### **Supported Upload Types**

| Type           | Max Size | Folder       | Allowed Formats           |
| -------------- | -------- | ------------ | ------------------------- |
| Avatar         | 5MB      | `avatars/`   | jpg, jpeg, png, gif, webp |
| Post Images    | 10MB     | `posts/`     | jpg, jpeg, png, gif, webp |
| Product Images | 10MB     | `products/`  | jpg, jpeg, png, gif, webp |
| Documents      | 10MB     | `documents/` | pdf, doc, docx, xls, xlsx |
| Insurance Docs | 10MB     | `insurance/` | pdf, jpg, png             |

### **Services & Helpers**

```typescript
// src/services/fileUploadService.ts
class FileUploadService {
  uploadSingleFile(buffer, name, options)
  uploadMultipleFiles(files, options)
  uploadAvatar(buffer, name)
  uploadDocument(buffer, name, folder)
}

// src/services/uploadHelpers.ts
class UploadHelpers {
  uploadPostImages(files)
  uploadUserDocuments(files)
  uploadInsuranceDocuments(files)
}
```

### **Image Processing**

- **Sharp**: Resize, compress, optimize images trước khi upload
- **WebP Conversion**: Tự động convert sang WebP (nếu cần)
- **Thumbnails**: Tạo thumbnail cho gallery images

### **Configuration**

```env
FILE_UPLOAD_BASE_URL=https://file-fastify.tranxuanthanhtxt.com/api/files
IMAGE_UPLOAD_KEY=your_api_key
```

---

## 🧪 Testing

### **Unit Tests**

(Chưa triển khai - TODO)

Khuyến nghị sử dụng:

- **Jest**: `npm install --save-dev jest @types/jest ts-jest`
- **Supertest**: Testing HTTP requests

```bash
# Chạy tests
npm test

# Coverage
npm run test:coverage
```

### **Manual Testing**

- **Swagger UI**: Test API trực tiếp tại `/docs`
- **Postman**: Import OpenAPI spec từ `/swagger.json`
- **cURL**: Examples trong `docs/` folder

---

## 🚀 Deploy

### **Deploy lên Vercel (Serverless)**

#### 1. **Cấu hình Vercel**

File `vercel.json` đã có sẵn:

```json
{
  "version": 2,
  "builds": [{ "src": "api/index.js", "use": "@vercel/node" }],
  "routes": [
    { "src": "/docs", "dest": "api/index.js" },
    { "src": "/swagger.json", "dest": "api/index.js" },
    { "src": "/(.*)", "dest": "api/index.js" }
  ]
}
```

#### 2. **Deploy Steps**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### 3. **Environment Variables trên Vercel**

Thêm các biến trong Vercel Dashboard → Settings → Environment Variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_ORIGIN`
- `FILE_UPLOAD_BASE_URL`
- `IMAGE_UPLOAD_KEY`

#### 4. **Build Command**

Vercel tự động chạy:

```bash
npm run vercel-build
```

### **Deploy lên VPS/Server**

#### 1. **Build**

```bash
npm run build
```

#### 2. **Start với PM2**

```bash
npm install -g pm2

pm2 start dist/index.js --name api-insurance
pm2 save
pm2 startup
```

#### 3. **Nginx Reverse Proxy**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3600;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. **SSL với Certbot**

```bash
sudo certbot --nginx -d api.yourdomain.com
```

---

## 📂 Cấu trúc Dự án

```
api-insurance/
├── src/
│   ├── index.ts                 # Entry point
│   ├── bases/                   # Base classes/utilities
│   ├── config/
│   │   ├── swagger.ts          # Swagger configuration
│   │   └── axiosClient.ts      # Axios instances
│   ├── middlewares/
│   │   ├── authMiddleware.ts   # JWT authentication
│   │   ├── authUtils.ts        # Auth utilities
│   │   └── rateLimit.ts        # Rate limiting
│   ├── modules/                # Feature modules
│   │   ├── auth/               # Login, register, refresh
│   │   ├── users/              # User management
│   │   ├── posts/              # Blog posts
│   │   ├── postCategories/     # Post categories
│   │   ├── products/           # Products
│   │   ├── menus/              # Dynamic menus
│   │   ├── vehicleTypes/       # Vehicle types
│   │   ├── permissions/        # Permissions CRUD
│   │   ├── userRoles/          # Roles CRUD
│   │   ├── userAssignments/    # Role assignments
│   │   ├── contact/            # Contact form
│   │   ├── reports/            # System reports
│   │   └── monitoring/         # Health checks
│   ├── router/
│   │   └── index.ts            # Route registration
│   ├── services/
│   │   ├── fileUploadService.ts    # File upload integration
│   │   ├── uploadHelpers.ts        # Upload utilities
│   │   ├── imageProcessingService.ts # Sharp image processing
│   │   └── seoService.ts           # SEO utilities
│   ├── schemas/                # Validation schemas (Zod/Joi)
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Helper functions
│   └── scripts/                # Seed & setup scripts
│       ├── setupAuth.ts
│       ├── seedRolesPermissions.ts
│       └── createDefaultAdmin.ts
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Migration history
│   ├── seed.ts                 # Main seed file
│   ├── seedUsers.ts
│   ├── seedPostCategories.ts
│   ├── seedPosts.ts
│   ├── seedVehicleTypes.ts
│   └── ...
├── docs/                       # Technical documentation
│   ├── auth-implementation-summary.md
│   ├── user-api-examples.md
│   ├── file-upload-service.md
│   ├── performance-optimization-*.md
│   └── ...
├── api/
│   └── index.js                # Vercel serverless entry
├── dist/                       # Build output (generated)
├── generated/
│   └── prisma/                 # Generated Prisma client
├── .env                        # Environment variables (not in git)
├── .env.example                # Example env file
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vercel.json                 # Vercel config
├── nodemon.json                # Nodemon config
└── README.md                   # This file
```

---

## 📜 Scripts Quan Trọng

| Script                 | Mô tả                                      |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Chạy dev server với Nodemon (auto-restart) |
| `npm run build`        | Build production (TypeScript → JavaScript) |
| `npm start`            | Chạy production server từ `dist/`          |
| `npm run vercel-build` | Build cho Vercel deployment                |
| `npm run lint`         | Kiểm tra ESLint                            |
| `npm run lint:fix`     | Auto-fix ESLint errors                     |
| `npm run prettier`     | Kiểm tra Prettier format                   |
| `npm run prettier:fix` | Auto-format code                           |
| `npm run setup:auth`   | Setup auth system (roles + permissions)    |
| `npm run seed:roles`   | Seed roles & permissions vào DB            |
| `npm run create:admin` | Tạo admin user mặc định                    |

---

## 📚 Tài liệu Bổ sung

Xem thư mục `docs/` cho các hướng dẫn chi tiết:

| File                             | Nội dung                              |
| -------------------------------- | ------------------------------------- |
| `auth-implementation-summary.md` | Hệ thống authentication & permissions |
| `auth-middleware-guide.md`       | Hướng dẫn sử dụng auth middleware     |
| `user-api-examples.md`           | Examples tạo/update user với avatar   |
| `file-upload-service.md`         | Hướng dẫn upload files                |
| `image-processing.md`            | Xử lý ảnh với Sharp                   |
| `seo-workflow.md`                | Workflow quản lý SEO                  |
| `performance-optimization-*.md`  | Tối ưu performance                    |
| `rollback-pattern.md`            | Rollback patterns cho transactions    |

---

## 🐛 Troubleshooting

### **Database Connection Failed**

```bash
# Kiểm tra DATABASE_URL trong .env
# Kiểm tra PostgreSQL/Supabase running
npx prisma db pull  # Test connection
```

### **Prisma Generate Failed**

```bash
# Xóa generated folder và generate lại
rm -rf generated/
npx prisma generate
```

### **Port Already in Use**

```bash
# Đổi PORT trong .env
PORT=3601
```

### **CORS Errors**

```bash
# Thêm frontend URL vào CLIENT_ORIGIN trong .env
CLIENT_ORIGIN=http://localhost:4600,https://your-frontend.com
```

### **JWT Token Invalid**

- Kiểm tra `JWT_SECRET` trong .env giống production
- Kiểm tra token expiration (default 15 phút)
- Sử dụng `/api/auth/refresh` để lấy token mới

### **File Upload Failed**

- Kiểm tra `FILE_UPLOAD_BASE_URL` và `IMAGE_UPLOAD_KEY` trong .env
- Verify file upload service đang chạy
- Check file size < limit (5MB avatar, 10MB docs)

---

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng:

1. Fork repository
2. Tạo branch feature: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Mở Pull Request

### **Coding Standards**

- Sử dụng ESLint và Prettier: `npm run lint:fix && npm run prettier:fix`
- Viết JSDoc comments cho Swagger
- Tuân thủ TypeScript strict mode
- Commit messages: Conventional Commits format

---

## 🌐 Demo & API Docs

- **API Base URL**: [https://api-insurance.tranxuanthanhtxt.com](https://api-insurance.tranxuanthanhtxt.com)
- **Swagger Documentation**: [https://api-insurance.tranxuanthanhtxt.com/docs](https://api-insurance.tranxuanthanhtxt.com/docs)

---

## 📝 License

Dự án này sử dụng license **ISC**.

---

## 👨‍💻 Tác giả

**Trần Xuân Thành**

- 📧 Email: [tranxuanthanhtxt2002@gmail.com](mailto:tranxuanthanhtxt2002@gmail.com)
- 🐙 GitHub: [@ThanhXT2002](https://github.com/ThanhXT2002)
- 🌐 API Demo: [https://api-insurance.tranxuanthanhtxt.com](https://api-insurance.tranxuanthanhtxt.com)
- 📖 Swagger Docs: [https://api-insurance.tranxuanthanhtxt.com/docs](https://api-insurance.tranxuanthanhtxt.com/docs)

---

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Fast, minimalist web framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [TypeScript](https://www.typescriptlang.org/) - JavaScript với types
- [Swagger](https://swagger.io/) - API documentation
- [Vercel](https://vercel.com/) - Serverless deployment platform

---

## 📞 Liên hệ & Hỗ trợ

Nếu có bất kỳ câu hỏi hoặc vấn đề, vui lòng:

- 📧 Email: tranxuanthanhtxt2002@gmail.com
- 🐛 Open Issue: [GitHub Issues](https://github.com/ThanhXT2002/api-insurance/issues)
- 📖 Xem Swagger Docs: [https://api-insurance.tranxuanthanhtxt.com/docs](https://api-insurance.tranxuanthanhtxt.com/docs)

---

**🎉 Cảm ơn bạn đã sử dụng API Insurance!**

_Built with ❤️ using Node.js, Express, TypeScript, and Prisma_
