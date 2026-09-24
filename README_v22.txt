InteractiveBoard v22 — share links + web release

WHAT CHANGED
1. The main sharing flow now uses protected links instead of email invitations.
2. The owner can create:
   - an editing link;
   - a view-only link.
3. Only a SHA-256 hash of the secret token is stored in Supabase.
4. Opening /?join=<token> while signed out is safe:
   the URL stays in the browser, and after login/registration the Boards screen
   automatically redeems the token and opens the shared board.
5. Existing owner/editor/viewer roles are retained.
6. The owner can revoke any active link.
7. Email invite backend code remains for backwards compatibility, but it is no
   longer the primary UI.
8. vercel.json is included for SPA deployment.

INSTALL OVER CURRENT v21
Copy these files into the project, preserving folders:
  src/BoardsScreen.tsx
  src/shareLinks.ts
  supabase/v22_share_links.sql
  vercel.json

Then run:
  npm run build

SUPABASE
Open Supabase -> SQL Editor and run the entire:
  supabase/v22_share_links.sql

WEB RELEASE WITH VERCEL
1. Open https://vercel.com and sign in with GitHub.
2. Add New -> Project.
3. Import Vue-Jay/interactive-board.
4. Framework Preset: Vite.
5. Build Command: npm run build
6. Output Directory: dist
7. Add environment variables:
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
8. Deploy.
9. In Supabase -> Authentication -> URL Configuration:
   Site URL = your production Vercel URL.
   Keep localhost redirect URLs for local development if you still use them.

SECURITY
- A board UUID by itself does not grant access.
- The raw share token is never stored in board_share_links.
- Revoked links stop working immediately.
- Viewer/editor permissions are still enforced by existing board RLS.
- Owners cannot accidentally downgrade themselves by opening a share link.

NOTE
For now links use the robust form:
  https://your-site.example/?join=<secret-token>
This avoids adding a router dependency and works on Vercel without extra routing
logic. A prettier /join/<token> URL can be added later.
