OnlineRepetitor v213 LOCAL

The internal testing guide has been completely rewritten against the current application.

Main change:
- no administrator role, admin panel, admin approvals or manual subscription administration in the guide;
- only normal product roles: teacher and student;
- current Smart Hand behavior;
- current teacher-only learning-object creation restrictions;
- student structural protection;
- student attachment approval flow and request queue;
- AI board assistant;
- current cabinet screens: students, assignments, progress, schedule, materials, templates, notifications, profile/settings, billing;
- current mobile portrait/landscape behavior and touch attachment drag;
- guest flow with ~6 hour server TTL;
- realtime, comments, following teacher, offline/reconnect;
- QA report submission remains available, but the guide only shows the current user's reports.

No database migration is required for v213.

QA:
npm run build
npm run dev
