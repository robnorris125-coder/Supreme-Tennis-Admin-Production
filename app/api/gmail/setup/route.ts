import { saveGmailSetup } from "../../../../lib/gmail";
import { ensureTenantForRequest } from "../../../../lib/tenant";

export async function POST(request:Request){
  try{
    await ensureTenantForRequest(request);
    const body=await request.json() as {clientId?:string;clientSecret?:string};
    await saveGmailSetup(body.clientId??"",body.clientSecret??"");
    return Response.json({ok:true});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"Gmail setup could not be saved"},{status:400});
  }
}
