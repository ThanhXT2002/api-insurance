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

  /**
   * Transform audit fields (createdBy, updatedBy) to user display names
   */
  protected transformUserAuditFields(data: any): any {
    if (!data) return data

    // Handle single object
    if (!Array.isArray(data)) {
      return this.transformSingleRecord(data)
    }

    // Handle array of objects
    return data.map((item: any) => this.transformSingleRecord(item))
  }

  private transformSingleRecord(record: any): any {
    if (!record || typeof record !== 'object') return record

    const transformed = { ...record }

    // Transform createdBy if exists
    if (record.creator && typeof record.creator === 'object') {
      transformed.createdBy = this.getUserDisplayName(record.creator)
      delete transformed.creator // Remove original relation
    }

    // Transform updatedBy if exists
    if (record.updater && typeof record.updater === 'object') {
      transformed.updatedBy = this.getUserDisplayName(record.updater)
      delete transformed.updater // Remove original relation
    }

    // Recursively transform nested arrays (like children, menus)
    Object.keys(transformed).forEach((key) => {
      if (Array.isArray(transformed[key])) {
        transformed[key] = transformed[key].map((item: any) => this.transformSingleRecord(item))
      }
    })

    return transformed
  }

  private getUserDisplayName(user: any): string {
    if (!user) return 'Unknown'

    // Return name if available, otherwise email, otherwise 'Unknown'
    return user.name || user.email || 'Unknown'
  }

  /**
   * Get default include for models with audit fields
   * Note: Chỉ dùng cho các service sử dụng getAll()/getById() mặc định của BaseService.
   * Nếu service có custom methods riêng thì phải tự include creator/updater trong repository
   * và gọi transformUserAuditFields() trực tiếp (như ProductService, MenuService).
   */
  protected getAuditInclude(): any {
    const modelName = this.repository.getModelName

    if (modelName === 'postCategory' || modelName === 'post') {
      return {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        updater: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }

    // For other models, no audit include needed
    return {}
  }

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

    // Merge default audit include with custom include
    const defaultInclude = this.getAuditInclude()
    const finalInclude = include ? { ...defaultInclude, ...include } : defaultInclude

    const finalOrderBy = orderBy ?? { id: 'desc' }

    const [rows, total] = await Promise.all([
      this.repository.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: Object.keys(finalInclude).length > 0 ? finalInclude : undefined,
        orderBy: finalOrderBy,
        select
      }),
      this.repository.count(where)
    ])

    // Transform audit fields to user display names
    const transformedRows = this.transformUserAuditFields(rows)

    return { rows: transformedRows, total }
  }

  async getById(id: string | number, options: { include?: any; select?: any } = {}): Promise<T | null> {
    // Nếu cần validate/cast id => làm ở đây
    const args: any = { where: { id } }

    // Merge default audit include with custom include
    const defaultInclude = this.getAuditInclude()
    const finalInclude = options.include ? { ...defaultInclude, ...options.include } : defaultInclude

    if (Object.keys(finalInclude).length > 0) args.include = finalInclude
    if (options.select) args.select = options.select

    const result = await this.repository.findById(args)

    // Transform audit fields to user display names
    return this.transformUserAuditFields(result)
  }

  async create(data: Partial<T>, ctx?: { actorId?: number }): Promise<T> {
    if (ctx?.actorId) {
      this.injectCreateAuditFields(data, ctx.actorId)
    }
    // Lưu: xử lý lỗi unique (Prisma P2002) có thể được catch ở đây hoặc controller
    return this.repository.create(data)
  }

  async update(where: any, data: Partial<T>, ctx?: { actorId?: number }): Promise<T> {
    if (ctx?.actorId) {
      this.injectUpdateAuditFields(data, ctx.actorId)
    }
    return this.repository.update(where, data)
  }

  // --- Audit helpers ---
  private injectCreateAuditFields(data: any, actorId: number) {
    const modelName = this.repository.getModelName
    // Models that use relation fields named `creator` / `updater` for nested connect
    if (modelName === 'postCategory' || modelName === 'post') {
      data.creator = { connect: { id: actorId } }
      data.updater = { connect: { id: actorId } }
      return
    }

    // Models that declare scalar createdBy / updatedBy fields
    const scalarAuditModels = ['postCategory', 'post', 'postComment', 'seoMeta', 'menuCategory', 'menuItem']
    if (scalarAuditModels.includes(modelName as string)) {
      data.createdBy = actorId
    }
  }

  private injectUpdateAuditFields(data: any, actorId: number) {
    const modelName = this.repository.getModelName
    if (modelName === 'postCategory' || modelName === 'post') {
      data.updater = { connect: { id: actorId } }
      return
    }

    const scalarAuditModels = ['postCategory', 'post', 'postComment', 'seoMeta', 'menuCategory', 'menuItem']
    if (scalarAuditModels.includes(modelName as string)) {
      data.updatedBy = actorId
    }
  }

  // LƯU Ý: thay đổi chính sách xóa - luôn thực hiện xóa cứng (hard delete).
  // Hàm này sẽ xóa bản ghi khỏi database hoàn toàn thay vì chỉ set `active=false`.
  async delete(where: any): Promise<any> {
    return this.repository.delete(where)
  }

  /**
   * Xóa nhiều bản ghi cùng lúc (xóa cứng luôn - deleteMany).
   * Trước đây BaseService hỗ trợ soft-delete bằng trường `active`;
   * hiện tại chính sách thay đổi: gọi hàm này sẽ xóa thật các bản ghi.
   */
  async deleteMultiple(where: any): Promise<any> {
    return this.repository.deleteMany({ where })
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
