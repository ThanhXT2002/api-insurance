export interface UserProfileSafe {
  email: string
  name: string | null
  avatarUrl: string | null
  active: boolean
  updatedAt: string | null
  addresses: string | null
  roles: string[] 
}