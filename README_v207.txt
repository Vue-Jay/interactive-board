OnlineRepetitor v207 LOCAL

Student permission hardening.

v206 protected teacher assignments in the visible toolbar. v207 closes alternate
editing paths too:
- protected teacher content cannot be dragged with Select;
- arrow keys cannot nudge it;
- Alt-drag cannot clone it;
- Ctrl+D cannot duplicate it;
- grouping/ungrouping cannot alter it;
- layer order cannot be changed;
- lock/unlock and rotation are blocked;
- context-menu structural actions are disabled;
- Ctrl+K command palette no longer exposes teacher-only creation tools to students;
- existing keyboard tool shortcuts continue to reject teacher-only tools.

Students can still solve/interact with quiz, checklist, flashcard and cover content.
Normal writing/drawing and the approved attachment workflow remain available.

QA:
npm run build
npm run dev

Student test:
Select a teacher quiz/checklist/formula and try drag, arrows, Alt-drag, Ctrl+D,
rotation, layers, lock and context menu. Structure must remain unchanged.
Then answer the quiz/checklist to confirm solving still works.
