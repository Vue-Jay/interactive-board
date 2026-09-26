OnlineRepetitor v199 LOCAL

FIX: crypto.randomUUID compatibility.

The board no longer calls crypto.randomUUID directly. All object IDs now go through createId():
- uses native crypto.randomUUID when available;
- falls back to crypto.getRandomValues;
- has a final compatibility fallback for older/non-secure browser contexts.

This fixes student image/PDF insertion on browsers where randomUUID is unavailable, and prevents the same crash in drawing, shapes, assignments, duplication and other board tools.

Test:
npm run build
npm run dev

Then test student -> image/PDF -> pending approval -> teacher preview/approve/reject.
