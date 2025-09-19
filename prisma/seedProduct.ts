import { PrismaClient } from '../generated/prisma'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

/**
 * Seed products from front-end JSON.
 * - Normalizes fields to match the Prisma `Product` model
 * - Upserts by `slug`
 *
 * Assumptions:
 * - `price` in products.json is absent -> default to 0 (VNĐ)
 * - createdBy/updatedBy in JSON are usernames; schema expects Int IDs, so we leave them null
 * - imgs/tags/features/metaKeywords stored as JSON arrays on the model
 */
async function main() {
  // Adjusted path: go up two levels from prisma folder to reach the workspace root
  const jsonPath = path.resolve(__dirname, '..', '..', 'fe-insurance', 'src', 'assets', 'json', 'products.json')

  if (!fs.existsSync(jsonPath)) {
    console.error('products.json not found at', jsonPath)
    process.exit(1)
  }

  const raw = fs.readFileSync(jsonPath, 'utf8')
  let items: any[] = []
  try {
    items = JSON.parse(raw)
  } catch (err) {
    console.error('Invalid JSON in products.json', err)
    process.exit(1)
  }

  for (const src of items) {
    // helper: generate SKU from name (initial letters, uppercase)
    const makeSku = (name?: string) => {
      if (!name) return `P${src.id ?? Math.floor(Math.random() * 1e6)}`
      // split by non-letter (keep unicode letters)
      const parts = name
        .trim()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
      // take first character of each part
      const initials = parts.map((s) => s[0]).join('')
      const cleaned = initials.replace(/[^A-Za-z0-9]/g, '')
      return (cleaned || 'P').toUpperCase()
    }

    // Build data object that fits the Prisma model
    const data: any = {
      name: src.name || src.title || 'Untitled product',
      description: src.description || null,
      slug: src.slug || `product-${src.id ?? Math.floor(Math.random() * 1e6)}`,
      price: typeof src.price === 'number' ? src.price : 0,
      coverage: src.coverage || null,
      term: src.term || null,
      targetLink: src.targetLink || null,
      targetFile: src.targetFile || null,
      shortContent: src.shortContent || null,
      content: src.detail || src.content || '',
      details: src.details || null,
      icon: src.icon || null,
      imgs: Array.isArray(src.imgs) ? src.imgs : null,
      active: src.status === 'active' || src.isPublish === true || src.active === true,
      tags: Array.isArray(src.tags) ? src.tags : null,
      isPromotion: !!src.isPromotion,
      promotionDetails: src.promotionDetails || null,
      features: Array.isArray(src.features) ? src.features : null,
      metaKeywords: Array.isArray(src.metaKeywords) ? src.metaKeywords : null,
      note: src.note || null,
      priority: typeof src.priority === 'number' ? src.priority : 0,
      isHighlighted: !!src.isHighlighted,
      isFeatured: !!src.isFeatured,
      // createdBy/updatedBy are Int? in schema; front JSON uses strings (usernames). Leave null.
      createdBy: typeof src.createdBy === 'number' ? src.createdBy : null,
      updatedBy: typeof src.updatedBy === 'number' ? src.updatedBy : null
    }

    // Ensure SKU: base from name, ensure uniqueness (avoid colliding with other products)
    const baseSku = makeSku(data.name)
    let candidateSku = baseSku
    let suffix = 1
    try {
      // loop until no other product (with different slug) has this sku
      // Note: this reads DB; small number of products so OK
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const exists = await prisma.product.findFirst({ where: { sku: candidateSku, NOT: { slug: data.slug } } })
        if (!exists) break
        candidateSku = `${baseSku}-${suffix++}`
      }
    } catch (e) {
      // If SKU field doesn't exist in DB yet, fallback to baseSku
      candidateSku = baseSku
    }

    data.sku = candidateSku

    try {
      const res = await prisma.product.upsert({
        where: { slug: data.slug },
        update: data,
        create: data
      })
      console.log('Upserted product:', res.slug)
    } catch (err) {
      console.error('Error upserting product', data.slug, err)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
