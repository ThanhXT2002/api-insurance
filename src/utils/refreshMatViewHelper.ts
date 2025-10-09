import prisma from '../config/prismaClient'

/**
 * Helper to refresh materialized view after role/permission changes
 * Usage: await refreshMatViewHelper() in controllers after role/permission updates
 */

let isRefreshing = false
let pendingRefresh = false

export async function refreshMatViewHelper(): Promise<void> {
  // Debounce: if already refreshing, mark as pending
  if (isRefreshing) {
    pendingRefresh = true
    return
  }

  try {
    isRefreshing = true
    console.log('[RefreshHelper] Starting REFRESH MATERIALIZED VIEW CONCURRENTLY')

    await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions_mat;')

    console.log('[RefreshHelper] REFRESH completed successfully')

    // If there was a pending refresh request while we were refreshing, do it again
    if (pendingRefresh) {
      pendingRefresh = false
      setImmediate(() => refreshMatViewHelper()) // Schedule next refresh
    }
  } catch (error: any) {
    console.error('[RefreshHelper] REFRESH failed:', error?.message || error)

    // Try fallback to blocking refresh
    try {
      console.log('[RefreshHelper] Trying blocking REFRESH as fallback')
      await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW user_permissions_mat;')
      console.log('[RefreshHelper] Fallback REFRESH completed')
    } catch (fallbackError: any) {
      console.error('[RefreshHelper] Fallback REFRESH also failed:', fallbackError?.message || fallbackError)
    }
  } finally {
    isRefreshing = false
  }
}

/**
 * Alternative: Non-blocking fire-and-forget refresh
 * Use this if you don't want to await the refresh
 */
export function refreshMatViewAsync(): void {
  refreshMatViewHelper().catch((err) => {
    console.error('[RefreshHelper] Async refresh failed:', err)
  })
}
