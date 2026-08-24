import { gmailStatus } from "../../../../lib/gmail";
import { ensureTenantForRequest } from "../../../../lib/tenant";

export async function GET(request:Request){
  try{await ensureTenantForRequest(request);return Response.json(await gmailStatus())}
  catch(error){return Response.json({configured:false,connected:false,email:"robnorris125@gmail.com",testRecipient:"robnorris125@gmail.com",deliveryMode:"test",error:error instanceof Error?error.message:"Gmail status unavailable"},{status:500})}
}
