/**
 * Bounded, idempotent Firestore schema migration.
 *
 * Dry-run is the default and performs no writes:
 *   node scripts/migrate-firestore-schema.mjs
 *
 * Applying requires three explicit safeguards:
 *   node scripts/migrate-firestore-schema.mjs --apply \
 *     --confirm-project=blood-hood-dev --limit=200
 *
 * For a non-dev project, --backup-confirmed is also mandatory.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const SCHEMA_VERSIONS = {
  users: 2,
  bloodRequests: 1,
  donations: 1,
  organizations: 1,
  camps: 1,
  announcements: 1,
  joinRequests: 1,
  notifications: 1,
}
const COLLECTIONS = [
  'users',
  'bloodRequests',
  'donations',
  'organizations',
  'camps',
  'announcements',
  'joinRequests',
  'notifications',
]
const DIVISION_BY_DISTRICT = {
  'খুলনা': 'খুলনা',
  'ঢাকা': 'ঢাকা',
  'চট্টগ্রাম': 'চট্টগ্রাম',
  'রাজশাহী': 'রাজশাহী',
  'সিলেট': 'সিলেট',
  'বরিশাল': 'বরিশাল',
}

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

const option = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const apply = process.argv.includes('--apply')
const backupConfirmed = process.argv.includes('--backup-confirmed')
const requestedLimit = Number(option('limit') ?? 200)
const limit = Number.isFinite(requestedLimit)
  ? Math.min(500, Math.max(1, Math.floor(requestedLimit)))
  : 200
const requestedCollection = option('collection')
const selectedCollections = requestedCollection
  ? COLLECTIONS.filter((name) => name === requestedCollection)
  : COLLECTIONS

if (requestedCollection && selectedCollections.length === 0) {
  throw new Error(`Unsupported collection: ${requestedCollection}`)
}

const env = {
  ...parseEnvFile(resolve(process.cwd(), '.env.local')),
  ...process.env,
}
const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const requiredCredentials = [
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
]
const missingCredentials = requiredCredentials.filter((key) => !env[key])
if (missingCredentials.length > 0) {
  throw new Error(`Missing Firebase Admin environment variables: ${missingCredentials.join(', ')}`)
}

if (apply) {
  if (option('confirm-project') !== projectId) {
    throw new Error(`Apply blocked: pass --confirm-project=${projectId}`)
  }
  if (!projectId.toLowerCase().includes('dev') && !backupConfirmed) {
    throw new Error('Production apply blocked: verify a restorable backup and pass --backup-confirmed')
  }
}

const app = getApps()[0] ?? initializeApp({
  credential: cert({
    projectId,
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
})
const db = getFirestore(app)

const isTimestamp = (value) =>
  value instanceof Timestamp
  || Boolean(value && typeof value.toMillis === 'function')

const timestampFallback = (...values) => values.find((value) => isTimestamp(value))
const normalizeSearchName = (value) =>
  typeof value === 'string'
    ? value.trim().toLocaleLowerCase('bn-BD').replace(/\s+/g, ' ')
    : ''

const planPatch = (collection, data) => {
  const patch = {}
  const manualReview = []
  const targetSchemaVersion = SCHEMA_VERSIONS[collection] ?? 1

  if (!Number.isInteger(data.schemaVersion) || data.schemaVersion < targetSchemaVersion) {
    patch.schemaVersion = targetSchemaVersion
  }

  const createdFallback = timestampFallback(data.createdAt, data.donatedAt, data.contactedAt, data.date)
  if (!isTimestamp(data.createdAt)) {
    if (createdFallback) patch.createdAt = createdFallback
    else manualReview.push('createdAt')
  }
  if (!isTimestamp(data.updatedAt)) {
    if (createdFallback) patch.updatedAt = createdFallback
    else manualReview.push('updatedAt')
  }

  if (collection === 'users' || collection === 'organizations') {
    const district = typeof data.district === 'string' ? data.district.trim() : ''
    const expectedDivision = DIVISION_BY_DISTRICT[district]
    if (expectedDivision && data.division !== expectedDivision) {
      patch.division = expectedDivision
    }
  }
  if (collection === 'users') {
    const searchName = normalizeSearchName(data.name)
    const district = typeof data.district === 'string' ? data.district.trim() : ''
    const districtSearchName = district && searchName ? `${district}|${searchName}` : ''
    if (data.searchName !== searchName) patch.searchName = searchName
    if (data.districtSearchName !== districtSearchName) patch.districtSearchName = districtSearchName
  }

  return { patch, manualReview }
}

const summarizeFields = (target, patch) => {
  for (const field of Object.keys(patch)) {
    target[field] = (target[field] ?? 0) + 1
  }
}

const reports = {}
let totalPlannedWrites = 0

for (const collectionName of selectedCollections) {
  const snapshot = await db.collection(collectionName).limit(limit).get()
  const fieldChanges = {}
  const manualReview = {}
  const planned = []

  for (const document of snapshot.docs) {
    const { patch, manualReview: fields } = planPatch(collectionName, document.data())
    if (Object.keys(patch).length > 0) {
      planned.push({ ref: document.ref, patch })
      summarizeFields(fieldChanges, patch)
    }
    for (const field of fields) {
      manualReview[field] = (manualReview[field] ?? 0) + 1
    }
  }

  if (apply && planned.length > 0) {
    const batch = db.batch()
    for (const change of planned) batch.update(change.ref, change.patch)
    await batch.commit()
  }

  totalPlannedWrites += planned.length
  reports[collectionName] = {
    scanned: snapshot.size,
    scanLimited: snapshot.size === limit,
    wouldChange: planned.length,
    fieldChanges,
    manualReview,
    applied: apply ? planned.length : 0,
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  projectId,
  mode: apply ? 'apply' : 'dry-run',
  schemaVersions: SCHEMA_VERSIONS,
  perCollectionLimit: limit,
  totalPlannedWrites,
  collections: reports,
  privacy: 'No document IDs or personal field values are included.',
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
