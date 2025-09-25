import { BaseService } from '../../bases/baseService'
import { ProductRepository } from './productRepository'
import { seoService, SeoDto } from '../../services/seoService'
import { fileUploadService } from '../../services/fileUploadService'
import { normalizeSlug } from '../../utils/urlHelper'
import { SeoableType } from '../../../generated/prisma'
import { withRollback } from '../../utils/rollbackHelper'
import prisma from '../../config/prismaClient'

interface ProductData {
  sku?: string
  name: string
  slug?: string
  description?: string
  shortContent?: string
  content?: string
  price?: number
  coverage?: string
  term?: string
  targetLink?: string
  targetFile?: string
  details?: string
  icon?: string
  imgs?: string[]
  imgsFiles?: Array<{ buffer: Buffer; originalName: string }>
  isSaleOnline?: boolean
  active?: boolean
  priority?: number
  isHighlighted?: boolean
  isFeatured?: boolean
  tags?: string[]
  isPromotion?: boolean
  promotionDetails?: string
  features?: any[]
  metaKeywords?: any[]
  note?: string
  seoMeta?: SeoDto
}

export class ProductService extends BaseService {
  constructor(protected repo: ProductRepository) {
    super(repo)
  }

  private tryParseJson(val: any) {
    if (val === undefined || val === null) return undefined
    if (Array.isArray(val) || typeof val === 'object') return val
    if (typeof val === 'string') {
      try {
        return JSON.parse(val)
      } catch {
        return val
      }
    }
    return val
  }

  private normalizeJsonFields(target: any) {
    if (!target || typeof target !== 'object') return
    if (target.imgs) target.imgs = this.tryParseJson(target.imgs)
    if (target.tags) target.tags = this.tryParseJson(target.tags)
    if (target.features) target.features = this.tryParseJson(target.features)
    if (target.metaKeywords) target.metaKeywords = this.tryParseJson(target.metaKeywords)
  }

  /**
   * Build a readable SKU from product name by taking the first character of each word
   * and uppercasing them. Non-alphanumeric characters are removed. If result is empty,
   * returns 'P'. Limit length to 8 characters for readability.
   */
  private makeSkuFromName(name?: string) {
    if (!name) return 'P'
    const parts = name
      .trim()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
    const initials = parts.map((s) => s[0]).join('')
    let cleaned = (initials || parts.join('')).replace(/[^A-Za-z0-9]/g, '')
    if (!cleaned) cleaned = 'P'
    cleaned = cleaned.toUpperCase()
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8)
    return cleaned
  }

  /**
   * Generate a unique SKU by checking repository for existence. If the base SKU
   * already exists, appends a numeric suffix like `BASE-1`, `BASE-2`, ...
   */
  async generateUniqueSku(name?: string, excludeId?: number) {
    const base = this.makeSkuFromName(name)
    let candidate = base
    let suffix = 1
    // Loop until unique or until a reasonable limit
    while (await this.repo.skuExists(candidate, excludeId)) {
      candidate = `${base}-${suffix++}`
      if (suffix > 100) throw new Error('Không thể sinh SKU duy nhất')
    }
    return candidate
  }

  private stripTransientFields(target: any) {
    if (!target || typeof target !== 'object') return
    if ('imgsFiles' in target) delete target.imgsFiles
    if ('iconFile' in target) delete target.iconFile
  }

  private async uploadImagesIfPresent(prismaObj: any, rollbackManager: any) {
    if (!prismaObj.imgsFiles || !Array.isArray(prismaObj.imgsFiles)) return
    try {
      const inputs = prismaObj.imgsFiles as Array<{ buffer: Buffer; originalName: string }>
      const uploaded = await fileUploadService.uploadMultipleFiles(inputs, { folderName: 'project-insurance/products' })
      const urls = uploaded.map((u) => u.url)
      rollbackManager.addFileDeleteAction(urls)
      prismaObj.imgs = urls
    } catch (err: any) {
      throw new Error(`Lỗi tải ảnh sản phẩm: ${err?.message || err}`)
    }
  }

  /**
   * Upload single icon file if provided. Keep original format and do not run image processing.
   */
  private async uploadIconIfPresent(prismaObj: any, rollbackManager: any) {
    if (!prismaObj.iconFile) return
    try {
      const input = prismaObj.iconFile as { buffer: Buffer; originalName: string }
      // Upload without processing, preserve original format and filename
      const uploaded = await fileUploadService.uploadSingleFile(input.buffer, input.originalName, {
        folderName: 'project-insurance/product-icons',
        maxFileSize: 5 * 1024 * 1024,
        allowedTypes: ['image/'],
        processImages: false
      })
      rollbackManager.addFileDeleteAction(uploaded.url)
      prismaObj.icon = uploaded.url
    } catch (err: any) {
      throw new Error(`Lỗi tải icon sản phẩm: ${err?.message || err}`)
    }
  }

  async getAll(params: any = {}) {
    const { keyword, active, page = 1, limit = 20 } = params
    const safePage = Math.max(1, Number(page) || 1)
    const safeLimit = Math.max(1, Number(limit) || 20)

    if (keyword) {
      const result = await this.repo.search(keyword, { skip: (safePage - 1) * safeLimit, limit: safeLimit, active })
      if (result && typeof result === 'object' && 'rows' in result && 'total' in result) return result
      const resAny: any = result
      return { rows: resAny, total: Array.isArray(resAny) ? resAny.length : 0 }
    }

    const filters: any = {}
    if (typeof active !== 'undefined') filters.active = active
    return super.getAll({ page: safePage, limit: safeLimit, filters })
  }

  async findBySlug(slug: string) {
    const product = await this.repo.findBySlug(slug)
    if (!product) return null
    // Load SEO
    try {
      const seo = await seoService.getSeoFor(SeoableType.PRODUCT, product.id)
      if (seo) (product as any).seoMeta = seo
    } catch (err: any) {
      console.error('Failed to load seo for product', product.id, err?.message || err)
    }
    return this.transformUserAuditFields([product])[0]
  }

  async getByIdWithRelations(id: number) {
    const product = await this.repo.findById({ where: { id } })
    if (!product) return null
    try {
      const seo = await seoService.getSeoFor(SeoableType.PRODUCT, product.id)
      if (seo) (product as any).seoMeta = seo
    } catch (err: any) {
      console.error('Failed to load seo for product', product.id, err?.message || err)
    }
    return this.transformUserAuditFields([product])[0]
  }

  async create(data: ProductData, ctx?: { actorId?: number }) {
    return withRollback(async (rollbackManager) => {
      if (!data.name) throw new Error('Tên sản phẩm là bắt buộc')
      const normalizedSlug = normalizeSlug(data.name)
      const slugExists = await this.repo.slugExists(normalizedSlug)
      if (slugExists) throw new Error('Slug đã tồn tại')

      const { seoMeta, ...productData } = data as any
      productData.slug = normalizedSlug

      const prismaData: any = { ...productData }
      this.normalizeJsonFields(prismaData)

      const prismaPayload: any = {
        ...prismaData,
        ...(ctx?.actorId && { createdBy: ctx.actorId, updatedBy: ctx.actorId })
      }

      // Ensure SKU: if not provided, generate one; if provided keep but validate uniqueness
      // Do this before any file uploads to fail fast on SKU conflicts and avoid unnecessary IO.
      if (!prismaPayload.sku) {
        prismaPayload.sku = await this.generateUniqueSku(prismaPayload.name || prismaData.name)
      } else {
        // if supplied, ensure it doesn't already exist
        const exists = await this.repo.skuExists(String(prismaPayload.sku).trim())
        if (exists) throw new Error('SKU đã tồn tại')
      }

      // Upload images if present
      await this.uploadImagesIfPresent(prismaData, rollbackManager)
      // Upload icon if present (preserve original format)
      await this.uploadIconIfPresent(prismaData, rollbackManager)

      if (prismaData.imgs) prismaPayload.imgs = prismaData.imgs

      const product = await this.repo.runTransaction(async (tx) => {
        this.stripTransientFields(prismaPayload)
        const created = await tx.product.create({ data: prismaPayload })
        if (seoMeta && Object.keys(seoMeta).length > 0) {
          await seoService.upsertSeoInTransaction(tx, SeoableType.PRODUCT, created.id, seoMeta, ctx?.actorId)
        }
        return created
      })

      return this.transformUserAuditFields([product])[0]
    })
  }

  async update(id: number, data: ProductData, ctx?: { actorId?: number }) {
    return withRollback(async (rollbackManager) => {
      const existing = await this.repo.findById(id)
      if (!existing) throw new Error('Không tìm thấy sản phẩm')

      // Handle slug changes
      let normalizedSlug = existing.slug
      if (data.name && data.name !== existing.name) {
        normalizedSlug = normalizeSlug(data.name)
        const slugExists = await this.repo.slugExists(normalizedSlug, id)
        if (slugExists) throw new Error('Slug đã tồn tại')
      }

      const { seoMeta, ...productData } = data as any
      if (data.name) productData.slug = normalizedSlug

      const prismaData: any = { ...productData }
      this.normalizeJsonFields(prismaData)

      // If SKU provided and changed, ensure uniqueness (exclude current record)
      if (prismaData.sku !== undefined && prismaData.sku !== existing.sku) {
        const exists = await this.repo.skuExists(String(prismaData.sku).trim(), existing.id)
        if (exists) throw new Error('SKU đã tồn tại')
      }

      await this.uploadImagesIfPresent(prismaData, rollbackManager)
      // If iconFile provided, upload it (no processing) and set prismaData.icon
      await this.uploadIconIfPresent(prismaData, rollbackManager)
      this.stripTransientFields(prismaData)

      const updated = await this.repo.runTransaction(async (tx) => {
        const sanitized: any = { ...prismaData }
        if (ctx?.actorId) sanitized.updatedBy = ctx.actorId

        const res = await tx.product.update({ where: { id }, data: sanitized })
        if (seoMeta && Object.keys(seoMeta).length > 0) {
          await seoService.upsertSeoInTransaction(tx, SeoableType.PRODUCT, id, seoMeta, ctx?.actorId)
        }
        return res
      })

      // cleanup old images if replaced
      try {
        const urlsToDelete: string[] = []
        if (existing.imgs && Array.isArray(existing.imgs)) {
          const newImgs: string[] = Array.isArray(updated.imgs) ? updated.imgs : []
          for (const u of existing.imgs) if (!newImgs.includes(u)) urlsToDelete.push(u)
        }
        // handle icon deletion when replaced
        try {
          const oldIcon = (existing as any).icon
          const newIcon = (updated as any).icon
          if (oldIcon && oldIcon !== newIcon) urlsToDelete.push(oldIcon)
        } catch {}
        if (urlsToDelete.length > 0) await fileUploadService.deleteFilesByUrls(urlsToDelete)
      } catch (err: any) {
        console.error('Failed to delete old product images:', err?.message || err)
      }

      return this.transformUserAuditFields([updated])[0]
    })
  }

  async deleteById(id: number) {
    return this.repo.runTransaction(async (tx) => {
      const existing = await this.repo.findById({ where: { id }, select: { id: true, imgs: true, icon: true } }, tx)
      if (!existing) throw new Error('Không tìm thấy sản phẩm')
      await tx.seoMeta.deleteMany({ where: { seoableType: SeoableType.PRODUCT, seoableId: id } })
      const deleted = await tx.product.delete({ where: { id } })

      ;(async () => {
        try {
          const urls: string[] = []
          if (existing.imgs && Array.isArray(existing.imgs)) urls.push(...existing.imgs)
          // include icon if present
          if ((existing as any).icon) urls.push((existing as any).icon)
          if (urls.length > 0) await fileUploadService.deleteFilesByUrls(urls)
        } catch (err: any) {
          console.error('Failed to delete product images after delete:', err?.message || err)
        }
      })()

      return deleted
    })
  }

  // Delete multiple products by ids or where filter
  async deleteMultiple(where: any) {
    let whereFilter: any = where
    if (Array.isArray(where)) {
      whereFilter = { id: { in: where } }
    }

    return this.repo.runTransaction(async (tx) => {
      const candidates = await this.repo.findMany(
        { where: whereFilter, select: { id: true, imgs: true, icon: true } },
        tx
      )
      if (!candidates || candidates.length === 0) return { count: 0 }

      const ids = candidates.map((c: any) => c.id)

      // Delete SEO metadata for these products inside transaction
      await tx.seoMeta.deleteMany({ where: { seoableType: SeoableType.PRODUCT, seoableId: { in: ids } } })

      // Delete products
      const res = await tx.product.deleteMany({ where: { id: { in: ids } } })

      // Attempt to delete images after DB success (ignore errors)
      ;(async () => {
        try {
          const urls: string[] = []
          for (const c of candidates) {
            if (c.imgs && Array.isArray(c.imgs)) urls.push(...c.imgs)
            if ((c as any).icon) urls.push((c as any).icon)
          }
          if (urls.length > 0) await fileUploadService.deleteFilesByUrls(urls)
        } catch (err: any) {
          console.error('Failed to delete product images after deleteMultiple:', err?.message || err)
        }
      })()

      return res
    })
  }

  // Activate/deactivate multiple products
  async activeMultiple(where: any, active: boolean, ctx?: { actorId?: number }) {
    // Accept array of ids or where filter
    let whereFilter: any = where
    if (Array.isArray(where)) whereFilter = { id: { in: where } }

    const data: any = { active }
    if (ctx?.actorId) data.updatedBy = ctx.actorId

    return this.repo.updateMany(whereFilter, data)
  }

  protected transformUserAuditFields(data: any): any {
    const transformed = super.transformUserAuditFields(data)
    try {
      if (Array.isArray(transformed)) {
        return transformed.map((p: any) => {
          if (typeof p.imgs === 'string') p.imgs = JSON.parse(p.imgs)
          if (typeof p.tags === 'string') p.tags = JSON.parse(p.tags)
          if (typeof p.features === 'string') p.features = JSON.parse(p.features)
          if (typeof p.metaKeywords === 'string') p.metaKeywords = JSON.parse(p.metaKeywords)
          return p
        })
      }
      if (transformed) {
        const p: any = transformed
        if (typeof p.imgs === 'string') p.imgs = JSON.parse(p.imgs)
        if (typeof p.tags === 'string') p.tags = JSON.parse(p.tags)
        if (typeof p.features === 'string') p.features = JSON.parse(p.features)
        if (typeof p.metaKeywords === 'string') p.metaKeywords = JSON.parse(p.metaKeywords)
      }
    } catch (e) {}
    return transformed
  }
}
