import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getAccessToken, getRefreshToken, setAccessToken, clearTokens } from '../utils/token-storage'

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010',
  timeout: 10000,
})

// Request Interceptor
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

// Response Interceptor
httpClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig

    // If error is 401 and we haven't retried yet, and it's not the refresh endpoint
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh'
    ) {
      originalRequest._retry = true
      const refreshToken = getRefreshToken()

      if (refreshToken) {
        try {
          // Use a separate axios instance or direct call to avoid interceptor loop
          const response = await axios.post(
            `${httpClient.defaults.baseURL}/auth/refresh`,
            { refreshToken }
          )

          const newAccessToken = response.data.accessToken
          setAccessToken(newAccessToken)

          // Update header for original request and retry
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          }
          
          return httpClient(originalRequest)
        } catch (refreshError) {
          // If refresh fails, clear tokens and redirect
          clearTokens()
          window.dispatchEvent(new Event('auth:unauthorized'))
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, just clear and reject
        clearTokens()
        window.dispatchEvent(new Event('auth:unauthorized'))
      }
    }

    // For any other 401 errors (like refresh failing) or other status codes
    if (error.response?.status === 401) {
      clearTokens()
      window.dispatchEvent(new Event('auth:unauthorized'))
    }

    return Promise.reject(error)
  }
)
