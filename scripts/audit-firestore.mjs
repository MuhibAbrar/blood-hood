/**
 * Read-only Firestore migration-readiness audit.
 *
 * Usage:
 *   node scripts/audit-firestore.mjs
 *   node scripts/audit-firestore.mjs --sample=300
 *
 * The report contains counts and schema findings only. It never prints names,
 * phone numbers, tokens, document IDs, or other personal values.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldPath, getFirestore, Timestamp } from 'firebase-admin/firestore'

const parseEnvFile = (filePath) => {
  try {
    return Object.fromEntries(
      readFileSync(filePath, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const separator = line.indexOf('=')
          const key = line.slice(0, separator).trim()
          let value = line.slice(separator + 1).trim()
          if (
            (value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1)
          }
          return [key, value]
        })
    )
  } catch {
    return {}
  }
}

const env = {
  ...parseEnvFile(resolve(process.cwd(), '.env.local')),
  ...process.env,
}

const requiredCredentials = [
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
]
const missingCredentials = requiredCredentials.filter((key) => !env[key])
if (missingCredentials.length > 0) {
  throw new Error(`Missing Firebase Admin environment variables: ${missingCredentials.join(', ')}`)
}

const sampleArg = process.argv.find((arg) => arg.startsWith('--sample='))
const requestedSample = Number(sampleArg?.split('=')[1] ?? 200)
const sampleSize = Number.isFinite(requestedSample)
  ? Math.min(500, Math.max(25, Math.floor(requestedSample)))
  : 200

const app = getApps()[0] ?? initializeApp({
  credential: cert({
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
})
const db = getFirestore(app)

const schemas = {
  users: {
    required: ['uid', 'name', 'searchName', 'districtSearchName', 'phone', 'bloodGroup', 'area', 'upazila', 'age', 'gender', 'isAvailable', 'totalDonations', 'organizations', 'role', 'createdAt', 'updatedAt'],
    timestamp: ['createdAt', 'updatedAt'],
  },
  bloodRequests: {
    required: ['patientName', 'bloodGroup', 'hospital', 'area', 'contactPhone', 'requestedBy', 'urgency', 'status', 'respondedBy', 'bags', 'createdAt'],
    timestamp: ['createdAt'],
    statuses: { field: 'status', allowed: ['open', 'fulfilled', 'cancelled'] },
  },
  donations: {
    required: ['donorId', 'donorName', 'requestId', 'recipientName', 'hospital', 'bloodGroup', 'donatedAt', 'orgId', 'createdAt'],
    timestamp: ['donatedAt', 'createdAt'],
  },
  organizations: {
    required: ['name', 'type', 'area', 'adminIds', 'memberIds', 'totalDonations', 'isVerified', 'createdAt'],
    timestamp: ['createdAt'],
  },
  camps: {
    required: ['title', 'organizationId', 'date', 'venue', 'area', 'registeredDonors', 'totalCollected', 'status', 'createdBy', 'createdAt'],
    timestamp: ['date', 'createdAt'],
    statuses: { field: 'status', allowed: ['upcoming', 'ongoing', 'completed'] },
  },
  announcements: {
    required: ['orgId', 'title', 'message', 'createdBy', 'createdAt'],
    timestamp: ['createdAt'],
  },
  joinRequests: {
    required: ['orgId', 'userId', 'userName', 'userPhone', 'userBloodGroup', 'status', 'createdAt', 'updatedAt'],
    timestamp: ['createdAt', 'updatedAt'],
    statuses: { field: 'status', allowed: ['pending', 'accepted', 'rejected'] },
  },
  contactEvents: {
    required: ['seekerId', 'donorId', 'donorName', 'donorBloodGroup', 'contactedAt', 'status'],
    timestamp: ['contactedAt'],
    statuses: { field: 'status', allowed: ['contacted', 'donated', 'not_donated'] },
  },
  notifications: {
    required: ['userId', 'title', 'body', 'type', 'read', 'data', 'createdAt'],
    timestamp: ['createdAt'],
  },
  contactLimits: {
    required: ['seekerId', 'date', 'count'],
    timestamp: [],
  },
}

const isTimestamp = (value) =>
  value instanceof Timestamp
  || Boolean(value && typeof value.toMillis === 'function')

const auditCollection = async (name, schema) => {
  const collection = db.collection(name)
  const [countResult, sample] = await Promise.all([
    collection.count().get(),
    collection.limit(sampleSize).get(),
  ])

  const missingFields = Object.fromEntries(schema.required.map((field) => [field, 0]))
  const invalidTimestamps = Object.fromEntries(schema.timestamp.map((field) => [field, 0]))
  let missingSchemaVersion = 0
  let invalidStatus = 0
  let uidDocumentMismatch = 0

  for (const document of sample.docs) {
    const data = document.data()
    for (const field of schema.required) {
      if (!(field in data) || data[field] === undefined) missingFields[field] += 1
    }
    for (const field of schema.timestamp) {
      if (field in data && data[field] != null && !isTimestamp(data[field])) {
        invalidTimestamps[field] += 1
      }
    }
    if (!Number.isInteger(data.schemaVersion)) missingSchemaVersion += 1
    if (schema.statuses && !schema.statuses.allowed.includes(data[schema.statuses.field])) {
      invalidStatus += 1
    }
    if (name === 'users' && data.uid !== document.id) uidDocumentMismatch += 1
  }

  return {
    documents: countResult.data().count,
    sampled: sample.size,
    sampleLimited: countResult.data().count > sample.size,
    missingFields: Object.fromEntries(Object.entries(missingFields).filter(([, count]) => count > 0)),
    invalidTimestamps: Object.fromEntries(Object.entries(invalidTimestamps).filter(([, count]) => count > 0)),
    missingSchemaVersion,
    ...(schema.statuses ? { invalidStatus } : {}),
    ...(name === 'users' ? { uidDocumentMismatch } : {}),
  }
}

const results = Object.fromEntries(
  await Promise.all(
    Object.entries(schemas).map(async ([name, schema]) => [name, await auditCollection(name, schema)])
  )
)

const usersSample = await db.collection('users').limit(sampleSize).get()
const normalizedPhones = new Map()
let missingDistrict = 0
let invalidOrganizationsShape = 0
for (const document of usersSample.docs) {
  const data = document.data()
  const phone = typeof data.phone === 'string' ? data.phone.replace(/\D/g, '') : ''
  if (phone) normalizedPhones.set(phone, (normalizedPhones.get(phone) ?? 0) + 1)
  if (!data.district) missingDistrict += 1
  if (!Array.isArray(data.organizations)) invalidOrganizationsShape += 1
}

const donorQueryChecks = {}
const requestQueryChecks = {}
const sampleUser = usersSample.docs[0]?.data()
if (sampleUser?.district) {
  const donorBase = () => db.collection('users')
    .where('role', 'in', ['donor', 'admin', 'superadmin'])
    .where('district', '==', sampleUser.district)
  const checks = {
    district: donorBase()
      .orderBy(FieldPath.documentId())
      .limit(2),
    bloodGroup: donorBase()
      .where('bloodGroup', '==', sampleUser.bloodGroup)
      .orderBy(FieldPath.documentId())
      .limit(2),
    upazila: donorBase()
      .where('upazila', '==', sampleUser.upazila)
      .orderBy(FieldPath.documentId())
      .limit(2),
    availability: donorBase()
      .where('isAvailable', '==', Boolean(sampleUser.isAvailable))
      .orderBy(FieldPath.documentId())
      .limit(2),
    bloodGroupUpazila: donorBase()
      .where('bloodGroup', 'in', [sampleUser.bloodGroup])
      .where('upazila', '==', sampleUser.upazila)
      .orderBy(FieldPath.documentId())
      .limit(2),
    bloodGroupAvailability: donorBase()
      .where('bloodGroup', 'in', [sampleUser.bloodGroup])
      .where('isAvailable', '==', Boolean(sampleUser.isAvailable))
      .orderBy(FieldPath.documentId())
      .limit(2),
    upazilaAvailability: donorBase()
      .where('upazila', '==', sampleUser.upazila)
      .where('isAvailable', '==', Boolean(sampleUser.isAvailable))
      .orderBy(FieldPath.documentId())
      .limit(2),
    combined: donorBase()
      .where('bloodGroup', 'in', [sampleUser.bloodGroup])
      .where('upazila', '==', sampleUser.upazila)
      .where('isAvailable', '==', Boolean(sampleUser.isAvailable))
      .orderBy(FieldPath.documentId())
      .limit(2),
    namePrefix: db.collection('users')
      .where('districtSearchName', '>=', `${sampleUser.district}|${String(sampleUser.searchName).slice(0, 2)}`)
      .where('districtSearchName', '<=', `${sampleUser.district}|${String(sampleUser.searchName).slice(0, 2)}\uf8ff`)
      .orderBy('districtSearchName')
      .orderBy(FieldPath.documentId())
      .limit(2),
  }
  for (const [name, query] of Object.entries(checks)) {
    try {
      await query.get()
      donorQueryChecks[name] = 'ok'
    } catch (error) {
      donorQueryChecks[name] = `error:${error?.code ?? 'unknown'}`
    }
  }
}

if (sampleUser?.district) {
  const requestChecks = {
    districtRecent: db.collection('bloodRequests')
      .where('district', '==', sampleUser.district)
      .orderBy('createdAt', 'desc')
      .limit(2),
    districtStatusRecent: db.collection('bloodRequests')
      .where('district', '==', sampleUser.district)
      .where('status', '==', 'open')
      .orderBy('createdAt', 'desc')
      .limit(2),
    districtBloodRecent: db.collection('bloodRequests')
      .where('district', '==', sampleUser.district)
      .where('bloodGroup', '==', sampleUser.bloodGroup)
      .orderBy('createdAt', 'desc')
      .limit(2),
    districtStatusBloodRecent: db.collection('bloodRequests')
      .where('district', '==', sampleUser.district)
      .where('status', '==', 'open')
      .where('bloodGroup', '==', sampleUser.bloodGroup)
      .orderBy('createdAt', 'desc')
      .limit(2),
  }
  for (const [name, query] of Object.entries(requestChecks)) {
    try {
      await query.get()
      requestQueryChecks[name] = 'ok'
    } catch (error) {
      requestQueryChecks[name] = {
        status: `error:${error?.code ?? 'unknown'}`,
        message: String(error?.message ?? '').replace(/https?:\/\/\S+/g, '[console-link]').slice(0, 220),
      }
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'read-only',
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  sampleSize,
  collections: results,
  crossCollectionSignals: {
    sampledUsers: usersSample.size,
    duplicatePhoneGroupsInSample: [...normalizedPhones.values()].filter((count) => count > 1).length,
    usersMissingDistrictInSample: missingDistrict,
    usersWithInvalidOrganizationsShapeInSample: invalidOrganizationsShape,
    donorQueryChecks,
    requestQueryChecks,
  },
  privacy: 'No document IDs, names, phone numbers, tokens, or record contents are included.',
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
