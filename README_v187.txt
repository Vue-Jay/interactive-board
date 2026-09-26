OnlineRepetitor v187 — LOCAL BILLING UI

Added:
- Free / Teacher / Pro plan model;
- plan limits and feature metadata;
- local subscription states: trial / active / past_due / canceled;
- local subscription persistence;
- BillingScreen with responsive tariff cards;
- QA subscription-state simulator;
- no real money movement and no payment credentials.

The screen is deliberately isolated in this patch. Next patch wires it into the account/dashboard navigation and applies the first real feature gates.

Test:
npm run build
npm run dev
