import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { tenantMemberships } from "../../../db/schema";
import { ensureTenantForRequest } from "../../../lib/tenant";

export async function GET(request: Request) {
  try {
    const context = await ensureTenantForRequest(request);
    const users = await getDb().select({
      email: tenantMemberships.userEmail,
      displayName: tenantMemberships.displayName,
      role: tenantMemberships.role,
      status: tenantMemberships.status,
      lastSignedInAt: tenantMemberships.lastSignedInAt
    }).from(tenantMemberships).where(eq(tenantMemberships.tenantId, context.tenantId)).orderBy(asc(tenantMemberships.id));
    return Response.json({ users }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Users unavailable" }, { status: 403 });
  }
}
