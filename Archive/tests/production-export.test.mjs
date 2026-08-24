import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production package targets Next.js, Vercel and Supabase", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const vercel = JSON.parse(await read("vercel.json"));
  const env = await read(".env.example");

  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(vercel.framework, "nextjs");
  assert.match(env, /NEXT_PUBLIC_SUPABASE_URL=/);
  assert.match(env, /SUPABASE_DB_URL=/);
  assert.doesNotMatch(env, /=[^\n#]+(?:secret|token|password)/i);
});

test("complete Next.js App Router source tree is present at repository root", async () => {
  const layout = await read("app/layout.tsx");
  const page = await read("app/page.tsx");
  const admin = await read("app/AdminApp.tsx");
  const workspaceRoute = await read("app/api/workspace/route.ts");
  const proxy = await read("proxy.ts");
  const socialImage = await read("public/tennis-growth-social.png");

  assert.match(layout, /RootLayout/);
  assert.match(page, /export default async function Page/);
  assert.match(admin, /Tennis Growth/);
  assert.match(workspaceRoute, /export async function GET/);
  assert.match(proxy, /getClaims/);
  assert.ok(socialImage.length > 0);
});

test("authentication, schema and protected source reference are included", async () => {
  const page = await read("app/page.tsx");
  const schema = await read("db/schema.ts");
  const migration = await read("supabase/migrations/20260821000100_initial_schema.sql");
  const legacy = await read("legacy-sites-reference/chatgpt-auth.ts");

  assert.match(page, /requireSupabaseUser/);
  assert.match(schema, /pgTable\("invoices"/);
  assert.match(migration, /enable row level security/i);
  assert.match(legacy, /ChatGPT/);
});

test("tested operational workflows remain present", async () => {
  const admin = await read("app/AdminApp.tsx");
  const workspace = await read("app/api/workspace/route.ts");

  for (const label of ["Invoice Group", "Weekly registers", "Review Next Term", "Trial", "Reports"])
    assert.match(admin, new RegExp(label));

  assert.match(workspace, /activeBillingKey/);
  assert.match(workspace, /sendTenantEmail/);
  assert.match(workspace, /trialSessionsAllowed/);
});
