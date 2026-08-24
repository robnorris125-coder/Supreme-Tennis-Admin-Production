# Security notes

## Included controls

- Supabase Auth replaces ChatGPT identity headers.
- Page and API access requires an authenticated, active membership email.
- Provider access and refresh tokens stay server-side.
- Provider tokens are encrypted before database storage.
- `.env.example` contains no credentials.
- Supabase operational tables have RLS enabled with direct Data API access denied.
- The Vercel application uses a server-side pooled Postgres connection.
- OAuth state is checked against the tenant connection record.
- Invoice duplicate protection is backed by a unique active billing key.

## First-pilot boundary

The exact current operational model stores customers, programmes, invoices, registers and payments in one workspace. Those tables do not yet contain `tenant_id`. This is intentional in this exact-version export to avoid rewriting or destabilising the tested workflows.

Therefore:

- Use this deployment for the Supreme Tennis pilot only.
- Do not create a second unrelated commercial tenant in the same database.
- Do not claim full tenant-isolation acceptance yet.

Before commercial multi-business rollout, add a non-null `tenant_id` to every operational table, backfill the Supreme Tennis records, add composite tenant-safe keys and foreign keys, and enforce tenant scope in every query and mutation. Complete hostile cross-tenant route and ID manipulation tests before release.

## Secrets

Never commit:

- `.env.local`
- Supabase service-role keys
- Postgres passwords
- Google or Microsoft client secrets
- OAuth JSON credentials
- OAuth access or refresh tokens
- `GMAIL_TOKEN_KEY`

Rotate any credential that is accidentally disclosed.
