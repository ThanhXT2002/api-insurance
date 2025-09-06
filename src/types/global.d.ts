// Global type definitions
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      PORT?: string
      DATABASE_URL: string
      SUPABASE_URL: string
      SUPABASE_ANON_KEY: string
    }
  }
}

export {}
