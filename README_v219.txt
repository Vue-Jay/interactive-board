OnlineRepetitor v219 build fix

Replace src/authStore.ts with the included complete file.

Fixes all 7 reported TypeScript errors:
- exports getRememberedAccount
- exports resumeRememberedAccount
- exports forgetRememberedAccount
- uses all four remembered-session backend imports
- preserves registered logout as remembered one-tap account
- guests still perform full sign-out

No SQL required.
Run: npm run build
