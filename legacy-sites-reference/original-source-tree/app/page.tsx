import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { tenantMemberships } from "../db/schema";
import { chatGPTSignOutPath, requireChatGPTUser } from "./chatgpt-auth";
import AdminApp from "./AdminApp";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireChatGPTUser("/");
  const email = user.email.trim().toLowerCase();
  const [membership] = await getDb()
    .select()
    .from(tenantMemberships)
    .where(and(eq(tenantMemberships.userEmail, email), eq(tenantMemberships.status, "Active")))
    .limit(1);

  if (!membership) {
    return (
      <main className="access-page">
        <section className="access-card">
          <span className="access-logo">TG</span>
          <p className="section-kicker">Protected business access</p>
          <h1>This account is not authorised</h1>
          <p>
            You signed in as <strong>{email}</strong>. Ask the business owner to authorise this exact
            address, or switch to the authorised account.
          </p>
          <a className="primary button-link" href={chatGPTSignOutPath("/")}>Switch account</a>
        </section>
      </main>
    );
  }

  return <AdminApp />;
}
