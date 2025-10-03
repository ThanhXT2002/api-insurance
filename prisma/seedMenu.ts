import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

/**
 * Seed Menu Categories và Menu Items
 * Tạo menu bài viết với cấu trúc 4 level
 */
async function seedMenu() {
  console.log('🌱 Bắt đầu seed menu...')

  try {
    // 1. Tạo hoặc lấy user admin để làm createdBy/updatedBy
    let adminUser = await prisma.user.findFirst({
      where: { email: 'tranxuanthanhtxt2002@gmail.com' }
    })

    if (!adminUser) {
      console.log('Tạo admin user...')
      adminUser = await prisma.user.create({
        data: {
          email: 'tranxuanthanhtxt2002@gmail.com',
          name: 'Admin User',
          active: true
        }
      })
    }

    const adminId = adminUser.id
    console.log(`✅ Admin user ID: ${adminId}`)

    // 2. Tạo MenuCategory cho menu bài viết
    let postMenuCategory = await prisma.menuCategory.findUnique({
      where: { key: 'menu-post' }
    })

    if (!postMenuCategory) {
      console.log('Tạo Menu Category: Bài viết...')
      postMenuCategory = await prisma.menuCategory.create({
        data: {
          key: 'menu-post',
          name: 'Menu Bài Viết',
          description: 'Menu chứa các danh mục bài viết',
          active: true,
          position: 'header',
          createdBy: adminId,
          updatedBy: adminId
        }
      })
      console.log(`✅ Đã tạo MenuCategory: ${postMenuCategory.name}`)
    } else {
      console.log('✅ MenuCategory đã tồn tại, bỏ qua...')
    }

    const categoryId = postMenuCategory.id

    // 3. Kiểm tra xem đã có menu items chưa
    const existingItems = await prisma.menuItem.count({
      where: { categoryId }
    })

    if (existingItems > 0) {
      console.log(`⚠️  Đã có ${existingItems} menu items trong category này. Bỏ qua seed.`)
      console.log('   Nếu muốn seed lại, hãy xóa các items cũ trước.')
      return
    }

    // 4. Tạo Menu Items với cấu trúc 4 level
    console.log('\n📝 Bắt đầu tạo Menu Items...\n')

    // ===== LEVEL 1: Root Items =====
    console.log('🔹 Level 1: Root items')

    const level1_baiviet = await prisma.menuItem.create({
      data: {
        categoryId,
        key: '0',
        label: 'Bài Viết',
        icon: 'pi pi-file',
        url: '/bai-viet',
        routerLink: '/bai-viet',
        active: true,
        order: 0,
        isBlank: false,
        expanded: true,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0] ${level1_baiviet.label}`)

    const level1_tintuc = await prisma.menuItem.create({
      data: {
        categoryId,
        key: '1',
        label: 'Tin Tức',
        icon: 'pi pi-calendar',
        url: '/tin-tuc',
        routerLink: '/tin-tuc',
        active: true,
        order: 1,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [1] ${level1_tintuc.label}`)

    const level1_huongdan = await prisma.menuItem.create({
      data: {
        categoryId,
        key: '2',
        label: 'Hướng Dẫn',
        icon: 'pi pi-book',
        url: '/huong-dan',
        routerLink: '/huong-dan',
        active: true,
        order: 2,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [2] ${level1_huongdan.label}`)

    // ===== LEVEL 2: Children của "Bài Viết" (0) =====
    console.log('\n🔹 Level 2: Children của [0] Bài Viết')

    const level2_baohiem = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level1_baiviet.id,
        key: '0-0',
        label: 'Bảo Hiểm',
        icon: 'pi pi-shield',
        url: '/bai-viet/bao-hiem',
        routerLink: '/bai-viet/bao-hiem',
        active: true,
        order: 0,
        isBlank: false,
        expanded: true,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-0] ${level2_baohiem.label}`)

    const level2_taichinh = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level1_baiviet.id,
        key: '0-1',
        label: 'Tài Chính',
        icon: 'pi pi-dollar',
        url: '/bai-viet/tai-chinh',
        routerLink: '/bai-viet/tai-chinh',
        active: true,
        order: 1,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-1] ${level2_taichinh.label}`)

    const level2_suckhoe = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level1_baiviet.id,
        key: '0-2',
        label: 'Sức Khỏe',
        icon: 'pi pi-heart',
        url: '/bai-viet/suc-khoe',
        routerLink: '/bai-viet/suc-khoe',
        active: true,
        order: 2,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-2] ${level2_suckhoe.label}`)

    // ===== LEVEL 2: Children của "Tin Tức" (1) =====
    console.log('\n🔹 Level 2: Children của [1] Tin Tức')

    const level2_thitruong = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level1_tintuc.id,
        key: '1-0',
        label: 'Thị Trường',
        icon: 'pi pi-chart-line',
        url: '/tin-tuc/thi-truong',
        routerLink: '/tin-tuc/thi-truong',
        active: true,
        order: 0,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [1-0] ${level2_thitruong.label}`)

    const level2_sukien = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level1_tintuc.id,
        key: '1-1',
        label: 'Sự Kiện',
        icon: 'pi pi-star',
        url: '/tin-tuc/su-kien',
        routerLink: '/tin-tuc/su-kien',
        active: true,
        order: 1,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [1-1] ${level2_sukien.label}`)

    // ===== LEVEL 3: Children của "Bảo Hiểm" (0-0) =====
    console.log('\n🔹 Level 3: Children của [0-0] Bảo Hiểm')

    const level3_bhnhantho = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level2_baohiem.id,
        key: '0-0-0',
        label: 'Bảo Hiểm Nhân Thọ',
        icon: 'pi pi-users',
        url: '/bai-viet/bao-hiem/nhan-tho',
        routerLink: '/bai-viet/bao-hiem/nhan-tho',
        active: true,
        order: 0,
        isBlank: false,
        expanded: true,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-0-0] ${level3_bhnhantho.label}`)

    const level3_bhxe = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level2_baohiem.id,
        key: '0-0-1',
        label: 'Bảo Hiểm Xe',
        icon: 'pi pi-car',
        url: '/bai-viet/bao-hiem/xe',
        routerLink: '/bai-viet/bao-hiem/xe',
        active: true,
        order: 1,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-0-1] ${level3_bhxe.label}`)

    const level3_bhnha = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level2_baohiem.id,
        key: '0-0-2',
        label: 'Bảo Hiểm Nhà',
        icon: 'pi pi-home',
        url: '/bai-viet/bao-hiem/nha',
        routerLink: '/bai-viet/bao-hiem/nha',
        active: true,
        order: 2,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-0-2] ${level3_bhnha.label}`)

    const level3_bhyte = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level2_baohiem.id,
        key: '0-0-3',
        label: 'Bảo Hiểm Y Tế',
        icon: 'pi pi-heart-fill',
        url: '/bai-viet/bao-hiem/y-te',
        routerLink: '/bai-viet/bao-hiem/y-te',
        active: true,
        order: 3,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-0-3] ${level3_bhyte.label}`)

    // ===== LEVEL 3: Children của "Tài Chính" (0-1) =====
    console.log('\n🔹 Level 3: Children của [0-1] Tài Chính')

    const level3_dautu = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level2_taichinh.id,
        key: '0-1-0',
        label: 'Đầu Tư',
        icon: 'pi pi-chart-bar',
        url: '/bai-viet/tai-chinh/dau-tu',
        routerLink: '/bai-viet/tai-chinh/dau-tu',
        active: true,
        order: 0,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-1-0] ${level3_dautu.label}`)

    const level3_tietkiem = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level2_taichinh.id,
        key: '0-1-1',
        label: 'Tiết Kiệm',
        icon: 'pi pi-wallet',
        url: '/bai-viet/tai-chinh/tiet-kiem',
        routerLink: '/bai-viet/tai-chinh/tiet-kiem',
        active: true,
        order: 1,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-1-1] ${level3_tietkiem.label}`)

    // ===== LEVEL 4: Children của "Bảo Hiểm Nhân Thọ" (0-0-0) =====
    console.log('\n🔹 Level 4: Children của [0-0-0] Bảo Hiểm Nhân Thọ')

    const level4_treem = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level3_bhnhantho.id,
        key: '0-0-0-0',
        label: 'Cho Trẻ Em',
        url: '/bai-viet/bao-hiem/nhan-tho/tre-em',
        routerLink: '/bai-viet/bao-hiem/nhan-tho/tre-em',
        active: true,
        order: 0,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-0-0-0] ${level4_treem.label}`)

    const level4_nguoilon = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level3_bhnhantho.id,
        key: '0-0-0-1',
        label: 'Cho Người Lớn',
        url: '/bai-viet/bao-hiem/nhan-tho/nguoi-lon',
        routerLink: '/bai-viet/bao-hiem/nhan-tho/nguoi-lon',
        active: true,
        order: 1,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-0-0-1] ${level4_nguoilon.label}`)

    const level4_nguoicaotuoi = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level3_bhnhantho.id,
        key: '0-0-0-2',
        label: 'Cho Người Cao Tuổi',
        url: '/bai-viet/bao-hiem/nhan-tho/nguoi-cao-tuoi',
        routerLink: '/bai-viet/bao-hiem/nhan-tho/nguoi-cao-tuoi',
        active: true,
        order: 2,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-0-0-2] ${level4_nguoicaotuoi.label}`)

    const level4_giadinh = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level3_bhnhantho.id,
        key: '0-0-0-3',
        label: 'Gói Gia Đình',
        url: '/bai-viet/bao-hiem/nhan-tho/gia-dinh',
        routerLink: '/bai-viet/bao-hiem/nhan-tho/gia-dinh',
        active: true,
        order: 3,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-0-0-3] ${level4_giadinh.label}`)

    // ===== LEVEL 4: Children của "Bảo Hiểm Xe" (0-0-1) =====
    console.log('\n🔹 Level 4: Children của [0-0-1] Bảo Hiểm Xe')

    const level4_xemay = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level3_bhxe.id,
        key: '0-0-1-0',
        label: 'Xe Máy',
        url: '/bai-viet/bao-hiem/xe/xe-may',
        routerLink: '/bai-viet/bao-hiem/xe/xe-may',
        active: true,
        order: 0,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-0-1-0] ${level4_xemay.label}`)

    const level4_oto = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level3_bhxe.id,
        key: '0-0-1-1',
        label: 'Ô Tô',
        url: '/bai-viet/bao-hiem/xe/o-to',
        routerLink: '/bai-viet/bao-hiem/xe/o-to',
        active: true,
        order: 1,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-0-1-1] ${level4_oto.label}`)

    const level4_xetai = await prisma.menuItem.create({
      data: {
        categoryId,
        parentId: level3_bhxe.id,
        key: '0-0-1-2',
        label: 'Xe Tải',
        url: '/bai-viet/bao-hiem/xe/xe-tai',
        routerLink: '/bai-viet/bao-hiem/xe/xe-tai',
        active: true,
        order: 2,
        isBlank: false,
        expanded: false,
        createdBy: adminId,
        updatedBy: adminId
      }
    })
    console.log(`   ✓ [0-0-1-2] ${level4_xetai.label}`)

    // ===== Tổng kết =====
    const totalItems = await prisma.menuItem.count({ where: { categoryId } })
    console.log(`\n✅ Hoàn thành! Đã tạo ${totalItems} menu items với cấu trúc 4 level.`)
    console.log('\n📊 Cấu trúc Menu:')
    console.log('   Level 1: 3 items (Bài Viết, Tin Tức, Hướng Dẫn)')
    console.log('   Level 2: 5 items')
    console.log('   Level 3: 6 items')
    console.log('   Level 4: 7 items')
    console.log('   ─────────────────')
    console.log(`   Tổng: ${totalItems} items`)
  } catch (error) {
    console.error('❌ Lỗi khi seed menu:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Chạy seed
seedMenu()
  .then(() => {
    console.log('\n🎉 Seed menu thành công!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Seed menu thất bại:', error)
    process.exit(1)
  })
