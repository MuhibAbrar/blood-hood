import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ApiAuthError, authErrorResponse, requireOrgAdmin } from '@/lib/api-auth'
import { CURRENT_SCHEMA_VERSION } from '@/lib/schema-version'

const cleanText = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''

export async function POST(req: NextRequest) {
  try {
    const input = await req.json() as Record<string, unknown>
    const action = input.action
    const orgId = cleanText(input.orgId, 128)
    if (!orgId || !['create', 'delete'].includes(String(action))) {
      return NextResponse.json({ error: 'Invalid announcement action' }, { status: 400 })
    }
    const actor = await requireOrgAdmin(req, orgId)
    const db = adminDb()

    if (action === 'create') {
      const title = cleanText(input.title, 120)
      const message = cleanText(input.message, 1000)
      if (!title || !message) {
        return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
      }
      const ref = await db.collection('announcements').add({
        orgId,
        title,
        message,
        createdBy: actor.uid,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ success: true, id: ref.id })
    }

    const announcementId = cleanText(input.announcementId, 128)
    if (!announcementId) {
      return NextResponse.json({ error: 'Announcement required' }, { status: 400 })
    }
    const ref = db.collection('announcements').doc(announcementId)
    const snap = await ref.get()
    if (!snap.exists || snap.data()?.orgId !== orgId) {
      throw new ApiAuthError(404, 'Announcement not found')
    }
    await ref.delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    console.error('Announcement action error:', error)
    return NextResponse.json({ error: 'Unable to update announcement' }, { status: 500 })
  }
}
