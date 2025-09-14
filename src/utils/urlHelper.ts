import { createSlug } from './slugHelper'

/**
 * Resource type mapping for canonical URL paths
 */
const RESOURCE_PATH_MAP = {
  'post-category': '/post-category',
  post: '/posts',
  product: '/products',
  'product-category': '/product-categories'
} as const

export type ResourceType = keyof typeof RESOURCE_PATH_MAP

/**
 * Normalize text to URL-safe slug
 * Reuses existing slugHelper logic
 */
export function normalizeSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  return createSlug(text)
}

/**
 * Normalize canonical URL - remove tracking params, standardize format
 */
export function normalizeCanonicalUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  try {
    const parsed = new URL(url)

    // Remove tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']
    trackingParams.forEach((param) => {
      parsed.searchParams.delete(param)
    })

    // Normalize path - remove trailing slash except for root
    let path = parsed.pathname.replace(/\/+$/, '') || '/'

    // Reconstruct URL
    const searchString = parsed.searchParams.toString()
    return `${parsed.protocol}//${parsed.host}${path}${searchString ? '?' + searchString : ''}`
  } catch (error) {
    // If URL parsing fails, return normalized slug version
    return normalizeSlug(url)
  }
}

/**
 * Build canonical URL for a specific resource type
 * Uses DOMAIN_FE from environment
 */
export function buildCanonicalFor(resourceType: ResourceType, slugOrText: string): string {
  const domain = process.env.DOMAIN_FE || 'https://localhost:3000'
  const basePath = RESOURCE_PATH_MAP[resourceType]

  // If input looks like a full URL, normalize it first
  if (slugOrText.startsWith('http://') || slugOrText.startsWith('https://')) {
    return normalizeCanonicalUrl(slugOrText)
  }

  // Otherwise, treat as text and create slug
  const slug = normalizeSlug(slugOrText)
  if (!slug) {
    throw new Error(`Cannot create canonical URL: invalid slug from "${slugOrText}"`)
  }

  return `${domain.replace(/\/$/, '')}${basePath}/${slug}`
}

/**
 * Validate canonical URL format
 */
export function validateCanonicalUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'Canonical URL cannot be empty' }
  }

  try {
    const parsed = new URL(url)

    // Must be http or https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Canonical URL must use http or https protocol' }
    }

    // Must have host
    if (!parsed.host) {
      return { valid: false, error: 'Canonical URL must have a valid host' }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Helper to get domain from environment with fallback
 */
export function getDomainFE(): string {
  return process.env.DOMAIN_FE || 'https://localhost:3000'
}

// Export examples for testing/documentation
export const examples = {
  normalizeSlug: {
    input: 'Bảo hiểm nhân thọ - Ưu đãi 2024!',
    output: normalizeSlug('Bảo hiểm nhân thọ - Ưu đãi 2024!')
  },
  buildCanonical: {
    input: 'Bảo hiểm sức khỏe',
    output: buildCanonicalFor('post-category', 'Bảo hiểm sức khỏe')
  },
  normalizeCanonical: {
    input: 'https://example.com/post-category/bao-hiem/?utm_source=google&utm_medium=cpc',
    output: normalizeCanonicalUrl('https://example.com/post-category/bao-hiem/?utm_source=google&utm_medium=cpc')
  }
}
