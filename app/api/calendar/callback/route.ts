import { completeCalendarAuthorisation } from "../../../../lib/google-calendar";
import { assertTenantMembership } from "../../../../lib/tenant";

export async function GET(request:Request){
  try{
    const connection=await completeCalendarAuthorisation(request);
    await assertTenantMembership(request,connection.tenant_id);
    return Response.redirect(`${new URL(request.url).origin}/private-lessons?calendar=connected`,302);
  }catch(error){
    const message=encodeURIComponent(error instanceof Error?error.message:"Google Calendar connection failed");
    return Response.redirect(`${new URL(request.url).origin}/private-lessons?calendar=error&message=${message}`,302);
  }
}
