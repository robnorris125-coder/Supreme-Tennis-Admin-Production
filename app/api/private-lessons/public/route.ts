import { getD1 } from "../../../../db";
import { addPrivateLessonCalendarEvent } from "../../../../lib/google-calendar";
import { ensurePrivateLessonSchema, PrivateLessonBooking, PrivateLessonSlot } from "../../../../lib/private-lessons";
const TENANT_ID="tenant-supreme-tennis";

export async function GET(){
  try{await ensurePrivateLessonSchema();const rows=(await getD1().prepare(`select id,coach_id,coach_name,venue,court,start_at,end_at,price_pence,court_confirmed_until from private_lesson_slots where tenant_id=? and status='Available' and start_at>now() and court_confirmed_until>now() order by start_at asc limit 80`).bind(TENANT_ID).all()).results;return Response.json({slots:rows})}
  catch(error){return Response.json({error:error instanceof Error?error.message:"Available lessons could not load"},{status:500})}
}
export async function POST(request:Request){
  try{
    await ensurePrivateLessonSchema();const body=await request.json() as Record<string,unknown>;const slotId=Number(body.slotId),playerName=String(body.playerName??"").trim(),parentName=String(body.parentName??"").trim(),email=String(body.email??"").trim().toLowerCase(),phone=String(body.phone??"").trim(),notes=String(body.notes??"").trim();
    if(!slotId||!playerName||!email.includes("@"))throw new Error("Player name and a valid email address are required");
    const db=getD1(); const slot=await db.prepare(`update private_lesson_slots set status='Booked',updated_at=now() where id=? and tenant_id=? and status='Available' and start_at>now() and court_confirmed_until>now() returning *`).bind(slotId,TENANT_ID).first<PrivateLessonSlot>();
    if(!slot)return Response.json({error:"That lesson slot is no longer available. Please choose another time."},{status:409});
    let booking:PrivateLessonBooking;
    try{booking=await db.prepare(`insert into private_lesson_bookings (tenant_id,slot_id,player_name,parent_name,email,phone,notes,status) values (?,?,?,?,?,?,?,'Confirmed') returning *`).bind(TENANT_ID,slotId,playerName,parentName,email,phone,notes).first<PrivateLessonBooking>() as PrivateLessonBooking}
    catch(error){await db.prepare(`update private_lesson_slots set status='Available',updated_at=now() where id=? and tenant_id=?`).bind(slotId,TENANT_ID).run();throw error}
    const eventId=await addPrivateLessonCalendarEvent(slot,booking).catch(()=> "");
    if(eventId)await db.prepare(`update private_lesson_bookings set google_calendar_event_id=?,updated_at=now() where id=?`).bind(eventId,booking.id).run();
    return Response.json({ok:true,bookingId:booking.id,calendarAdded:Boolean(eventId),slot:{coachName:slot.coach_name,venue:slot.venue,court:slot.court,startAt:slot.start_at,endAt:slot.end_at}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"The lesson could not be booked"},{status:400})}
}
