# Learning quality and language repair implementation plan

**Goal:** Implement the actionable gaps from the approved review, prioritising readable, fully localised practice progress.
**Architecture:** Keep the existing static Three.js client, add bounded local learning records and portable exports, and preserve current assessment rules. Keep classroom work local until a school identity/storage policy exists.
**Tech stack:** Vanilla JS/CSS, Node tests, Playwright, Flutter, existing Express and Cloud APIs.
**Spec:** The user's approved eight-point review and request to repair layout and translations.

## Constraints and decisions
- RU, EN and KK must render correctly on first load and language changes.
- Preserve v1/v2 saved progress and private-by-default feedback.
- Practice drills must never count as completed assessments.
- Do not invent clinical validation, model permissions, source licensing, or assessment authenticity.
- Implement native in this existing isolated checkout to economise tokens. Publishing after CI is already authorised.

## Review focus
- Existing progress, legacy records and language switching: all labels update without merged text.
- Malformed imports and storage quota: no loss of saved data; bounded, sanitised, idempotent merge.
- Background tab and manual pause: timers, animation and actions cannot advance.
- Drill completion: no changes to assessment score or completed attempt count.
- Offline Android: local report remains available; uploads need explicit consent and a configured endpoint.

## Tasks
- [x] 1. Reproduce locale/layout regressions in browser tests; repair rendering order and dynamic language refresh. Add shared responsive attempt cards and missing game translations.
- [x] 2. Add bounded attempt-level history (skills, case/scoring version, mode, assistance, timing), safe JSON merge/backup and CSV export. Test malformed/duplicate imports and migrated records.
- [x] 3. Add a local classroom assignment builder with shareable links, optional non-identifying class code, and teacher CSV collection. Test generated links and export safety.
- [x] 4. Add sound, sensitivity, untimed practice and real pause/resume; background automatically pauses. Test game clock and browser interaction. Preserve controls and active exercises.
- [x] 5. Add targeted practical drills from weak report components, with separate practice history and no assessment credit. Vary answer positions and repeat case selection where supported.
- [x] 6. Configure Android release API and test CORS/config paths; add clear privacy/data removal controls, moderation instructions and tested recovery/pilot protocols.
- [ ] 7. Update README and release notes, run logic/API/browser/build checks, review branch, push, merge after CI, verify public assets and APK.

External work remains: recruit practitioners and learners, collect validation data, select a source licence, and establish school account/privacy requirements before hosted classroom accounts or credentials.

Verification ledger: 51 frontend logic tests and 37 Express/D1 tests; focused browser reports/classroom/settings/progress and drills passed. Final recovery/browser CI and public deployment remain in task 7. Review findings on pause, live language switching and resumed IT scene state were addressed with regressions. Checkpoint coverage is IT/Doctor; broader resume and external validation remain explicit limitations in the README.
