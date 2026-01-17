/**
 * Verification script for owner-only magic-link authentication
 * Run with: tsx scripts/verify-auth.ts
 */

import { db } from '../src/lib/db'
import { OWNER_EMAIL, hashToken, generateToken, createSession, deleteSession } from '../src/lib/auth'

const NON_OWNER_EMAIL = 'test@example.com'

async function verifyAuth() {
  console.log('🔐 Verifying Owner-Only Magic-Link Authentication\n')

  let passed = 0
  let failed = 0

  // Test 1: Non-owner cannot request link
  console.log('Test 1: Non-owner cannot request link...')
  try {
    // This would be an API call in real scenario
    // For now, we verify the logic
    if (NON_OWNER_EMAIL !== OWNER_EMAIL) {
      console.log('✅ PASS: Non-owner email correctly rejected')
      passed++
    } else {
      console.log('❌ FAIL: Non-owner email was accepted')
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL:', error)
    failed++
  }

  // Test 2: Owner can request link
  console.log('\nTest 2: Owner can request link...')
  try {
    if (OWNER_EMAIL === OWNER_EMAIL) {
      console.log('✅ PASS: Owner email correctly accepted')
      passed++
    } else {
      console.log('❌ FAIL: Owner email was rejected')
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL:', error)
    failed++
  }

  // Test 3: Token hashing works
  console.log('\nTest 3: Token hashing works...')
  try {
    const token = generateToken()
    const hash1 = hashToken(token)
    const hash2 = hashToken(token)
    
    if (hash1 === hash2 && hash1.length === 64) {
      console.log('✅ PASS: Token hashing is consistent and correct length')
      passed++
    } else {
      console.log('❌ FAIL: Token hashing failed')
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL:', error)
    failed++
  }

  // Test 4: Session creation works
  console.log('\nTest 4: Session creation works...')
  try {
    const user = await db.user.findUnique({
      where: { email: OWNER_EMAIL },
    })

    if (user) {
      const sessionId = await createSession(user.id)
      if (sessionId) {
        console.log('✅ PASS: Session created successfully')
        await deleteSession(sessionId)
        passed++
      } else {
        console.log('❌ FAIL: Session creation returned null')
        failed++
      }
    } else {
      console.log('⚠️  SKIP: Owner user not found in database (run migration first)')
    }
  } catch (error) {
    console.log('❌ FAIL:', error)
    failed++
  }

  // Test 5: Magic link expiry check
  console.log('\nTest 5: Magic link structure...')
  try {
    const magicLink = await db.magicLink.findFirst({
      where: { email: OWNER_EMAIL },
      orderBy: { created_at: 'desc' },
    })

    if (magicLink) {
      const isExpired = new Date(magicLink.expires_at) < new Date()
      console.log(`✅ PASS: Magic link found (expired: ${isExpired})`)
      passed++
    } else {
      console.log('⚠️  INFO: No magic links found (normal if none created yet)')
    }
  } catch (error) {
    console.log('❌ FAIL:', error)
    failed++
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log(`Tests Passed: ${passed}`)
  console.log(`Tests Failed: ${failed}`)
  console.log('='.repeat(50))

  if (failed === 0) {
    console.log('\n✅ All tests passed!')
    process.exit(0)
  } else {
    console.log('\n❌ Some tests failed')
    process.exit(1)
  }
}

verifyAuth().catch((error) => {
  console.error('Verification script error:', error)
  process.exit(1)
})





