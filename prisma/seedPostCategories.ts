/// <reference types="node" />
import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

const categories: Array<{
  name: string
  slug: string
  description?: string | null
  parentSlug?: string | null
  active?: boolean
  order?: number
}> = [
  // top-level
  { name: 'Bảo Hiểm', slug: 'bao-hiem', description: 'Bảo Hiểm', parentSlug: null, active: true },

  // children under bao-hiem (inferred from screenshot)
  { name: 'Bảo hiểm y tế tư nhân', slug: 'bao-hiem-y-te-tu-nhan', parentSlug: 'bao-hiem', active: true },
  { name: 'Bảo hiểm nhân thọ', slug: 'bao-hiem-nhan-tho', parentSlug: 'bao-hiem', active: true },
  { name: 'Sản phẩm cá nhân', slug: 'san-pham-ca-nhan', parentSlug: 'bao-hiem-nhan-tho', active: true },
  { name: 'Bảo hiểm tử kỳ', slug: 'bao-hiem-tu-ky', parentSlug: 'san-pham-ca-nhan', active: true },
  { name: 'Bảo hiểm trọn đời', slug: 'bao-hiem-tron-doi', parentSlug: 'san-pham-ca-nhan', active: true },
  { name: 'Bảo hiểm hưu trí', slug: 'bao-hiem-huu-tri', parentSlug: 'san-pham-ca-nhan', active: true },
  { name: 'Sản phẩm nhóm', slug: 'san-pham-nhom', parentSlug: 'bao-hiem-nhan-tho', active: true },
  { name: 'Bảo hiểm doanh nghiệp', slug: 'bao-hiem-doanh-nghiep', parentSlug: 'bao-hiem', active: true },
  { name: 'Bảo hiểm nhân viên', slug: 'bao-hiem-nhan-vien', parentSlug: 'bao-hiem', active: true },
  { name: 'Bảo hiểm Sức khỏe', slug: 'bao-hiem-suc-khoe', parentSlug: 'bao-hiem', active: true },
  { name: 'Bảo hiểm nội trú', slug: 'bao-hiem-noi-tru', parentSlug: 'bao-hiem', active: true },
  { name: 'Bảo hiểm ngoại trú', slug: 'bao-hiem-ngoai-tru', parentSlug: 'bao-hiem', active: true },
  { name: 'Bảo hiểm thai sản', slug: 'bao-hiem-thai-san', parentSlug: 'bao-hiem', active: true },
  { name: 'Bảo hiểm xe cơ', slug: 'bao-hiem-xe-co', parentSlug: 'bao-hiem', active: true },
  { name: 'Bảo hiểm ô tô', slug: 'bao-hiem-o-to', parentSlug: 'bao-hiem', active: true },
  { name: 'Trách nhiệm dân sự', slug: 'trach-nhiem-dan-su', parentSlug: 'bao-hiem', active: true },
  { name: 'Vật chất xe', slug: 'vat-chat-xe', parentSlug: 'bao-hiem', active: true },
  { name: 'Bảo hiểm xe máy', slug: 'bao-hiem-xe-may', parentSlug: 'bao-hiem', active: true },
  { name: 'Bảo hiểm Du lịch', slug: 'bao-hiem-du-lich', parentSlug: 'bao-hiem', active: true },
  { name: 'Trong nước', slug: 'trong-nuoc', parentSlug: 'bao-hiem-du-lich', active: true },
  { name: 'Quốc tế', slug: 'quoc-te', parentSlug: 'bao-hiem-du-lich', active: true },
  { name: 'Bảo hiểm Nhà & Tài sản', slug: 'bao-hiem-nha-va-tai-san', parentSlug: 'bao-hiem', active: true },
  { name: 'Bảo hiểm cháy nổ', slug: 'bao-hiem-chay-no', parentSlug: 'bao-hiem-nha-va-tai-san', active: true },
  {
    name: 'Bảo hiểm tài sản cá nhân',
    slug: 'bao-hiem-tai-san-ca-nhan',
    parentSlug: 'bao-hiem-nha-va-tai-san',
    active: true
  },
  { name: 'Bảo hiểm chung cư', slug: 'bao-hiem-chung-cu', parentSlug: 'bao-hiem-nha-va-tai-san', active: true },
  { name: 'Bảo hiểm Trách nhiệm', slug: 'bao-hiem-trach-nhiem', parentSlug: 'bao-hiem', active: true },
  { name: 'Trách nhiệm nghề nghiệp', slug: 'trach-nhiem-nghe-nghiep', parentSlug: 'bao-hiem', active: true },
  { name: 'Luật sư & tư vấn', slug: 'luat-su-tu-van', parentSlug: 'bao-hiem', active: true },
  { name: 'Y bác sĩ', slug: 'y-bac-si', parentSlug: 'bao-hiem', active: true },
  { name: 'Trách nhiệm công cộng', slug: 'trach-nhiem-cong-cong', parentSlug: 'bao-hiem', active: true },
  { name: 'Bảo hiểm Hàng hải', slug: 'bao-hiem-hang-hai', parentSlug: 'bao-hiem', active: true },
  { name: 'Vận chuyển hàng hóa', slug: 'van-chuyen-hang-hoa', parentSlug: 'bao-hiem-hang-hai', active: true },
  { name: 'Thuyền viên & tàu biển', slug: 'thuyen-vien-va-tau-bien', parentSlug: 'bao-hiem-hang-hai', active: true },
  { name: 'Bảo hiểm Nông nghiệp', slug: 'bao-hiem-nong-nghiep', parentSlug: 'bao-hiem', active: true },
  { name: 'Cây trồng', slug: 'cay-trong', parentSlug: 'bao-hiem-nong-nghiep', active: true },
  { name: 'Vật nuôi', slug: 'vat-nuoi', parentSlug: 'bao-hiem-nong-nghiep', active: true },
  { name: 'Bảo hiểm Tín dụng', slug: 'bao-hiem-tin-dung', parentSlug: 'bao-hiem', active: true },
  { name: 'Cá nhân', slug: 'ca-nhan', parentSlug: null, active: true },
  { name: 'Doanh nghiệp', slug: 'doanh-nghiep', parentSlug: null, active: true },
  { name: 'Bảo hiểm Giáo dục', slug: 'bao-hiem-giao-duc', parentSlug: null, active: false },
  { name: 'Cho trẻ em', slug: 'cho-tre-em', parentSlug: 'bao-hiem-giao-duc', active: false },
  { name: 'Cho sinh viên du học', slug: 'cho-sinh-vien-du-hoc', parentSlug: 'bao-hiem-giao-duc', active: false }
]

async function main() {
  console.log(`Seeding ${categories.length} post categories...`)

  // Ensure top-level parents are created first (we upsert in order)
  for (const cat of categories) {
    // find parent id if parentSlug provided
    let parentConnect: any = undefined
    if (cat.parentSlug) {
      const parent = await prisma.postCategory.findUnique({ where: { slug: cat.parentSlug } })
      if (parent) parentConnect = { connect: { id: parent.id } }
    }

    try {
      // parentConnect is an object like { connect: { id } } when parent exists
      // Prisma expects scalar parentId in this unchecked upsert context, so set parentId directly.
      const parentId = parentConnect ? parentConnect.connect && parentConnect.connect.id : undefined

      await prisma.postCategory.upsert({
        where: { slug: cat.slug },
        update: {
          name: cat.name,
          description: cat.description ?? cat.name,
          active: cat.active ?? true,
          order: cat.order ?? 0,
          ...(parentId !== undefined ? { parentId } : {}),
          updatedBy: 1
        },
        create: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description ?? cat.name,
          active: cat.active ?? true,
          order: cat.order ?? 0,
          ...(parentId !== undefined ? { parentId } : {}),
          createdBy: 1,
          updatedBy: 1
        }
      })
    } catch (err) {
      console.error('Failed to upsert category', cat.slug, err)
    }
  }

  console.log('Post categories seeding completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
