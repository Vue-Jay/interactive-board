OnlineRepetitor v209 LOCAL RELEASE CANDIDATE

This closes the current local development pass before full QA.

Final reliability change:
- student attachment approval requests are no longer retried only once;
- while a request is pending, it is re-broadcast every 4 seconds;
- retries stop immediately after teacher approve/reject;
- retries are bounded to 10 minutes to avoid an endless background loop;
- manual “Отправить снова” restarts the reliable delivery window;
- teacher-side requestId deduplication prevents duplicate cards.

Why:
A teacher may open the shared board a few seconds after the student sends a file,
or Supabase Realtime may reconnect at that exact moment. The request should still
arrive without forcing the student to upload the file again.

Added:
docs/LOCAL_RELEASE_CHECKLIST.md

This checklist covers desktop, Android portrait/landscape, roles, realtime,
student permissions, attachments, AI and final production-release steps.

Not included intentionally:
- real payment processing;
- production AI API/gateway secrets.
Those require an actual provider/server configuration and should not be faked
inside the browser client.

Commands:
npm run build
npm run dev
