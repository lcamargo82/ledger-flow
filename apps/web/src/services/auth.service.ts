import { httpClient } from './http-client'
import type { 
  LoginRequest, 
  LoginResponse, 
  MeResponse, 
  RefreshTokenResponse 
} from '../types/auth.types'

export const authService = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>('/auth/login', payload)
    return response.data
  },

  async me(): Promise<MeResponse> {
    const response = await httpClient.get<MeResponse>('/auth/me')
    return response.data
  },

  async refresh(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await httpClient.post<RefreshTokenResponse>('/auth/refresh', { refreshToken })
    return response.data
  },

  async logout(refreshToken: string): Promise<void> {
    await httpClient.post('/auth/logout', { refreshToken })
  }
}
