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

## Relationship consistency audit

- Project: `blood-hood-dev`
- Audit date: 2026-07-30
- Mode: read-only
- Coverage: all current users, organizations, blood requests, donations,
  camps, and join requests
- Extra point-reference reads used: 0
- Unresolved references: 0
- Missing referenced records: 0
- User/organization reverse-link mismatches: 0
- Invalid request/donation/camp/join-request relationships: 0
- Direct browser-side Firestore write files: 0

No Firebase records were changed by this audit.

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
4. Active browser-side Firestore writes have been removed from registration,
   organization membership, announcements, blood requests, profile/settings,
   notifications, camps, and donation flows. These mutations now use
   authenticated server APIs.
5. Organization membership is duplicated between `users.organizations[]` and
   `organizations.memberIds/adminIds`, so reconciliation is required.
6. Status unions exist in TypeScript, but legacy Firestore values still require a
   read-only live audit before enforcement.
7. Location values are centralized for the six supported districts, but legacy
   documents can still be missing division/district fields.
8. Firestore rules and the composite indexes required by the current app
   queries are checked into the repository, making query infrastructure
   reproducible in another Firebase project.
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

Dev security rules now deny browser-side writes for all application
collections. Authenticated reads remain available where current screens still
use the browser SDK. The stricter rules are validated on dev first; production
rules must only be deployed together with the tested app version so an older
cached PWA is not left on a partially migrated write path.

The latest server-side migration step also covers:

- new blood-request creation, with server-owned requester identity, district,
  timestamps, status, expiry, and validation;
- a user's own profile, availability, and notification-token updates, with
  server-side field allowlisting and location validation;
- single and bulk notification read-state updates, with server-enforced
  notification ownership;
- social-link and helpline setting writes, restricted to authenticated platform
  admins and validated on the server.
- registration profile creation with server-derived division/search fields;
- organization-admin manual member addition with district and single-membership
  enforcement;
- organization announcement creation/deletion with organization-admin
  authorization and bounded text validation.

## Static client-access audit

```powershell
node scripts/audit-client-firestore.mjs
```

This source-only command reports pages/components that import the browser
Firestore SDK directly and flags direct write primitives. It does not connect
to Firebase or consume Firestore quota.

## Free-tier read audit

See `docs/FREE_TIER_READ_USAGE_AUDIT.md` for the current 1,000-daily-active-user
model, high-read paths, and operating thresholds. The minute-by-minute donation
follow-up query has been replaced with a six-hour per-account check, and common
list/settings reads use short client-side deduplication caches.

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

The main blood-request list also uses an authenticated, account-district
enforced API with 30-document cursor pages. Status and blood-group filters run
in Firestore before pagination, and the next page is only read after the user
presses “আরো দেখুন”.

User documents use schema version 2 and include `searchName` plus
`districtSearchName`. The bounded migration was applied to the dev project
only; its post-migration dry-run reported zero pending user updates.

## Read-only audit command

```powershell
node scripts/audit-firestore.mjs
```

The command uses aggregation counts plus a bounded sample (default 200,
maximum 500 per collection). It also checks sampled user/organization,
request, donation, camp, and join-request references. Additional point reads
are capped at 200 by default and can be lowered:

```powershell
node scripts/audit-firestore.mjs --sample=100 --max-reference-reads=100
```

It does not write or delete data and does not print personal record values or
document IDs.

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
