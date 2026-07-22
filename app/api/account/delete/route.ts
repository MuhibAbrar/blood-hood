import { NextRequest, NextResponse } from 'next/server'
import { authErrorResponse, requireUser } from '@/lib/api-auth'
import { deleteUserAccount } from '@/lib/delete-user-account'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const body = await req.json().catch(() => ({}))
    if (body.confirmation !== 'DELETE') return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
    const result = await deleteUserAccount(user.uid)
    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    console.error('Self-service account deletion failed:', error)
    return NextResponse.json({ error: 'Account deletion failed' }, { status: 500 })
  }
}
