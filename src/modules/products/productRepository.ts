import { BaseRepository } from '../../bases/repositoryBase'
import prisma from '../../config/prismaClient'

export class ProductRepository extends BaseRepository<'product'> {
  constructor(logger?: { info?: (...args: any[]) => void; error?: (...args: any[]) => void }) {
    super('product', logger)
  }

  async findBySlug(slug: string, include?: any, client?: any) {
    return this.findUnique({ where: { slug }, include }, client)
  }

  // Simple search by name, shortContent, content
  async search(
    keyword: string,
    options: { limit?: number; skip?: number; active?: boolean; include?: any } = {},
    client?: any
  ) {
    const { limit, skip, active, include } = options

    const where: any = {
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { shortContent: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } }
      ]
    }

    if (typeof active !== 'undefined') where.active = active

    const findQuery: any = { where, orderBy: { priority: 'desc' } }
    if (skip) findQuery.skip = skip
    if (limit) findQuery.take = limit
    if (include) findQuery.include = include

    const db = client ?? prisma

    const countPromise = db.product.count({ where })
    const rowsPromise = db.product.findMany(findQuery)

    const [total, rows] = await Promise.all([countPromise, rowsPromise])
    return { rows, total }
  }

  async slugExists(slug: string, excludeId?: number, client?: any) {
    const where: any = { slug }
    if (excludeId) where.id = { not: excludeId }
    const existingCount = await this.count({ where }, client)
    return existingCount > 0
  }

  // Update product images (simple helper: replace imgs array)
  async updateImages(id: number, imgs: string[] = [], client?: any) {
    if (client) {
      return client.product.update({ where: { id }, data: { imgs } })
    }
    return this.update({ id }, { imgs })
  }
}
