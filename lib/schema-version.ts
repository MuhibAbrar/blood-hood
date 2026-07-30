/**
 * Firestore schema version written to new primary records.
 *
 * A version bump must ship with an idempotent dry-run migration before
 * stricter reads or security rules are enabled.
 */
export const CURRENT_SCHEMA_VERSION = 1
