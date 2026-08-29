import { calendarAuthorisationUrl } from "../../../../lib/google-calendar";
import { ensureTenantForRequest } from "../../../../lib/tenant";

export async function GET(request:Request){
  try{
    const coachId=new URL(request.url).searchParams.get("coachId")?.trim();
    if(!coachId)return Response.json({error:"Choose a coach first"},{status:400});
    const tenant=await ensureTenantForRequest(request);
    return Response.redirect(await calendarAuthorisationUrl(request,tenant.tenantId,coachId),302);
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Google Calendar connection could not start"},{status:503})}
}
