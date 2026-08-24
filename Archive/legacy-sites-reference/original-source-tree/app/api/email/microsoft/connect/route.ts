import { tenantMicrosoftAuthorisationUrl } from "../../../../../lib/tenant-email";

export async function GET(request:Request){
  try{return Response.redirect(await tenantMicrosoftAuthorisationUrl(request),302)}
  catch(error){return Response.redirect(`${new URL(request.url).origin}/?view=settings&email=error&message=${encodeURIComponent(error instanceof Error?error.message:"Microsoft connection could not start")}`,302)}
}
