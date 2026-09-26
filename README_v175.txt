OnlineRepetitor v175 — alternative frontend delivery

The application code is no longer being changed to chase a network-routing problem.
v175 adds Netlify as an alternative static frontend host while Vercel can remain as fallback.

Why:
Recent reports from Russian networks show response-body stalls on some international CDN/edge
routes. Repeated cache changes cannot repair ISP-level transport throttling.

Added:
- netlify.toml with npm run build / dist deployment;
- SPA fallback for /board/* and other client routes;
- long immutable caching for Vite hashed assets;
- no-store for version.json and sw.js;
- HTML revalidation;
- Node 22 build environment;
- app version 175.

Netlify must receive the same VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables
as the existing Vercel project. No Supabase database migration is required.
