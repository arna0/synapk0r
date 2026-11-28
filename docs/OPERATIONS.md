# Feedback operations and recovery

## Deployment order

The owner must apply every SQL migration in `drizzle/`, including `0001_wild_raza.sql`, through the hosting platform migration mechanism **before** serving this Worker version. The new nullable `reviews.delete_token_hash` column preserves existing feedback; old rows have no owner deletion key and remain admin-only. Do not reapply the initial migration against an existing database. Check migration status in the host and verify `PRAGMA table_info(reviews);` includes the new column.

Deploy the API bundle built by `node scripts/build-cloud.mjs`, and publish frontend assets including `moderation.html`, `js/moderation.js`, and `js/privacy.js`. The home page loads privacy.js after survey.js and contains `#privacyTools`. Keep the D1 binding named `DB`. This repository does not automatically provision or rotate a production moderation secret.

Set a randomly generated, private `REVIEW_ADMIN_TOKEN` in the Worker hosting secret store, or the Express process environment. Never commit it, put it in a URL, embed it in mobile/frontend builds, or save it in localStorage. Rotate it in the host if exposed. The operator opens `frontend/moderation.html` on the published static site, enters the secret for that page session, and clears it or closes the page after use.

After deployment, check `/api/health`, create a clearly marked disposable feedback submission, confirm public/private visibility matches its consent, delete it from My feedback and data, and verify the public list and summary no longer count it. Check a second DELETE confirms an already absent row. Exercise an Android file/appassets build against the real API: its Origin is `null` or `https://appassets.androidplatform.net`. These anonymous APIs intentionally allow those origins without credentials; arbitrary HTTP origins remain blocked. CORS is not the deletion authorization mechanism.

## Access and moderation

New feedback gets a cryptographically random 256-bit deletion capability. Its device receipt contains the raw key; the server stores only its SHA-256 hash. Receipt JSON is private and anyone with its key can delete that response. Public review responses expose neither keys nor hashes. Duplicate submission IDs do not replace the existing key or feedback. Old local private answers without upload consent are never automatically uploaded.

In My feedback and data, Download my receipts exports this device's saved feedback and deletion keys. Delete asks for confirmation, stops retries first, waits for an existing upload, and requests deletion. If the network fails, the UI retains the receipt marked deletion pending and explicitly says server deletion is unconfirmed. It never resumes upload of that row. A later explicit Delete retries the request. An absent server record is a successful no-op, so a response that never left the device can also be removed. Clearing browser/app data removes device keys; it does not delete already uploaded feedback.

The moderation page lists only public feedback and can delete an exact submission ID for a private or old response. Ask the requester for the submission ID from their private receipt; do not request a public posting of their receipt or key. Confirm the ID and requested deletion, enter the owner secret, delete once, and check the response and public totals. The secret is kept only in page memory and sent in the Authorization header. Deleting is permanent; there is no undo or soft-delete archive.

Express uses a single-process, serialized JSONL store. Set `SURVEY_FILE` to a persistent, access-restricted volume and run one writer process per file. Removal writes a same-directory temporary file, syncs it, then atomically replaces the original before acknowledging. Do not use independent Express processes against one file. D1 uses the primary database session and parameterized DELETE. Device requests are rate limited; retry after a minute if limited.

## Retention and backups — owner actions

There is **no automatic feedback expiry or automatic backup job** in this repository. The operator must choose and disclose a retention period before collecting real feedback. For a limited pilot, review data monthly and erase it when the pilot ends or the declared period expires. Use the moderation endpoint for individual requests. For a full pilot purge, pause writes, confirm the owner's intended scope, and delete feedback in the host database console (or replace the offline Express file with an empty one while the process is stopped). Do not count database backups as active published feedback.

Before a migration or destructive maintenance, take a protected host D1 export or copy the stopped Express `SURVEY_FILE`. Store it outside the public/static directory, restrict access to the owner, encrypt backups at rest, record the export time, and expire them under the same disclosed retention policy. Backups include private answers/comments and deletion hashes. Never place them in Git, Pages, downloadable assets, logs, or issue attachments. Device receipt exports are the player's responsibility and contain stronger secrets than server exports.

## Recovery — explicit runbook

1. Pause writes or route traffic to a maintenance response. Save the failing deployment version and a protected copy of the current database/file; do not overwrite the only surviving copy.
2. Restore service code/schema into an isolated database or private directory first. Apply production migrations in journal order once. For Express, start a separate process with a separate restored file; never run recovery and production against one file.
3. Verify health, record counts and expected visibility using disposable test feedback. Confirm delete authorization, public omission of private rows and deletion persistence across restart. Keep restored feedback quarantined until the deletion check below is resolved.
4. A historical backup can resurrect feedback deleted after export. Reconcile against the current authoritative database's surviving IDs and any protected owner deletion record. Do not import/publish a backed-up row merely because it existed in the backup. If authoritative state is lost and prior deletions cannot be established, restore the service with an empty feedback table and keep the backup private until renewed consent or owner verification permits specific rows. Do not undo a self-service deletion during recovery.
5. Switch traffic only after the restored service and data policy have been checked. Remove temporary exports and quarantined rows when their retention window expires. Record the operator, time, migration version, checks and outcome without logging deletion capabilities or moderation secrets.

These are operational instructions, not a claim that production backups, secret rotation, Android network verification or disaster recovery have already been performed.

## Verification for this change

The local automated checks execute production SQL migrations against SQLite through the D1 result adapter. They do not replace a production migration/Android smoke check. Commands from the repository root:

- `node --test backend/test/*.test.js cloud/test/*.test.mjs` — API validation, token hashing, ownership, admin moderation, durable removal, concurrent write noninterference, migration compatibility and Android CORS.
- `node --test frontend/test/privacy.test.mjs` — receipt entropy, consent-safe queue handling, upload/delete ordering, offline deletion recovery and memory-only moderation secrets.
- `node --check frontend/js/survey.js`, `node --check frontend/js/privacy.js`, `node --check frontend/js/moderation.js` — browser script syntax.
- `node scripts/build-cloud.mjs` — Worker bundle build.
