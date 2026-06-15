import { httpClient } from './http-client'
import type { 
  PaginatedUsersResponse, 
  UserDetailsResponse, 
  ListUsersParams,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateUserStatusRequest,
  UpdateUserRolesRequest,
  UserMutationResponse
} from '../types/users.types'

export const usersService = {
  async listUsers(params?: ListUsersParams): Promise<PaginatedUsersResponse> {
    const response = await httpClient.get<PaginatedUsersResponse>('/users', { params })
    return response.data
  },

  async getUserById(id: string): Promise<UserDetailsResponse> {
    const response = await httpClient.get<UserDetailsResponse>(`/users/${id}`)
    return response.data
  },

  async createUser(data: CreateUserRequest): Promise<UserMutationResponse> {
    const response = await httpClient.post<UserMutationResponse>('/users', data)
    return response.data
  },

  async updateUser(id: string, data: UpdateUserRequest): Promise<UserMutationResponse> {
    const response = await httpClient.patch<UserMutationResponse>(`/users/${id}`, data)
    return response.data
  },

  async updateUserStatus(id: string, data: UpdateUserStatusRequest): Promise<UserMutationResponse> {
    const response = await httpClient.patch<UserMutationResponse>(`/users/${id}/status`, data)
    return response.data
  },

  async updateUserRoles(id: string, data: UpdateUserRolesRequest): Promise<UserMutationResponse> {
    const response = await httpClient.patch<UserMutationResponse>(`/users/${id}/roles`, data)
    return response.data
  }
}
