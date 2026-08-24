# Tennis Growth Admin

Production export of the current Tennis Growth Admin operational application.

This package preserves the current interface, workflows, routes, data model and assets while replacing the ChatGPT Sites runtime adapters with:

- Next.js for Vercel
- Supabase Auth
- Supabase Postgres
- Supabase-compatible database migrations

The protected reference deployment at `supreme-tennis-admin.robnorris125.chatgpt.site` was not changed while this export was produced.

## Export provenance

- Source project: `supreme-tennis-admin`
- Source project ID: `appgprj_6a8614833b34819193caf4bc3dfac1f3`
- Source revision: `059776b960adac14609bfe481a94755ff525b990`
- Export target: GitHub, Vercel and Supabase
- Intended production domain: `https://admin.tennisgrowth.com`

The original Sites runtime files and SQLite migrations are retained under `legacy-sites-reference/`. They are excluded from the Vercel build but remain available as an exact implementation reference.

## Requirements

- Node.js 20.11 or newer
- npm
- A Supabase project
- A Vercel project
- Central Google and/or Microsoft OAuth applications for production email connections

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in the Supabase values and database connection string.
3. Install dependencies with `npm ci`.
4. Apply `supabase/migrations/20260821000100_initial_schema.sql` to the Supabase project.
5. Apply `supabase/seed.sql` after reviewing the authorised email addresses.
6. Create matching Supabase Auth users or send invitations from the Supabase dashboard.
7. Start the application with `npm run dev`.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the exact GitHub, Supabase, Vercel and domain steps.

## Environment variables

Every supported variable is documented in [.env.example](.env.example). The example contains names and descriptions only. It contains no secrets.

## Security and deployment scope

The Supabase Data API is blocked from reading the operational tables directly. Application reads and writes run only through authenticated server routes and the server-side database connection.

This export preserves the current single-workspace operational data model. It is suitable for the first Supreme Tennis production pilot. Before onboarding unrelated paying businesses, add `tenant_id` to every operational table and enforce tenant filtering in every server query. The existing email connection and communication tables are already tenant-aware, but the complete operational data model is not yet commercially multi-tenant. See [SECURITY.md](SECURITY.md).

Do not represent this export as having passed Microsoft production OAuth, tenant-isolation or live-domain acceptance testing until those tests have actually been completed against the connected accounts.
