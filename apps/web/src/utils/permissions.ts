/**
 * Checks if the user has a specific permission.
 */
export function hasPermission(userPermissions: string[], permission: string): boolean {
  return userPermissions.includes(permission)
}

/**
 * Checks if the user has at least one of the required permissions.
 */
export function hasAnyPermission(userPermissions: string[], permissions: string[]): boolean {
  if (!permissions.length) return true
  return permissions.some(permission => userPermissions.includes(permission))
}

/**
 * Checks if the user has all of the required permissions.
 */
export function hasAllPermissions(userPermissions: string[], permissions: string[]): boolean {
  if (!permissions.length) return true
  return permissions.every(permission => userPermissions.includes(permission))
}
