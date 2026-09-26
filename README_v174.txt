OnlineRepetitor v174 — network performance fix

v173 temporarily disabled caching for every Vercel response. That made update
delivery reliable, but also forced large hashed JS/CSS files to be transferred
again on every visit.

v174 keeps update safety while restoring efficient static-asset caching:
- HTML revalidates;
- version.json and sw.js remain no-store;
- /assets/* uses public, max-age=31536000, immutable;
- Vite hashed filenames make this safe across releases;
- manifest uses a short one-hour cache;
- update detection remains enabled and build version is 174.
