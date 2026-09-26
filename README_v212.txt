OnlineRepetitor v212 LOCAL

Guest lifetime changed to a simple server-side TTL:
- guest accounts are NOT deleted immediately on logout anymore;
- every guest account is automatically deleted after approximately 6 hours;
- cleanup runs on the server every 15 minutes, so actual lifetime is 6h to ~6h15m;
- closing the browser, killing the tab or losing connection does not matter;
- guests remain hidden from Admin -> All users;
- registered users are never touched by this cleanup;
- deleting auth.users cascades to guest profile/membership data according to existing FK rules.

DATABASE:
Run v210_admin_subscriptions.sql first if not already applied.
Then run ONCE:
supabase/v212_guest_ttl_6h.sql

If v211_ephemeral_guests.sql was already applied, that is fine: v212 removes its immediate-delete RPC and replaces it with the scheduled cleanup.

QA:
npm run build
npm run dev
