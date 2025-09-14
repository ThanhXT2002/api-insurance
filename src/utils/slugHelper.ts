import slugify from 'slugify'

// Configure slugify for Vietnamese
slugify.extend({
  '₫': 'vnd',
  '%': 'phan-tram',
  '&': 'va',
  '@': 'at',
  '©': 'copyright',
  '®': 'registered',
  '™': 'trademark'
})

// Default options for Vietnamese slugs
const defaultOptions: Parameters<typeof slugify>[1] = {
  lower: true,
  locale: 'vi',
  strict: true,
  trim: true
}

/**
 * Create SEO-friendly slug from Vietnamese text
 */
export function createSlug(text: string, options?: Parameters<typeof slugify>[1]): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  return slugify(text, Object.assign({}, defaultOptions, options))
}

/**
 * Create unique slug by appending number if needed
 */
export function createUniqueSlug(
  text: string,
  existingSlugs: string[] = [],
  options?: Parameters<typeof slugify>[1]
): string {
  const baseSlug = createSlug(text, options)

  if (!baseSlug) {
    return 'untitled'
  }

  let finalSlug = baseSlug
  let counter = 1

  while (existingSlugs.includes(finalSlug)) {
    finalSlug = `${baseSlug}-${counter}`
    counter++
  }

  return finalSlug
}

/**
 * Create slug with custom length limit
 */
export function createSlugWithLimit(
  text: string,
  maxLength: number = 100,
  options?: Parameters<typeof slugify>[1]
): string {
  const slug = createSlug(text, options)

  if (slug.length <= maxLength) {
    return slug
  }

  // Cut at word boundary
  const truncated = slug.substring(0, maxLength)
  const lastHyphen = truncated.lastIndexOf('-')

  if (lastHyphen > maxLength * 0.7) {
    return truncated.substring(0, lastHyphen)
  }

  return truncated
}

// Examples of usage
export const examples = {
  basic: createSlug('Điện thoại iPhone 15 Pro Max - Giá tốt nhất!'),
  // Result: "dien-thoai-iphone-15-pro-max-gia-tot-nhat"

  withPrice: createSlug('Sản phẩm mới 2024 & khuyến mãi 50% - Giá 10.000.000₫'),
  // Result: "san-pham-moi-2024-va-khuyen-mai-50-phan-tram-gia-10000000vnd"

  unique: createUniqueSlug('Bài viết mới', ['bai-viet-moi', 'bai-viet-moi-1']),
  // Result: "bai-viet-moi-2"

  limited: createSlugWithLimit('Đây là một tiêu đề rất dài có thể vượt quá giới hạn ký tự cho phép trong slug', 50)
  // Result: "day-la-mot-tieu-de-rat-dai-co-the-vuot-qua-gioi"
}

export default {
  createSlug,
  createUniqueSlug,
  createSlugWithLimit
}
