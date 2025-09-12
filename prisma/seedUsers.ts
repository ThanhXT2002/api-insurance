/// <reference types="node" />
import { PrismaClient } from '../generated/prisma'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]) {
  return arr[randInt(0, arr.length - 1)]
}

function randomDateWithinYears(years: number) {
  const now = Date.now()
  const past = now - years * 365 * 24 * 60 * 60 * 1000
  return new Date(randInt(past, now))
}

const firstNames = ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Phan', 'Vu', 'Vo', 'Dang', 'Bui', 'Do', 'Ngo']

const givenNames = [
  'Minh',
  'Anh',
  'Hoa',
  'Lan',
  'Nam',
  'Huy',
  'Thuy',
  'Linh',
  'Khanh',
  'Duy',
  'Huyen',
  'Quang',
  'Trang',
  'Tuan'
]

const streets = [
  'Nguyen Trai',
  'Le Duan',
  'Tran Hung Dao',
  'Pham Ngu Lao',
  'Vo Van Kiet',
  'Le Loi',
  'Tran Phu',
  'Hoang Van Thu'
]

const districts = ['Quận 1', 'Quận 3', 'Quận 5', 'Quận 7', 'Hà Đông', 'Cầu Giấy', 'Đống Đa', 'Bình Thạnh']
const cities = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Nha Trang']
const domains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'example.com']

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '.')
}

function makePhone() {
  // Vietnamese-like mobile numbers
  const prefixes = ['03', '05', '07', '08', '09']
  const prefix = pick(prefixes)
  let rest = ''
  for (let i = 0; i < 8; i++) rest += String(randInt(0, 9))
  return prefix + rest
}

async function main() {
  const total = 150
  console.log(`Seeding ${total} fake users...`)

  for (let i = 0; i < total; i++) {
    const first = pick(firstNames)
    const given = pick(givenNames)
    const fullName = `${given} ${first}`
    const localPart = `${slugify(given)}.${slugify(first)}${randInt(1, 999)}`
    const domain = pick(domains)
    const email = `${localPart}@${domain}`

    const street = pick(streets)
    const district = pick(districts)
    const city = pick(cities)
    const addresses = `${randInt(1, 200)} ${street}, ${district}, ${city}`

    const userData = {
      email,
      name: fullName,
      avatarUrl: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
      addresses,
      phoneNumber: makePhone(),
      active: true,
      createdAt: randomDateWithinYears(2)
      // note: supabaseId only set on create (unique)
    }

    try {
      await prisma.user.upsert({
        where: { email },
        update: {
          name: userData.name,
          avatarUrl: userData.avatarUrl,
          addresses: userData.addresses,
          phoneNumber: userData.phoneNumber,
          active: userData.active
        },
        create: {
          email: userData.email,
          name: userData.name,
          avatarUrl: userData.avatarUrl,
          addresses: userData.addresses,
          phoneNumber: userData.phoneNumber,
          active: userData.active,
          supabaseId: randomUUID(),
          createdAt: userData.createdAt
        }
      })

      if ((i + 1) % 25 === 0) console.log(`Seeded ${i + 1}/${total} users`)
    } catch (err) {
      console.error('Error seeding user', email, err)
    }
  }

  console.log('User seeding completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
