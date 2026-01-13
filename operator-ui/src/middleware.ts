import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentUser, hasOperatorAccess } from './lib/auth'

/**
 * Middleware to protect /console/* routes
 * TODO: Wire to actual session-based authentication
 */
export async function middleware(request: NextRequest) {
  // For now, check if user exists in database
  // TODO: Replace with session-based auth
  const user = await getCurrentUser()
  
  if (!user || !hasOperatorAccess(user)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/console/:path*', '/api/orgs/:path*'],
  // Public routes are not protected: /, /scale, /launch, /ecosystems, /pricing, /apply, /api/public/*
}

