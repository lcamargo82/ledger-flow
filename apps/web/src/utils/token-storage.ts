/**
 * Token Storage Utility
 * 
 * Note: In this phase, we are using localStorage for simplicity in the local portfolio environment.
 * In production, it is highly recommended to evaluate using HttpOnly, Secure, and SameSite cookies
 * for storing refresh tokens to prevent XSS attacks.
 */

const ACCESS_TOKEN_KEY = 'ledgerflow.accessToken'
const REFRESH_TOKEN_KEY = 'ledgerflow.refreshToken'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}
