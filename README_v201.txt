OnlineRepetitor v201 LOCAL

Fix for the broken student attachment approval workflow.

Root cause fixed:
v200 tried to use a hidden board object itself as the request transport. That depended on the board document save/realtime merge path, so the teacher could miss the request entirely.

v201:
- adds a dedicated Supabase Realtime broadcast channel per board for attachment approval;
- student uploads the binary asset to shared remote storage, but does NOT add any object to the board;
- request metadata is sent directly to the teacher in realtime;
- teacher gets a popup with a real preview loaded from shared storage;
- Approve creates the image/PDF as a normal board object and syncs it through the ordinary board document path;
- Reject creates no board object;
- approval/rejection result is broadcast back to the student;
- multiple requests queue in the teacher popup.

The selection-toolbar viewport fix from v200 is retained.

Important QA:
Run two accounts with the SAME shared board open at the same time.
1. Teacher opens board.
2. Student opens same board.
3. Student uploads image/PDF.
4. Student board must remain unchanged.
5. Teacher must immediately see preview popup.
6. Approve -> object appears on shared board.
7. Reject -> object never appears.
8. Student receives approval/rejection toast.

Commands:
npm run build
npm run dev
