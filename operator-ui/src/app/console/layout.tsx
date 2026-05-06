import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

// Force Node.js runtime so Prisma + node:crypto work.
// This auth gate used to live in middleware.ts but Next 14 middleware
// runs on Edge Runtime, which doesn't support Prisma.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'owner' && user.role !== 'operator') {
    redirect('/login?error=access_restricted')
  }

  // Owner-only routes (/console/owner/*) enforce isOwner() in their own
  // page components since layouts can't reliably read the current path.
  return <>{children}</>
}
