import ContactRepository, { ContactRecord } from './contactRepository'

export class ContactService {
  repo: ContactRepository
  constructor(repo: ContactRepository) {
    this.repo = repo
  }

  async submit(payload: { name?: string; phone?: string; email?: string; message?: string; ip?: string; userAgent?: string }) {
    // basic validation could be added here
    const record = await this.repo.create(payload as Omit<ContactRecord, 'id' | 'createdAt'>)
    return record
  }
  
  async getAll(params: any = {}) {
    const { keyword, page, limit, ...other } = params
    const safePage = Number(page) || 1
    const safeLimit = Number(limit) || 20
    const skip = (safePage - 1) * safeLimit

    const where: any = { ...(other ?? {}) }
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { phone: { contains: keyword, mode: 'insensitive' } },
        { email: { contains: keyword, mode: 'insensitive' } },
        { message: { contains: keyword, mode: 'insensitive' } }
      ]
    }

    const rows = await (this.repo as any).findMany({ where, take: safeLimit, skip, orderBy: { createdAt: 'desc' } })
    // repo.count expects the where object directly (not { where })
    const total = await (this.repo as any).count(where)
    return { rows, total }
  }
}

export default ContactService
