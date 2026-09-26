OnlineRepetitor v217 LOCAL — build fix

Fixed the two TypeScript errors reported by npm run build:

1. boardAttachmentApprovalSync.ts
- broadcast payload is generic/unknown;
- it is now explicitly narrowed to Record<string, unknown> before spreading;
- network message structure and attachment approval protocol are unchanged.

2. SettingsScreen.tsx
- the initial AccountAccess value now contains subscriptionPlan: "free" and subscriptionUntil: null;
- matches the current AccountAccess type introduced by subscription support.

No SQL migration is required.

Run:
npm run build

Only push after the build succeeds.
