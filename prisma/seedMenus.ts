import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

async function seedMenus() {
  console.log('🌱 Seeding menus...')

  // Lấy admin user để làm creator/updater
  const adminUser = await prisma.user.findFirst({
    where: { email: 'tranxuanthanhtxt2002@gmail.com' }
  })

  if (!adminUser) {
    console.error('❌ Admin user not found. Please run seed users first.')
    return
  }

  const userId = adminUser.id

  // 1. Tạo Menu Categories
  const menuCategories = [
    {
      key: 'menu-header',
      name: 'Menu Header',
      description: 'Menu hiển thị ở header chính của website',
      position: 'header',
      active: true,
      createdBy: userId,
      updatedBy: userId
    },
    {
      key: 'menu-header-mobile',
      name: 'Menu Header Mobile',
      description: 'Menu hiển thị ở header trên mobile',
      position: 'header',
      active: true,
      createdBy: userId,
      updatedBy: userId
    },
    {
      key: 'menu-footer',
      name: 'Menu Footer',
      description: 'Menu hiển thị ở footer',
      position: 'footer',
      active: true,
      createdBy: userId,
      updatedBy: userId
    },
    {
      key: 'menu-product',
      name: 'Menu Sản phẩm',
      description: 'Menu danh sách sản phẩm bảo hiểm',
      position: 'sidebar',
      active: true,
      createdBy: userId,
      updatedBy: userId
    }
  ]

  console.log('📁 Creating menu categories...')
  for (const category of menuCategories) {
    await prisma.menuCategory.upsert({
      where: { key: category.key },
      update: category,
      create: category
    })
  }

  // 2. Tạo Menu Items cho Header (cấu trúc cây)
  const headerCategory = await prisma.menuCategory.findUnique({
    where: { key: 'menu-header' }
  })

  if (headerCategory) {
    console.log('🌳 Creating header menu tree...')

    // Level 0 - Root menus
    const homeMenu = await prisma.menuItem.upsert({
      where: { categoryId_key: { categoryId: headerCategory.id, key: '0' } },
      update: {},
      create: {
        key: '0',
        label: 'Trang chủ',
        icon: 'pi pi-home',
        url: '/',
        routerLink: '/',
        order: 0,
        categoryId: headerCategory.id,
        createdBy: userId,
        updatedBy: userId,
        active: true,
        selectable: true
      }
    })

    const productsMenu = await prisma.menuItem.upsert({
      where: { categoryId_key: { categoryId: headerCategory.id, key: '1' } },
      update: {},
      create: {
        key: '1',
        label: 'Sản phẩm',
        icon: 'pi pi-shopping-bag',
        order: 1,
        categoryId: headerCategory.id,
        createdBy: userId,
        updatedBy: userId,
        active: true,
        selectable: false,
        expanded: false
      }
    })

    // Level 1 - Children of Products
    await prisma.menuItem.upsert({
      where: { categoryId_key: { categoryId: headerCategory.id, key: '1-0' } },
      update: {},
      create: {
        key: '1-0',
        label: 'Bảo hiểm xe ô tô',
        icon: 'pi pi-car',
        url: '/san-pham/bao-hiem-xe-o-to',
        routerLink: '/products/car-insurance',
        order: 0,
        parentId: productsMenu.id,
        categoryId: headerCategory.id,
        createdBy: userId,
        updatedBy: userId,
        badge: 'Hot',
        badgeClass: 'bg-red-500'
      }
    })

    await prisma.menuItem.upsert({
      where: { categoryId_key: { categoryId: headerCategory.id, key: '1-1' } },
      update: {},
      create: {
        key: '1-1',
        label: 'Bảo hiểm sức khỏe',
        icon: 'pi pi-heart',
        url: '/san-pham/bao-hiem-suc-khoe',
        routerLink: '/products/health-insurance',
        order: 1,
        parentId: productsMenu.id,
        categoryId: headerCategory.id,
        createdBy: userId,
        updatedBy: userId
      }
    })

    await prisma.menuItem.upsert({
      where: { categoryId_key: { categoryId: headerCategory.id, key: '1-2' } },
      update: {},
      create: {
        key: '1-2',
        label: 'Bảo hiểm nhân thọ',
        icon: 'pi pi-shield',
        url: '/san-pham/bao-hiem-nhan-tho',
        routerLink: '/products/life-insurance',
        order: 2,
        parentId: productsMenu.id,
        categoryId: headerCategory.id,
        createdBy: userId,
        updatedBy: userId,
        badge: 'New',
        badgeClass: 'bg-blue-500'
      }
    })

    const aboutMenu = await prisma.menuItem.upsert({
      where: { categoryId_key: { categoryId: headerCategory.id, key: '2' } },
      update: {},
      create: {
        key: '2',
        label: 'Về chúng tôi',
        icon: 'pi pi-info-circle',
        order: 2,
        categoryId: headerCategory.id,
        createdBy: userId,
        updatedBy: userId,
        active: true,
        selectable: false
      }
    })

    // Level 1 - Children of About
    await prisma.menuItem.upsert({
      where: { categoryId_key: { categoryId: headerCategory.id, key: '2-0' } },
      update: {},
      create: {
        key: '2-0',
        label: 'Giới thiệu công ty',
        icon: 'pi pi-building',
        url: '/gioi-thieu',
        routerLink: '/about',
        order: 0,
        parentId: aboutMenu.id,
        categoryId: headerCategory.id,
        createdBy: userId,
        updatedBy: userId
      }
    })

    await prisma.menuItem.upsert({
      where: { categoryId_key: { categoryId: headerCategory.id, key: '2-1' } },
      update: {},
      create: {
        key: '2-1',
        label: 'Đội ngũ',
        icon: 'pi pi-users',
        url: '/doi-ngu',
        routerLink: '/team',
        order: 1,
        parentId: aboutMenu.id,
        categoryId: headerCategory.id,
        createdBy: userId,
        updatedBy: userId
      }
    })

    await prisma.menuItem.upsert({
      where: { categoryId_key: { categoryId: headerCategory.id, key: '3' } },
      update: {},
      create: {
        key: '3',
        label: 'Tin tức',
        icon: 'pi pi-book',
        url: '/tin-tuc',
        routerLink: '/news',
        order: 3,
        categoryId: headerCategory.id,
        createdBy: userId,
        updatedBy: userId
      }
    })

    await prisma.menuItem.upsert({
      where: { categoryId_key: { categoryId: headerCategory.id, key: '4' } },
      update: {},
      create: {
        key: '4',
        label: 'Liên hệ',
        icon: 'pi pi-envelope',
        url: '/lien-he',
        routerLink: '/contact',
        order: 4,
        categoryId: headerCategory.id,
        createdBy: userId,
        updatedBy: userId
      }
    })
  }

  // 3. Tạo Menu Items cho Footer
  const footerCategory = await prisma.menuCategory.findUnique({
    where: { key: 'menu-footer' }
  })

  if (footerCategory) {
    console.log('🦶 Creating footer menu...')

    await prisma.menuItem.upsert({
      where: { categoryId_key: { categoryId: footerCategory.id, key: '0' } },
      update: {},
      create: {
        key: '0',
        label: 'Chính sách bảo mật',
        url: '/chinh-sach-bao-mat',
        routerLink: '/privacy-policy',
        order: 0,
        categoryId: footerCategory.id,
        createdBy: userId,
        updatedBy: userId
      }
    })

    await prisma.menuItem.upsert({
      where: { categoryId_key: { categoryId: footerCategory.id, key: '1' } },
      update: {},
      create: {
        key: '1',
        label: 'Điều khoản sử dụng',
        url: '/dieu-khoan-su-dung',
        routerLink: '/terms-of-service',
        order: 1,
        categoryId: footerCategory.id,
        createdBy: userId,
        updatedBy: userId
      }
    })

    await prisma.menuItem.upsert({
      where: { categoryId_key: { categoryId: footerCategory.id, key: '2' } },
      update: {},
      create: {
        key: '2',
        label: 'Hướng dẫn thanh toán',
        url: '/huong-dan-thanh-toan',
        routerLink: '/payment-guide',
        order: 2,
        categoryId: footerCategory.id,
        createdBy: userId,
        updatedBy: userId
      }
    })
  }

  console.log('✅ Menu seeding completed!')
}

seedMenus()
  .catch((e) => {
    console.error('❌ Error seeding menus:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
