/// <reference types="node" />
import { PrismaClient } from '../generated/prisma'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]) {
  return arr[randInt(0, arr.length - 1)]
}

function randomDateWithinYears(years: number) {
  const now = Date.now()
  const past = now - years * 365 * 24 * 60 * 60 * 1000
  return new Date(randInt(past, now))
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const userIds = [184, 179]

// Categories from the screenshot: 24..54 (some may be missing in DB but we'll use these ids)
const categoryIds = [
  24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
  53, 54
]

const sampleTitles = [
  'Giải pháp bảo hiểm tối ưu cho gia đình',
  'Tổng quan sản phẩm bảo hiểm nhân thọ',
  'So sánh các gói bảo hiểm xe hơi phổ biến',
  'Hướng dẫn mua bảo hiểm sức khỏe cho người cao tuổi',
  'Bảo hiểm du lịch: điều khoản cần biết',
  'Bảo hiểm nhà ở và tài sản cho chủ nhà',
  'Chọn bảo hiểm nhân thọ hay đầu tư?',
  'Bảo hiểm cho doanh nghiệp nhỏ: lợi ích và rủi ro',
  'Các câu hỏi thường gặp về bảo hiểm ô tô',
  'Lựa chọn bảo hiểm bảo lãnh y tế phù hợp',
  'Bảo hiểm sinh viên: có nên mua?',
  'Bảo hiểm tai nạn cá nhân: điều khoản quan trọng',
  'Gói bảo hiểm trọn đời và những điều cần biết',
  'Bảo hiểm trách nhiệm dân sự cho doanh nghiệp',
  'Bảo hiểm sức khỏe cho nhân viên công ty',
  'So sánh phí bảo hiểm xe máy theo hãng',
  'Bảo hiểm trách nhiệm nghề nghiệp cho chuyên gia',
  'Chính sách hoàn tiền và đổi trả bảo hiểm',
  'Lợi ích của bảo hiểm sức khỏe trả góp',
  'Bảo hiểm nhân thọ cho người mới lập gia đình',
  'Bảo hiểm nhà chung cư: quyền lợi & lưu ý',
  'Các điều khoản thường thấy trong hợp đồng bảo hiểm',
  'Cách đọc hợp đồng bảo hiểm không bị mất quyền lợi',
  'Bảo hiểm cho tài sản kỹ thuật số: có cần không?',
  'Bảo hiểm dành cho người làm tự do (freelancer)',
  'Ưu đãi bảo hiểm cho người thân gia đình',
  'Hướng dẫn yêu cầu bồi thường nhanh chóng',
  'Các loại trừ phổ biến trong hợp đồng bảo hiểm',
  'Bảo hiểm y tế tư nhân vs bảo hiểm nhà nước',
  'Bảo hiểm du lịch quốc tế: chuẩn bị giấy tờ',
  'Gói bảo hiểm cho trẻ em: nên chọn thế nào?',
  'Bảo hiểm mất việc: khi nào bạn nên mua?',
  'Tư vấn lựa chọn bảo hiểm cho người cao tuổi',
  'Cách tối ưu chi phí khi mua bảo hiểm dài hạn',
  'Bảo hiểm cho tài xế công nghệ: Grab/Be',
  'Bảo hiểm xe cơ giới: các mức bồi thường phổ biến',
  'Bảo hiểm nhà máy và thiết bị công nghiệp',
  'Làm sao để so sánh quyền lợi và mức phí?',
  'Bảo hiểm cho hoạt động du lịch mạo hiểm',
  'Phí bảo hiểm ảnh hưởng thế nào đến quyền lợi?',
  'Bảo hiểm tín dụng: bảo vệ khoản vay',
  'Bảo hiểm hàng hóa vận chuyển quốc tế',
  'Bảo hiểm trách nhiệm sản phẩm: doanh nghiệp cần biết',
  '4 bí quyết đàm phán phí bảo hiểm tốt hơn',
  'Mẹo chọn gói bảo hiểm phù hợp cho gia đình trẻ',
  'Bảo hiểm chăm sóc nha khoa: có đáng đầu tư?',
  'Bảo hiểm cho người điều hành doanh nghiệp nhỏ',
  'Chiến lược phối hợp nhiều gói bảo hiểm',
  'Các câu chuyện thực tế về bồi thường bảo hiểm',
  'Xu hướng bảo hiểm 2025: gì đang thay đổi'
]

const sampleParagraphs = [
  'Nội dung bài viết này nhằm cung cấp cái nhìn tổng quan và các lưu ý khi lựa chọn sản phẩm bảo hiểm phù hợp.',
  'Bạn cần cân nhắc kỹ các điều khoản loại trừ, thời hạn chờ, và quyền lợi bồi thường để tránh hiểu nhầm khi sự cố xảy ra.',
  'Trong nhiều trường hợp, việc kết hợp nhiều gói bảo hiểm nhỏ có thể mang lại bảo vệ toàn diện hơn với chi phí tối ưu.',
  'Các công ty bảo hiểm thường có chương trình khuyến mãi theo mùa — đây có thể là thời điểm tốt để mua với mức phí thấp hơn.',
  'Hãy tham khảo ý kiến chuyên gia tư vấn để tùy chỉnh gói bảo hiểm phù hợp với tình trạng sức khỏe và nhu cầu tài chính của bạn.',
  'Bảo hiểm không phải lúc nào cũng đắt — bạn có thể tối ưu bằng cách điều chỉnh quyền lợi theo nhu cầu.',
  'Đọc kỹ phần loại trừ trong hợp đồng để tránh trường hợp từ chối bồi thường khi xảy ra rủi ro.',
  'Thời hạn chờ là yếu tố quan trọng khi mua bảo hiểm nhân thọ và bảo hiểm sức khỏe.',
  'So sánh nhiều báo giá sẽ giúp bạn có quyết định thông minh hơn về chi phí và quyền lợi.',
  'Lưu giữ các giấy tờ liên quan để quy trình bồi thường diễn ra nhanh chóng và thuận lợi.',
  'Một số chương trình có thêm quyền lợi miễn phí cho sức khỏe tinh thần hoặc tư vấn y tế từ xa.',
  'Kiểm tra xem gói bảo hiểm có hỗ trợ khám chữa bệnh nội trú và ngoại trú hay không.',
  'Với bảo hiểm xe, bạn nên lựa chọn mức khấu trừ phù hợp để cân bằng phí và bồi thường.',
  'Đối với bảo hiểm nhà ở, hãy kiểm tra điều khoản về thiên tai và cháy nổ.',
  'Bảo hiểm du lịch có thể bao gồm chi phí y tế khẩn cấp, hủy chuyến, và mất hành lý.',
  'Có những gói bảo hiểm kết hợp giữa chăm sóc y tế và bảo hiểm tử kỳ — phù hợp cho nhiều gia đình.',
  'Trong trường hợp doanh nghiệp, hãy cân nhắc bảo hiểm trách nhiệm và bảo hiểm tài sản.',
  'Nên cân nhắc bảo hiểm bổ sung (rider) nếu gói cơ bản không đủ quyền lợi.',
  'Bảo hiểm cho trẻ em thường có quyền lợi về sơ cứu và hỗ trợ y tế khẩn cấp.',
  'Quyền lợi phụ thuộc nhiều vào hồ sơ sức khỏe và lịch sử bệnh lý của người được bảo hiểm.',
  'Một số công ty bảo hiểm có chương trình giảm phí khi kết hợp nhiều hợp đồng.',
  'Cách thức đóng phí (trả theo năm hoặc theo tháng) ảnh hưởng tới tổng chi phí dài hạn.',
  'Hãy lưu ý tới các giới hạn tuổi khi mua bảo hiểm nhân thọ.',
  'Bảo hiểm mất việc thường chỉ bồi thường trong điều kiện nhất định, đọc kỹ điều khoản nhé.',
  'Đối với bảo hiểm hàng hóa, cần mô tả chính xác giá trị hàng hóa khi khai báo.',
  'Quy trình khiếu nại có thể khác nhau giữa các công ty; hãy chuẩn bị hồ sơ đầy đủ.',
  'Bảo hiểm cho nhà sản xuất cần ghi rõ giá trị thiết bị và chi phí thay thế.',
  'Một số gói có hỗ trợ tư vấn pháp lý khi xảy ra tranh chấp liên quan tới bảo hiểm.',
  'Lưu ý các điều kiện loại trừ liên quan tới các hoạt động thể thao mạo hiểm.',
  'Bạn có thể yêu cầu bổ sung quyền lợi sau khi hợp đồng có hiệu lực bằng phụ lục hợp đồng.',
  'Chi phí bảo hiểm có thể được giảm khi bạn đạt tiêu chí an toàn của công ty.',
  'Thông tin liên lạc với doanh nghiệp bảo hiểm nên được cập nhật để nhận thông báo quan trọng.',
  'Kiểm tra kỹ phần thời hạn bảo hiểm và ngày bắt đầu hiệu lực của hợp đồng.',
  'Trong nhiều trường hợp, quyền lợi bảo hiểm gia tăng theo mức phí cao hơn.',
  'Bảo hiểm trách nhiệm sản phẩm giúp doanh nghiệp tránh rủi ro kiện tụng lớn.',
  'Một hồ sơ bồi thường rõ ràng và trung thực giúp quá trình xét duyệt nhanh hơn.',
  'Hãy cân nhắc mua bảo hiểm sớm để tránh giới hạn tuổi và điều kiện loại trừ.',
  'Bảo hiểm du lịch nội địa có mức phí khác biệt so với du lịch quốc tế.',
  'Tìm hiểu kỹ chính sách hủy hợp đồng và hoàn phí khi cần thay đổi kế hoạch.',
  'Nhiều công ty cung cấp gói bảo hiểm theo gói ngành nghề cụ thể, phù hợp cho doanh nghiệp nhỏ.'
]

async function main() {
  const total = 100
  console.log(`Seeding ${total} fake posts...`)

  for (let i = 0; i < total; i++) {
    const title = `${pick(sampleTitles)} #${i + 1}`
    const slug = `${slugify(title)}-${randInt(1, 9999)}`
    const excerpt = pick(sampleParagraphs)
    const shortContent = `${pick(sampleParagraphs)}\n\n${pick(sampleParagraphs)}`
    const content = `${shortContent}\n\n${pick(sampleParagraphs)}\n\n${pick(sampleParagraphs)}`

    const createdAt = randomDateWithinYears(2)
    const createdBy = pick(userIds)
    const updatedBy = pick(userIds)
    const categoryId = pick(categoryIds)

    // relatedProducts placeholder: id list 1..9
    const relatedProducts = [1, 2, 3, 4, 5, 6, 7, 8, 9]

    const postData = {
      title,
      slug,
      excerpt,
      shortContent,
      content,
      featuredImage: `https://picsum.photos/seed/${randInt(1, 10000)}/1200/600`,
      status: 'PUBLISHED',
      albumImages: JSON.stringify([
        `https://picsum.photos/seed/${randInt(1, 10000)}/800/400`,
        `https://picsum.photos/seed/${randInt(1, 10000)}/800/400`
      ]),
      note: 'Auto-seeded post for dev/testing',
      priority: randInt(0, 2),
      isHighlighted: Math.random() > 0.95,
      isFeatured: Math.random() > 0.9,
      scheduledAt: null,
      expiredAt: null,
      targetAudience: JSON.stringify(['individual']),
      relatedProducts: JSON.stringify(relatedProducts),
      metaKeywords: JSON.stringify(['bảo hiểm', 'sản phẩm', 'tư vấn']),
      publishedAt: createdAt,
      categoryId,
      createdAt,
      createdBy,
      updatedBy,
      updatedAt: createdAt
    }

    try {
      // Use upsert on slug to avoid duplicates when re-running
      await prisma.post.upsert({
        where: { slug },
        update: postData as any,
        create: postData as any
      })

      if ((i + 1) % 100 === 0) console.log(`Seeded ${i + 1}/${total} posts`)
    } catch (err) {
      console.error('Error seeding post', slug, err)
    }
  }

  console.log('Post seeding completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
