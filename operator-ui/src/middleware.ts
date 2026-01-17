import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentUser, isOwner } from './lib/auth'

/**
 * Middleware to protect /console/* routes
 * Requires valid session and owner role
 * 
 * EXPLICITLY EXCLUDED (no auth checks):
 * - /login
 * - /api/auth/request-link
 * - /api/auth/verify-link
 * - /api/auth/logout (handles its own auth)
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Explicitly exclude login and auth routes
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/request-link') ||
    pathname.startsWith('/api/auth/verify-link')
  ) {
    return NextResponse.next()
  }

  // Only protect /console/* routes
  if (!pathname.startsWith('/console')) {
    return NextResponse.next()
  }

  // Allow other /api/* routes to handle their own auth
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  try {
    const user = await getCurrentUser()

    if (!user) {
      // No session - redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check if owner for /console/owner
    if (pathname.startsWith('/console/owner')) {
      if (!isOwner(user)) {
        // Not owner - return 403
        return new NextResponse('Forbidden', { status: 403 })
      }
    } else {
      // For other /console/* routes, check operator access
      // This maintains backward compatibility
      if (user.role !== 'owner' && user.role !== 'operator') {
        return new NextResponse('Forbidden', { status: 403 })
      }
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/console/:path*'],
  // Public routes are not protected: /, /scale, /launch, /ecosystems, /pricing, /apply, /api/public/*
}
