OnlineRepetitor v200 LOCAL

Attachment approval workflow redesigned:
- Student upload is NOT shown on the board.
- It is synchronized as a hidden approval request.
- Student gets only “sent for approval” feedback.
- Teacher gets a floating notification with actual preview, student/file name and Open / Reject / Approve.
- Approve publishes the same attachment into the center of the teacher's current viewport.
- Reject removes the hidden request.
- Multiple requests are processed one by one and the notification shows remaining count.

Selection toolbar fix:
- bottom action toolbar now clamps to the visible board area;
- if the selected object is too close to the bottom, the toolbar moves above it;
- horizontal position is also clamped so media near screen edges keeps a usable toolbar.

QA:
npm run build
npm run dev
Test student upload and teacher approval in two browsers/accounts.
