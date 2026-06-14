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
import { useToastStore } from './toast.store'
import { getHttpErrorMessage } from '../utils/http-error'
import { useI18n } from '../composables/useI18n'

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
      
      const toast = useToastStore()
      const { t } = useI18n()
      
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
        
        toast.success(t('toast.loginSuccess'))
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 400) {
          this.error = t('auth.login.invalidCredentials')
        } else {
          this.error = t(getHttpErrorMessage(err, 'auth.login.unexpectedError'))
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

    async logout(showToast = true) {
      const toast = useToastStore()
      const { t } = useI18n()
      
      try {
        if (this.refreshToken) {
          await authService.logout(this.refreshToken)
        }
      } catch (err) {
        // Ignore errors on logout
      } finally {
        this.clearAuth()
        if (showToast) {
          toast.success(t('toast.logoutSuccess'))
        }
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
