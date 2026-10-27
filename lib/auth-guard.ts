import { User, UserRole } from './auth-context'

/**
 * Internal permission definitions for roles
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  admin: [
    'users:read',
    'users:write',
    'users:delete',
    'labs:read',
    'labs:write',
    'labs:delete',
    'models:train',
    'models:manage',
    'system:settings',
    'analytics:view',
  ],
  user: [
    'labs:read',
    'labs:execute',
    'models:train',
    'models:view',
  ],
} as const

/**
 * Internal check whether a user possesses a specific permission
 */
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false
  const permissions = ROLE_PERMISSIONS[user.role] || []
  return permissions.includes(permission)
}

/**
 * Internal constraint check for route or action access
 */
export function validateRoleConstraint(
  user: User | null,
  requiredRole?: UserRole
): { allowed: boolean; reason?: 'unauthenticated' | 'forbidden' } {
  if (!user) {
    return { allowed: false, reason: 'unauthenticated' }
  }

  if (requiredRole && requiredRole === 'admin' && user.role !== 'admin') {
    return { allowed: false, reason: 'forbidden' }
  }

  return { allowed: true }
}
