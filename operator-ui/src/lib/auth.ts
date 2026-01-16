/**
 * Authentication utilities for owner-only magic-link auth
 */

import { cookies } from 'next/headers'
import { db } from './db'
import crypto from 'crypto'

export const OWNER_EMAIL = 'aaronhenry1981@gmail.com'
export const ROLE_OWNER = 'owner'

export type UserRole = 'operator' | 'participant' | 'owner'

export interface User {
  id: string
  email: string
  role: UserRole | null
}

/**
 * Hash a token using SHA256
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Generate a random token (32 bytes = 64 hex chars)
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Get current user from session cookie
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return null
    }

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    })

    if (!session || !session.user) {
      return null
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      // Clean up expired session
      await db.session.delete({ where: { id: sessionId } })
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email,
      role: (session.user.role as UserRole) || null,
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Check if user has operator access
 */
export function hasOperatorAccess(user: User | null): boolean {
  return user?.role === 'operator' || user?.role === 'owner'
}

/**
 * Check if user is owner
 */
export function isOwner(user: User | null): boolean {
  return user?.role === 'owner' && user?.email === OWNER_EMAIL
}

/**
 * Create a session for a user
 */
export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  const session = await db.session.create({
    data: {
      user_id: userId,
      expires_at: expiresAt,
    },
  })

  return session.id
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await db.session.delete({ where: { id: sessionId } })
}

/**
 * Resolve org context (stub for backward compatibility with existing routes)
 * TODO: Implement proper org membership resolution
 */
export async function resolveOrgContext(
  userId: string,
  orgId: string
): Promise<{ role: string } | null> {
  const user = await getCurrentUser()
  if (!user) return null
  
  // For owner, allow access to any org
  if (isOwner(user)) {
    return { role: 'owner' }
  }
  
  // For other users, check org membership
  // TODO: Implement proper org membership check
  return null
}
