import { tenantEmailStatus } from "../../../../lib/tenant-email";

export async function GET(request:Request){
  try{return Response.json(await tenantEmailStatus(request))}
  catch(error){return Response.json({error:error instanceof Error?error.message:"Email status is unavailable"},{status:400})}
}
