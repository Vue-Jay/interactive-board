OnlineRepetitor v215 LOCAL

Mobile scrolling is fixed globally for the main application screens, not only Boards.

Covered mobile screens:
- Boards / dashboard
- Students
- Assignments
- Progress
- Schedule
- Materials
- Templates
- Notifications
- Profile
- Settings
- Internal testing guide
- Tariffs / Billing
- AI Studio

What changed:
- every non-board main screen owns a 100dvh vertical scroll container;
- body/#root can remain locked for the interactive board without freezing cabinet pages;
- touch-action: pan-y and momentum scrolling are enabled;
- safe-area bottom padding is added so the last controls can be reached on phones;
- the interactive board viewport behavior itself is unchanged.

No SQL migration is required.

QA:
npm run build
npm run dev -- --host
