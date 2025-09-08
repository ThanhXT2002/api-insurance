// ...existing code...
import { BaseRepository } from './repositoryBase'

interface GetAllParams {
  page?: number
  limit?: number
  keyword?: string
  active?: boolean
  filters?: Record<string, any>
  include?: any
  orderBy?: any
  select?: any
}

export class BaseService<T = any> {
  constructor(protected repository: BaseRepository<any>) {}

  // Mặc định giới hạn tối đa page size để tránh over-fetch
  protected MAX_LIMIT = 100

  async getAll(params: GetAllParams = {}): Promise<{ rows: T[]; total: number }> {
    const { page = 1, limit = 10, keyword, active, filters = {}, include, orderBy, select } = params

    const safePage = Math.max(1, Number(page) || 1)
    const safeLimit = Math.min(this.MAX_LIMIT, Math.max(1, Number(limit) || 10))

    const where: any = { ...filters }

    if (typeof active === 'boolean') {
      // Lưu ý: trong schema dùng field `active`
      where.active = active
    }

    if (keyword) {
      // Tiêu chí tìm kiếm mặc định không rõ chung cho tất cả entity,
      // nên override trong service module con (ví dụ search trên `name` hoặc `title`).
      throw new Error('Keyword search not implemented in BaseService. Override this in child service.')
    }

    const [rows, total] = await Promise.all([
      this.repository.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include,
        orderBy,
        select
      }),
      this.repository.count(where)
    ])

    return { rows, total }
  }

  async getById(id: string | number, options: { include?: any; select?: any } = {}): Promise<T | null> {
    // Nếu cần validate/cast id => làm ở đây
    const args: any = { where: { id } }
    if (options.include) args.include = options.include
    if (options.select) args.select = options.select
    return this.repository.findById(args)
  }

  async create(data: Partial<T>, ctx?: { actorId?: number }): Promise<T> {
    if (ctx?.actorId) {
      // tuỳ model có createdBy hay không
      ;(data as any).createdBy = ctx.actorId
    }
    // Lưu: xử lý lỗi unique (Prisma P2002) có thể được catch ở đây hoặc controller
    return this.repository.create(data)
  }

  async update(where: any, data: Partial<T>, ctx?: { actorId?: number }): Promise<T> {
    if (ctx?.actorId) {
      ;(data as any).updatedBy = ctx.actorId
    }
    return this.repository.update(where, data)
  }

  // Khuyến nghị: mặc định soft-delete (toggle active) thay vì xóa cứng
  async delete(where: any, hard = false): Promise<any> {
    if (hard) {
      return this.repository.delete(where)
    }
    return this.repository.update(where, { active: false })
  }

  /**
   * Xóa nhiều bản ghi cùng lúc.
   * - Nếu hard=true => xóa cứng bằng deleteMany
   * - Nếu hard=false => soft-delete bằng updateMany({ active: false })
   */
  async deleteMultiple(where: any, hard = false): Promise<any> {
    if (hard) {
      return this.repository.deleteMany({ where })
    }
    return this.repository.updateMany({ where }, { active: false })
  }

  /**
   * Kích hoạt / hủy kích hoạt nhiều bản ghi cùng lúc (set active true/false).
   * ctx.actorId sẽ được gán vào updatedBy nếu có.
   */
  async activeMultiple(where: any, active: boolean, ctx?: { actorId?: number }): Promise<any> {
    const data: any = { active }
    if (ctx?.actorId) data.updatedBy = ctx.actorId
    return this.repository.updateMany({ where }, data)
  }

  async count(where: any = {}): Promise<number> {
    return this.repository.count(where)
  }
}
