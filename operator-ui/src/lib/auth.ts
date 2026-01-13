/**
 * Authentication utilities
 * TODO: Wire to actual auth system
 */

export type UserRole = 'operator' | 'participant' | 'owner'

export interface User {
  id: string
  email: string
  role: UserRole
}

/**
 * Mock auth check - replace with actual session/auth logic
 */
export function getCurrentUser(): User | null {
  // TODO: Replace with actual session check
  // For now, return mock operator user
  return {
    id: '1',
    email: 'operator@ironfrontdigital.com',
    role: 'operator',
  }
}

/**
 * Check if user has operator access
 */
export function hasOperatorAccess(user: User | null): boolean {
  return user?.role === 'operator' || user?.role === 'owner'
}

