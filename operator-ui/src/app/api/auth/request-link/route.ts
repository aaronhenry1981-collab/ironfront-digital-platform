import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { OWNER_EMAIL, hashToken, generateToken } from '@/lib/auth'
import { sendMagicLink } from '@/lib/email'
import { writeAuditEvent } from '@/lib/audit'

// Get intake org ID for audit events (system org)
const INTAKE_ORG_ID = process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Hard requirement: Only owner email can request a link
    if (normalizedEmail !== OWNER_EMAIL) {
      // Log denied attempt
      try {
        await writeAuditEvent({
          org_id: INTAKE_ORG_ID,
          actor_user_id: null,
          actor_role: 'system',
          event_type: 'auth_denied',
          target_type: 'auth_request',
          metadata: { email: normalizedEmail, reason: 'not_owner' },
        })
      } catch (e) {
        // Non-fatal if audit fails
        console.error('Failed to log auth_denied event:', e)
      }

      return NextResponse.json(
        { error: 'Access restricted.' },
        { status: 403 }
      )
    }

    // Get or create owner user
    let user = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      user = await db.user.create({
        data: {
          email: normalizedEmail,
          role: 'owner',
        },
      })
    } else if (user.role !== 'owner') {
      // Ensure role is owner (immutable)
      user = await db.user.update({
        where: { id: user.id },
        data: { role: 'owner' },
      })
    }

    // Invalidate previous unused links for this email
    await db.magicLink.updateMany({
      where: {
        email: normalizedEmail,
        used_at: null,
        expires_at: { gt: new Date() },
      },
      data: {
        used_at: new Date(), // Mark as used
      },
    })

    // Generate token and hash
    const token = generateToken()
    const tokenHash = hashToken(token)

    // Create magic link (15 minute expiry)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 15)

    await db.magicLink.create({
      data: {
        email: normalizedEmail,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    })

    // Log auth request
    try {
      await writeAuditEvent({
        org_id: INTAKE_ORG_ID,
        actor_user_id: user.id,
        actor_role: 'owner',
        event_type: 'auth_request',
        target_type: 'magic_link',
        metadata: { email: normalizedEmail },
      })
    } catch (e) {
      console.error('Failed to log auth_request event:', e)
    }

    // Send magic link email
    await sendMagicLink(normalizedEmail, token)

    return NextResponse.json({
      success: true,
      message: 'Magic link sent',
    })
  } catch (error: any) {
    console.error('Error in request-link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

