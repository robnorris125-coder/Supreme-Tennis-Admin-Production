import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { tenantMemberships } from "../db/schema";

export type TenantContext={tenantId:string;userEmail:string;role:string};

function authenticatedEmail(request:Request){
  const email=request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if(!email||!email.includes("@"))throw new Error("Sign in to manage this business email connection");
  return email;
}

export async function ensureTenantForRequest(request:Request):Promise<TenantContext>{
  const userEmail=authenticatedEmail(request),db=getDb();
  const [membership]=await db.select().from(tenantMemberships).where(and(eq(tenantMemberships.userEmail,userEmail),eq(tenantMemberships.status,"Active"))).limit(1);
  if(!membership)throw new Error("This account has not been authorised for Tennis Growth Admin");
  await db.update(tenantMemberships).set({lastSignedInAt:new Date().toISOString()}).where(eq(tenantMemberships.id,membership.id));
  return {tenantId:membership.tenantId,userEmail,role:membership.role};
}

export async function assertTenantMembership(request:Request,tenantId:string){
  const userEmail=authenticatedEmail(request),[membership]=await getDb().select().from(tenantMemberships).where(and(eq(tenantMemberships.tenantId,tenantId),eq(tenantMemberships.userEmail,userEmail),eq(tenantMemberships.status,"Active"))).limit(1);
  if(!membership)throw new Error("This Google connection belongs to a different business");
  return {tenantId,userEmail,role:membership.role};
}
