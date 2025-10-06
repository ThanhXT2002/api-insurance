/**
 * CacheService - Centralized cache management
 * Sử dụng in-memory cache với TTL để tránh query DB nhiều lần
 */

interface CacheItem<T> {
  data: T
  timestamp: number
}

export class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map()
  private defaultTTL: number

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    // Default TTL: 5 minutes
    this.defaultTTL = defaultTTL

    // Clean expired cache every 10 minutes
    setInterval(() => this.cleanExpiredCache(), 10 * 60 * 1000)
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    if (now - item.timestamp > this.defaultTTL) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  /**
   * Set data to cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Delete all keys matching pattern
   * Example: deletePattern('user:*') xóa tất cả keys bắt đầu bằng 'user:'
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$')
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clean expired cache items
   */
  private cleanExpiredCache(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.defaultTTL) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get cache stats for monitoring
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Singleton instance
export const cacheService = new CacheService()

// Helper functions cho user cache
export const UserCacheHelper = {
  getUserKey: (userId: number) => `user:permissions:${userId}`,

  getUser: (userId: number): any | null => {
    return cacheService.get(UserCacheHelper.getUserKey(userId))
  },

  setUser: (userId: number, data: any): void => {
    cacheService.set(UserCacheHelper.getUserKey(userId), data)
  },

  clearUser: (userId: number): void => {
    cacheService.delete(UserCacheHelper.getUserKey(userId))
  },

  clearAllUsers: (): void => {
    cacheService.deletePattern('user:permissions:*')
  }
}
