# Testers opinion

The main-menu link opens `frontend/testers-opinion.html`. Each submitted questionnaire appears with its comment, profession, date, and all eight answers. Responses without a comment also appear. Readers can filter by profession and load every page (20 responses per page). English, Russian and Kazakh labels follow the menu's selected language.

The questionnaire explains that new submissions are published anonymously. Earlier private questionnaires remain in storage and in the existing summary; they are not silently made public. Old responses stored only on another device cannot be retrieved from that device by the website.

## Running shared storage

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

**GitHub Pages has no backend.** Until one is connected, responses remain queued on the submitting device, and the review page explains why shared reviews are unavailable. The UI never treats an HTTP error as successful publication. Pending responses retry on the next visit, when connectivity returns, or with the Retry button. A full/unavailable local store is reported if server upload also fails.

## Validation

Backend tests cover restart persistence, concurrent writes, duplicate retries, pagination, filtering, validation, private historical rows and recovery from a damaged record. Browser tests cover cross-visitor visibility, escaped comment text, all answers, offline retry, error recovery, mobile width, scrolling and loading more. All test submissions use temporary files; no test responses are written to production storage.
