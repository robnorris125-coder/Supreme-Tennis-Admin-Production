# Production deployment

## 1. Create the GitHub repository

Create a new private repository for this production application. Upload the complete contents of this export directory, including hidden files such as `.env.example` and `.gitignore`.

Do not upload `.env.local`, OAuth JSON files, database passwords, access tokens or refresh tokens.

## 2. Create the Supabase project

1. Create a new Supabase project in the preferred UK or nearby European region.
2. In the SQL editor, run `supabase/migrations/20260821000100_initial_schema.sql`.
3. Review and run `supabase/seed.sql` to create the Supreme Tennis tenant memberships.
4. In Authentication, create or invite the authorised users.
5. Copy the project URL and publishable key.
6. Copy the transaction-pooler PostgreSQL URI for Vercel and set it as `SUPABASE_DB_URL`.

The seed file authorises these email addresses in the application database:

- `robnorris125@gmail.com`
- `info@supremetennis.co.uk`

Supabase Auth must contain the same verified address before that person can sign in.

## 3. Create the Vercel project

1. Import the new GitHub repository into Vercel.
2. Keep Framework Preset set to Next.js.
3. Keep the project root at the repository root.
4. Add every required variable listed in `.env.example` to Production, Preview and Development as appropriate.
5. Deploy.

The build command is `npm run build`. The output is managed by Next.js and Vercel.

## 4. Configure authentication URLs

In Supabase Authentication URL Configuration, set:

- Site URL: `https://admin.tennisgrowth.com`
- Redirect URL: `https://admin.tennisgrowth.com/auth/confirm`
- Temporary Vercel preview redirect during acceptance testing, if required

## 5. Configure provider callbacks

Google OAuth callback for both the protected fallback and tenant connection:

`https://admin.tennisgrowth.com/api/gmail/callback`

Microsoft OAuth callback:

`https://admin.tennisgrowth.com/api/email/microsoft/callback`

Configure the central provider applications once at platform level. Never ask a normal tenant user to provide a client secret.

## 6. Connect the domain

1. In Vercel, add `admin.tennisgrowth.com` to the project.
2. Vercel will display the required DNS record.
3. In GoDaddy DNS for `tennisgrowth.com`, add only the `admin` record supplied by Vercel.
4. Do not alter the root domain or `www` records.
5. Wait for Vercel to confirm DNS and SSL.
6. Set `NEXT_PUBLIC_APP_URL=https://admin.tennisgrowth.com` and redeploy if it was previously different.

## 7. Acceptance checks

Do not enable real customer delivery until all checks pass:

1. Rob and Jake can sign in without ChatGPT.
2. Unauthorised accounts receive the access-denied screen.
3. Refresh and logout work.
4. The operational demonstration data loads.
5. Customer, programme, register, invoice and payment actions persist after refresh.
6. Duplicate invoice protection blocks a second active invoice for the same player, programme and term.
7. Test Mode sends only to the signed-in test recipient.
8. The matching PDF is attached.
9. Communication history and invoice status update after provider success.
10. Live Mode is enabled deliberately and tested with a controlled recipient.

Microsoft sending is not accepted until `info@supremetennis.co.uk` has successfully completed the Microsoft consent flow and sent a controlled test message.

## 8. Rollback

The protected ChatGPT-hosted operational application remains the rollback reference. Do not remove it or its working Gmail connection until the independent production system has completed acceptance testing.
