/**
 * Referral code utilities
 * Generates and validates referral codes for lead tracking
 */

import crypto from 'crypto'

/**
 * Generate a referral code
 * Format: 8-character alphanumeric (uppercase), easy to share
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude ambiguous chars (I, O, 0, 1)
  const bytes = crypto.randomBytes(4)
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[bytes[i] % chars.length]
  }
  // Add hyphen for readability: XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`
}

/**
 * Validate referral code format
 */
export function isValidReferralCode(code: string): boolean {
  // Format: XXXX-XXXX (8 chars + 1 hyphen)
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code.toUpperCase())
}

/**
 * Normalize referral code (uppercase, remove whitespace)
 */
export function normalizeReferralCode(code: string): string {
  return code.toUpperCase().replace(/\s+/g, '').trim()
}

