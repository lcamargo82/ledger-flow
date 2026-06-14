import { httpClient } from './http-client'
import type { PaginatedUsersResponse, UserDetailsResponse, ListUsersParams } from '../types/users.types'

export const usersService = {
  async listUsers(params?: ListUsersParams): Promise<PaginatedUsersResponse> {
    const response = await httpClient.get<PaginatedUsersResponse>('/users', { params })
    return response.data
  },

  async getUserById(id: string): Promise<UserDetailsResponse> {
    const response = await httpClient.get<UserDetailsResponse>(`/users/${id}`)
    return response.data
  }
}
