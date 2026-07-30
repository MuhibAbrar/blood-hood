# Free-tier read usage audit

Audit date: 2026-07-30

This is a code-path estimate, not a billing statement. Actual usage depends on
daily active users, pages opened, record counts, retries, and cached sessions.

## Current free-tier constraints

- Firestore: 50,000 document reads/day, 20,000 writes/day, and 1 GiB storage.
- Vercel Hobby: 1,000,000 function invocations/month plus compute and memory
  limits.

## Highest-impact findings

1. The donation follow-up component queried Firestore every minute while the
   app remained open. It now checks at most once per six hours per account and
   re-checks on focus only after that interval.
2. Blood-request lists read up to 100 documents per fresh page load.
3. The donor screen reads up to 51 donor documents plus authentication/context
   reads for each initial 50-person page.
4. The dashboard uses one Vercel invocation and several bounded Firestore
   aggregation/recent-request queries per load.
5. Organization, camp, blood-request, social-link, and helpline reads now have
   short in-memory deduplication/TTL caching inside a browser session. Mutations
   invalidate the relevant cache.

## Approximate 1,000 daily-active-user model

Assuming every user starts one fresh authenticated session and opens the
dashboard once:

- authentication/membership/profile setup: roughly 6,000 reads/day;
- dashboard counts and recent cards: roughly 15,000 reads/day at the current
  small collection sizes;
- follow-up eligibility check: roughly 1,000 reads/day;
- baseline total: roughly 22,000 reads/day.

Optional page usage changes the result substantially:

- one donor-page visit by every user: about 51,000+ additional reads/day;
- one request-list visit by every user: up to 100,000 additional reads/day;
- organization and camp lists add the number of returned documents per fresh
  client session.

Therefore 1,000 registered users can fit the free tier when only a smaller
portion is active each day, but 1,000 daily active users using donor/request
search normally will not reliably remain under Firestore's free read quota.
Firestore reads are expected to become the first limit before Vercel function
invocations.

## Operating thresholds

- Warning: 30,000 Firestore reads/day (60%).
- Action required: 40,000 reads/day (80%).
- Warning: 600,000 Vercel invocations/month (60%).
- Action required: 800,000 Vercel invocations/month (80%).

Before reaching the Firestore threshold, the next optimization should be a
district/status paginated request list (20-30 records per page) and careful
measurement of donor-page usage. Do not move every read to Vercel merely to
reduce client SDK usage; that consumes both Firestore reads and Vercel
invocations.
