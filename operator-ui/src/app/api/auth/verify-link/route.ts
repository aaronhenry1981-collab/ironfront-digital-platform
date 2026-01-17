import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { OWNER_EMAIL, hashToken, createSession } from '@/lib/auth'
import { writeAuditEvent } from '@/lib/audit'

const INTAKE_ORG_ID = process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000000'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url))
    }

    const tokenHash = hashToken(token)

    // Find magic link
    const magicLink = await db.magicLink.findFirst({
      where: {
        token_hash: tokenHash,
        used_at: null,
      },
      orderBy: {
        created_at: 'desc',
      },
    })

    if (!magicLink) {
      // Log failed verification attempt
      try {
        await writeAuditEvent({
          org_id: INTAKE_ORG_ID,
          actor_user_id: null,
          actor_role: 'system',
          event_type: 'auth_denied',
          target_type: 'auth_verify',
          metadata: { reason: 'invalid_token' },
        })
      } catch (e) {
        console.error('Failed to log auth_denied event:', e)
      }

      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url))
    }

    // Check if expired
    if (new Date(magicLink.expires_at) < new Date()) {
      await db.magicLink.update({
        where: { id: magicLink.id },
        data: { used_at: new Date() },
      })

      return NextResponse.redirect(new URL('/login?error=expired', request.url))
    }

    // Verify email matches owner
    if (magicLink.email !== OWNER_EMAIL) {
      await db.magicLink.update({
        where: { id: magicLink.id },
        data: { used_at: new Date() },
      })

      try {
        await writeAuditEvent({
          org_id: INTAKE_ORG_ID,
          actor_user_id: null,
          actor_role: 'system',
          event_type: 'auth_denied',
          target_type: 'auth_verify',
          metadata: { email: magicLink.email, reason: 'not_owner' },
        })
      } catch (e) {
        console.error('Failed to log auth_denied event:', e)
      }

      return NextResponse.redirect(new URL('/login?error=access_restricted', request.url))
    }

    // Get user
    const user = await db.user.findUnique({
      where: { email: magicLink.email },
    })

    if (!user || user.role !== 'owner') {
      await db.magicLink.update({
        where: { id: magicLink.id },
        data: { used_at: new Date() },
      })

      return NextResponse.redirect(new URL('/login?error=access_restricted', request.url))
    }

    // Mark magic link as used
    await db.magicLink.update({
      where: { id: magicLink.id },
      data: { used_at: new Date() },
    })

    // Create session
    const sessionId = await createSession(user.id)

    // Log successful verification
    try {
      await writeAuditEvent({
        org_id: INTAKE_ORG_ID,
        actor_user_id: user.id,
        actor_role: 'owner',
        event_type: 'auth_verify',
        target_type: 'magic_link',
        metadata: { email: user.email },
      })
    } catch (e) {
      console.error('Failed to log auth_verify event:', e)
    }

    // Set secure cookie
    const cookieStore = await cookies()
    const isProduction = process.env.NODE_ENV === 'production'

    cookieStore.set('session_id', sessionId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    // Log login
    try {
      await writeAuditEvent({
        org_id: INTAKE_ORG_ID,
        actor_user_id: user.id,
        actor_role: 'owner',
        event_type: 'auth_login',
        target_type: 'session',
        metadata: { email: user.email },
      })
    } catch (e) {
      console.error('Failed to log auth_login event:', e)
    }

    // Redirect to owner console
    return NextResponse.redirect(new URL('/console/owner', request.url))
  } catch (error: any) {
    console.error('Error in verify-link:', error)
    return NextResponse.redirect(new URL('/login?error=server_error', request.url))
  }
}





