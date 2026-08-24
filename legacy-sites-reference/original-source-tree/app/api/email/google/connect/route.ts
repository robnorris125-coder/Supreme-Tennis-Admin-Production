import { tenantGoogleAuthorisationUrl } from "../../../../../lib/tenant-email";

export async function GET(request:Request){
  try{return Response.redirect(await tenantGoogleAuthorisationUrl(request),302)}
  catch(error){return Response.redirect(`${new URL(request.url).origin}/?view=settings&email=error&message=${encodeURIComponent(error instanceof Error?error.message:"Google connection could not start")}`,302)}
}
