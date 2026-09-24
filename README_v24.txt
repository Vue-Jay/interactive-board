OnlineRepetitor v24 — branding patch

Base: current project after the Vercel/share-link hotfix.

Replace:
  index.html
  src/AuthScreen.tsx
  src/BoardsScreen.tsx
  public/favicon.svg

What changes:
- product name: OnlineRepetitor
- tagline: "Интерактивная доска для занятий"
- new OR monogram in login/dashboard/cards
- browser title and SEO description
- new favicon matching the current purple UI
- friendlier dashboard copy for lessons and collaboration

No Supabase SQL changes are needed.

After replacement:
  npm run build
  git add .
  git commit -m "v24: rebrand app as OnlineRepetitor"
  git push

Vercel should redeploy automatically.
