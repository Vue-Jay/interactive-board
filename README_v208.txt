OnlineRepetitor v208 LOCAL

Attachment approval UX hardening:
- student sees a compact “На согласовании” status after sending image/PDF;
- request is automatically re-broadcast once after 2.5 s to reduce the chance
  of a request being missed while the teacher realtime channel is reconnecting;
- student can manually “Отправить снова” without re-uploading the file;
- approval/rejection removes the pending state immediately;
- teacher requests are kept as a queue instead of showing only the first item;
- teacher can move between pending previews with previous/next controls;
- duplicate realtime deliveries are deduplicated by requestId;
- approved attachment is still added only after teacher approval.

v205-v207 mobile drag and student permission fixes are retained.

QA:
npm run build
npm run dev

Two-account test:
1. Student attaches image/PDF.
2. Student sees “На согласовании”.
3. Teacher sees preview notification.
4. Send two files and navigate both requests.
5. Approve one, reject one.
6. Student receives result and pending status clears.
