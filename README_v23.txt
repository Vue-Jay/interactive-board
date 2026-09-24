InteractiveBoard v23 — WEB RELEASE

Base: current v21 main.
This archive is cumulative: it includes the v22 share-link feature plus v23
production/deep-link hardening. You do NOT need to install the old v22 archive first.

REPLACE / ADD
- replace src/BoardsScreen.tsx
- replace src/AuthScreen.tsx
- add src/shareLinks.ts
- add supabase/v23_share_links.sql
- add vercel.json

Then:
  npm run build

SUPABASE
Run the entire:
  supabase/v23_share_links.sql

WHAT IS NEW
- Owner shares a board by protected link, not by entering another user's email.
- Roles: editing or view-only.
- Links use a production-friendly URL:
    https://your-domain/join/<secret-token>
- Opening that URL while logged out shows sign-in/registration.
- After authentication the token is redeemed and the shared board opens.
- Revoked/bad links are cleaned from the address and do not trap the app.
- Only SHA-256 of the token is stored in Supabase.
- Existing stronger role is never downgraded by a weaker link.
- Owner always remains owner.
- vercel.json makes direct /join/... navigation work as an SPA.

VERCEL RELEASE
1. Push these changes to GitHub after testing.
2. Go to Vercel -> Add New -> Project.
3. Import Vue-Jay/interactive-board.
4. Framework: Vite.
5. Build Command: npm run build
6. Output Directory: dist
7. Environment variables:
     VITE_SUPABASE_URL
     VITE_SUPABASE_ANON_KEY
8. Deploy.
9. Copy the generated https://....vercel.app address.
10. Supabase -> Authentication -> URL Configuration:
      Site URL = production Vercel URL
    Keep http://localhost:5173 in Redirect URLs for local tests.

TEST BEFORE PUBLIC USE
- owner creates Editor link
- second account opens it in a private browser
- after login board opens and can be edited
- View-only link cannot edit
- revoke the link and confirm a new account can no longer redeem it
- refresh directly on /join/<token> and confirm Vercel serves the app
