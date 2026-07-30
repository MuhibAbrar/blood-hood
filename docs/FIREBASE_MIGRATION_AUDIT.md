# Firebase migration-readiness audit

Status: in progress  
Safety mode: read-only until an explicitly reviewed migration is approved

## First live audit

- Project audited: `blood-hood-dev`
- Mode: read-only
- Coverage: every current document in the audited primary collections
- Users: 5; UID/document ID mismatches: 0
- Blood requests: 11; invalid statuses: 0
- Donations: 2; both missing `createdAt`
- Organizations: 1
- Notifications: 13
- Duplicate phone groups: 0
- Users missing district: 0
- Existing primary records missing `schemaVersion`: all non-empty collections

Production was not audited because the local Admin credentials point to the dev
project. No production data was read or changed.

## First dev migration result

- Dry-run planned writes: 32
- Manual-review records: 0
- Applied project: `blood-hood-dev`
- Applied writes: 32
- Post-migration dry-run pending writes: 0
- Production writes: 0

The dev migration added only schema metadata, missing historical timestamps
derived from existing timestamps, and division values derived from supported
districts. It did not change donation totals, memberships, request statuses,
names, phone numbers, or other personal values.

## Scope

The audit covers:

- stable Firebase UID usage;
- Firestore collection and field consistency;
- `createdAt`, `updatedAt`, and `schemaVersion` readiness;
- standardized location and status values;
- user–organization relationship consistency;
- duplicate and incomplete record signals;
- direct client-side Firestore access;
- backup/export and rollback readiness.

## Static findings

1. User documents use the Firebase UID as their document ID in current creation paths.
2. No primary collection currently has a consistent `schemaVersion` field.
3. `createdAt` and `updatedAt` are not consistent across all primary entities.
4. Blood-request creation and self profile/availability/token updates now use
   authenticated server APIs. A smaller set of lower-risk operational writes
   still remains in the browser service layer.
5. Organization membership is duplicated between `users.organizations[]` and
   `organizations.memberIds/adminIds`, so reconciliation is required.
6. Status unions exist in TypeScript, but legacy Firestore values still require a
   read-only live audit before enforcement.
7. Location values are centralized for the six supported districts, but legacy
   documents can still be missing division/district fields.
8. The repository has Firestore rules but no checked-in Firestore index
   configuration, reducing reproducibility for a future backend migration.
9. Retention cleanup preserves fulfilled requests and donation history.
10. Managed backup/export is not configured in the repository and needs a
    billing-enabled, tested restore plan.

## Server-side mutation progress

The following sensitive mutations now use authenticated server APIs:

- blood request cancellation;
- camp registration;
- camp create, update, and delete;
- organization create and update;
- organization admin assignment with reverse user-link synchronization;
- camp donation recording as one atomic transaction;
- donation deletion with user, organization, and camp counter reconciliation.

Legacy direct-write security-rule compatibility remains temporarily enabled for
older cached PWA clients. Rules should only be tightened after the new API
version is stable in production.

The latest server-side migration step also covers:

- new blood-request creation, with server-owned requester identity, district,
  timestamps, status, expiry, and validation;
- a user's own profile, availability, and notification-token updates, with
  server-side field allowlisting and location validation.

## Static client-access audit

```powershell
node scripts/audit-client-firestore.mjs
```

This source-only command reports pages/components that import the browser
Firestore SDK directly and flags direct write primitives. It does not connect
to Firebase or consume Firestore quota.

## Server-side read progress

Donor list/search now uses an authenticated API with:

- account-district enforcement on the server;
- a hard maximum of 50 donors per request;
- 50-donor pages in the main donor screen;
- cursor-based pagination instead of offsets;
- a fresh randomized starting point for each new donor-page visit, with
  duplicate-free continuation through “আরো দেখুন”;
- district-wide normalized name-prefix search, independent of the donors
  already loaded on screen;
- server-side blood group, upazila, and availability filters;
- compatible blood-group filtering for request assistance;
- no phone number, FCM token, or profile photo in list responses.

The previous 500-document donor page fetch has been removed.

User documents use schema version 2 and include `searchName` plus
`districtSearchName`. The bounded migration was applied to the dev project
only; its post-migration dry-run reported zero pending user updates.

## Read-only audit command

```powershell
node scripts/audit-firestore.mjs
```

The command uses aggregation counts plus a bounded sample (default 200,
maximum 500 per collection). It does not write or delete data and does not
print personal record values.

## Dry-run migration command

```powershell
node scripts/migrate-firestore-schema.mjs
```

Dry-run is the default. It reports planned field changes without writing data.
The tool is bounded to 200 documents per collection by default and never
accepts a value above 500 in one run.

Apply mode requires the exact Firebase project ID:

```powershell
node scripts/migrate-firestore-schema.mjs --apply --confirm-project=blood-hood-dev
```

For any project whose ID does not contain `dev`, apply mode is blocked unless
`--backup-confirmed` is also supplied. This is a safety gate, not a substitute
for verifying a real, restorable backup.

## Safe implementation order

1. Capture and review the live read-only report.
2. Add shared schema-version and timestamp conventions to new writes.
3. Move sensitive and relationship-changing writes behind authenticated APIs.
4. Add dry-run migration endpoints/scripts that report intended changes.
5. Export/backup and verify restore before any bulk migration.
6. Migrate in bounded batches with idempotency and progress checkpoints.
7. Re-run the audit and only then enforce stricter schemas.

## Production safeguards

- Never mutate production data from a preview deployment.
- Never run a migration without a dry-run count and explicit approval.
- Never log names, phone numbers, FCM tokens, or OTP data in audit output.
- Keep every migration idempotent and resumable.
- Preserve Firebase UID as the permanent external user identity.
