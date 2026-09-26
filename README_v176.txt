OnlineRepetitor v176 — Supabase startup optimization

Network export showed repeated /auth/v1/user and refresh-token traffic during one startup.

Changes:
- removed /auth/v1/user validation from every backend request;
- cached JWT is used until it is close to expiry;
- refresh-token operation is single-flight, so parallel requests share one refresh;
- a real HTTP 401 triggers one refresh and one retry;
- simultaneous identical GET requests are deduplicated while in flight;
- network timeout increased from 5s to 12s for slow routes;
- storage/functions requests use the same timeout helper;
- no persistent response cache was added, so board data is not made stale.

Security note:
The diagnostic network export contained session credentials. Sign out and sign in again
after testing so the previously exposed session is replaced.
