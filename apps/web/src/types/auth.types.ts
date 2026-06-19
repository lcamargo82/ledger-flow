export interface AuthenticatedUser {
  id: string
  tenantId: string
  name: string
  email: string
  roles: string[]
  permissions: string[]
  sessionId?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthenticatedUser
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  accessToken: string
}

export interface MeResponse {
  user: AuthenticatedUser
}

export interface LogoutRequest {
  refreshToken: string
}

export interface AuthState {
  user: AuthenticatedUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isBootstrapping: boolean
  isRequestingPasswordReset: boolean
  isResettingPassword: boolean
  passwordRecoveryError: string | null
  error: string | null
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ForgotPasswordResponse {
  message: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

export interface ResetPasswordResponse {
  message: string
}
