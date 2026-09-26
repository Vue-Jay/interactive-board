OnlineRepetitor v186 — LOCAL NEXT STAGE

Core v185 remains unchanged and verified.

Started the two remaining roadmap stages locally:
- billing/tariffs foundation;
- AI foundation.

This patch intentionally does NOT connect real payments or an AI provider yet.
It adds local feature flags and implementation contracts so the next patches can build UI/models without risking the stable core or exposing secrets.

Test:
npm run build
npm run dev
