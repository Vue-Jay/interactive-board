OnlineRepetitor v224 — subscription source-of-truth fix

Problem:
Admin subscriptions are stored on the server, while Settings/Billing were reading the old local browser billing store.
There was also a plan-id mismatch: server/admin used "basic" while the actual product plan is "teacher".

Fix:
- Settings reads subscriptionPlan/subscriptionUntil from get_my_account_access.
- Billing reads the same server account access.
- accountRoleStore uses free/teacher/pro and accepts legacy "basic" as "teacher".
- Settings refreshes access on focus and on account-access events.
- Subscription expiry is shown when available.
- If AdminScreen.tsx is included, its selector is aligned to Teacher.

No SQL migration is required for existing "basic" rows because the compatibility mapper treats them as Teacher.
For new grants, use teacher.

Run npm run build.
