OnlineRepetitor v188 — LOCAL PROFILE / SETTINGS SPLIT + BILLING NAVIGATION

Changes:
- clicking the profile tile now opens a dedicated Profile screen;
- Profile contains identity, email, role badges and display-name editing only;
- Settings is now a separate compact screen;
- existing Settings buttons/menu entries are redirected to the compact Settings screen;
- compact Settings contains theme, compact UI, default board zoom, account role, app install/logout;
- current tariff is shown in Settings;
- BillingScreen from v187 is now wired into the app via Settings → Tariffs;
- stable board core remains unchanged.

Test:
npm run build
npm run dev

Check:
1. Click profile tile -> Profile.
2. Click Settings -> compact Settings.
3. Settings -> Tariffs -> Billing screen.
4. Back from Tariffs -> Settings.
5. Theme/compact/zoom save correctly.
