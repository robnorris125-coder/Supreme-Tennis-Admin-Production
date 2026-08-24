# GitHub upload check

The repository root must contain these folders after upload:

- `app/`
- `db/`
- `drizzle/`
- `lib/`
- `public/`
- `supabase/`
- `tests/`

It must also contain `package.json`, `package-lock.json`, `next.config.ts`,
`proxy.ts`, `tsconfig.json`, `vercel.json` and `.env.example`.

If GitHub shows only the loose configuration files and no `app/` folder,
the browser upload has omitted the folders. Vercel will then report:

`Couldn't find any pages or app directory.`

Do not import that incomplete repository into Vercel. Upload or push the full
directory tree, then confirm that `app/page.tsx` is visible on GitHub before
deploying.

Vercel settings:

- Framework preset: Next.js
- Root directory: repository root (`./`)
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: leave blank so Vercel detects Next.js automatically

