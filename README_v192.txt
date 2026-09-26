OnlineRepetitor v192 — LOCAL HOOK CRASH FIX + BILLING/AI POLISH

Critical fix:
- Fixed React crash: "Rendered more hooks than during the previous render."
- The dashboard routing effect is now declared before every conditional return, so hook order is stable during auth/session transitions and board opening.
- This specifically fixes the crash visible when opening /board/... from the local app.

Continued roadmap:
- tariff cards now show compact concrete limits for boards, collaborators and AI;
- AI -> board transfer now gives a clear confirmation before returning to boards;
- v191 simplified Follow Teacher icon remains included.

Test:
npm run build
npm run dev

Required QA:
1. Start logged out -> log in -> open board.
2. Reload directly on /board/<id>.
3. Return to boards and open another board.
4. Profile -> Settings -> Tariffs -> AI Studio.
5. Generate AI draft -> На доску.
