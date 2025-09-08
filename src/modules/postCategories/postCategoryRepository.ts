import { BaseRepository } from '../../bases/repositoryBase'

export class PostCategoryRepository extends BaseRepository<'postCategory'> {
  constructor(logger?: { info?: (...args: any[]) => void; error?: (...args: any[]) => void }) {
    super('postCategory', logger)
  }

  // Tìm category theo slug
  async findBySlug(slug: string, include?: any, client?: any) {
    return this.findUnique({ where: { slug }, include }, client)
  }

  // Tìm tất cả children của một category
  async findChildren(parentId: number, include?: any, client?: any) {
    return this.findMany({ where: { parentId, active: true }, include }, client)
  }

  // Tìm tất cả category cha (không có parentId)
  async findRoots(include?: any, client?: any) {
    return this.findMany(
      {
        where: { parentId: null, active: true },
        include: include || { children: true }
      },
      client
    )
  }

  // Tìm tree đầy đủ (parent + children)
  async findTree(include?: any, client?: any) {
    const defaultInclude = {
      children: {
        where: { active: true },
        include: { posts: { select: { id: true } } }
      },
      posts: { select: { id: true } }
    }

    return this.findMany(
      {
        where: { active: true },
        include: include || defaultInclude,
        orderBy: [{ parentId: 'asc' }, { name: 'asc' }]
      },
      client
    )
  }

  // Tìm kiếm theo keyword trong name, description
  async search(keyword: string, include?: any, client?: any) {
    return this.findMany(
      {
        where: {
          active: true,
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } }
          ]
        },
        include
      },
      client
    )
  }

  // Kiểm tra slug đã tồn tại chưa (cho validation)
  async slugExists(slug: string, excludeId?: number, client?: any) {
    const where: any = { slug }
    if (excludeId) where.id = { not: excludeId }

    const count = await this.count(where, client)
    return count > 0
  }

  // Đếm số post thuộc category
  async countPosts(categoryId: number, client?: any) {
    return this.delegate(client).findUnique({
      where: { id: categoryId },
      select: { _count: { select: { posts: true } } }
    })
  }
}
