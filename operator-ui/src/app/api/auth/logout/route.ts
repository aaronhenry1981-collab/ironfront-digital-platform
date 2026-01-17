import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deleteSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (sessionId) {
      await deleteSession(sessionId)
    }

    // Clear cookie
    cookieStore.delete('session_id')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in logout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}





