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
    registeredCampsSnap, createdCampsSnap, announcementsSnap,
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
    db.collection('camps').where('createdBy', '==', uid).get(),
    db.collection('announcements').where('createdBy', '==', uid).get(),
  ])

  try {
    await adminAuth().deleteUser(uid)
  } catch (error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
    if (code !== 'auth/user-not-found') throw error
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
    })
    if (data.fulfilledBy === uid) Object.assign(update, { fulfilledBy: null, fulfilledByName: null, fulfilledByPhone: null })
    operations.push({ type: 'update', ref, data: update })
  }

  for (const doc of donorDonationsSnap.docs) operations.push({ type: 'update', ref: doc.ref, data: { donorId: 'deleted-user', donorName: 'Deleted donor', externalDonorPhone: null } })
  for (const doc of verifiedDonationsSnap.docs) operations.push({ type: 'update', ref: doc.ref, data: { verifiedBy: null } })
  for (const doc of registeredCampsSnap.docs) operations.push({ type: 'update', ref: doc.ref, data: { registeredDonors: FieldValue.arrayRemove(uid) } })
  for (const doc of createdCampsSnap.docs) operations.push({ type: 'update', ref: doc.ref, data: { createdBy: 'deleted-user' } })
  for (const doc of announcementsSnap.docs) operations.push({ type: 'update', ref: doc.ref, data: { createdBy: 'deleted-user' } })
  operations.push({ type: 'delete', ref: db.collection('users').doc(uid) })

  await commitInChunks(db, operations)
  return { cleanedRecords: operations.length }
}
