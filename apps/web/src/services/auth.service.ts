import { httpClient } from './http-client'
import type { 
  LoginRequest, 
  LoginResponse, 
  MeResponse, 
  RefreshTokenResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse
} from '../types/auth.types'

export const authService = {
  async forgotPassword(payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const response = await httpClient.post<ForgotPasswordResponse>('/auth/forgot-password', payload)
    return response.data
  },

  async resetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const response = await httpClient.post<ResetPasswordResponse>('/auth/reset-password', payload)
    return response.data
  },

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
  },

  async acceptTenantInvitation(token: string, password: string): Promise<{ message: string }> {
    const response = await httpClient.post<{ message: string }>('/auth/accept-tenant-invitation', { token, password })
    return response.data
  }
}
