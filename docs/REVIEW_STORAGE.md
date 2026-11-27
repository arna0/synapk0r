# Testers opinion

The main-menu link opens `frontend/testers-opinion.html`. Questionnaires whose authors explicitly opt into publication appear with their comment, profession, date and eight answers. Private responses are excluded. Readers can filter by profession and load every page (20 responses per page). English, Russian and Kazakh labels follow the menu's selected language.

New submissions are private feedback to the project team by default. A separate unchecked checkbox allows anonymous public publication of all answers and the comment. The local queue records upload consent independently of publication consent, preserving the choice through retries. Historical private device-only rows without upload consent stay on that device.

## Hosted shared storage

The public GitHub Pages site connects to the managed database backend. See [HOSTED_BACKEND.md](HOSTED_BACKEND.md) for production endpoints, schema, deployment, and moderation. The hosted database persists across code deployments and is separate from local JSONL files.

## Running local storage

```sh
npm ci --prefix backend
npm start --prefix backend
```

Open `http://localhost:8787`. The same Express server serves the game, review page and API:

- `POST /api/survey` validates and saves a response. A stable submission ID makes retries idempotent.
- `GET /api/reviews?page=1&module=barista` returns public responses, newest first. Omit `module` for all professions.
- `GET /api/survey/summary` retains the existing aggregate summary, including older private questionnaires.

Responses append to `backend/data/survey.jsonl`, which is excluded from git. Writes are serialized, flushed to disk, and acknowledged before the UI reports publication. Reads use an in-memory cache. Restarting reloads the file, skipping damaged lines without losing subsequent valid records.

Run **one backend process** and put `SURVEY_FILE` on a persistent, writable data volume, for example `/var/data/synapkor/survey.jsonl`. Back up this file. Ephemeral serverless filesystems are unsuitable for this adapter; multiple server instances need a shared database adapter instead.

For a separately hosted backend, add its origin to `ALLOWED_API_ORIGINS` in `frontend/js/config.js`, set the server's `ALLOWED_ORIGINS` to the frontend origin, and open the game with `?api=https://your-backend`. Navigation to the review page preserves this configuration. Hosting the frontend through Express works without extra configuration.

GitHub Pages serves the frontend and calls the hosted API for shared storage. During an outage, responses remain queued on the submitting device. The UI never treats an HTTP error as successful publication. Pending responses retry on the next visit, when connectivity returns, or with the Retry button. A full/unavailable local store is reported if server upload also fails.

## Validation

Backend tests cover restart persistence, concurrent writes, duplicate retries, pagination, filtering, validation, private historical rows and recovery from a damaged record. Browser tests cover cross-visitor visibility, escaped comment text, all answers, offline retry, error recovery, mobile width, scrolling and loading more. All test submissions use temporary files; no test responses are written to production storage.
