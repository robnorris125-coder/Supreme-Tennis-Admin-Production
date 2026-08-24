import { completeTenantMicrosoftAuthorisation } from "../../../../../lib/tenant-email";

export async function GET(request:Request){
  try{
    await completeTenantMicrosoftAuthorisation(request);
    return Response.redirect(`${new URL(request.url).origin}/?view=settings&email=connected&provider=microsoft`,302);
  }catch(error){
    return Response.redirect(`${new URL(request.url).origin}/?view=settings&email=error&message=${encodeURIComponent(error instanceof Error?error.message:"Microsoft connection failed")}`,302);
  }
}
