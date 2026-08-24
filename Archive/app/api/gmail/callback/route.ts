import { completeGmailAuthorisation } from "../../../../lib/gmail";
import { completeTenantGoogleAuthorisation } from "../../../../lib/tenant-email";
import { ensureTenantForRequest } from "../../../../lib/tenant";

export async function GET(request:Request){
  try{
    await ensureTenantForRequest(request);
    if(await completeTenantGoogleAuthorisation(request))return Response.redirect(`${new URL(request.url).origin}/?view=settings&email=connected`,302);
    await completeGmailAuthorisation(request);
    return Response.redirect(`${new URL(request.url).origin}/?view=invoices&gmail=connected`,302)
  }
  catch(error){
    const tenantFlow=new URL(request.url).searchParams.has("state");
    return Response.redirect(`${new URL(request.url).origin}/?view=${tenantFlow?"settings":"invoices"}&${tenantFlow?"email":"gmail"}=error&message=${encodeURIComponent(error instanceof Error?error.message:"Google connection failed")}`,302)
  }
}
