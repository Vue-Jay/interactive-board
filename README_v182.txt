OnlineRepetitor v182 — LOCAL TEST BUILD
Do not publish yet.

Cumulative local patch: v176-v182.

v182:
- desktop “More tools” expanded/collapsed choice is remembered locally;
- reopening a board no longer unexpectedly changes that toolbar preference;
- permanent navigation group remains Select → Hand → Lasso;
- pinned navigation controls are protected from shrinking in the desktop rail;
- all mobile fixes from v180 and command-palette work remain included.

Test:
npm run build
npm run dev

Desktop check:
1. Expand “More tools”.
2. Return to boards and reopen the board, or refresh.
3. Expanded state should remain.
4. Collapse it, refresh again, and confirm it remains collapsed.
