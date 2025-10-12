/// <reference types="node" />
import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding permissions and roles...')

  // 1. Seed Permissions
  const permissions = [
    // Vehicle Type permissions
    {
      key: 'vehicle_type.view',
      name: 'Xem loại phương tiện',
      description: 'Có thể xem danh sách và chi tiết loại phương tiện'
    },
    { key: 'vehicle_type.create', name: 'Tạo loại phương tiện', description: 'Có thể tạo mới loại phương tiện' },
    {
      key: 'vehicle_type.update',
      name: 'Cập nhật loại phương tiện',
      description: 'Có thể chỉnh sửa thông tin loại phương tiện'
    },
    { key: 'vehicle_type.delete', name: 'Xóa loại phương tiện', description: 'Có thể xóa loại phương tiện' },

    // Menu permissions
    { key: 'menu.view', name: 'Xem menu', description: 'Có thể xem danh sách menu và menu items' },
    { key: 'menu.create', name: 'Tạo menu', description: 'Có thể tạo mới menu categories và menu items' },
    { key: 'menu.update', name: 'Cập nhật menu', description: 'Có thể chỉnh sửa menu categories và menu items' },
    { key: 'menu.delete', name: 'Xóa menu', description: 'Có thể xóa menu categories và menu items' },

    // Post Category permissions
    { key: 'post_category.view', name: 'Xem danh mục bài viết', description: 'Có thể xem danh sách danh mục bài viết' },
    { key: 'post_category.create', name: 'Tạo danh mục bài viết', description: 'Có thể tạo mới danh mục bài viết' },
    { key: 'post_category.edit', name: 'Sửa danh mục bài viết', description: 'Có thể chỉnh sửa danh mục bài viết' },
    { key: 'post_category.delete', name: 'Xóa danh mục bài viết', description: 'Có thể xóa danh mục bài viết' },

    // Contact permissions
    { key: 'contact.view', name: 'Xem liên hệ', description: 'Có thể xem danh sách và chi tiết liên hệ từ khách hàng' },

    // User management permissions
    { key: 'user.view', name: 'Xem người dùng', description: 'Có thể xem danh sách và thông tin người dùng' },
    { key: 'user.create', name: 'Tạo người dùng', description: 'Có thể tạo mới tài khoản người dùng' },
    { key: 'user.edit', name: 'Sửa người dùng', description: 'Có thể chỉnh sửa thông tin người dùng' },
    { key: 'user.delete', name: 'Xóa người dùng', description: 'Có thể xóa tài khoản người dùng' },

    // Role management permissions
    { key: 'role.view', name: 'Xem vai trò', description: 'Có thể xem danh sách vai trò và phân quyền' },
    { key: 'role.create', name: 'Tạo vai trò', description: 'Có thể tạo mới vai trò' },
    { key: 'role.edit', name: 'Sửa vai trò', description: 'Có thể chỉnh sửa vai trò và phân quyền' },
    { key: 'role.delete', name: 'Xóa vai trò', description: 'Có thể xóa vai trò' },

    // Permission management permissions
    { key: 'permission.view', name: 'Xem quyền hạn', description: 'Có thể xem danh sách quyền hạn' },
    { key: 'permission.manage', name: 'Quản lý quyền hạn', description: 'Có thể gán/thu hồi quyền hạn cho người dùng' },

    // Post permissions
    { key: 'post.view', name: 'Xem bài viết', description: 'Có thể xem danh sách và chi tiết bài viết' },
    { key: 'post.create', name: 'Tạo bài viết', description: 'Có thể tạo mới bài viết' },
    { key: 'post.edit', name: 'Sửa bài viết', description: 'Có thể chỉnh sửa bài viết' },
    { key: 'post.delete', name: 'Xóa bài viết', description: 'Có thể xóa bài viết' },
    { key: 'post.publish', name: 'Xuất bản bài viết', description: 'Có thể thay đổi trạng thái xuất bản bài viết' },

    // Product permissions
    { key: 'product.view', name: 'Xem sản phẩm', description: 'Có thể xem danh sách và chi tiết sản phẩm' },
    { key: 'product.create', name: 'Tạo sản phẩm', description: 'Có thể tạo mới sản phẩm' },
    { key: 'product.edit', name: 'Sửa sản phẩm', description: 'Có thể chỉnh sửa thông tin sản phẩm' },
    { key: 'product.delete', name: 'Xóa sản phẩm', description: 'Có thể xóa sản phẩm' },

    // System permissions
    { key: 'system.admin', name: 'Quản trị hệ thống', description: 'Toàn quyền quản trị hệ thống' },
    { key: 'system.backup', name: 'Sao lưu hệ thống', description: 'Có thể thực hiện sao lưu và khôi phục dữ liệu' },
    { key: 'system.logs', name: 'Xem logs hệ thống', description: 'Có thể xem và phân tích logs hệ thống' },

    // Report permissions
    { key: 'report.view', name: 'Xem báo cáo', description: 'Có thể xem các báo cáo thống kê' },
    { key: 'report.export', name: 'Xuất báo cáo', description: 'Có thể xuất báo cáo ra file Excel/PDF' }
  ]

  console.log('📝 Creating permissions...')
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        description: permission.description
      },
      create: permission
    })
  }
  console.log(`✅ Created ${permissions.length} permissions`)

  // 2. Seed Roles (từ database hiện có)
  const roles = [
    {
      key: 'admin',
      name: 'Administrator',
      description: 'Administrative access to most system features'
    },
    {
      key: 'user',
      name: 'User',
      description: 'Basic user with viewing permissions'
    },
    {
      key: 'editor',
      name: 'Editor',
      description: 'Content management and moderation'
    },
    {
      key: 'super_admin',
      name: 'Super Admin',
      description: 'Full system access with all permissions'
    },
    {
      key: 'author',
      name: 'Author',
      description: 'Content creation and basic editing'
    },
    {
      key: 'manager',
      name: 'Manager',
      description: 'Manager level access with department permissions'
    }
  ]

  console.log('👥 Creating roles...')
  for (const role of roles) {
    await prisma.userRole.upsert({
      where: { key: role.key },
      update: {
        name: role.name,
        description: role.description
      },
      create: role
    })
  }
  console.log(`✅ Created ${roles.length} roles`)

  // 3. Assign Permissions to Roles
  console.log('🔗 Assigning permissions to roles...')

  // Super Admin - Tất cả quyền
  const superAdminRole = await prisma.userRole.findUnique({ where: { key: 'super_admin' } })
  const allPermissions = await prisma.permission.findMany()

  if (superAdminRole) {
    for (const permission of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId: permission.id
        }
      })
    }
    console.log(`✅ Assigned all permissions to Super Admin`)
  }

  // Admin - Hầu hết quyền trừ system.admin
  const adminRole = await prisma.userRole.findUnique({ where: { key: 'admin' } })
  const adminPermissionKeys = [
    'vehicle_type.view',
    'vehicle_type.create',
    'vehicle_type.update',
    'vehicle_type.delete',
    'menu.view',
    'menu.create',
    'menu.update',
    'menu.delete',
    'post_category.view',
    'post_category.create',
    'post_category.edit',
    'post_category.delete',
    'contact.view',
    'user.view',
    'user.create',
    'user.edit',
    'user.delete',
    'role.view',
    'role.create',
    'role.edit',
    'role.delete',
    'permission.view',
    'permission.manage',
    'post.view',
    'post.create',
    'post.edit',
    'post.delete',
    'post.publish',
    'product.view',
    'product.create',
    'product.edit',
    'product.delete',
    'system.backup',
    'system.logs',
    'report.view',
    'report.export'
  ]

  if (adminRole) {
    const adminPermissions = await prisma.permission.findMany({
      where: { key: { in: adminPermissionKeys } }
    })

    for (const permission of adminPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      })
    }
    console.log(`✅ Assigned ${adminPermissions.length} permissions to Admin`)
  }

  // Content Manager - Quản lý nội dung
  const contentManagerRole = await prisma.userRole.findUnique({ where: { key: 'content_manager' } })
  const contentManagerPermissionKeys = [
    'post_category.view',
    'post_category.create',
    'post_category.edit',
    'post.view',
    'post.create',
    'post.edit',
    'post.delete',
    'post.publish',
    'product.view',
    'product.create',
    'product.edit',
    'product.delete',
    'menu.view',
    'menu.update',
    'report.view'
  ]

  if (contentManagerRole) {
    const contentManagerPermissions = await prisma.permission.findMany({
      where: { key: { in: contentManagerPermissionKeys } }
    })

    for (const permission of contentManagerPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: contentManagerRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: contentManagerRole.id,
          permissionId: permission.id
        }
      })
    }
    console.log(`✅ Assigned ${contentManagerPermissions.length} permissions to Content Manager`)
  }

  // Editor - Chỉnh sửa nội dung
  const editorRole = await prisma.userRole.findUnique({ where: { key: 'editor' } })
  const editorPermissionKeys = [
    'post.view',
    'post.create',
    'post.edit',
    'product.view',
    'product.create',
    'product.edit',
    'post_category.view',
    'menu.view'
  ]

  if (editorRole) {
    const editorPermissions = await prisma.permission.findMany({
      where: { key: { in: editorPermissionKeys } }
    })

    for (const permission of editorPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: editorRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: editorRole.id,
          permissionId: permission.id
        }
      })
    }
    console.log(`✅ Assigned ${editorPermissions.length} permissions to Editor`)
  }

  // Viewer - Chỉ xem
  const viewerRole = await prisma.userRole.findUnique({ where: { key: 'viewer' } })
  const viewerPermissionKeys = ['post.view', 'product.view', 'post_category.view', 'menu.view', 'report.view']

  if (viewerRole) {
    const viewerPermissions = await prisma.permission.findMany({
      where: { key: { in: viewerPermissionKeys } }
    })

    for (const permission of viewerPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: viewerRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: viewerRole.id,
          permissionId: permission.id
        }
      })
    }
    console.log(`✅ Assigned ${viewerPermissions.length} permissions to Viewer`)
  }

  // Customer Service - Chăm sóc khách hàng
  const customerServiceRole = await prisma.userRole.findUnique({ where: { key: 'customer_service' } })
  const customerServicePermissionKeys = ['contact.view', 'user.view', 'post.view', 'product.view', 'report.view']

  if (customerServiceRole) {
    const customerServicePermissions = await prisma.permission.findMany({
      where: { key: { in: customerServicePermissionKeys } }
    })

    for (const permission of customerServicePermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: customerServiceRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: customerServiceRole.id,
          permissionId: permission.id
        }
      })
    }
    console.log(`✅ Assigned ${customerServicePermissions.length} permissions to Customer Service`)
  }

  // Manager - Manager level access
  const managerRole = await prisma.userRole.findUnique({ where: { key: 'manager' } })
  const managerPermissionKeys = [
    'vehicle_type.view',
    'vehicle_type.create',
    'vehicle_type.update',
    'menu.view',
    'menu.update',
    'post_category.view',
    'post_category.create',
    'post_category.edit',
    'contact.view',
    'user.view',
    'post.view',
    'post.create',
    'post.edit',
    'post.publish',
    'product.view',
    'product.create',
    'product.edit',
    'report.view',
    'report.export'
  ]

  if (managerRole) {
    const managerPermissions = await prisma.permission.findMany({
      where: { key: { in: managerPermissionKeys } }
    })

    for (const permission of managerPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: managerRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: managerRole.id,
          permissionId: permission.id
        }
      })
    }
    console.log(`✅ Assigned ${managerPermissions.length} permissions to Manager`)
  }

  // Author - Content creation and basic editing
  const authorRole = await prisma.userRole.findUnique({ where: { key: 'author' } })
  const authorPermissionKeys = [
    'post.view',
    'post.create',
    'post.edit',
    'product.view',
    'product.create',
    'product.edit',
    'post_category.view',
    'menu.view'
  ]

  if (authorRole) {
    const authorPermissions = await prisma.permission.findMany({
      where: { key: { in: authorPermissionKeys } }
    })

    for (const permission of authorPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: authorRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: authorRole.id,
          permissionId: permission.id
        }
      })
    }
    console.log(`✅ Assigned ${authorPermissions.length} permissions to Author`)
  }

  // User - Basic user with viewing permissions
  const userRole = await prisma.userRole.findUnique({ where: { key: 'user' } })
  const userPermissionKeys = ['post.view', 'product.view', 'post_category.view', 'menu.view']

  if (userRole) {
    const userPermissions = await prisma.permission.findMany({
      where: { key: { in: userPermissionKeys } }
    })

    for (const permission of userPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: userRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: userRole.id,
          permissionId: permission.id
        }
      })
    }
    console.log(`✅ Assigned ${userPermissions.length} permissions to User`)
  }

  console.log('🎉 Permissions and roles seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding permissions and roles:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
