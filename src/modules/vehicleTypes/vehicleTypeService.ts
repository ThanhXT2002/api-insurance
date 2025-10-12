import { BaseService } from '../../bases/baseService'
import { VehicleTypeRepository } from './vehicleTypeRepository'
import { UsageType, UsagePurpose } from '../../../generated/prisma'

interface VehicleTypeData {
  vehicleTypeCode: string
  vehicleTypeName: string
  usageType: UsageType
  usagePurpose: UsagePurpose
  seatMin: number
  seatMax: number
  weightMin: number
  weightMax: number
  isShowSeat?: boolean
  isShowWeight?: boolean
  pricePerYear: number
  active?: boolean
}

export class VehicleTypeService extends BaseService {
  constructor(protected repo: VehicleTypeRepository) {
    super(repo)
  }

  /**
   * Override getAll để hỗ trợ tìm kiếm theo keyword
   * @param params - Tham số tìm kiếm
   */
  async getAll(params: any = {}) {
    const { keyword, usageType, usagePurpose, ...otherParams } = params

    if (keyword) {
      // Tìm kiếm theo keyword
      const results = await this.repo.search(keyword, {
        limit: otherParams.limit,
        skip: otherParams.skip || (otherParams.page - 1) * otherParams.limit,
        active: otherParams.active,
        usageType,
        usagePurpose
      })
      const total = results.length

      return {
        rows: results,
        total,
        page: otherParams.page || 1,
        limit: otherParams.limit || 20,
        totalPages: Math.ceil(total / (otherParams.limit || 20))
      }
    }

    // Nếu có filter theo usageType hoặc usagePurpose
    if (usageType || usagePurpose) {
      const where: any = {}
      if (usageType) where.usageType = usageType
      if (usagePurpose) where.usagePurpose = usagePurpose
      if (typeof otherParams.active !== 'undefined') where.active = otherParams.active

      otherParams.where = where
    }

    return super.getAll(otherParams)
  }

  /**
   * Tạo mới loại phương tiện
   * @param data - Dữ liệu loại phương tiện
   * @param ctx - Context chứa thông tin người tạo
   */
  async create(data: VehicleTypeData, ctx?: { actorId?: number }) {
    // Validate dữ liệu
    this.validateVehicleTypeData(data)

    // Kiểm tra mã loại phương tiện đã tồn tại
    const existingCode = await this.repo.codeExists(data.vehicleTypeCode)
    if (existingCode) {
      throw new Error(`Mã loại phương tiện "${data.vehicleTypeCode}" đã tồn tại`)
    }

    // Validate seat range
    if (data.seatMin > data.seatMax) {
      throw new Error('Số ghế tối thiểu không được lớn hơn số ghế tối đa')
    }

    // Validate weight range
    if (data.weightMin > data.weightMax) {
      throw new Error('Trọng tải tối thiểu không được lớn hơn trọng tải tối đa')
    }

    return super.create(data, ctx)
  }

  /**
   * Cập nhật loại phương tiện
   * @param where - Điều kiện tìm kiếm
   * @param data - Dữ liệu cập nhật
   * @param ctx - Context chứa thông tin người cập nhật
   */
  async update(where: any, data: Partial<VehicleTypeData>, ctx?: { actorId?: number }) {
    // Validate dữ liệu nếu có
    if (Object.keys(data).length > 0) {
      this.validateVehicleTypeData(data, true)
    }

    // Nếu cập nhật mã loại phương tiện, kiểm tra trùng lặp
    if (data.vehicleTypeCode) {
      const existing = await this.repo.findUnique(where)
      if (!existing) {
        throw new Error('Không tìm thấy loại phương tiện')
      }

      const existingCode = await this.repo.codeExists(data.vehicleTypeCode, existing.id)
      if (existingCode) {
        throw new Error(`Mã loại phương tiện "${data.vehicleTypeCode}" đã tồn tại`)
      }
    }

    // Validate seat range nếu có cập nhật
    if (data.seatMin !== undefined || data.seatMax !== undefined) {
      const current = await this.repo.findUnique(where)
      const newSeatMin = data.seatMin ?? current?.seatMin ?? 0
      const newSeatMax = data.seatMax ?? current?.seatMax ?? 0

      if (newSeatMin > newSeatMax) {
        throw new Error('Số ghế tối thiểu không được lớn hơn số ghế tối đa')
      }
    }

    // Validate weight range nếu có cập nhật
    if (data.weightMin !== undefined || data.weightMax !== undefined) {
      const current = await this.repo.findUnique(where)
      const newWeightMin = data.weightMin ?? current?.weightMin ?? 0
      const newWeightMax = data.weightMax ?? current?.weightMax ?? 0

      if (newWeightMin > newWeightMax) {
        throw new Error('Trọng tải tối thiểu không được lớn hơn trọng tải tối đa')
      }
    }

    return super.update(where, data, ctx)
  }

  /**
   * Lấy loại phương tiện theo mã code
   * @param vehicleTypeCode - Mã loại phương tiện
   */
  async findByCode(vehicleTypeCode: string) {
    return this.repo.findByCode(vehicleTypeCode)
  }

  /**
   * Lấy danh sách loại phương tiện theo loại sử dụng
   * @param usageType - Loại sử dụng
   * @param active - Trạng thái active
   */
  async findByUsageType(usageType: UsageType, active?: boolean) {
    return this.repo.findByUsageType(usageType, active)
  }

  /**
   * Lấy danh sách loại phương tiện theo mục đích sử dụng
   * @param usagePurpose - Mục đích sử dụng
   * @param active - Trạng thái active
   */
  async findByUsagePurpose(usagePurpose: UsagePurpose, active?: boolean) {
    return this.repo.findByUsagePurpose(usagePurpose, active)
  }

  /**
   * Lấy thống kê loại phương tiện
   */
  async getStatistics() {
    return this.repo.getStatistics()
  }

  /**
   * Kích hoạt/vô hiệu hóa nhiều loại phương tiện
   * @param ids - Danh sách ID
   * @param active - Trạng thái mới
   * @param ctx - Context
   */
  async toggleMultiple(ids: number[], active: boolean, ctx?: { actorId?: number }) {
    return this.activeMultiple({ id: { in: ids } }, active, ctx)
  }

  /**
   * Validate dữ liệu loại phương tiện
   * @param data - Dữ liệu cần validate
   * @param isUpdate - Có phải đang update không
   */
  private validateVehicleTypeData(data: Partial<VehicleTypeData>, isUpdate = false) {
    if (!isUpdate) {
      // Required fields cho create
      if (!data.vehicleTypeCode?.trim()) {
        throw new Error('Mã loại phương tiện là bắt buộc')
      }
      if (!data.vehicleTypeName?.trim()) {
        throw new Error('Tên loại phương tiện là bắt buộc')
      }
      if (!data.usageType) {
        throw new Error('Loại sử dụng là bắt buộc')
      }
      if (!data.usagePurpose) {
        throw new Error('Mục đích sử dụng là bắt buộc')
      }
      if (typeof data.pricePerYear !== 'number' || data.pricePerYear < 0) {
        throw new Error('Giá theo năm phải là số không âm')
      }
    }

    // Validate fields nếu có
    if (data.vehicleTypeCode !== undefined && !data.vehicleTypeCode.trim()) {
      throw new Error('Mã loại phương tiện không được để trống')
    }

    if (data.vehicleTypeName !== undefined && !data.vehicleTypeName.trim()) {
      throw new Error('Tên loại phương tiện không được để trống')
    }

    if (data.seatMin !== undefined && (typeof data.seatMin !== 'number' || data.seatMin < 0)) {
      throw new Error('Số ghế tối thiểu phải là số không âm')
    }

    if (data.seatMax !== undefined && (typeof data.seatMax !== 'number' || data.seatMax < 0)) {
      throw new Error('Số ghế tối đa phải là số không âm')
    }

    if (data.weightMin !== undefined && (typeof data.weightMin !== 'number' || data.weightMin < 0)) {
      throw new Error('Trọng tải tối thiểu phải là số không âm')
    }

    if (data.weightMax !== undefined && (typeof data.weightMax !== 'number' || data.weightMax < 0)) {
      throw new Error('Trọng tải tối đa phải là số không âm')
    }

    if (data.pricePerYear !== undefined && (typeof data.pricePerYear !== 'number' || data.pricePerYear < 0)) {
      throw new Error('Giá theo năm phải là số không âm')
    }
  }
}
