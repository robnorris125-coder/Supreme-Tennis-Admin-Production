# Export notes

## Protected source

The source checkout used for this export was clean at revision:

`059776b960adac14609bfe481a94755ff525b990`

The protected hosted application was not edited or redeployed.

## Exact source preservation

`legacy-sites-reference/original-source-tree/` contains the complete original source tree from that revision, excluding only repository metadata, installed dependencies, build outputs and disposable runtime caches.

No source file, configuration file or public asset from the original revision was omitted from that reference tree.

## Production adapter changes

The active repository root contains the same application feature code with the minimum platform adapters required for the requested target:

- Native Next.js build scripts replace Vinext and Cloudflare build scripts.
- Supabase Auth replaces ChatGPT identity headers.
- Supabase Postgres replaces Cloudflare D1.
- PostgreSQL Drizzle schema replaces SQLite Drizzle syntax.
- Vercel configuration and production-domain callback handling are included.
- Supabase schema, access protection and initial membership seed are included.

The operational UI and tested workflow implementation in `app/AdminApp.tsx`, API routes, email services and public assets were retained.

## Not included

- `.git` repository metadata
- `node_modules`
- build output such as `.next` and `dist`
- disposable Sites runtime caches
- credentials, tokens, database passwords or live environment files

Those items should never be uploaded as application source.
