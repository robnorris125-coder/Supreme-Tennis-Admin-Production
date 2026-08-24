import { gmailAuthorisationUrl } from "../../../../lib/gmail";
import { ensureTenantForRequest } from "../../../../lib/tenant";

export async function GET(request:Request){
  try{await ensureTenantForRequest(request);return Response.redirect(await gmailAuthorisationUrl(request),302)}
  catch(error){return Response.json({error:error instanceof Error?error.message:"Gmail connection could not start"},{status:503})}
}
