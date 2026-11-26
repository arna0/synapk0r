# Hosted review backend validation

Validated on 26 November 2026:

- 20 existing Express backend tests.
- 9 cloud API tests using the production SQL against real SQLite: restart persistence, concurrent duplicate submissions, stable pagination, filters, public/private projection, CORS, payload validation, rate limits, reports, summary, protected deletion and storage failure.
- 14 gameplay/configuration tests.
- 16 Chromium browser tests against the cloud API adapter: all four profession scenes, movement/choreography, restart resource cleanup, reduced motion, phone layout, public reviews from a separate visitor, all answers, HTML escaping, failed-upload retries, loading/pagination, and language switching during slow queued uploads.
- Production bundle, frontend JavaScript syntax, mobile asset sync, and whitespace checks.

The same review browser suite is also checked against the original local Express adapter. The live smoke script verifies hosted D1 health, GitHub Pages CORS, write acknowledgment, duplicate retry, unauthenticated reads and moderation authorization. Its temporary record is removed in a `finally` block.

Scope: browser checks cover scene/input/report integration and tool choreography. They do not claim every possible mini-game path or hardware configuration was tested. Native Android/iOS builds and paid Claude calls are not part of this validation. The hosted backend reports AI disabled and uses existing rule-based feedback.
