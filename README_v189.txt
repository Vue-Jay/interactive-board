OnlineRepetitor v189 — LOCAL AI STUDIO + ENTITLEMENTS

Added:
- effective subscription entitlement logic: paid features work only for trial/active Teacher or Pro;
- inactive paid subscriptions fall back to Free capabilities;
- AI Studio route from compact Settings;
- local AI Studio for Assignment / Quiz / Flashcards;
- topic, difficulty and item count controls;
- editable draft result and copy action;
- local draft history;
- teacher-review-first UX;
- Free/inactive plan lock with direct Tariffs action;
- no external AI API and no browser API secrets.

This is still local development only.

Test:
npm run build
npm run dev

Suggested QA:
Settings -> AI Studio.
Free must show locked state.
Switch locally to Teacher/Pro trial or active -> AI Studio becomes available.
Generate all 3 content types and reopen a draft from history.
Set paid plan to past_due/canceled -> AI Studio must lock again.
