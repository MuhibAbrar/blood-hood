import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

type CleanupOperation =
  | { type: 'delete'; ref: FirebaseFirestore.DocumentReference }
  | { type: 'update'; ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> }

async function commitInChunks(db: FirebaseFirestore.Firestore, operations: CleanupOperation[]) {
  for (let i = 0; i < operations.length; i += 450) {
    const batch = db.batch()
    for (const operation of operations.slice(i, i + 450)) {
      if (operation.type === 'delete') batch.delete(operation.ref)
      else batch.update(operation.ref, operation.data)
    }
    await batch.commit()
  }
}

// Deletes active personal data and anonymizes historical service records.
// The operation is safe to retry after a partially completed run.
export async function deleteUserAccount(uid: string) {
  const db = adminDb()
  const [
    orgMemberSnap, orgAdminSnap, notificationsSnap, joinRequestsSnap,
    seekerEventsSnap, donorEventsSnap, contactLimitsSnap,
    requestedSnap, respondedSnap, fulfilledSnap,
    donorDonationsSnap, verifiedDonationsSnap,
    registeredCampsSnap, donatedCampsSnap, createdCampsSnap, announcementsSnap,
  ] = await Promise.all([
    db.collection('organizations').where('memberIds', 'array-contains', uid).get(),
    db.collection('organizations').where('adminIds', 'array-contains', uid).get(),
    db.collection('notifications').where('userId', '==', uid).get(),
    db.collection('joinRequests').where('userId', '==', uid).get(),
    db.collection('contactEvents').where('seekerId', '==', uid).get(),
    db.collection('contactEvents').where('donorId', '==', uid).get(),
    db.collection('contactLimits').where('seekerId', '==', uid).get(),
    db.collection('bloodRequests').where('requestedBy', '==', uid).get(),
    db.collection('bloodRequests').where('respondedBy', 'array-contains', uid).get(),
    db.collection('bloodRequests').where('fulfilledBy', '==', uid).get(),
    db.collection('donations').where('donorId', '==', uid).get(),
    db.collection('donations').where('verifiedBy', '==', uid).get(),
    db.collection('camps').where('registeredDonors', 'array-contains', uid).get(),
    db.collection('camps').where('donatedUids', 'array-contains', uid).get(),
    db.collection('camps').where('createdBy', '==', uid).get(),
    db.collection('announcements').where('createdBy', '==', uid).get(),
  ])

  const requestedIds = requestedSnap.docs.map((doc) => doc.id)
  const requestDonationSnaps: FirebaseFirestore.QuerySnapshot[] = []
  for (let i = 0; i < requestedIds.length; i += 30) {
    requestDonationSnaps.push(await db.collection('donations').where('requestId', 'in', requestedIds.slice(i, i + 30)).get())
  }

  const operations: CleanupOperation[] = []
  const orgRefs = new Map<string, FirebaseFirestore.DocumentReference>()
  for (const doc of [...orgMemberSnap.docs, ...orgAdminSnap.docs]) orgRefs.set(doc.id, doc.ref)
  for (const ref of Array.from(orgRefs.values())) operations.push({ type: 'update', ref, data: {
    memberIds: FieldValue.arrayRemove(uid), adminIds: FieldValue.arrayRemove(uid), updatedAt: FieldValue.serverTimestamp(),
  } })

  const disposableRefs = new Map<string, FirebaseFirestore.DocumentReference>()
  for (const doc of [...notificationsSnap.docs, ...joinRequestsSnap.docs, ...seekerEventsSnap.docs, ...donorEventsSnap.docs, ...contactLimitsSnap.docs]) disposableRefs.set(doc.ref.path, doc.ref)
  for (const ref of Array.from(disposableRefs.values())) operations.push({ type: 'delete', ref })

  const requestRefs = new Map<string, { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData }>()
  for (const doc of [...requestedSnap.docs, ...respondedSnap.docs, ...fulfilledSnap.docs]) requestRefs.set(doc.id, { ref: doc.ref, data: doc.data() })
  for (const { ref, data } of Array.from(requestRefs.values())) {
    const update: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = { respondedBy: FieldValue.arrayRemove(uid) }
    if (data.requestedBy === uid) Object.assign(update, {
      requestedBy: 'deleted-user',
      patientName: 'Deleted request',
      contactPhone: '',
      details: '',
      note: null,
      ...(data.status === 'open' ? { status: 'cancelled' } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    })
    if (data.fulfilledBy === uid) Object.assign(update, { fulfilledBy: null, fulfilledByName: null, fulfilledByPhone: null })
    operations.push({ type: 'update', ref, data: update })
  }

  const donationUpdates = new Map<string, { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> }>()
  const mergeDonationUpdate = (doc: FirebaseFirestore.QueryDocumentSnapshot, data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>) => {
    const existing = donationUpdates.get(doc.ref.path)
    donationUpdates.set(doc.ref.path, { ref: doc.ref, data: { ...(existing?.data ?? {}), ...data } })
  }
  for (const doc of donorDonationsSnap.docs) mergeDonationUpdate(doc, { donorId: 'deleted-user', donorName: 'Deleted donor', externalDonorPhone: null })
  for (const doc of verifiedDonationsSnap.docs) mergeDonationUpdate(doc, { verifiedBy: null })
  for (const snap of requestDonationSnaps) {
    for (const doc of snap.docs) mergeDonationUpdate(doc, { recipientName: 'Deleted recipient' })
  }
  for (const update of Array.from(donationUpdates.values())) operations.push({ type: 'update', ...update })
  const campUpdates = new Map<string, { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> }>()
  const mergeCampUpdate = (doc: FirebaseFirestore.QueryDocumentSnapshot, data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>) => {
    const existing = campUpdates.get(doc.ref.path)
    campUpdates.set(doc.ref.path, { ref: doc.ref, data: { ...(existing?.data ?? {}), ...data } })
  }
  for (const doc of registeredCampsSnap.docs) mergeCampUpdate(doc, { registeredDonors: FieldValue.arrayRemove(uid) })
  for (const doc of donatedCampsSnap.docs) mergeCampUpdate(doc, { donatedUids: FieldValue.arrayRemove(uid) })
  for (const doc of createdCampsSnap.docs) mergeCampUpdate(doc, { createdBy: 'deleted-user' })
  for (const update of Array.from(campUpdates.values())) operations.push({ type: 'update', ...update })
  for (const doc of announcementsSnap.docs) operations.push({ type: 'update', ref: doc.ref, data: { createdBy: 'deleted-user' } })
  await commitInChunks(db, operations)

  // Delete authentication only after linked records are safely cleaned. If
  // cleanup fails, the signed-in user can retry instead of being locked out.
  try {
    await adminAuth().deleteUser(uid)
  } catch (error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
    if (code !== 'auth/user-not-found') throw error
  }
  await db.collection('users').doc(uid).delete()

  return { cleanedRecords: operations.length + 1 }
}
