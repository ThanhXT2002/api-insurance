/// <reference types="node" />
import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

/**
 * Seed script (Contacts)
 * - Tạo dữ liệu giả cho bảng `Contact` (~100 bản ghi theo mặc định)
 * - Idempotent: xóa hết contact hiện có trước khi tạo mới
 * - Có thể tuỳ chỉnh số lượng bằng biến môi trường SEED_CONTACTS_COUNT
 *
 * Cách chạy: từ thư mục project root
 * npx ts-node prisma/seedContacts.ts
 * hoặc
 * npx tsx prisma/seedContacts.ts
 */
async function main() {
  const count = Number(process.env.SEED_CONTACTS_COUNT) || 100

  const firstNames = [
    'An',
    'Bình',
    'Chi',
    'Dương',
    'Em',
    'Phong',
    'Hà',
    'Hạnh',
    'Khanh',
    'Lan',
    'Minh',
    'Nam',
    'Nga',
    'Phúc',
    'Quỳnh',
    'Trang',
    'Tuấn',
    'Vân',
    'Vy',
    'Yến'
  ]

  const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Võ', 'Đặng', 'Bùi', 'Đỗ']

  const msgs = [
    'Tôi muốn biết thêm thông tin về gói bảo hiểm A.',
    'Xin cho biết cách thanh toán và thủ tục đăng ký.',
    'Bao lâu thì hợp đồng có hiệu lực?',
    'Tôi muốn tư vấn cá nhân cho gia đình.',
    'Có hỗ trợ bồi thường khi nằm viện không?',
    'Làm sao để đổi thông tin người thụ hưởng?',
    'Sản phẩm có bảo hiểm cho trẻ em không?',
    'Tôi gặp lỗi khi nạp hồ sơ, vui lòng hỗ trợ.',
    'Bạn có văn phòng tại Hà Nội không?',
    'Xin gửi bảng giá chi tiết các gói.'
  ]

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
    'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  ]

  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

  const pad = (n: number) => String(n).padStart(2, '0')

  const randomIp = () => `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`

  const randomEmailFromName = (name: string) => {
    const norm = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '')
    return `${norm}${randomInt(1, 999)}@example.com`
  }

  const randomDateWithinDays = (days: number) => {
    const now = Date.now()
    const past = now - Math.floor(Math.random() * days * 24 * 60 * 60 * 1000)
    return new Date(past)
  }

  // Xóa hết contact hiện có để seed idempotent
  try {
    await prisma.contact.deleteMany({})
    console.log('Deleted existing contacts')
  } catch (e) {
    console.warn('Failed to delete existing contacts (continuing)', e)
  }

  const items: any[] = []

  for (let i = 0; i < count; i++) {
    const first = pick(firstNames)
    const last = pick(lastNames)
    const fullName = `${last} ${first}`
    const email = Math.random() < 0.8 ? randomEmailFromName(fullName) : undefined
    const message = `${pick(msgs)} ${i % 5 === 0 ? 'Vui lòng liên hệ lại sớm.' : ''}`
    const ip = Math.random() < 0.95 ? randomIp() : undefined
    const userAgent = Math.random() < 0.9 ? pick(userAgents) : undefined
    const createdAt = randomDateWithinDays(365)

    items.push({
      name: fullName,
      email,
      message,
      ip,
      userAgent,
      createdAt
    })
  }

  // Thêm bằng createMany để nhanh hơn
  try {
    const chunkSize = 200
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize)
      await prisma.contact.createMany({ data: chunk })
    }
    console.log(`Inserted ${items.length} contact records`)
  } catch (err) {
    console.error('Error inserting contacts', err)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
