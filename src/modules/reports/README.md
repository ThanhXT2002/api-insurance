# Reports Module

## Mục đích
Module Reports cung cấp các API báo cáo và thống kê cho hệ thống quản lý phân quyền (Permission Management System). Module này được thiết kế để giúp admin có cái nhìn tổng quan về:

- Thống kê tổng quan về permissions, roles, users
- Phân tích sử dụng permissions
- Báo cáo về mối quan hệ user-role-permission  
- Audit trail và phân tích bảo mật

## Kiến trúc

Module này tuân thủ đúng nguyên tắc **Repository-Service-Controller-Router** pattern:

```
ReportsRepository (Data Layer)
    ↓
ReportsService (Business Logic Layer)  
    ↓
ReportsController (API Layer)
    ↓
ReportsRouter (Route Definition Layer)
```

### ReportsRepository
- **Chức năng**: Xử lý các truy vấn database phức tạp cho báo cáo
- **Kế thừa**: BaseRepository để có transaction support và logging
- **Methods**:
  - `getPermissionsSummary()` - Thống kê tổng quan
  - `getUsersByRole()` - Đếm user theo role
  - `getPermissionsByRole()` - Đếm permission theo role
  - `getMostUsedPermissions()` - Permissions được dùng nhiều nhất
  - `getUsersWithMultipleRoles()` - Users có nhiều roles
  - `getOrphanedPermissions()` - Permissions không được sử dụng
  - `getRolePermissionMatrix()` - Ma trận role-permission
  - `getUserAccessAudit()` - Audit chi tiết cho user

### ReportsService  
- **Chức năng**: Xử lý business logic, tính toán thêm metrics và analysis
- **Kế thừa**: BaseService để có CRUD operations cơ bản
- **Value-add**:
  - Tính toán percentages và averages
  - Phân tích complexity levels
  - Security risk assessment
  - Tạo recommendations
  - Phân loại usage patterns

### ReportsController
- **Chức năng**: Xử lý HTTP requests/responses
- **Sử dụng**: StatusCodes constants và ApiResponse standardization  
- **Error handling**: Proper HTTP status codes và error messages
- **Validation**: Input validation cho parameters

### ReportsRouter
- **Chức năng**: Định nghĩa routes và OpenAPI documentation
- **Authentication**: Tất cả routes đều require authentication
- **Documentation**: Đầy đủ Swagger/OpenAPI specs cho từng endpoint

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reports/permissions-summary` | GET | Thống kê tổng quan hệ thống |
| `/api/reports/users-by-role` | GET | Số lượng user theo từng role |
| `/api/reports/permissions-by-role` | GET | Số lượng permission theo từng role |
| `/api/reports/most-used-permissions` | GET | Permissions được sử dụng nhiều nhất |
| `/api/reports/users-with-multiple-roles` | GET | Users có nhiều roles (complexity analysis) |
| `/api/reports/orphaned-permissions` | GET | Permissions không được assign |
| `/api/reports/role-permission-matrix` | GET | Ma trận role-permission đầy đủ |
| `/api/reports/user-access-audit/:userId` | GET | Audit chi tiết cho user cụ thể |

## Tính năng đặc biệt

### 1. Advanced Analytics
- **Percentage calculations**: Tính % user trong mỗi role
- **Complexity scoring**: Đánh giá độ phức tạp của user permissions
- **Risk assessment**: Phân tích rủi ro bảo mật
- **Coverage statistics**: Thống kê coverage của role-permission matrix

### 2. Security Analysis
- **Admin access detection**: Phát hiện users có quyền admin
- **Redundant permissions**: Tìm permissions trùng lặp (role vs direct)
- **Orphaned resources**: Tìm permissions không được sử dụng
- **Risk level calculation**: Tính mức độ rủi ro based on access complexity

### 3. Recommendations Engine
- **Security recommendations**: Đề xuất cải thiện bảo mật
- **Optimization suggestions**: Đề xuất tối ưu hóa permission structure
- **Compliance guidance**: Hướng dẫn tuân thủ best practices

## Use Cases

### 1. Admin Dashboard
- Hiển thị overview statistics
- Monitor system health
- Track permission usage trends

### 2. Security Audit
- Review user access patterns
- Identify security risks
- Generate compliance reports

### 3. System Optimization
- Find unused permissions
- Optimize role structure
- Reduce permission complexity

### 4. User Access Review
- Audit individual user permissions
- Review role assignments
- Validate access appropriateness

## Lợi ích của kiến trúc mới

### So với cách cũ (logic trong router):
❌ **Cũ**: Logic business trực tiếp trong router
- Khó test
- Khó mở rộng  
- Không tái sử dụng được
- Vi phạm separation of concerns

✅ **Mới**: Tuân thủ Repository-Service-Controller pattern
- **Testable**: Mỗi layer có thể test riêng biệt
- **Maintainable**: Logic tách biệt rõ ràng
- **Extensible**: Dễ thêm tính năng mới
- **Reusable**: Service có thể dùng trong contexts khác
- **Consistent**: Theo chuẩn của toàn bộ dự án

### Performance Benefits:
- Repository tận dụng transaction support từ BaseRepository
- Service layer cache và optimize calculations
- Controller layer handle errors properly với correct HTTP codes

### Developer Experience:
- IntelliSense support đầy đủ
- Type safety với TypeScript
- Clear separation of concerns
- Consistent error handling
- Comprehensive OpenAPI documentation