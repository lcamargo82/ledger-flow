import { defineStore } from 'pinia'
import { authService } from '../services/auth.service'
import { 
  getAccessToken, 
  getRefreshToken, 
  setAccessToken, 
  setRefreshToken, 
  clearTokens 
} from '../utils/token-storage'
import { hasPermission, hasAnyPermission, hasAllPermissions } from '../utils/permissions'
import type { AuthState, LoginRequest } from '../types/auth.types'

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    isBootstrapping: true,
    error: null,
  }),

  getters: {
    userName: (state) => state.user?.name || '',
    userEmail: (state) => state.user?.email || '',
    roles: (state) => state.user?.roles || [],
    permissions: (state) => state.user?.permissions || [],
  },

  actions: {
    async login(email: string, password: string) {
      this.isLoading = true
      this.error = null
      
      try {
        const payload: LoginRequest = { email, password }
        const response = await authService.login(payload)
        
        // Save tokens
        this.accessToken = response.accessToken
        this.refreshToken = response.refreshToken
        setAccessToken(response.accessToken)
        setRefreshToken(response.refreshToken)
        
        // Set user
        this.user = response.user
        this.isAuthenticated = true
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 400) {
          this.error = "E-mail ou senha inválidos."
        } else if (!err.response) {
          this.error = "Não foi possível conectar à API."
        } else {
          this.error = "Ocorreu um erro inesperado."
        }
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async fetchMe() {
      try {
        const response = await authService.me()
        this.user = response.user
        this.isAuthenticated = true
      } catch (err) {
        this.clearAuth()
        throw err
      }
    },

    async bootstrap() {
      this.isBootstrapping = true
      
      try {
        const access = getAccessToken()
        const refresh = getRefreshToken()
        
        if (!access || !refresh) {
          this.clearAuth()
          return
        }

        this.accessToken = access
        this.refreshToken = refresh
        
        await this.fetchMe()
      } catch (err) {
        // Interceptor might have cleared tokens already, or will do so
        this.clearAuth()
      } finally {
        this.isBootstrapping = false
      }
    },

    async logout() {
      try {
        if (this.refreshToken) {
          await authService.logout(this.refreshToken)
        }
      } catch (err) {
        // Ignore errors on logout
      } finally {
        this.clearAuth()
      }
    },

    clearAuth() {
      this.user = null
      this.accessToken = null
      this.refreshToken = null
      this.isAuthenticated = false
      clearTokens()
    },

    checkPermission(permission: string) {
      return hasPermission(this.permissions, permission)
    },

    checkAnyPermission(permissions: string[]) {
      return hasAnyPermission(this.permissions, permissions)
    },

    checkAllPermissions(permissions: string[]) {
      return hasAllPermissions(this.permissions, permissions)
    }
  }
})
