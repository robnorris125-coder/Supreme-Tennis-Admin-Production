import { getD1, getRuntimeEnv } from "../db";
import { platformGoogleCredentials } from "./gmail";
import { ensurePrivateLessonSchema, PrivateLessonBooking, PrivateLessonSlot } from "./private-lessons";

const bytesToBase64=(bytes:Uint8Array)=>{let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary)};
const base64ToBytes=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
async function tokenKey(){const secret=getRuntimeEnv().GMAIL_TOKEN_KEY;if(!secret)throw new Error("Calendar token protection is not configured");const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret));return crypto.subtle.importKey("raw",digest,{name:"AES-GCM"},false,["encrypt","decrypt"])}
async function encrypt(value:string){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},await tokenKey(),new TextEncoder().encode(value));return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`}
async function decrypt(value:string){const [iv,cipher]=value.split(".");if(!iv||!cipher)throw new Error("Stored calendar connection is invalid");const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv:base64ToBytes(iv)},await tokenKey(),base64ToBytes(cipher));return new TextDecoder().decode(clear)}

export async function calendarAuthorisationUrl(request:Request,tenantId:string,coachId:string){
  await ensurePrivateLessonSchema();
  const credentials=await platformGoogleCredentials();
  if(!credentials.clientId||!credentials.clientSecret)throw new Error("Google OAuth credentials are not configured");
  const state=crypto.randomUUID();
  await getD1().prepare(`insert into coach_calendar_connections (tenant_id,coach_id,oauth_state,updated_at) values (?,?,?,now()) on conflict (tenant_id,coach_id) do update set oauth_state=excluded.oauth_state,updated_at=now()`).bind(tenantId,coachId,state).run();
  const redirectUri=`${new URL(request.url).origin}/api/calendar/callback`;
  const params=new URLSearchParams({client_id:credentials.clientId,redirect_uri:redirectUri,response_type:"code",scope:"openid email https://www.googleapis.com/auth/calendar.events",access_type:"offline",prompt:"consent",include_granted_scopes:"true",state});
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function completeCalendarAuthorisation(request:Request){
  await ensurePrivateLessonSchema();
  const url=new URL(request.url),code=url.searchParams.get("code"),state=url.searchParams.get("state");
  if(!code||!state)throw new Error("Google Calendar authorisation could not be verified");
  const connection=await getD1().prepare(`select tenant_id,coach_id from coach_calendar_connections where oauth_state=? limit 1`).bind(state).first<{tenant_id:string;coach_id:string}>();
  if(!connection)throw new Error("Google Calendar authorisation state is invalid");
  const credentials=await platformGoogleCredentials();
  if(!credentials.clientId||!credentials.clientSecret)throw new Error("Google OAuth credentials are not configured");
  const redirectUri=`${url.origin}/api/calendar/callback`;
  const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:credentials.clientId,client_secret:credentials.clientSecret,redirect_uri:redirectUri,grant_type:"authorization_code"})});
  const token=await tokenResponse.json() as {access_token?:string;refresh_token?:string;error_description?:string};
  if(!tokenResponse.ok||!token.access_token||!token.refresh_token)throw new Error(token.error_description||"Google did not return a reusable Calendar connection");
  const profileResponse=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{authorization:`Bearer ${token.access_token}`}});
  const profile=await profileResponse.json() as {email?:string};
  if(!profileResponse.ok||!profile.email)throw new Error("Google could not confirm the coach email address");
  await getD1().prepare(`update coach_calendar_connections set google_email=?,encrypted_refresh_token=?,oauth_state='',connected_at=now(),updated_at=now() where tenant_id=? and coach_id=?`).bind(profile.email.toLowerCase(),await encrypt(token.refresh_token),connection.tenant_id,connection.coach_id).run();
  return connection;
}

async function accessToken(tenantId:string,coachId:string){
  await ensurePrivateLessonSchema();
  const row=await getD1().prepare(`select encrypted_refresh_token from coach_calendar_connections where tenant_id=? and coach_id=? and encrypted_refresh_token<>'' limit 1`).bind(tenantId,coachId).first<{encrypted_refresh_token:string}>();
  if(!row)return "";
  const credentials=await platformGoogleCredentials();
  if(!credentials.clientId||!credentials.clientSecret)return "";
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:credentials.clientId,client_secret:credentials.clientSecret,refresh_token:await decrypt(row.encrypted_refresh_token),grant_type:"refresh_token"})});
  const token=await response.json() as {access_token?:string};
  return response.ok&&token.access_token?token.access_token:"";
}

export async function addPrivateLessonCalendarEvent(slot:PrivateLessonSlot,booking:PrivateLessonBooking){
  const token=await accessToken(slot.tenant_id,slot.coach_id); if(!token)return "";
  const event={summary:`Private Lesson - ${booking.player_name}`,location:`${slot.venue}${slot.court?` - ${slot.court}`:""}`,description:[`Supreme Tennis private lesson`,`Player: ${booking.player_name}`,booking.parent_name?`Parent/client: ${booking.parent_name}`:"",booking.phone?`Phone: ${booking.phone}`:"",booking.email?`Email: ${booking.email}`:"",booking.notes?`Notes: ${booking.notes}`:""].filter(Boolean).join("\n"),start:{dateTime:new Date(slot.start_at).toISOString(),timeZone:"Europe/London"},end:{dateTime:new Date(slot.end_at).toISOString(),timeZone:"Europe/London"}};
  const response=await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events",{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify(event)});
  if(!response.ok)return ""; const result=await response.json() as {id?:string}; return result.id??"";
}
