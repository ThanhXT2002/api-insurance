import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'

// Bộ giới hạn tần suất (rate limiter) đơn giản lưu trên bộ nhớ trong process.
// Lưu ý: giải pháp này phù hợp cho môi trường nhỏ, development hoặc testing.
// Trong production, khi có nhiều instance hoặc cần chia sẻ state giữa các node,
// nên dùng Redis hoặc store chia sẻ khác (ví dụ: rate-limiter-flexible với Redis).
//
// Giải thích ngắn:
// - Mỗi IP có một mục trong `ipCounters` chứa số lần gọi (`count`) và thời điểm reset (`resetAt`).
// - Nếu chưa có mục hoặc đã quá thời gian reset thì khởi tạo lại đếm = 1.
// - Nếu số lần gọi vượt quá `DEFAULT_MAX_REQUESTS` trong cửa sổ `DEFAULT_WINDOW_MS`,
//   trả về 429 cùng header `Retry-After` (số giây còn lại đến khi reset).

const DEFAULT_WINDOW_MS = 60 * 1000 // 1 phút (ms)
const DEFAULT_MAX_REQUESTS = 5 // tối đa 5 request mỗi cửa sổ

// Lưu counters theo IP: ip -> { count, resetAt }
const ipCounters: Record<string, { count: number; resetAt: number }> = {}

/**
 * rateLimitMiddleware
 * - req: Request
 * - res: Response
 * - next: NextFunction
 *
 * Mục đích: chặn các request lặp nhanh từ cùng 1 IP để giảm spam/abuse
 * Cách hoạt động chi tiết:
 * 1) Xác định IP client bằng thứ tự ưu tiên:
 *    - Header 'x-forwarded-for' (nếu app chạy sau proxy như Vercel, Cloudflare)
 *    - req.socket.remoteAddress (socket-level)
 *    - req.ip (Express helper)
 *    - fallback 'unknown' nếu không lấy được
 * 2) Lấy entry hiện tại từ `ipCounters`.
 * 3) Nếu chưa có entry hoặc entry đã hết hạn (resetAt <= now) -> khởi tạo mới với count=1.
 * 4) Nếu count >= MAX -> trả 429 và header Retry-After (giây còn lại đến lúc reset).
 * 5) Ngược lại: tăng count và gọi next().
 */
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  // Lấy IP client theo thứ tự ưu tiên để hỗ trợ deployment sau proxy
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'

  const now = Date.now()
  const entry = ipCounters[ip]

  // Nếu chưa có entry hoặc đã quá thời gian reset thì tạo mới (bắt đầu cửa sổ mới)
  if (!entry || entry.resetAt <= now) {
    ipCounters[ip] = { count: 1, resetAt: now + DEFAULT_WINDOW_MS }
    return next()
  }

  // Nếu vượt quá giới hạn -> trả lỗi 429 và header Retry-After
  if (entry.count >= DEFAULT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    res.setHeader('Retry-After', String(retryAfter))
    return res.status(StatusCodes.TOO_MANY_REQUESTS).send({ error: 'Too many requests' })
  }

  // Tăng counter và tiếp tục
  entry.count += 1
  return next()
}

export default rateLimitMiddleware
