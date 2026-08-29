import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "../../db";
import { tenantMemberships } from "../../db/schema";
import { requireSupabaseUser } from "../../lib/supabase/server";
import PrivateLessonsClient from "./PrivateLessonsClient";
export const dynamic="force-dynamic";
export default async function PrivateLessonsPage(){
  const user=await requireSupabaseUser(); if(!user?.email)redirect("/login"); const email=user.email.trim().toLowerCase();
  const [membership]=await getDb().select().from(tenantMemberships).where(and(eq(tenantMemberships.userEmail,email),eq(tenantMemberships.status,"Active"))).limit(1);
  if(!membership)redirect("/"); return <PrivateLessonsClient/>;
}
