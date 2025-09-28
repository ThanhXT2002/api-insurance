import prisma from '../../config/prismaClient'

export type ContactRecord = {
  id: number
  name?: string | null
  phone?: string | null
  email?: string | null
  message: string
  ip?: string | null
  userAgent?: string | null
  createdAt: string
}

export class ContactRepository {
  async create(record: Omit<ContactRecord, 'id' | 'createdAt'>) {
    const created = await prisma.contact.create({
      data: {
        name: record.name ?? null,
        email: record.email ?? null,
        message: record.message,
        ip: record.ip ?? null,
        userAgent: record.userAgent ?? null,
        phone: record.phone ?? null
      }
    })
    return created as unknown as ContactRecord
  }

  async findMany(options: { where?: any; take?: number; skip?: number; orderBy?: any } = {}) {
    const { where, take, skip, orderBy } = options
    const rows = await prisma.contact.findMany({ where, take, skip, orderBy })
    return rows as unknown as ContactRecord[]
  }

  async count(where: any = {}) {
    return prisma.contact.count({ where })
  }
}

export default ContactRepository
