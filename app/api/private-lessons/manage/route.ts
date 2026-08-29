import { getD1 } from "../../../../db";
import { ensureTenantForRequest } from "../../../../lib/tenant";
import { ensurePrivateLessonSchema } from "../../../../lib/private-lessons";

export async function GET(request:Request){
  try{
    const tenant=await ensureTenantForRequest(request); await ensurePrivateLessonSchema(); const db=getD1();
    const staff=(await db.prepare(`select id,name,email,status from staff where status='Active' order by name`).all()).results;
    const slots=(await db.prepare(`select * from private_lesson_slots where tenant_id=? order by start_at asc`).bind(tenant.tenantId).all()).results;
    const connections=(await db.prepare(`select coach_id,google_email,connected_at from coach_calendar_connections where tenant_id=? and encrypted_refresh_token<>''`).bind(tenant.tenantId).all()).results;
    return Response.json({staff,slots,connections});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Private lessons could not load"},{status:401})}
}

export async function POST(request:Request){
  try{
    const tenant=await ensureTenantForRequest(request); await ensurePrivateLessonSchema(); const body=await request.json() as Record<string,unknown>; const action=String(body.action??""); const db=getD1();
    if(action==="createSlot"){
      const coachId=String(body.coachId??"").trim(),venue=String(body.venue??"").trim(),court=String(body.court??"").trim(),startAt=String(body.startAt??""),endAt=String(body.endAt??""),notes=String(body.notes??"").trim();
      const pricePence=Math.max(0,Number(body.pricePence??0)); if(!coachId||!venue||!startAt||!endAt)throw new Error("Coach, venue, date and time are required");
      const coach=await db.prepare(`select id,name from staff where id=? and status='Active' limit 1`).bind(coachId).first<{id:string;name:string}>(); if(!coach)throw new Error("That coach is not active");
      const start=new Date(startAt),end=new Date(endAt); if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)throw new Error("Enter a valid lesson time"); if(start<=new Date())throw new Error("Private lesson slots must be in the future");
      const clash=await db.prepare(`select id from private_lesson_slots where tenant_id=? and coach_id=? and status in ('Available','Booked') and start_at < ?::timestamptz and end_at > ?::timestamptz limit 1`).bind(tenant.tenantId,coachId,end.toISOString(),start.toISOString()).first(); if(clash)throw new Error("That coach already has a private-lesson slot at this time");
      await db.prepare(`insert into private_lesson_slots (tenant_id,coach_id,coach_name,venue,court,start_at,end_at,price_pence,status,court_source,court_checked_at,court_confirmed_until,notes) values (?,?,?,?,?,?,?,?,'Available','Manual',now(),now()+interval '24 hours',?)`).bind(tenant.tenantId,coach.id,coach.name,venue,court,start.toISOString(),end.toISOString(),pricePence,notes).run();
      return Response.json({ok:true});
    }
    if(action==="reconfirmCourt"){await db.prepare(`update private_lesson_slots set court_checked_at=now(),court_confirmed_until=now()+interval '24 hours',updated_at=now() where id=? and tenant_id=? and status='Available'`).bind(Number(body.id),tenant.tenantId).run();return Response.json({ok:true})}
    if(action==="cancelSlot"){await db.prepare(`update private_lesson_slots set status='Cancelled',updated_at=now() where id=? and tenant_id=? and status='Available'`).bind(Number(body.id),tenant.tenantId).run();return Response.json({ok:true})}
    throw new Error("Unknown private lesson action");
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Private lesson action failed"},{status:400})}
}
