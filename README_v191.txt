OnlineRepetitor v191 — LOCAL FOLLOW ICON FIX + AI BOARD TRANSFER

Fixed:
- Follow Teacher icon redesigned specifically for 32–36 px mobile controls.
- Removed intersecting decorative trails that made the old icon look piled up.
- New icon uses two clearly separated ideas: teacher silhouette + follow arrow.
- Smaller 18 px rendering on very narrow phones.
- Active-state live dot reduced on narrow phones.

Continued AI work:
- AI drafts now have a structured local transfer payload for board insertion.
- AI Studio has a “На доску” action.
- The selected draft is safely queued locally and returns to the boards area.
- This patch intentionally does not mutate the stable board object model yet. The next step consumes the queued draft after the user chooses/opens a board and converts it to native assignment/quiz/flashcard objects.

Test:
npm run build
npm run dev

QA:
1. Open shared board as student and inspect Follow Teacher at normal mobile scale.
2. Toggle voluntary follow and verify the live dot does not collide with the glyph.
3. Check guided follow state.
4. Teacher/Pro -> AI Studio -> generate draft -> “На доску”.
