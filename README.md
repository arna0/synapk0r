# SynapKor: a 3D career simulator with skills assessment

**Shared tester reviews:** the public site connects automatically to the hosted database API. [Testers opinion](https://arna0.github.io/synapk0r/frontend/testers-opinion.html?lang=en) shows submissions across devices. [Backend operation and testing](docs/HOSTED_BACKEND.md).

**VentureHack 2026 · Track 2: EdTech and the future of education**
Track focus areas: *career guidance and exploring career paths · skills development and vocational training · interactive hands-on environments · assessment and feedback*.

🇬🇧 English · [🇷🇺 Русский](README.ru.md)

- **Live demo (runs in the browser, nothing to install):** https://arna0.github.io/synapk0r/
  - jump straight into a module: [IT engineer](https://arna0.github.io/synapk0r/frontend/?module=it) · [Doctor](https://arna0.github.io/synapk0r/frontend/?module=doctor) · [Safety engineer](https://arna0.github.io/synapk0r/frontend/?module=safety) · [Barista](https://arna0.github.io/synapk0r/frontend/?module=barista) · [in English](https://arna0.github.io/synapk0r/?lang=en) · [in Kazakh](https://arna0.github.io/synapk0r/?lang=kk)
  - The frontend runs on GitHub Pages and shared reviews use a hosted database API. Debriefs remain rule-based; Claude requires a separately configured AI key (section 6).
- **Android app:** [download SynapKor.apk](https://github.com/arna0/synapk0r/releases/download/android-latest/SynapKor.apk), all four professions, rebuilt automatically on every change
- **Code:** https://github.com/arna0/synapk0r
- **Demo video (60 seconds, narrated):** [docs/demo.mp4](docs/demo.mp4): the IT module from the alert to the report, the Kazakh interface, and the career path

---


## Learning quality update — 28 November 2026

- Readable attempt cards and complete RU/EN/KK game dictionaries; saved progress refreshes when switching language.
- Detailed history for the latest 120 completed shifts, retaining lifetime counts. JSON backup/merge and spreadsheet-safe CSV export preserve mode, skills, case, scoring version and assistance.
- Local classroom assignment links and multi-file result collection work without student accounts or server upload. Scores remain client-reported practice evidence.
- Targeted drills practise a weak practical skill without changing the original assessment. IT drills vary the incident case. Final decision positions are shuffled.
- Pause/settings stop active timers and exercises; hidden tabs pause automatically. Master sound, camera sensitivity and untimed decisions are available.
- IT and Doctor resume from completed-stage checkpoints. An interrupted mini-game restarts; Safety and Barista currently require a new shift after a reload.
- Android release builds configure the hosted API. Offline exercises and local reports remain available.
- New feedback receipts support token-based deletion. The owner has a moderation page; publication still requires separate opt-in. [Operations and recovery](docs/OPERATIONS.md).

[Classroom and validation protocol](docs/VALIDATION_PROTOCOL.md) describes the next real pilot. Practitioner review, stronger learning evidence, a source licence and verified assessment credentials remain pending.

## Report redesign — 27 November 2026

[Open the public simulator](https://arna0.github.io/synapk0r/) · [Download the Android APK](https://github.com/arna0/synapk0r/releases/download/android-latest/SynapKor.apk)

Anyone can access the website through the link, without registration or installation.

- Four professions cover Safety engineer, Barista, IT engineer and Doctor, with Russian, Kazakh and English interfaces.
- Redesigned desktop and phone reports show the profession, attempt outcome, skill evidence, metrics and a specific next step. Practice-needed outcomes use amber styling, and optional feedback opens on demand.
- Practical exercises contribute to the score. Guided and independent progress are stored separately, with previous results retained in an archive.
- Three IT incident causes have matching evidence and repairs. Recovery requires both a readiness check and a persisted test order.
- Live voltage in the Safety exercise requires stopping work, escalation, isolation acknowledgement and a fresh verification.
- Survey feedback is private by default. Public publication requires a separate opt-in, which is preserved through offline retries.
- Characters and hands use original procedural geometry. Mini-games support keyboard input, focus management and textual alternatives.

These changes were implemented in [PR #2](https://github.com/arna0/synapk0r/pull/2) and [PR #3](https://github.com/arna0/synapk0r/pull/3). Verification covers all four profession reports on desktop and phones, private-feedback behavior, gameplay scenarios and Android compilation.

The Doctor scenario awaits practising-clinician review. Scores describe a practice attempt; calibration against professionals remains future work. The owners still need to select a source-code license. [Asset provenance and professional-review status](docs/ASSETS_AND_REVIEW.md).

## Animation and tester reviews

The menu now has pointer-responsive depth, layered motion and reduced-motion support. Tool transfers, hand reaches, valves and gauge response use elapsed time, and leaving a simulation cancels pending transfers. Old room resources are released when restarting or switching professions, with rendering paused in the menu and hidden tabs.

**[Testers opinion](frontend/testers-opinion.html)** shows anonymous questionnaires from the hosted database, with profession filtering and pagination. Failed uploads remain queued on the device. GitHub Pages connects automatically to the hosted API; local Express development keeps a separate JSONL store. See [storage and connection setup](docs/REVIEW_STORAGE.md).

## 1. Problem

When choosing a career, a school or university student usually relies on descriptions, tests and other people's stories. They only find out what the job is actually like once they have already spent years studying or have started working.

Employers face the other side of the same problem:
- **Onboarding is expensive and risky.** A newcomer learns on real equipment and real customers: they waste materials, make mistakes with guests, and in industry they break safety rules.
- **Checking skills before hiring is subjective.** An interview shows how a person talks about the work, not how they do it.
- **Safety briefings are often a formality.** The person signs the logbook but has never actually performed the sequence of steps in practice (for example, LOTO: locking out equipment before repair).

**What the data says (desk research):**
- According to the OECD (PISA 2018, the *Dream Jobs?* report), **47% of boys and 53% of girls** aged 15 expect to work in one of just **10 occupations**: their picture of the world of work is narrow ([OECD / Kappan](https://kappanonline.org/teenagers-dream-jobs-career-oecd/)).
- In Kazakhstan, according to the Ministry of Science and Higher Education, the share of engineering graduates working in their field has fallen for the third year in a row: **75% → 72% → 69%** (2023–2025) ([BES.media, 2026](https://bes.media/news/dolya-rabotayuschih-po-spetsialnosti-vypusknikov-inzhenerov-snizhaetsya-tretiy-god-podryad/)).
- According to a study by the Atameken National Chamber of Entrepreneurs (2018), about **35%** of university graduates do not work in their field ([informburo.kz](https://informburo.kz/stati/60-vypusknikov-vuzov-ne-rabotayut-po-professii-pochemu-tak-proishodit.html)).

**User test (23–24 Sept 2026, 7 participants):** 86% completed the simulation without help, 100% learned something new about the profession, all 7 want to try other professions; clarity was rated 4.86 out of 5. The hypothesis "people have a poor idea of the job before playing" was not confirmed on this sample (43% against a 60% threshold), since almost half of the participants were already university students. Details and screenshots are in [docs/VALIDATION.md](docs/VALIDATION.md).

## 2. Target audience

| Segment | What they get |
|---|---|
| **School students in grades 8–11 and college students** | Try a profession "from the inside" in 5 minutes and get a clear report on their strengths |
| **School psychologists, career guidance centres, colleges** | A hands-on tool for career guidance lessons instead of tests alone |
| **Employers (HoReCa, manufacturing)** | Training and checking newcomers' basic skills before their first shift |

## 3. Solution

SynapKor is a first-person 3D simulator that runs in the browser. The user performs real work tasks, and the system records their actions and builds a skills report.

**Module 1. Safety engineer (LOTO, 380 V switchboard)**
Prepare the equipment for repair in the correct order:
1. put on PPE;
2. switch off the breaker;
3. attach the LOTO lock;
4. check with a multimeter that there is no voltage;
5. release the pressure with two valves.

Breaking the order (for example, touching the breaker without gloves) counts as a safety violation.

**Module 2. Barista (HoReCa)**
Three tasks test three kinds of skills:
- **Hard skills:** an Iced Oat Latte following a 6-step recipe card.
- **Soft skills:** responding to an unhappy guest.
- **Management:** calculating the weekly coffee bean order.

**Module 3. IT engineer (on call, server room)**
The online store has stopped loading. You need to:
1. work through the incident in 6 steps: monitoring alert → logs → server db-01 → plug back the disconnected cable → restart the service → check the metrics;
2. **Hard skills:** find a bug in the code (`ZeroDivisionError` on an empty list) and choose the correct fix;
3. **Soft skills:** explain the outage to the store manager without jargon.

**Module 4. General practitioner (patient appointment)**
A patient with a cough and fever. You need to:
1. examine the patient in 6 steps: medical record and complaints → hand hygiene → temperature → oxygen saturation → blood pressure → listening to the lungs (readings appear on the monitor in the office);
2. **Hard skills:** make a clinical decision (refer for an X-ray and blood test, rather than send the patient home or prescribe antibiotics blindly);
3. **Soft skills:** answer the worried patient honestly and with care.

The scenario is simplified and for learning only. It is not medical advice.

**Built-in guide for beginners**
- intro screen: the goal and the plan;
- a "what to do now / how / why" panel;
- labels above objects and an arrow above the right one;
- an edge-of-screen pointer when the target is out of view;
- a hint when the wrong object is selected.

**Validation survey** (after the report, 1 minute)
- 8 questions on hypotheses H1–H3 from [docs/VALIDATION.md](docs/VALIDATION.md);
- answers are saved on the device and, if a backend is running, in `backend/data/survey.jsonl` (`POST /api/survey`);
- summary for the team: `index.html?survey=results` (on the device) or `GET /api/survey/summary` (on the server).

**Skills report**
- an overall Job Fit Score;
- metrics: accuracy, safety violations, extra actions, time;
- confirmed competencies and areas to grow.

**Russian, Kazakh and English interface**
- a "Рус / Қаз / Eng" switch on the home page, or the `?lang=kk` / `?lang=en` link;
- the home page, intro screens, report, career path and survey are translated; the Claude debrief is written in the selected language;
- in English the whole game is translated, including the 3D guide, step bar, tooltips and text on 3D screens; in Kazakh the guide inside the 3D scene is still in Russian.

**Career path in Kazakhstan and student profile**
- in the report: the UNT (national exam) subjects for the profession, university programme groups, the college route, and a fact about the Kazakhstan labour market;
- on the home page: "Your profession profile", with results across all completed modules and a suggestion of what to try next.

### How it differs from alternatives
- **Career aptitude tests** ask about preferences. Here the person **does** the work.
- **[Transfr Trek](https://transfrinc.com/products/career-exploration)** (50+ VR simulations) requires a Meta Quest / Pico headset. Here a browser on a school PC or a phone is enough.
- **[Forage](https://www.theforage.com/)** (9M+ students) offers text-based tasks for university students in English. Here it's first-person 3D for school students, in Russian and Kazakh, with Kazakhstan context.
- **[ctest.enbek.kz](https://ctest.enbek.kz/ru)** covers professional standards and recognition of qualifications, but you can't try the work.
- **Video courses** don't check skills. Here every action is recorded and assessed.

### The market in Kazakhstan
- **8,048 schools and more than 4.1 million school students** in the 2026/27 school year ([Bureau of National Statistics, Ministry of Education](https://www.zakon.kz/obshestvo/6530002-skolko-shkol-otkroyut-dveri-dlya-uchenikov-v-kazakhstane-1-sentyabrya-2026-goda.html)).
- The state is strengthening career guidance: a new concept, the "Atlas of New Professions", and specialised classes in 1,000 schools ([Kazpravda](https://kazpravda.kz/n/novuyu-kontseptsiyu-professionalnoy-orientatsii-zapustyat-v-kazahstane/)).
- Employers need staff and safety: there is a shortage of doctors and programmers ([Ministry of Labour, May 2026](https://orda.kz/kazahstan-ne-mozhet-zakryt-deficit-vrachej-i-ajtishnikov-414775/)); 133 people died at work in the first 9 months of 2025 ([Kapital.kz](https://kapital.kz/gosudarstvo/141656/v-etom-godu-na-proizvodstve-v-kazahstane-pogibli-133-cheloveka.html)).

## 4. How assessment works and where the AI is

Assessment has two parts.

**1. The score and metrics are calculated by rules.** They are transparent and reproducible, and are calculated on the client from the player's actual actions.

| Metric | How it is measured |
|---|---|
| Safety violations | An action out of order: breaker without PPE, LOTO lock on a live breaker, measuring under voltage |
| Recipe accuracy | 100% − 2% for each click on the wrong object |
| Extra actions | Clicks on the wrong object |
| Time | Seconds from the start (after the intro screen) to completion |
| Soft skills | The chosen answer to the guest and response time (from complaint to choice) |
| Management | Whether the order is calculated correctly: 35 kg within budget |

- **IT and Doctor:** 60% mean practical exercise result + 10% action accuracy + 20% technical decision + 10% communication.
- **Barista:** 55% technique (grinding, extraction, milk) + 25% service + 20% purchasing.
- **Safety:** 70% practical exercises + 30% procedure. Violations cap the result at 59 and require further practice.
- Every exercise contributes. Any component below 60 requires practice regardless of the aggregate. The report leads with observed strengths and a specific next action.
- Guided and independent attempts are stored separately. The profile shows first/latest results and attempt counts within each profession. Previous results remain in a labelled archive.
- IT rotates network loss, stopped database service and release configuration incidents. Service readiness and a persisted test order must both be checked. Restoration time freezes at that point.

**2. The written debrief is generated by AI (Claude API).** At the end of a session the client sends the score, metrics and action log to the backend (`POST /api/report`). The backend asks Claude (`claude-opus-5-5`) to write a short personal debrief:
- what went well;
- what to work on, referring to real mistakes from the log;
- an exercise to practise next and a further career-exploration step.

How it is built:
- **The response format** is strictly defined by a JSON schema (structured outputs).
- **The AI doesn't change the score:** it only explains the result in plain words.
- **The API key is stored only on the server;** it is not in the frontend or the mobile app.
- **Without a key, or if the API fails,** the backend returns a rule-based debrief, and the interface shows which source was used.

## 5. Architecture

```
 ┌───────────── frontend/ (browser) ──────────────┐        ┌──────────── backend/ (Node.js) ───────────┐
 │ index.html + css/ + js/                        │  POST  │ Express                                   │
 │  ui · guide · controls   ← UI and guide        │ /api/  │  validate.js  — input validation           │
 │  engine (Three.js)       ← 3D, lighting, ray   │ report │  feedback.js  — Claude API (JSON schema)   │──► Claude API
 │  safety · barista · it · doctor ← modules      │ ─────► │  rules.js     — rule-based fallback        │
 │  report · telemetry      ← scoring, log        │ ◄───── │  server.js    — /api/*, rate limit,        │
 └────────────────────────────────────────────────┘        │                 serves frontend/           │
            ▲ asset (copied by scripts/)                   └────────────────────────────────────────────┘
 ┌───────────── mobile/ (Flutter) ────────────────┐                ▲
 │ SimView: WebView (Android/iOS) / iframe (Web)  │  POST /api/report (--dart-define=API_BASE_URL)
 │ GameProvider → AiAnalysisService ──────────────┼────────────────┘
 │ ResultScreen                                   │
 └────────────────────────────────────────────────┘
```

| Part | Technologies | Responsibility |
|---|---|---|
| `frontend/` | HTML, CSS, JavaScript, Three.js r128 | 3D scenes, controls, module logic, guide, scoring, report |
| `backend/` | Node.js 20+, Express 5, `@anthropic-ai/sdk` | AI debrief API, validation, rate limiting, serving the frontend |
| `mobile/` | Flutter 3.x (Dart), provider, webview_flutter, web | Mobile and web app that embeds the simulator; report screen |

**Client → host protocol.** The simulator sends JSON messages `{type: "action" | "session_complete", ...}` via `window.FlutterChannel` (WebView) and `window.parent.postMessage` (iframe).

### What we built vs. third-party technology (clause 5.3 of the rules)

| Ours | Third-party |
|---|---|
| 3D scenes for all four modules: geometry from primitives, procedural textures | [Three.js r128](https://threejs.org/) (rendering, MIT; a copy in `frontend/vendor/` so the demo works offline) |
| First-person controls: mouse, WASD, multitouch, D-pad | Google Fonts |
| Scenario logic and the shared `scenario.js` engine, action-order checks, safety violations | Express (HTTP server) |
| Guide, labels, target pointers | Claude API via `@anthropic-ai/sdk` (debrief text) |
| Scoring rules, action log, client–host protocol | Flutter, provider, webview_flutter, http, google_fonts, web |
| Backend: prompt, response JSON schema, validation, fallback rules, tests | |
| Procedural sounds with WebAudio | Claude AI assistant (development tool): used to build the "IT engineer" and "General practitioner" modules and the `scenario.js` engine |

### Data and privacy
- No sign-up and no personal data: no name, email or phone number.
- Survey feedback is submitted privately to the hosted API. Publishing all answers and the comment requires separate consent. Failed uploads remain queued on the device. Local Express development uses a separate `backend/data/survey.jsonl` file excluded from git.
- The Claude API key is only on the server; input is validated, requests are rate-limited, and security HTTP headers are set.

Architecture cheat sheet and answers to jury questions: [docs/QA.md](docs/QA.md).

## 6. How to run

**1. The whole system locally (frontend + backend + AI):**
```bash
cd backend
npm install
cp .env.example .env    # add your ANTHROPIC_API_KEY
npm start               # http://localhost:8787
```
Everything works without a key, but the debrief will be rule-based.
Backend tests:
```bash
npm test
```

**2. Frontend only (no AI).** Works offline too: Three.js is in `frontend/vendor/`. Any static server will do:
```bash
python -m http.server 8080 --directory frontend
```
GitHub Pages uses the root `index.html`, which redirects to `frontend/`. The frontend automatically connects to the hosted reviews and rule-based feedback API. This host has no Claude key configured. For a different backend, pass its address as a parameter: `frontend/?api=https://your-backend`, after adding that origin to `ALLOWED_API_ORIGINS` in `frontend/js/config.js` (other addresses are ignored, so a crafted link cannot send a player's session somewhere else).

**3. Mobile and web app (Flutter 3.22+):**
```bash
node scripts/sync-frontend.mjs          # copies frontend/ into mobile/assets/sim/
cd mobile
flutter create . --platforms=android,ios,web --project-name synapkor   # once: platform scaffolding
flutter pub get
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:8787
flutter build web --dart-define=API_BASE_URL=https://your-backend
flutter build apk --dart-define=API_BASE_URL=https://your-backend
```
For the Android emulator, the local backend address is `http://10.0.2.2:8787`.

**Controls:** `WASD` to walk, mouse to look around, `E` / click to act, `H` to show or hide the guide, `1/2/3` for tools in the safety module and for choosing answers in the IT engineer and Doctor modules. On a phone: joystick and the `E` button.

## 7. Feasibility

- **No hardware needed.** All it takes is a browser and a link, so the simulator runs on school computers and students' phones.
- **Scaling to new professions.** A module is a scene, a list of steps with checking rules, and guide texts. Next candidates: cook, car mechanic, pharmacist, CNC operator.
- **Business model (hypothesis):**
  - free for school students (basic modules);
  - a subscription for schools and career guidance centres: a teacher dashboard, class reports;
  - a B2B licence for employers: custom scenarios, integration with HR systems.
- **MVP limitations:**
  - no accounts: practice progress is browser-local, while submitted survey feedback is stored by the hosted API;
  - scoring is rule-based and not yet calibrated against real professionals;
  - four modules, all available in the browser and in the Android app; the app uses the same simulator and evidence report for every profession;
  - the "Doctor" scenario is for learning and has not been reviewed by a practising doctor.

## 8. Work done during the hackathon

The base prototype was created before the qualifying stage started: the commits from 14–16 Sept 2026 are visible in the repository history, and we did not rewrite it. **During the qualifying stage (22–24 Sept 2026)** we did the following:

- **"Safety engineer" module:**
  - fixed the LOTO logic (for example, the lock could not be attached);
  - added action-order checks;
  - added a separate report.
- **Fixed critical bugs:**
  - module scenes were mixing together;
  - clicks on the interface were registering as actions in the scene;
  - actions fired twice on phones;
  - some objects could not be reached.
- **New home page and reworked graphics:**
  - balanced lighting and reflections;
  - high-contrast materials;
  - object labels.
- **Beginner guide:**
  - intro screen, step-by-step panel;
  - an arrow above the target, a pointer to off-screen targets;
  - hints on mistakes.
- **Honest metrics:**
  - instead of made-up "tremor" and "eye contact", genuinely measurable "extra actions" and "response time";
  - the scoring formula is documented openly.
- **Architecture:**
  - a 5,600-line monolithic HTML file was split into `frontend/` (HTML, CSS and 10 JS modules);
  - `backend/` and `mobile/` were added.
- **AI through the backend:**
  - Node.js + Express, the `/api/report` endpoint;
  - the debrief text is written by the Claude API, strictly following a JSON schema;
  - input validation, rate limiting, fallback rules, automated tests;
  - an "AI comment" card in the interface.
- **Flutter:**
  - the simulator is embedded as an asset: WebView on Android/iOS, iframe in Flutter Web (previously it loaded from localhost);
  - the AI debrief goes through the backend; the direct Gemini call with a key inside the app was removed;
  - telemetry from the WebView ends the session;
  - fixed a double navigation to the results screen;
  - removed dead code.
- **Two new professions and a scenario engine:**
  - "IT engineer": a server-room incident, fixing a bug in code, talking to the client;
  - "General practitioner": examining a patient, a clinical decision, talking to the patient;
  - the shared `scenario.js` engine: a new profession is described in a single file (scene, steps, decisions, report texts);
  - the backend accepts reports from the new modules; debrief rules and automated tests were added.
- **Kazakh-language interface:** a "Рус / Қаз" switch; the home page, intro screens, report and survey are translated.
- **Career guidance for Kazakhstan:** a "Career path" block (UNT, university programmes, college, Kazakhstan labour market data) and a student profile across all modules.
- **Validation and quality:**
  - the testing survey is built into the report, and the H1–H3 hypothesis summary is calculated automatically;
  - `POST /api/survey` and `GET /api/survey/summary` endpoints with input validation and a test;
  - CI in GitHub Actions: backend tests and a check of every frontend JS file on each push.

## 9. Repository structure

```
├── frontend/                     # Web client (MVP): opens in the browser
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── config.js             # API address
│       ├── telemetry.js          # session state, action log, bridge to the host
│       ├── safety.js             # "Safety engineer" module: workshop scene and LOTO logic
│       ├── barista.js            # "Barista" module: 3 tasks
│       ├── scenario.js           # shared scenario engine: steps, decisions, guide, report
│       ├── it.js                 # "IT engineer" module: server room and incident
│       ├── doctor.js             # "General practitioner" module: office and examination
│       ├── engine.js             # Three.js: rendering, lighting, loop, coffee shop scene
│       ├── controls.js           # first-person controls, aiming
│       ├── guide.js              # guide, labels, pointers, intro screen
│       ├── effects.js            # animations and pop-up messages
│       ├── audio.js              # procedural sounds
│       ├── report.js             # report and AI debrief request
│       ├── survey.js             # post-report survey and the ?survey=results summary
│       ├── career.js             # career path in Kazakhstan (UNT, universities) and student profile
│       ├── i18n.js               # Russian / Kazakh switch
│       └── ui.js                 # screens, HUD, module launch
├── backend/                      # AI debrief API (Node.js)
│   ├── src/server.js             # Express: /api/health, /api/report, /api/survey, static files
│   ├── src/feedback.js           # Claude API + response JSON schema
│   ├── src/rules.js              # rule-based fallback debrief
│   ├── src/validate.js           # input validation
│   ├── test/api.test.js          # automated tests (node --test)
│   └── .env.example
├── mobile/                       # Flutter app (Android / iOS / Web)
│   ├── lib/
│   │   ├── config.dart           # API_BASE_URL
│   │   ├── models/ · providers/ · screens/ · services/ · theme/
│   │   └── widgets/sim_view/     # WebView / iframe with the simulator
│   ├── android/
│   └── pubspec.yaml
├── scripts/sync-frontend.mjs     # copies frontend/ into mobile/assets/sim/
├── docs/                         # VALIDATION.md (validation), PITCH.md (pitch plan), QA.md (jury answers), demo.mp4
├── .github/workflows/ci.yml      # CI: backend tests and JS checks
└── index.html                    # redirect to frontend/ for GitHub Pages
```

### How to add a new profession

1. Create `frontend/js/<id>.js` and call `registerScenario({...})` in it: the 3D scene (`build`), 6 steps (`steps`: which object, guide hints, animation), on-screen decisions (`decisions`), and the win and report texts. See `it.js` or `doctor.js` for an example; the format is described at the top of `scenario.js`.
2. Include the file in `frontend/index.html` after `scenario.js` and add a card with `onclick="startScenario('<id>')"`.
3. Add `<id>` to `MODULES` (`backend/src/validate.js`), a description to `MODULE_CONTEXT` (`backend/src/feedback.js`), and a rule-based debrief to `backend/src/rules.js`.

Direct link to a module: `index.html?module=<id>` (`safety`, `barista`, `it`, `doctor`).

## 10. Team

- Arnur
- Koilybay Magzhan
- Turaly Yermek
- Ashim Ruknuddin

## Assets and professional review

Characters and hands use original procedural geometry. Asset provenance and clinical review status are recorded in [ASSETS_AND_REVIEW.md](docs/ASSETS_AND_REVIEW.md).

Quality changes are tracked in the [implementation plan](docs/QUALITY_PLAN.md).
