import { NextRequest, NextResponse } from 'next/server'
import { authErrorResponse, requireRole } from '@/lib/api-auth'
import { cleanupExpiredData, getRetentionPreview } from '@/lib/data-retention'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['superadmin'])
    return NextResponse.json(await getRetentionPreview())
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Cleanup preview failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireRole(req, ['superadmin'])
    return NextResponse.json(await cleanupExpiredData())
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
