OnlineRepetitor v190 — LOCAL AI QUOTAS + FOLLOW ICON

Added:
- monthly local AI usage accounting;
- Teacher/Pro AI credit limit enforcement;
- remaining credits displayed in AI Studio;
- usage progress indicator;
- generation stops when monthly quota is exhausted;
- QA reset for AI counter;
- redesigned Follow Teacher icon: teacher silhouette + directional follow/focus motif;
- active follow state remains visually distinct.

No production AI API or payment processing is enabled.

Test:
npm run build
npm run dev

QA:
1. Teacher/Pro active/trial -> generate AI drafts and watch remaining counter decrease.
2. QA reset restores monthly counter.
3. Free/past_due/canceled remains locked.
4. Open a shared board as non-owner and inspect Follow Teacher icon inactive/active/guided.
