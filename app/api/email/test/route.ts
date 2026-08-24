import { sendTenantEmail } from "../../../../lib/tenant-email";

export async function POST(request:Request){
  try{
    const result=await sendTenantEmail(request,{recipient:"test-recipient@example.com",intendedRecipient:"test-recipient@example.com",subject:"Tennis Growth Admin connection test",body:"Your Google account is connected. This safe test confirms that Tennis Growth Admin can send a separate email from your account. No customer received this message.",messageType:"System",deliveryMode:"test"});
    return Response.json({ok:true,messageId:result.messageId,recipient:result.actualRecipient,sendingAccount:result.sendingAccount});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"The safe test could not be sent"},{status:400})}
}
