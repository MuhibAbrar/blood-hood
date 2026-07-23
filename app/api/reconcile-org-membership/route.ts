import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { authErrorResponse, ApiAuthError, requireUser } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json()
    if (!uid) return NextResponse.json({ error: 'missing uid' }, { status: 400 })

    const decoded = await requireUser(req)
    if (decoded.uid !== uid) throw new ApiAuthError(403, 'Forbidden')

    const db = adminDb()
    const userRef = db.collection('users').doc(uid)
    const userDoc = await userRef.get()
    if (!userDoc.exists) return NextResponse.json({ error: 'user-not-found' }, { status: 404 })

    const linkedIds: string[] = userDoc.data()?.organizations ?? []
    const [linkedDocs, memberSnap, adminSnap] = await Promise.all([
      Promise.all(linkedIds.map(id => db.collection('organizations').doc(id).get())),
      db.collection('organizations').where('memberIds', 'array-contains', uid).get(),
      db.collection('organizations').where('adminIds', 'array-contains', uid).get(),
    ])

    const validIds = new Set<string>()
    linkedDocs.forEach(doc => {
      if (doc.exists) validIds.add(doc.id)
    })
    memberSnap.docs.forEach(doc => validIds.add(doc.id))
    adminSnap.docs.forEach(doc => validIds.add(doc.id))

    const organizations = Array.from(validIds)
    const changed = linkedIds.length !== organizations.length
      || linkedIds.some(id => !validIds.has(id))

    if (changed) {
      await userRef.update({
        organizations,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    return NextResponse.json({ success: true, organizations })
  } catch (error: unknown) {
    const authError = authErrorResponse(error)
    if (authError) return authError
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
