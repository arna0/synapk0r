# SynapKor hosted backend

The GitHub Pages client connects to `https://synapkor-api.epictitan2048.chatgpt.site` automatically. The hosted Worker (`cloud/worker.js`) stores reviews in a managed D1 database. Redeploying code preserves records. `.openai/hosting.json` identifies the project and `DB` binding and contains no credentials. The schema and immutable migrations live in `cloud/schema.js` and `drizzle/`.

## Endpoints

- `GET /api/health`: checks the review table is reachable.
- `POST /api/survey`: validates all eight answers, saves once per submission ID, acknowledges after the database write. Retries don't create duplicate reviews.
- `GET /api/reviews?page=1&module=barista`: public responses, newest first, 20 per page. Pass the returned `snapshot` on later pages to avoid shifts from new submissions. Omit `module` for all professions.
- `GET /api/survey/summary`: aggregate counts without comments or raw sessions.
- `POST /api/report`: existing rule-based feedback. No paid AI key is configured on this host; health reports `ai: false` and the frontend keeps its localized scenario debrief.
- `DELETE /api/reviews/:id`: protected moderation, requiring `Authorization: Bearer <REVIEW_ADMIN_TOKEN>`. Configure this secret only in the host environment. Deletion is permanent; use the exact ID.

Public responses omit score, errors and completion time. Only submissions made under the public disclosure (`publish: true`) appear. Queued public responses retry from their original device on a later visit. Earlier private responses are not silently published, and device-only data cannot be recovered from other devices.

## Limits

Writes accept JSON up to 32 KiB, use bound SQL parameters, and share a durable limit of 20 requests per IP per minute. Short-lived hashed rate-limit keys are cleaned on subsequent writes. The server-only `RATE_LIMIT_PER_MIN` configures the limit. Public reads are separate. CORS allows GitHub Pages, the backend's own origin, and local development on port 8787. Comments render as text.

Anonymous submissions cannot prove a completed simulation or prevent every form of spam. The protected removal endpoint supports moderation. A larger public launch should add a challenge service and a moderation workflow. Hosting and database quotas still apply.

## Development

Use Node 24 for the SQL adapter:

```sh
npm ci
npm ci --prefix backend
npm test --prefix backend
npm run test:cloud
npm run test:game
npm run build
npx playwright install chromium
TEST_CLOUD=1 npm run test:browser
```

On PowerShell set `$env:TEST_CLOUD='1'` before the browser command. Cloud preview runs production Worker code against isolated SQLite. Ordinary Express development remains available with `npm start --prefix backend`; its JSONL file is a separate store.

Run `npm run db:generate` after schema changes and inspect/commit generated SQL and metadata. Never rewrite applied migrations. Publish through the hosting project's source/version flow; the host applies migrations before deploying. A GitHub push alone does not update this separately hosted API. Frontend updates continue through GitHub Pages.
