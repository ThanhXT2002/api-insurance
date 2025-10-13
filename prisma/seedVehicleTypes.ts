/// <reference types="node" />
import { PrismaClient } from '../generated/prisma'
import vehicleTypes from './vehicleType.json'

const prisma = new PrismaClient()

async function main() {
  console.log(`Seeding ${vehicleTypes.length} vehicle types (full replace)...`)

  // Replace all vehicle types (delete existing then batch insert fresh)
  // Build insert array first
  const insertData = (vehicleTypes as any[]).map((v) => ({
    vehicleTypeCode: v.vehicleTypeCode,
    vehicleTypeName: v.vehicleTypeName,
    usageType: v.usageType as any,
    usagePurpose: v.usagePurpose as any,
    seatMin: v.seat_min ?? null,
    seatMax: v.seat_max ?? null,
    weightMin: v.weight_min ?? null,
    weightMax: v.weight_max ?? null,
    isShowSeat: Boolean(v.isShowSeat),
    isShowWeight: Boolean(v.isShowWeight),
    pricePerYear: Number(v.pricePerYear),
    active: v.active === undefined ? true : Boolean(v.active),
    createdBy: 1,
    updatedBy: 1
  }))

  try {
    await prisma.vehicleType.deleteMany({})
    // createMany is faster and avoids long-running transaction issues
    await prisma.vehicleType.createMany({ data: insertData })
    console.log(`Inserted ${insertData.length} vehicle types`)
  } catch (err) {
    console.error('Error replacing vehicle types', err)
    throw err
  }

  console.log('Vehicle type seeding (replace) completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
