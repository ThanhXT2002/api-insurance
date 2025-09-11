export interface UserProfileSafe {
  email: string
  name: string | null
  avatarUrl: string | null
  active: boolean
  updatedAt: string | null
  addresses: string | null
  roles: string[] 
}

export interface UserCreateDto {
  // Supabase auth
  email: string
  password: string

  // profile
  name?: string | null
  avatarUrl?: string | null
  // optional file shape when uploading via multipart (service handles upload)
  avatarFile?: { buffer: Buffer; originalname: string }

  addresses?: string | null
  active?: boolean

  // Role & Permission by key (client supplies keys only)
  roleKeys?: string[]              // e.g. ['user','admin']
  permissionKeys?: string[]        // e.g. ['user.view','project.create']
}