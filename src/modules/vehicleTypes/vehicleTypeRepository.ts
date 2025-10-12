import { BaseRepository } from '../../bases/repositoryBase'
import { UsageType, UsagePurpose } from '../../../generated/prisma'

export class VehicleTypeRepository extends BaseRepository<'vehicleType'> {
  constructor(logger?: { info?: (...args: any[]) => void; error?: (...args: any[]) => void }) {
    super('vehicleType', logger)
  }

  /**
   * Tìm loại phương tiện theo mã code
   * @param vehicleTypeCode - Mã loại phương tiện
   * @param client - Transaction client (optional)
   */
  async findByCode(vehicleTypeCode: string, client?: any) {
    return this.findUnique({ where: { vehicleTypeCode } }, client)
  }

  /**
   * Tìm kiếm loại phương tiện theo từ khóa
   * @param keyword - Từ khóa tìm kiếm
   * @param options - Tùy chọn tìm kiếm
   * @param client - Transaction client (optional)
   */
  async search(
    keyword: string,
    options: {
      limit?: number
      skip?: number
      active?: boolean
      usageType?: UsageType
      usagePurpose?: UsagePurpose
    } = {},
    client?: any
  ) {
    const { limit, skip, active, usageType, usagePurpose } = options

    const where: any = {
      OR: [
        { vehicleTypeCode: { contains: keyword, mode: 'insensitive' } },
        { vehicleTypeName: { contains: keyword, mode: 'insensitive' } }
      ]
    }

    if (typeof active !== 'undefined') where.active = active
    if (usageType) where.usageType = usageType
    if (usagePurpose) where.usagePurpose = usagePurpose

    const findQuery: any = {
      where,
      orderBy: [{ active: 'desc' }, { vehicleTypeName: 'asc' }]
    }

    if (skip) findQuery.skip = skip
    if (limit) findQuery.take = limit

    return this.findMany(findQuery, client)
  }

  /**
   * Lấy danh sách loại phương tiện theo loại sử dụng
   * @param usageType - Loại sử dụng phương tiện
   * @param active - Trạng thái active (optional)
   * @param client - Transaction client (optional)
   */
  async findByUsageType(usageType: UsageType, active?: boolean, client?: any) {
    const where: any = { usageType }
    if (typeof active !== 'undefined') where.active = active

    return this.findMany(
      {
        where,
        orderBy: { vehicleTypeName: 'asc' }
      },
      client
    )
  }

  /**
   * Lấy danh sách loại phương tiện theo mục đích sử dụng
   * @param usagePurpose - Mục đích sử dụng
   * @param active - Trạng thái active (optional)
   * @param client - Transaction client (optional)
   */
  async findByUsagePurpose(usagePurpose: UsagePurpose, active?: boolean, client?: any) {
    const where: any = { usagePurpose }
    if (typeof active !== 'undefined') where.active = active

    return this.findMany(
      {
        where,
        orderBy: { vehicleTypeName: 'asc' }
      },
      client
    )
  }

  /**
   * Kiểm tra mã loại phương tiện đã tồn tại chưa
   * @param vehicleTypeCode - Mã loại phương tiện
   * @param excludeId - ID loại bỏ khỏi kiểm tra (để update)
   * @param client - Transaction client (optional)
   */
  async codeExists(vehicleTypeCode: string, excludeId?: number, client?: any) {
    const where: any = { vehicleTypeCode }
    if (excludeId) where.id = { not: excludeId }

    const result = await this.findUnique({ where }, client)
    return !!result
  }

  /**
   * Lấy thống kê theo loại và mục đích sử dụng
   * @param client - Transaction client (optional)
   */
  async getStatistics(client?: any) {
    const db = this.delegate(client)

    const stats = await db.groupBy({
      by: ['usageType', 'usagePurpose', 'active'],
      _count: {
        id: true
      }
    })

    return stats
  }
}
