OnlineRepetitor v194 — FINAL LOCAL DEVELOPMENT STAGE

This cumulative local package closes the currently planned local work.

Final hardening:
- account-access cache is cleared on logout and account switch;
- notifications cache is cleared on logout and account switch;
- queued AI board transfer is cleared on logout;
- prevents short-lived cross-account UI state leakage after switching users;
- local version marker bumped to 194;
- Settings includes an explicit local-stage readiness note.

Completed local product contour:
- stable collaborative board core;
- mobile/desktop toolbar stabilization;
- profile separated from compact Settings;
- Free / Teacher / Pro local tariff model;
- subscription states and effective entitlements;
- AI monthly quota accounting;
- AI Studio: assignments, quizzes, flashcards;
- teacher-review-first drafts;
- AI -> native board checklist/quiz/flashcard insertion;
- redesigned Follow Teacher control.

Intentionally NOT faked:
- real payment processing;
- production checkout/customer portal/webhooks;
- external AI provider calls.
Those require provider selection, server credentials and production backend configuration. No secret is stored in the browser.

Final local QA:
npm run build
npm run dev

Then verify login/logout with two different accounts, Profile, Settings, Tariffs, AI Studio, AI -> board insertion, shared board collaboration, Follow Teacher, portrait/landscape mobile UI.
