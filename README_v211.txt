OnlineRepetitor v211 LOCAL

Guest lifecycle fix:
- guests are temporary and are NOT displayed in Admin -> All users;
- on normal guest logout, the anonymous Supabase auth account itself is deleted;
- cascading relations remove the guest profile/memberships instead of leaving a permanent pseudo-user;
- registered users are unaffected;
- client additionally filters email-less anonymous accounts from the admin list.

DATABASE:
Run v210_admin_subscriptions.sql first if you have not already.
Then run ONCE:
supabase/v211_ephemeral_guests.sql

Important:
A browser/tab that is killed without a logout cannot reliably execute a network deletion request.
Such abandoned anonymous Auth rows are still hidden from the administrator user list.
Normal guest logout deletes the guest account completely.

Test:
1. Open invitation in incognito -> Continue as guest.
2. Confirm guest can use the shared board.
3. Admin -> All users must NOT contain the guest.
4. Guest logs out.
5. Guest account/profile should be removed server-side.
6. Registered student/teacher accounts remain unchanged.

Commands:
npm run build
npm run dev
