# coturn deployment for OnlineRepetitor

This folder is a production-oriented template for the TURN relay used by board video calls.

1. Point a DNS name such as `turn.example.com` to the VPS public IP.
2. Generate a long random shared secret. Put the same value into `static-auth-secret` in `turnserver.conf` and the Supabase Edge Function secret `TURN_SHARED_SECRET`.
3. Set Supabase secret `TURN_URLS` to `turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp` (and add `turns:turn.example.com:5349?transport=tcp` after TLS is configured).
4. Open UDP/TCP 3478, TCP 5349 when TLS is enabled, and UDP relay range 49160-49200 in the VPS firewall/security group.
5. Start with `docker compose up -d` and check `docker compose logs -f coturn`.
6. Test from two different networks, for example Wi-Fi and mobile data. The call panel should show `Через TURN` when a relay candidate is actually selected.

Never commit the real shared secret. The checked-in files contain placeholders only.
