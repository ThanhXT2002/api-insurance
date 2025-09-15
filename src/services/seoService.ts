import { fileUploadService } from './fileUploadService'
import { buildCanonicalFor, normalizeCanonicalUrl, validateCanonicalUrl, ResourceType } from '../utils/urlHelper'
import { withRollback, RollbackManager } from '../utils/rollbackHelper'
import prisma from '../config/prismaClient'
import { SeoableType } from '../../generated/prisma'

// Types for SEO data
export interface SeoDto {
  seoTitle?: string
  metaDescription?: string
  canonicalUrl?: string
  focusKeyword?: string
  seoImage?: string | { buffer: Buffer; originalName: string } // URL string or file upload
  ogType?: string
  noindex?: boolean
  nofollow?: boolean
}

export interface UpsertSeoOptions {
  actorId?: number
  rollback?: RollbackManager
  useTransaction?: boolean
}

export class SeoService {
  /**
   * Upsert SEO metadata for a resource
   */
  async upsertSeoFor(
    resourceType: SeoableType,
    resourceId: number,
    seoDto: SeoDto,
    options: UpsertSeoOptions = {}
  ): Promise<any> {
    const { actorId, rollback, useTransaction = false } = options

    return withRollback(async (rollbackManager: RollbackManager) => {
      // Use provided rollback manager or create new one
      const rm = rollback || rollbackManager

      let seoImageUrl: string | null = null

      // 1. Handle seoImage upload if file provided
      if (seoDto.seoImage && typeof seoDto.seoImage === 'object' && seoDto.seoImage.buffer) {
        const uploaded = await fileUploadService.uploadSeoImage(seoDto.seoImage.buffer, seoDto.seoImage.originalName)
        seoImageUrl = uploaded.url
        rm.addFileDeleteAction(uploaded.url)
      } else if (seoDto.seoImage && typeof seoDto.seoImage === 'string') {
        seoImageUrl = seoDto.seoImage
      }

      // 2. Process canonical URL
      let canonicalUrl: string | null = null
      if (seoDto.canonicalUrl) {
        // If full URL provided, normalize it
        if (seoDto.canonicalUrl.startsWith('http')) {
          canonicalUrl = normalizeCanonicalUrl(seoDto.canonicalUrl)
        } else {
          // Treat as slug and build canonical based on resource type
          const resourceTypeKey = this.mapSeoableTypeToResourceType(resourceType)
          canonicalUrl = buildCanonicalFor(resourceTypeKey, seoDto.canonicalUrl)
        }

        // Validate canonical URL
        const validation = validateCanonicalUrl(canonicalUrl)
        if (!validation.valid) {
          throw new Error(`Invalid canonical URL: ${validation.error}`)
        }
      }

      // 3. Prepare SEO data
      const createData: any = {
        seoTitle: seoDto.seoTitle || null,
        metaDescription: seoDto.metaDescription || null,
        canonicalUrl: canonicalUrl,
        focusKeyword: seoDto.focusKeyword || null,
        seoImage: seoImageUrl,
        ogType: seoDto.ogType || 'article',
        noindex: seoDto.noindex || false,
        nofollow: seoDto.nofollow || false,
        ...(actorId && {
          createdBy: actorId,
          updatedBy: actorId
        })
      }

      // For update, only include seoImage if the caller provided a value (either string or uploaded file)
      const updateData: any = {
        seoTitle: seoDto.seoTitle || null,
        metaDescription: seoDto.metaDescription || null,
        canonicalUrl: canonicalUrl,
        focusKeyword: seoDto.focusKeyword || null,
        ogType: seoDto.ogType || 'article',
        noindex: seoDto.noindex || false,
        nofollow: seoDto.nofollow || false,
        ...(actorId && { updatedBy: actorId })
      }

      // If seoDto.seoImage was provided (either as file uploaded -> seoImageUrl set, or as string), then include it in update.
      if (typeof (seoDto as any).seoImage !== 'undefined') {
        updateData.seoImage = seoImageUrl
      }

      // 4. Upsert SeoMeta
      if (useTransaction) {
        // Assume caller handles transaction
        throw new Error('Transaction mode not implemented - use upsertSeoInTransaction instead')
      } else {
        const result = await prisma.seoMeta.upsert({
          where: {
            seoableType_seoableId: {
              seoableType: resourceType,
              seoableId: resourceId
            }
          },
          create: {
            seoableType: resourceType,
            seoableId: resourceId,
            ...createData
          },
          update: {
            ...updateData,
            updatedAt: new Date()
          }
        })

        return result
      }
    })
  }

  /**
   * Upsert SEO metadata within a transaction (for use inside other transactions)
   */
  async upsertSeoInTransaction(
    tx: any,
    resourceType: SeoableType,
    resourceId: number,
    seoDto: SeoDto,
    actorId?: number
  ): Promise<any> {
    // Process canonical URL
    let canonicalUrl: string | null = null
    if (seoDto.canonicalUrl) {
      if (seoDto.canonicalUrl.startsWith('http')) {
        canonicalUrl = normalizeCanonicalUrl(seoDto.canonicalUrl)
      } else {
        const resourceTypeKey = this.mapSeoableTypeToResourceType(resourceType)
        canonicalUrl = buildCanonicalFor(resourceTypeKey, seoDto.canonicalUrl)
      }

      const validation = validateCanonicalUrl(canonicalUrl)
      if (!validation.valid) {
        throw new Error(`Invalid canonical URL: ${validation.error}`)
      }
    }

    const createData: any = {
      seoTitle: seoDto.seoTitle || null,
      metaDescription: seoDto.metaDescription || null,
      canonicalUrl: canonicalUrl,
      focusKeyword: seoDto.focusKeyword || null,
      seoImage: seoDto.seoImage && typeof seoDto.seoImage === 'string' ? seoDto.seoImage : null,
      ogType: seoDto.ogType || 'article',
      noindex: seoDto.noindex || false,
      nofollow: seoDto.nofollow || false,
      ...(actorId && {
        createdBy: actorId,
        updatedBy: actorId
      })
    }

    const updateData: any = {
      seoTitle: seoDto.seoTitle || null,
      metaDescription: seoDto.metaDescription || null,
      canonicalUrl: canonicalUrl,
      focusKeyword: seoDto.focusKeyword || null,
      ogType: seoDto.ogType || 'article',
      noindex: seoDto.noindex || false,
      nofollow: seoDto.nofollow || false,
      ...(actorId && { updatedBy: actorId })
    }

    // Only set seoImage on update if caller provided seoImage (as string). Caller must handle uploading and pass URL.
    if (typeof (seoDto as any).seoImage !== 'undefined') {
      updateData.seoImage = seoDto.seoImage && typeof seoDto.seoImage === 'string' ? seoDto.seoImage : null
    }

    return tx.seoMeta.upsert({
      where: {
        seoableType_seoableId: {
          seoableType: resourceType,
          seoableId: resourceId
        }
      },
      create: {
        seoableType: resourceType,
        seoableId: resourceId,
        ...createData
      },
      update: {
        ...updateData,
        updatedAt: new Date()
      }
    })
  }

  /**
   * Get SEO metadata for a resource
   */
  async getSeoFor(resourceType: SeoableType, resourceId: number): Promise<any> {
    return prisma.seoMeta.findUnique({
      where: {
        seoableType_seoableId: {
          seoableType: resourceType,
          seoableId: resourceId
        }
      }
    })
  }

  /**
   * Delete SEO metadata for a resource
   */
  async deleteSeoFor(resourceType: SeoableType, resourceId: number): Promise<void> {
    await prisma.seoMeta.deleteMany({
      where: {
        seoableType: resourceType,
        seoableId: resourceId
      }
    })
  }

  /**
   * Map SeoableType to ResourceType for canonical building
   */
  private mapSeoableTypeToResourceType(seoableType: SeoableType): ResourceType {
    const mapping: Record<SeoableType, ResourceType> = {
      POST_CATEGORY: 'post-category',
      POST: 'post',
      PRODUCT: 'product',
      PRODUCT_CATEGORY: 'product-category',
      // Add more mappings as needed
      INSURANCE_PLAN: 'product', // fallback
      REVIEW: 'post', // fallback
      TESTIMONIAL: 'post', // fallback
      CLAIM_GUIDE: 'post', // fallback
      FAQ_ITEM: 'post', // fallback
      LEGAL_PAGE: 'post', // fallback
      BRANCH_OFFICE: 'post', // fallback
      AGENT_PROFILE: 'post' // fallback
    }

    return mapping[seoableType] || 'post'
  }

  /**
   * Build canonical URL for resource (utility method)
   */
  buildCanonicalForResource(resourceType: SeoableType, slugOrText: string): string {
    const resourceTypeKey = this.mapSeoableTypeToResourceType(resourceType)
    return buildCanonicalFor(resourceTypeKey, slugOrText)
  }
}

// Export singleton instance
export const seoService = new SeoService()
export default seoService
