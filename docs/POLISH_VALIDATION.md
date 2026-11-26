# Motion, performance and tester reviews

Changes are based on `c579679` and preserve the current purple/lavender homepage design.

## Changes checked

- Pointer-responsive hero depth, independent floating panels, hover motion and offscreen animation pausing. Reduced-motion preferences retain visible controls and disable decorative loops.
- Smooth reach/retract hand motion, lifted tool transfers, tamping, pouring and gradual cup filling. IT/Doctor transfers use the same cancellable motion helper. The breaker and valves turn smoothly; gauge damping is independent of display refresh rate.
- Old room geometries, materials and textures are disposed on replacement. The main render loop also updates the character; its redundant animation loop is removed. Hidden tabs and the menu stop scheduling scene frames. Labels/raycast work runs at most 30 times per second. Pixel ratio and shadow-map costs are bounded on smaller/slower devices.
- New public review page with all eight survey answers, comments, module filters and pagination. Anonymous public disclosure appears before submission. Upload acknowledgements, persistent local queue, safe retries, server restart persistence and safe text rendering are covered by tests.

## Resource comparison

A local Chromium run used software WebGL at a 1280 × 720 viewport. Both versions opened Barista three times, waiting for room enhancement before each sample. These are allocated resource counts, not bytes or a claim about hardware FPS.

| Run | Previous geometries | Updated geometries | Previous textures | Updated textures |
| --- | ---: | ---: | ---: | ---: |
| First | 111 | 69 | 33 | 34 |
| Second | 168 | 69 | 61 | 34 |
| Third | 224 | 69 | 85 | 34 |

The repeated-room leak is removed in this check. The browser regression also confirms no further render calls after returning to the menu, and that rendering resumes when entering another profession.

## Final result

Local validation passed: **20 backend tests, 11 gameplay/motion tests, and 15 Chromium browser tests** (46 total). All frontend scripts passed syntax checks; `git diff --check` and Flutter asset synchronization also passed. Desktop and 390 px phone screenshots were inspected. The final browser suite completed in 2.9 minutes with one worker.

## Commands

```sh
npm ci --prefix backend
npm test --prefix backend
node --test frontend/test/*.test.mjs
for f in frontend/js/*.js; do node --check "$f" || exit 1; done
npm install --no-save --no-package-lock @playwright/test@1.56.1
npx playwright install chromium
npx playwright test --workers=1
node scripts/sync-frontend.mjs
```

The choreography test isolates changed tool transfers by completing skill-check callbacks immediately. It does not claim to play all fifteen mini-games to a successful score. Browser checks also exercise ordinary module starts, guided Barista input, cancellation, layout, cross-visitor reviews, offline retry, pagination and mobile scrolling. AI tests use mocked responses and rule-based fallback; no paid live Claude call is made. Flutter asset synchronization is checked, but a native Android/iOS runtime is not available here.

Shared reviews on the public GitHub Pages demo require a hosted backend. No backend deployment is included in this change, as requested. See [review storage](REVIEW_STORAGE.md).
