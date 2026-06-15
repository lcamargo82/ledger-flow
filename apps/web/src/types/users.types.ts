export interface UserListItem {
  id: string
  tenantId: string
  name: string
  email: string
  active: boolean
  roles: string[]
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface PaginatedUsersResponse {
  data: UserListItem[]
  meta: PaginatedMeta
}

export interface UserDetailsResponse {
  user: UserListItem
}

export interface ListUsersParams {
  page?: number
  perPage?: number
  search?: string
  status?: 'active' | 'inactive' | 'all'
  role?: string
}

export interface CreateUserRequest {
  name: string
  email: string
  temporaryPassword: string
  roleKeys: string[]
  active?: boolean
}

export interface UpdateUserRequest {
  name?: string
  email?: string
}

export interface UpdateUserStatusRequest {
  active: boolean
}

export interface UpdateUserRolesRequest {
  roleKeys: string[]
}

export interface UserMutationResponse {
  user: UserListItem
}
