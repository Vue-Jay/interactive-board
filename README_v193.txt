OnlineRepetitor v193 — LOCAL AI -> NATIVE BOARD OBJECTS

Implemented the complete local insertion path:
- AI Studio -> На доску -> choose/open any editable board;
- Assignment drafts become native Checklist objects;
- Quiz drafts become native Quiz objects;
- Flashcard drafts become native Flashcard objects;
- generated objects are positioned around the current viewport center;
- multiple inserted objects are selected immediately;
- queued transfer is cleared only after successful insertion;
- viewer-only boards do not consume the queued draft;
- local app/version marker bumped to 193 for clearer QA.

Includes all v192 hook-order crash fixes and v191 Follow Teacher icon fixes.

Test:
npm run build
npm run dev

QA:
1. Teacher/Pro trial/active -> AI Studio.
2. Generate Assignment -> На доску -> open editable board -> checklist appears.
3. Repeat for Quiz -> native quiz cards appear.
4. Repeat for Flashcards -> native flashcards appear.
5. Queue a draft and open viewer-only board -> draft must remain queued.
6. Open editable board afterwards -> queued draft is inserted.
