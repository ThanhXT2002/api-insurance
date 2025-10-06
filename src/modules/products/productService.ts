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
  coverage?: number
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
    if ('imgsKeep' in target) delete target.imgsKeep
  }

  /**
   * Merge imgsKeep (ordered list of existing items and placeholders) with uploaded images.
   * imgsKeepItem can be:
   * - string (existing url)
   * - object with url/id (existing) -> we accept as-is
   * - placeholder object { __newIndex: n } to indicate insertion point for uploadedImgs[n]
   * Returns final array of strings (urls) where placeholders are replaced by uploaded images.
   */
  private mergeImgsKeepWithUploads(imgsKeepInput: any, uploadedImgs?: string[]): string[] {
    const uploaded = Array.isArray(uploadedImgs) ? [...uploadedImgs] : []
    const consumed = new Set<number>()
    const result: string[] = []

    console.log('mergeImgsKeepWithUploads called with:')
    console.log('- imgsKeepInput:', imgsKeepInput)
    console.log('- uploadedImgs:', uploadedImgs)

    if (!Array.isArray(imgsKeepInput)) {
      // No keep list provided: return uploaded (or empty)
      console.log('No imgsKeep provided, returning uploaded:', uploaded.slice())
      return uploaded.slice()
    }

    for (const item of imgsKeepInput) {
      if (item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, '__newIndex')) {
        const idx = Number(item.__newIndex)
        if (!Number.isNaN(idx) && idx >= 0 && idx < uploaded.length) {
          result.push(uploaded[idx])
          consumed.add(idx)
        } else {
          // placeholder refers to missing upload -> skip it
        }
      } else if (typeof item === 'string') {
        result.push(item)
      } else if (item && typeof item === 'object' && item.url) {
        result.push(item.url)
      } else if (item && typeof item === 'object') {
        // unknown object shape, stringify or ignore; prefer url if present
        try {
          result.push(JSON.stringify(item))
        } catch {
          // ignore
        }
      }
    }

    // Append any uploaded images that were not consumed by placeholders
    for (let i = 0; i < uploaded.length; i++) {
      if (!consumed.has(i)) result.push(uploaded[i])
    }

    console.log('mergeImgsKeepWithUploads result:', result)
    return result
  }

  /**
   * Upload imgsFiles (if any) and return an array of URLs/strings to be used in imgs.
   * Does not mutate prismaObj.imgs; caller should compose final imgs list using imgsKeep and returned uploads.
   */
  private async uploadImagesIfPresent(prismaObj: any, rollbackManager: any): Promise<string[] | undefined> {
    if (!prismaObj.imgsFiles || !Array.isArray(prismaObj.imgsFiles)) return undefined
    try {
      const inputs = prismaObj.imgsFiles as Array<{ buffer: Buffer; originalName: string }>
      const uploaded = await fileUploadService.uploadMultipleFiles(inputs, { folderName: 'project-insurance/products' })
      console.log(`Uploaded ${uploaded.length} images`)

      // Build URLs array, with fallback to data URL for SVGs when upstream URL lacks extension
      const urls: string[] = uploaded.map((u, idx) => {
        const url = u.url
        const fileType: string = u.fileType || ''
        const isSvg = fileType.toLowerCase().startsWith('image/svg')
        const urlHasSvgExt = typeof url === 'string' && url.toLowerCase().endsWith('.svg')

        if (isSvg && !urlHasSvgExt) {
          try {
            const buf = inputs[idx].buffer
            const dataUrl = `data:image/svg+xml;base64,${buf.toString('base64')}`
            console.warn(`Using data URL fallback for SVG image at index ${idx}`)
            return dataUrl
          } catch (err) {
            console.warn('Failed to build data URL fallback for SVG image:', err)
            return url
          }
        }

        return url
      })

      // Register rollback for the original uploaded URLs (only strings that look like remote URLs)
      const remoteUrls = uploaded.map((u) => u.url).filter((u) => typeof u === 'string') as string[]
      if (remoteUrls.length) rollbackManager.addFileDeleteAction(remoteUrls)

      return urls
    } catch (err: any) {
      throw new Error(`Lỗi tải ảnh sản phẩm: ${err?.message || err}`)
    }
  }

  /**
   * Upload single icon file if provided. Keep original format and do not run image processing.
   * Processed first to catch icon validation errors early before uploading imgs.
   */
  private async uploadIconIfPresent(prismaObj: any, rollbackManager: any) {
    if (!prismaObj.iconFile) return
    try {
      const input = prismaObj.iconFile as { buffer: Buffer; originalName: string }
      console.log('Uploading icon with originalName:', input.originalName)

      // Upload without processing, preserve original format and filename
      // Allow common image formats including SVG, ICO, AVIF, BMP, TIFF for icons
      const uploaded = await fileUploadService.uploadSingleFile(input.buffer, input.originalName, {
        folderName: 'project-insurance/product-icons',
        maxFileSize: 5 * 1024 * 1024,
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          'image/avif',
          'image/bmp',
          'image/tiff',
          'image/x-icon'
        ],
        processImages: false
      })
      console.log('Uploaded icon; fileType:', uploaded.fileType)

      // If upstream returned an SVG but the URL lacks an explicit .svg extension,
      // browsers sometimes have trouble loading it as an <img>. As a safe fallback,
      // use a data URL created from the original buffer so frontend can render immediately.
      const uploadedUrl: string = uploaded.url
      const fileType: string = uploaded.fileType || ''
      const isSvg = fileType.toLowerCase().startsWith('image/svg')
      const urlHasSvgExt = typeof uploadedUrl === 'string' && uploadedUrl.toLowerCase().endsWith('.svg')

      if (isSvg && !urlHasSvgExt) {
        try {
          const dataUrl = `data:image/svg+xml;base64,${input.buffer.toString('base64')}`
          console.warn('Using data URL fallback for uploaded SVG icon')
          // Still register remote URL for rollback cleanup
          rollbackManager.addFileDeleteAction(uploadedUrl)
          prismaObj.icon = dataUrl
        } catch (err) {
          console.warn('Failed to build data URL fallback for SVG icon, falling back to remote URL:', err)
          rollbackManager.addFileDeleteAction(uploadedUrl)
          prismaObj.icon = uploadedUrl
        }
      } else {
        rollbackManager.addFileDeleteAction(uploadedUrl)
        prismaObj.icon = uploadedUrl
      }
    } catch (err: any) {
      throw new Error(`Lỗi tải icon sản phẩm: ${err?.message || err}`)
    }
  }

  async getAll(params: any = {}) {
    const { keyword, active, page = 1, limit = 20 } = params
    const safePage = Math.max(1, Number(page) || 1)
    const safeLimit = Math.max(1, Number(limit) || 20)

    // Minimal select for listing/search to reduce payload
    const listSelect = {
      id: true,
      name: true,
      icon: true,
      sku: true,
      active: true,
      isSaleOnline: true
    }

    if (keyword) {
      const result = await this.repo.search(keyword, {
        skip: (safePage - 1) * safeLimit,
        limit: safeLimit,
        active,
        select: listSelect
      })
      if (result && typeof result === 'object' && 'rows' in result && 'total' in result) return result
      const resAny: any = result
      return { rows: resAny, total: Array.isArray(resAny) ? resAny.length : 0 }
    }

    // Non-keyword listing: use repo.findMany with select and count for pagination
    const where: any = {}
    if (typeof active !== 'undefined') where.active = active

    const skip = (safePage - 1) * safeLimit
    const [total, rows] = await Promise.all([
      this.repo.count({ where }),
      this.repo.findMany({ where, select: listSelect, skip, take: safeLimit })
    ])

    return {
      rows: this.transformUserAuditFields(rows),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    }
  }

  /**
   * Get products for homepage.
   * Priority ordering rule:
   *  - Only include active && isFeatured products
   *  - Sort by priority ascending (1,2,3...). priority === 0 should be treated as 'last'
   *  - For equal priority, newest updatedAt first (updatedAt DESC)
   *  - Accept optional limit
   */
  async getProductHome(params: { limit?: number } = {}) {
    const limit = typeof params.limit === 'number' ? params.limit : Number(params.limit) || 10

    // Load candidates with a minimal select to reduce payload (include updatedAt for sorting)
    const candidates = await this.repo.findMany({
      where: { active: true, isFeatured: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        priority: true,
        // include updatedAt for sorting logic but we'll strip it from final output
        updatedAt: true
      }
    })

    // Ensure we operate on array
    const rows: any[] = Array.isArray(candidates) ? candidates : (candidates && (candidates as any).rows) || []

    // Sort in-memory with custom comparator: treat priority===0 as very large so it goes last when sorting asc
    rows.sort((a: any, b: any) => {
      const pa = typeof a.priority === 'number' ? a.priority : 0
      const pb = typeof b.priority === 'number' ? b.priority : 0
      const va = pa === 0 ? Number.MAX_SAFE_INTEGER : pa
      const vb = pb === 0 ? Number.MAX_SAFE_INTEGER : pb
      if (va !== vb) return va - vb

      // tie-breaker: updatedAt desc
      const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return db - da
    })

    const selected = typeof limit === 'number' && limit > 0 ? rows.slice(0, limit) : rows

    // Strip transient sorting field updatedAt before returning to FE
    const cleaned = selected.map((r: any) => {
      const copy = { ...r }
      if ('updatedAt' in copy) delete copy.updatedAt
      return copy
    })

    return this.transformUserAuditFields(cleaned)
  }

  async findBySlug(slug: string) {
    // Use a minimal select for public product detail endpoint. SEO is loaded separately.
    const select = {
      id: true,
      sku: true,
      name: true,
      description: true,
      slug: true,
      price: true,
      targetLink: true,
      targetFile: true,
      shortContent: true,
      content: true,
      imgs: true,
      isSaleOnline: true,
      isPromotion: true,
      promotionDetails: true
    }

    const product = await this.repo.findBySlug(slug, { select })
    if (!product) return null

    // Load SEO metadata and attach as seoMeta
    try {
      const seo = await seoService.getSeoFor(SeoableType.PRODUCT, product.id)
      if (seo) (product as any).seoMeta = seo
    } catch (err: any) {
      console.error('Failed to load seo for product', product.id, err?.message || err)
    }

    return this.transformUserAuditFields([product])[0]
  }

  async getByIdWithRelations(id: number) {
    const product = await this.repo.findById({ where: { id }, include: this.getProductIncludeWithNameAuthor() })
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

      // Upload icon first to catch icon errors early before processing imgs
      await this.uploadIconIfPresent(prismaData, rollbackManager)
      // Upload images if present (returns uploaded urls which should be combined with imgsKeep)
      const uploadedImgs = await this.uploadImagesIfPresent(prismaData, rollbackManager)

      // Compose final imgs list using imgsKeep (which may include placeholders) and uploaded images
      const imgsKeepInput = prismaData.imgsKeep ?? prismaData.imgs
      const finalImgs = this.mergeImgsKeepWithUploads(imgsKeepInput, uploadedImgs)
      if (finalImgs && finalImgs.length > 0) prismaPayload.imgs = finalImgs
      // Ensure uploaded icon URL is persisted to payload so DB saves the URL
      if (prismaData.icon) prismaPayload.icon = prismaData.icon

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

      // Upload icon first to catch icon errors early before processing imgs
      await this.uploadIconIfPresent(prismaData, rollbackManager)
      // Upload images if present (returns uploaded urls which should be combined with imgsKeep)
      const uploadedImgs = await this.uploadImagesIfPresent(prismaData, rollbackManager)

      const updated = await this.repo.runTransaction(async (tx) => {
        const sanitized: any = { ...prismaData }
        if (ctx?.actorId) sanitized.updatedBy = ctx.actorId

        // If client provided imgsKeep (or imgs) and/or there are uploaded images, compose new imgs array
        const imgsKeepInput = sanitized.imgsKeep ?? sanitized.imgs
        const finalImgs = this.mergeImgsKeepWithUploads(imgsKeepInput, uploadedImgs)
        if (finalImgs && finalImgs.length > 0) sanitized.imgs = finalImgs

        // remove temporary fields before DB write (AFTER merging)
        this.stripTransientFields(sanitized)

        const res = await tx.product.update({ where: { id }, data: sanitized })
        if (seoMeta && Object.keys(seoMeta).length > 0) {
          await seoService.upsertSeoInTransaction(tx, SeoableType.PRODUCT, id, seoMeta, ctx?.actorId)
        }
        return res
      })
      // After successful update, delete remote files that are no longer referenced
      try {
        const urlsToDelete: string[] = []
        const oldImgs: string[] = existing.imgs && Array.isArray(existing.imgs) ? existing.imgs : []
        const newImgs: string[] = Array.isArray(updated.imgs) ? updated.imgs : []
        for (const u of oldImgs) if (!newImgs.includes(u)) urlsToDelete.push(u)
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
          if (typeof p.metaKeywords === 'string') p.metaKeywords = JSON.parse(p.metaKeywords)
          return p
        })
      }
      if (transformed) {
        const p: any = transformed
        if (typeof p.imgs === 'string') p.imgs = JSON.parse(p.imgs)
        if (typeof p.tags === 'string') p.tags = JSON.parse(p.tags)
        if (typeof p.metaKeywords === 'string') p.metaKeywords = JSON.parse(p.metaKeywords)
      }
    } catch (e) {}
    return transformed
  }

  private getProductInclude() {
    return {
      creator: {
        select: { id: true, name: true, email: true }
      },
      updater: {
        select: { id: true, name: true, email: true }
      }
    }
  }

  private getProductIncludeWithNameAuthor() {
    return {
      ...this.getProductInclude()
    }
  }

  // Quick update for isSaleOnline flag
  async updateIsSaleOnline(id: number, isSaleOnline: boolean, ctx?: { actorId?: number }) {
    const updated = await this.repo.runTransaction(async (tx) => {
      const data: any = { isSaleOnline }
      if (ctx?.actorId) data.updatedBy = ctx.actorId
      const res = await tx.product.update({ where: { id }, data })
      return res
    })
    return this.transformUserAuditFields([updated])[0]
  }
}
