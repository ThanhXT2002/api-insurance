import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

async function main() {
  // Seed roles
  const roles = [
    { key: 'admin', name: 'Quản trị viên', description: 'Toàn quyền hệ thống' },
    { key: 'user', name: 'Người dùng', description: 'Quyền mặc định cho user' },
    { key: 'editor', name: 'Biên tập viên', description: 'Có thể chỉnh sửa nội dung' }
  ]

  for (const r of roles) {
    await prisma.userRole.upsert({
      where: { key: r.key },
      update: { name: r.name, description: r.description },
      create: r
    })
  }

  // Seed permissions
  const permissions = [
    { key: 'user.view', name: 'Xem người dùng', description: 'Xem danh sách & chi tiết user' },
    { key: 'user.edit', name: 'Sửa người dùng', description: 'Chỉnh sửa thông tin user' },
    { key: 'project.create', name: 'Tạo project', description: 'Tạo project mới' }
  ]

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { name: p.name, description: p.description },
      create: p
    })
  }

  // Assign permissions to roles (idempotent)
  const editor = await prisma.userRole.findUnique({ where: { key: 'editor' } })
  const userRole = await prisma.userRole.findUnique({ where: { key: 'user' } })
  const permView = await prisma.permission.findUnique({ where: { key: 'user.view' } })
  const permEdit = await prisma.permission.findUnique({ where: { key: 'user.edit' } })

  if (editor && permView && permEdit) {
    const exists1 = await prisma.rolePermission.findFirst({ where: { roleId: editor.id, permissionId: permView.id } })
    if (!exists1) await prisma.rolePermission.create({ data: { roleId: editor.id, permissionId: permView.id } })

    const exists2 = await prisma.rolePermission.findFirst({ where: { roleId: editor.id, permissionId: permEdit.id } })
    if (!exists2) await prisma.rolePermission.create({ data: { roleId: editor.id, permissionId: permEdit.id } })
  }

  if (userRole && permView) {
    const exists = await prisma.rolePermission.findFirst({ where: { roleId: userRole.id, permissionId: permView.id } })
    if (!exists) await prisma.rolePermission.create({ data: { roleId: userRole.id, permissionId: permView.id } })
  }

  console.log('Seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
