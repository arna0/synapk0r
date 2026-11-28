# Learning and professional-review protocol

Status, 28 November 2026: the original seven-person usability pilot remains the only completed participant study. The following is a protocol to execute, not new evidence. Exercise scores are client-reported and must not determine hiring, clinical clearance, electrical authorisation or certification.

## Practitioner review before a larger pilot

Recruit a practising safety professional and a practising clinician. Have each walk through every choice, corrective step, equipment depiction and report statement in their own module. Record role, experience, consent, date, simulator commit, finding, severity, agreed change and retest. Specifically check LOTO scope and prove-test-prove, residual energy and escalation; clinical uncertainty, patient communication and where the simplified scenario differs from practice. Do not remove pending-review labels until signed review records exist. A source licence remains an owner decision; see ASSETS_AND_REVIEW.md.

## Feasible classroom pilot

- Recruit at least 24 consenting learners with varied prior experience; use random codes rather than names in exported simulator records. Follow the institution's consent procedure, including guardian permission when required by its policy.
- Before gameplay, present a new IT incident: a checkout outage with reachable network and stopped database. Ask for the first priority, the evidence supporting the cause, the safe repair and two independent checks of recovery. Score each with the rubric below.
- Randomly assign half to simulator practice and half to a written runbook covering the same learning objectives, then swap after the first post-test so both groups can use the simulator.
- After practice, use a different cause (wrong release credentials with healthy network/database) and equivalent questions. Shuffle question and answer positions; never repeat the same answer sequence. Keep the answer key hidden from participants.
- Seven days later, use the third incident (disconnected cable) and repeat the transfer test without hints. Record elapsed active time separately; untimed mode and guided/independent attempts must remain separate.
- Collect task completion, error type, hint use, before/after/retention rubric scores, discomfort and accessibility barriers. Keep usability/self-reported learning separate from demonstrated task performance.

## Transfer scoring rubric

Each of the four objectives earns 0 (unsupported or unsafe), 1 (partly correct explanation), or 2 (correct and supported by observations). Priority must identify the blocked customer transaction. Evidence must distinguish root cause from downstream 503 errors. Repair must address the observed cause with an authorised reversible action. Verification must include both service readiness and a persisted customer test transaction. Total: 0–8, always retain objective subscores.

Have two independent reviewers score a blinded subset before resolving disagreements. Report agreement and disagreements, sample size, exclusions, missing follow-ups, score distributions and paired changes. A small pilot estimates feasibility; it does not establish career aptitude or clinical competence. Set any pass threshold only after practitioner review and calibration.

## Reproducibility and evidence

Use assignment links with an anonymous class code. Each learner exports their own JSON backup after the attempt; the teacher's local collector generates a CSV without server upload. Preserve commit, scenario/scoring version, case, mode, assistance and untimed status. Back up original exports securely according to the institution's retention policy. Publish aggregate results only with appropriate consent and disclose attrition and limitations. Never replace the original seven-person result table with planned or synthetic data.

## Release acceptance

Run frontend logic, Express and D1 tests, both browser CI environments, Android compilation and a real-device smoke check. Confirm all languages at first load and after switching, no horizontal scrolling at 390 px, pause/background timing, feedback opt-in/deletion and failed-network retries. Real Android WebView connectivity needs device verification in addition to compilation and CORS tests.
