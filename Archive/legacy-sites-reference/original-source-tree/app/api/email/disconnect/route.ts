import { disconnectTenantEmail } from "../../../../lib/tenant-email";

export async function POST(request:Request){
  try{const body=await request.json().catch(()=>({})) as {provider?:"Google"|"Microsoft"};await disconnectTenantEmail(request,body.provider);return Response.json({ok:true})}
  catch(error){return Response.json({error:error instanceof Error?error.message:"The email account could not be disconnected"},{status:400})}
}
