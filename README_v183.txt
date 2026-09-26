OnlineRepetitor v183 — LOCAL FINAL STABILIZATION
Do not publish yet.

Cumulative patch v176-v183.

Added final startup request stabilization:
- notifications: 15 s cache + single-flight request deduplication;
- notification read actions update cache immediately;
- account access: 30 s cache + single-flight request deduplication;
- account-role changes invalidate/refresh cached access safely;
- all UI/mobile/toolbar fixes from v176-v182 remain included.

Test:
npm run build
npm run dev

Phone:
npm run dev -- --host
