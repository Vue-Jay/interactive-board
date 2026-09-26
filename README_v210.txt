OnlineRepetitor v210 LOCAL

Administrator user/subscription console:
- Admin screen now has tabs “Все пользователи” and “Преподаватели”.
- “Все пользователи” shows every registered account, name/email, role, current tariff and subscription end date.
- Search by name/email.
- Administrator can manually grant Бесплатный / Базовый / PRO independently of payment.
- Subscription end date can be chosen manually or set quickly to 30 / 90 / 365 days.
- Switching to Бесплатный immediately clears the subscription.
- Expired paid subscriptions are treated as Бесплатный by get_my_account_access.
- Existing teacher approval workflow remains in the second admin tab.

IMPORTANT DATABASE STEP:
Before testing this feature, run the complete file:
supabase/v210_admin_subscriptions.sql
in Supabase SQL Editor ONCE.

Then:
npm run build
npm run dev

Admin QA:
1. Open Администрирование -> Все пользователи.
2. Confirm all accounts appear.
3. Grant PRO for 30 days.
4. Refresh: PRO and end date must remain.
5. Change to Basic / custom date.
6. Set Free: subscription end date must clear.
7. Non-admin account must not be able to call admin RPCs.
