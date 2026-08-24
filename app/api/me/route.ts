import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { tenantMemberships } from "../../../db/schema";
import { ensureTenantForRequest } from "../../../lib/tenant";

export async function GET(request: Request) {
  try {
    const context = await ensureTenantForRequest(request);
    const [membership] = await getDb().select().from(tenantMemberships).where(and(
      eq(tenantMemberships.tenantId, context.tenantId),
      eq(tenantMemberships.userEmail, context.userEmail)
    )).limit(1);
    return Response.json({
      email: context.userEmail,
      displayName: membership?.displayName || context.userEmail,
      role: membership?.role || context.role
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Account unavailable" }, { status: 403 });
  }
}
