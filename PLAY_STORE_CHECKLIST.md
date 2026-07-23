# Blood Hood — Google Play production checklist

Last reviewed: 2026-07-23

## Completed in the app

- Public privacy policy: `https://bloodhood.pro.bd/privacy-policy`
- Public account deletion: `https://bloodhood.pro.bd/delete-account`
- In-app account deletion from Profile
- Privacy Policy links in registration consent, Profile, About, and account deletion flows
- Notification permission is requested only after the user presses an explicit enable button
- No precise/background location, camera, microphone, contacts, SMS, or storage access is used by the web app

## Data Safety form — proposed declarations

These answers must be checked again against the final Android wrapper and every SDK included in the uploaded AAB.

### General

- Does the app collect or share user data? **Yes**
- Is all user data encrypted in transit? **Yes** (HTTPS/Firebase transport)
- Can users request deletion? **Yes**
- Account deletion URL: `https://bloodhood.pro.bd/delete-account`
- Data is sold? **No**
- Third-party behavioral advertising? **No**

### Data types collected

| Play data category | Blood Hood data | Purpose | Required? |
|---|---|---|---|
| Personal info — Name | Donor/requester name | Account management, app functionality | Yes |
| Personal info — Phone number | Login, donor contact, blood request contact | Authentication, account management, app functionality | Yes |
| Personal info — User IDs | Firebase UID | Account management, security | Yes |
| Health and fitness — Health info | Blood group, donation history, availability | Donor matching and blood donation features | Yes |
| Approximate location | User-selected district/upazila/area (not GPS) | Nearby donor/request matching | Yes |
| App activity — Other user-generated content | Blood requests, organization join requests, announcements | App functionality | Feature-dependent |
| App activity — Other actions | Donor contact events, request responses | App functionality, fraud prevention, service integrity | Feature-dependent |
| Device or other IDs | Firebase Cloud Messaging token | Push notifications | Optional |

### Sharing/processing notes

- Firebase processes authentication, Firestore, and Cloud Messaging data as a service provider.
- Vercel processes hosting requests and operational logs as a service provider.
- Donor/request contact details may be displayed to other users where necessary for the core blood-matching feature; declare this consistently with Play Console's current definition of “sharing.”
- No advertising SDK is currently present in this repository.

### Retention and deletion

- Active account/profile data is retained while the account is active.
- Account deletion removes authentication, profile, notification token, contact activity, and organization/camp membership.
- Open requests are removed from public use.
- Historical fulfilled requests/donations may be retained only after personal identifiers are anonymized, as described in the Privacy Policy.

## Health Apps declaration

- The app provides health-related functionality.
- Declare the blood donation/donor matching feature accurately in the Play Console Health Apps form.
- The app is not a hospital, blood bank, diagnostic tool, treatment provider, or medical device.
- Store listing and in-app descriptions must not claim medical diagnosis, treatment, or guaranteed blood availability.

## Android release project still required

This repository contains the Next.js PWA, but no Android project (`AndroidManifest.xml`, Gradle project, package name, signing configuration, or AAB build).

Before publishing:

1. Create the production Android wrapper (normally a Trusted Web Activity for `bloodhood.pro.bd`).
2. Choose the permanent package name.
3. Add and verify Digital Asset Links at `/.well-known/assetlinks.json`.
4. Set current Play-required target SDK and compile SDK.
5. Request only `INTERNET` and notification permission if the wrapper actually needs it; do not add location, contacts, SMS, call log, camera, microphone, or storage permissions.
6. Configure production signing and Play App Signing.
7. Generate a signed `.aab`.
8. Test install, login, OTP, notification opt-in, account deletion, offline behavior, and external phone links on a physical Android device.
9. Complete Data Safety, Health Apps, Content Rating, Target Audience, App Access, Ads, and Account Deletion sections in Play Console.
10. Upload store listing assets and submit to a testing track before production rollout.
