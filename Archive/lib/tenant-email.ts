import { and, eq } from "drizzle-orm";
import { getDb, getRuntimeEnv } from "../db";
import { communicationMessages, emailConnections } from "../db/schema";
import { gmailStatus, platformGoogleCredentials } from "./gmail";
import { assertTenantMembership, ensureTenantForRequest } from "./tenant";

type DeliveryMode="test"|"live";
type SendInput={recipient:string;intendedRecipient?:string;subject:string;body:string;messageType?:string;deliveryMode:DeliveryMode;attachment?:{name:string;mimeType:string;bytes:Uint8Array};customerId?:string;playerId?:string;programmeId?:string;venue?:string;invoiceId?:number};

const bytesToBase64=(bytes:Uint8Array)=>{let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary)};
const base64ToBytes=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const utf8Base64=(value:string)=>bytesToBase64(new TextEncoder().encode(value));
const base64Url=(value:string)=>value.replaceAll("+","-").replaceAll("/","_").replace(/=+$/g,"");
const wrap=(value:string)=>value.match(/.{1,76}/g)?.join("\r\n")??"";

async function tokenKey(){
  const secret=getRuntimeEnv().GMAIL_TOKEN_KEY;
  if(!secret)throw new Error("Secure email connection storage is not configured");
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw",digest,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}
async function encrypt(value:string){const iv=crypto.getRandomValues(new Uint8Array(12)),encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},await tokenKey(),new TextEncoder().encode(value));return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`}
async function decrypt(value:string){const [iv,cipher]=value.split(".");if(!iv||!cipher)throw new Error("The saved email connection is invalid");const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv:base64ToBytes(iv)},await tokenKey(),base64ToBytes(cipher));return new TextDecoder().decode(clear)}

function friendlyFailure(message:string){
  const value=message.toLowerCase();
  if(value.includes("invalid_grant")||value.includes("revoked"))return {status:"Needs reconnection",category:"Access revoked",message:"The business email connection needs attention"};
  if(value.includes("rate")||value.includes("quota")||value.includes("limit"))return {status:"Connected",category:"Provider limit",message:"Email sending is temporarily unavailable. Try again later."};
  return {status:"Connection failed",category:"Provider error",message:"The email provider could not send this message. Please try again."};
}

async function connectionForTenant(tenantId:string,provider:"Google"|"Microsoft"){
  const [row]=await getDb().select().from(emailConnections).where(and(eq(emailConnections.tenantId,tenantId),eq(emailConnections.provider,provider))).limit(1);
  return row;
}

async function connectionsForTenant(tenantId:string){
  return getDb().select().from(emailConnections).where(eq(emailConnections.tenantId,tenantId));
}

function microsoftCredentials(){
  const env=getRuntimeEnv();
  return {clientId:env.TENNIS_GROWTH_MICROSOFT_CLIENT_ID||"",clientSecret:env.TENNIS_GROWTH_MICROSOFT_CLIENT_SECRET||""};
}

export async function tenantEmailStatus(request:Request){
  const context=await ensureTenantForRequest(request),connections=await connectionsForTenant(context.tenantId),legacy=await gmailStatus();
  const active=connections.find(row=>row.connectionStatus==="Connected"&&row.activeForSending),latest=[...connections].filter(row=>row.connectionStatus==="Connected").sort((a,b)=>b.connectedAt.localeCompare(a.connectedAt))[0],connection=active||latest;
  const tenantConnected=Boolean(connection),tenantReady=Boolean(active),googleCredentials=await platformGoogleCredentials(),microsoft=microsoftCredentials();
  return {
    tenantId:context.tenantId,userEmail:context.userEmail,
    status:connection?.connectionStatus||"Not connected",tenantConnected,
    connected:tenantReady||legacy.connected,
    email:tenantReady?connection?.connectedEmail||"":legacy.email,tenantEmail:connection?.connectedEmail||"",
    connectedAt:connection?.connectedAt||"",lastSuccessfulUse:connection?.lastSuccessfulUse||"",
    activeForSending:Boolean(connection?.activeForSending),provider:connection?.provider||(legacy.connected?"Protected fallback":""),
    testRecipient:context.userEmail,deliveryMode:legacy.deliveryMode,
    googleAvailable:Boolean(googleCredentials.clientId&&getRuntimeEnv().GMAIL_TOKEN_KEY),microsoftAvailable:Boolean(microsoft.clientId&&microsoft.clientSecret&&getRuntimeEnv().GMAIL_TOKEN_KEY),
    connections:connections.map(row=>({provider:row.provider,email:row.connectedEmail,status:row.connectionStatus,activeForSending:Boolean(row.activeForSending),connectedAt:row.connectedAt,lastSuccessfulUse:row.lastSuccessfulUse})),
    legacy:{connected:legacy.connected,email:legacy.email,deliveryMode:legacy.deliveryMode,protected:true}
  };
}

export async function tenantGoogleAuthorisationUrl(request:Request){
  const context=await ensureTenantForRequest(request),credentials=await platformGoogleCredentials();
  if(!credentials.clientId||!credentials.clientSecret||!getRuntimeEnv().GMAIL_TOKEN_KEY)throw new Error("Google connection is not available yet");
  const state=crypto.randomUUID(),now=new Date().toISOString(),existing=await connectionForTenant(context.tenantId,"Google");
  if(existing)await getDb().update(emailConnections).set({oauthState:state,connectionStatus:existing.connectedEmail?existing.connectionStatus:"Not connected",updatedAt:now}).where(eq(emailConnections.id,existing.id));
  else await getDb().insert(emailConnections).values({tenantId:context.tenantId,provider:"Google",oauthState:state,connectionStatus:"Not connected",createdAt:now,updatedAt:now});
  const redirectUri=`${new URL(request.url).origin}/api/gmail/callback`;
  const params=new URLSearchParams({client_id:credentials.clientId,redirect_uri:redirectUri,response_type:"code",scope:"openid email https://www.googleapis.com/auth/gmail.send",access_type:"offline",prompt:"consent select_account",include_granted_scopes:"true",state});
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function completeTenantGoogleAuthorisation(request:Request){
  const url=new URL(request.url),state=url.searchParams.get("state"),code=url.searchParams.get("code");
  if(!state||!code)return false;
  const [connection]=await getDb().select().from(emailConnections).where(and(eq(emailConnections.oauthState,state),eq(emailConnections.provider,"Google"))).limit(1);
  if(!connection)return false;
  await assertTenantMembership(request,connection.tenantId);
  const credentials=await platformGoogleCredentials(),redirectUri=`${url.origin}/api/gmail/callback`;
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:credentials.clientId,client_secret:credentials.clientSecret,redirect_uri:redirectUri,grant_type:"authorization_code"})});
  const token=await response.json() as {access_token?:string;refresh_token?:string;expires_in?:number;scope?:string;error_description?:string};
  if(!response.ok||!token.access_token)throw new Error(token.error_description||"Google did not approve the connection");
  const profileResponse=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{authorization:`Bearer ${token.access_token}`}}),profile=await profileResponse.json() as {email?:string};
  if(!profileResponse.ok||!profile.email)throw new Error("Google could not confirm the sending address");
  const now=new Date(),refresh=token.refresh_token?await encrypt(token.refresh_token):connection.encryptedRefreshToken;
  if(!refresh)throw new Error("Google did not provide a reusable connection. Please reconnect and approve access.");
  await getDb().update(emailConnections).set({connectedEmail:profile.email.toLowerCase(),encryptedAccessToken:await encrypt(token.access_token),encryptedRefreshToken:refresh,tokenExpiresAt:new Date(now.getTime()+(token.expires_in||3600)*1000).toISOString(),connectionStatus:"Connected",scopes:token.scope||"gmail.send",oauthState:"",connectedAt:now.toISOString(),lastFailureCategory:"",updatedAt:now.toISOString()}).where(eq(emailConnections.id,connection.id));
  return true;
}

export async function tenantMicrosoftAuthorisationUrl(request:Request){
  const context=await ensureTenantForRequest(request),credentials=microsoftCredentials();
  if(!credentials.clientId||!credentials.clientSecret||!getRuntimeEnv().GMAIL_TOKEN_KEY)throw new Error("Microsoft connection is not available yet");
  const state=crypto.randomUUID(),now=new Date().toISOString(),existing=await connectionForTenant(context.tenantId,"Microsoft");
  if(existing)await getDb().update(emailConnections).set({oauthState:state,connectionStatus:existing.connectedEmail?existing.connectionStatus:"Not connected",updatedAt:now}).where(eq(emailConnections.id,existing.id));
  else await getDb().insert(emailConnections).values({tenantId:context.tenantId,provider:"Microsoft",oauthState:state,connectionStatus:"Not connected",createdAt:now,updatedAt:now});
  const redirectUri=`${new URL(request.url).origin}/api/email/microsoft/callback`;
  const params=new URLSearchParams({client_id:credentials.clientId,redirect_uri:redirectUri,response_type:"code",response_mode:"query",scope:"openid profile email offline_access User.Read Mail.Send",prompt:"select_account",state});
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

export async function completeTenantMicrosoftAuthorisation(request:Request){
  const url=new URL(request.url),state=url.searchParams.get("state"),code=url.searchParams.get("code"),providerError=url.searchParams.get("error_description");
  if(providerError)throw new Error(providerError);
  if(!state||!code)throw new Error("Microsoft did not return a completed approval");
  const [connection]=await getDb().select().from(emailConnections).where(and(eq(emailConnections.oauthState,state),eq(emailConnections.provider,"Microsoft"))).limit(1);
  if(!connection)throw new Error("This Microsoft approval has expired. Start again from Settings.");
  await assertTenantMembership(request,connection.tenantId);
  const credentials=microsoftCredentials(),redirectUri=`${url.origin}/api/email/microsoft/callback`;
  const response=await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:credentials.clientId,client_secret:credentials.clientSecret,redirect_uri:redirectUri,grant_type:"authorization_code",scope:"openid profile email offline_access User.Read Mail.Send"})});
  const token=await response.json() as {access_token?:string;refresh_token?:string;expires_in?:number;scope?:string;error_description?:string};
  if(!response.ok||!token.access_token)throw new Error(token.error_description||"Microsoft did not approve the connection");
  const profileResponse=await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName",{headers:{authorization:`Bearer ${token.access_token}`}}),profile=await profileResponse.json() as {mail?:string;userPrincipalName?:string};
  const email=(profile.mail||profile.userPrincipalName||"").trim().toLowerCase();
  if(!profileResponse.ok||!email)throw new Error("Microsoft could not confirm the sending address");
  const now=new Date(),refresh=token.refresh_token?await encrypt(token.refresh_token):connection.encryptedRefreshToken;
  if(!refresh)throw new Error("Microsoft did not provide a reusable connection. Please reconnect and approve access.");
  await getDb().update(emailConnections).set({connectedEmail:email,encryptedAccessToken:await encrypt(token.access_token),encryptedRefreshToken:refresh,tokenExpiresAt:new Date(now.getTime()+(token.expires_in||3600)*1000).toISOString(),connectionStatus:"Connected",scopes:token.scope||"Mail.Send User.Read",oauthState:"",connectedAt:now.toISOString(),lastFailureCategory:"",updatedAt:now.toISOString()}).where(eq(emailConnections.id,connection.id));
}

async function googleAccessToken(tenantId:string){
  const connection=await connectionForTenant(tenantId,"Google");
  if(!connection||connection.connectionStatus!=="Connected"||!connection.encryptedRefreshToken)throw new Error("Connect Google in Settings before sending email");
  if(connection.encryptedAccessToken&&connection.tokenExpiresAt&&new Date(connection.tokenExpiresAt).getTime()>Date.now()+60_000)return {token:await decrypt(connection.encryptedAccessToken),connection};
  const credentials=await platformGoogleCredentials(),response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:credentials.clientId,client_secret:credentials.clientSecret,refresh_token:await decrypt(connection.encryptedRefreshToken),grant_type:"refresh_token"})}),result=await response.json() as {access_token?:string;expires_in?:number;error_description?:string};
  if(!response.ok||!result.access_token){const issue=friendlyFailure(result.error_description||"Token refresh failed");await getDb().update(emailConnections).set({connectionStatus:issue.status,lastFailureCategory:issue.category,updatedAt:new Date().toISOString()}).where(eq(emailConnections.id,connection.id));throw new Error(issue.message)}
  const expiresAt=new Date(Date.now()+(result.expires_in||3600)*1000).toISOString();
  await getDb().update(emailConnections).set({encryptedAccessToken:await encrypt(result.access_token),tokenExpiresAt:expiresAt,lastFailureCategory:"",updatedAt:new Date().toISOString()}).where(eq(emailConnections.id,connection.id));
  return {token:result.access_token,connection:{...connection,tokenExpiresAt:expiresAt}};
}

async function microsoftAccessToken(tenantId:string){
  const connection=await connectionForTenant(tenantId,"Microsoft");
  if(!connection||connection.connectionStatus!=="Connected"||!connection.encryptedRefreshToken)throw new Error("Connect Microsoft in Settings before sending email");
  if(connection.encryptedAccessToken&&connection.tokenExpiresAt&&new Date(connection.tokenExpiresAt).getTime()>Date.now()+60_000)return {token:await decrypt(connection.encryptedAccessToken),connection};
  const credentials=microsoftCredentials(),response=await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:credentials.clientId,client_secret:credentials.clientSecret,refresh_token:await decrypt(connection.encryptedRefreshToken),grant_type:"refresh_token",scope:"openid profile email offline_access User.Read Mail.Send"})}),result=await response.json() as {access_token?:string;expires_in?:number;error_description?:string};
  if(!response.ok||!result.access_token){const issue=friendlyFailure(result.error_description||"Token refresh failed");await getDb().update(emailConnections).set({connectionStatus:issue.status,lastFailureCategory:issue.category,updatedAt:new Date().toISOString()}).where(eq(emailConnections.id,connection.id));throw new Error(issue.message)}
  const expiresAt=new Date(Date.now()+(result.expires_in||3600)*1000).toISOString();
  await getDb().update(emailConnections).set({encryptedAccessToken:await encrypt(result.access_token),tokenExpiresAt:expiresAt,lastFailureCategory:"",updatedAt:new Date().toISOString()}).where(eq(emailConnections.id,connection.id));
  return {token:result.access_token,connection:{...connection,tokenExpiresAt:expiresAt}};
}

export interface EmailProvider{send(input:SendInput):Promise<{messageId:string;actualRecipient:string;sendingAccount:string}>}

class GoogleTenantProvider implements EmailProvider{
  constructor(private tenantId:string,private testRecipient:string){}
  async send(input:SendInput){
    const {token,connection}=await googleAccessToken(this.tenantId),isTest=input.deliveryMode==="test",actualRecipient=isTest?this.testRecipient:input.recipient,boundary=`tennis_growth_${crypto.randomUUID().replaceAll("-","")}`;
    const notice=isTest?`TEST DELIVERY\n\nThis email was sent only to ${this.testRecipient}. The intended recipient is ${input.intendedRecipient||input.recipient}.\n\n`:"";
    const parts=[`From: Tennis Growth Admin <${connection.connectedEmail}>`,`To: ${actualRecipient}`,`Subject: =?UTF-8?B?${utf8Base64(`${isTest?"[TEST] ":""}${input.subject}`)}?=`,`MIME-Version: 1.0`,`X-Tennis-Growth-Delivery-Mode: ${input.deliveryMode}`,`Content-Type: multipart/mixed; boundary="${boundary}"`,"",`--${boundary}`,"Content-Type: text/plain; charset=UTF-8","Content-Transfer-Encoding: base64","",wrap(utf8Base64(notice+input.body))];
    if(input.attachment)parts.push(`--${boundary}`,`Content-Type: ${input.attachment.mimeType}`,"Content-Transfer-Encoding: base64",`Content-Disposition: attachment; filename="${input.attachment.name}"`,"",wrap(bytesToBase64(input.attachment.bytes)));
    parts.push(`--${boundary}--`,"");
    const response=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify({raw:base64Url(utf8Base64(parts.join("\r\n")))})}),result=await response.json() as {id?:string;error?:{message?:string}};
    if(!response.ok||!result.id)throw new Error(result.error?.message||"Google did not accept the email");
    await getDb().update(emailConnections).set({activeForSending:false}).where(eq(emailConnections.tenantId,this.tenantId));
    await getDb().update(emailConnections).set({lastSuccessfulUse:new Date().toISOString(),connectionStatus:"Connected",activeForSending:true,lastFailureCategory:"",updatedAt:new Date().toISOString()}).where(eq(emailConnections.id,connection.id));
    return {messageId:result.id,actualRecipient,sendingAccount:connection.connectedEmail};
  }
}

class MicrosoftTenantProvider implements EmailProvider{
  constructor(private tenantId:string,private testRecipient:string){}
  async send(input:SendInput){
    const {token,connection}=await microsoftAccessToken(this.tenantId),isTest=input.deliveryMode==="test",actualRecipient=isTest?this.testRecipient:input.recipient;
    const notice=isTest?`TEST DELIVERY\n\nThis email was sent only to ${this.testRecipient}. The intended recipient is ${input.intendedRecipient||input.recipient}.\n\n`:"";
    const message:{subject:string;body:{contentType:"Text";content:string};toRecipients:{emailAddress:{address:string}}[];attachments?:{[key:string]:string}[]}={subject:`${isTest?"[TEST] ":""}${input.subject}`,body:{contentType:"Text",content:notice+input.body},toRecipients:[{emailAddress:{address:actualRecipient}}]};
    if(input.attachment)message.attachments=[{"@odata.type":"#microsoft.graph.fileAttachment",name:input.attachment.name,contentType:input.attachment.mimeType,contentBytes:bytesToBase64(input.attachment.bytes)}];
    const requestId=crypto.randomUUID(),response=await fetch("https://graph.microsoft.com/v1.0/me/sendMail",{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json","client-request-id":requestId},body:JSON.stringify({message,saveToSentItems:true})});
    if(!response.ok){const result=await response.json().catch(()=>({})) as {error?:{message?:string}};throw new Error(result.error?.message||"Microsoft did not accept the email")}
    await getDb().update(emailConnections).set({activeForSending:false}).where(eq(emailConnections.tenantId,this.tenantId));
    await getDb().update(emailConnections).set({lastSuccessfulUse:new Date().toISOString(),connectionStatus:"Connected",activeForSending:true,lastFailureCategory:"",updatedAt:new Date().toISOString()}).where(eq(emailConnections.id,connection.id));
    return {messageId:response.headers.get("request-id")||requestId,actualRecipient,sendingAccount:connection.connectedEmail};
  }
}

export async function sendTenantEmail(request:Request,input:SendInput){
  const context=await ensureTenantForRequest(request),now=new Date().toISOString(),connections=await connectionsForTenant(context.tenantId),connection=connections.find(row=>row.connectionStatus==="Connected"&&row.activeForSending)||[...connections].filter(row=>row.connectionStatus==="Connected").sort((a,b)=>b.connectedAt.localeCompare(a.connectedAt))[0];
  if(!connection)throw new Error("Connect the business email in Settings before sending messages");
  const provider:EmailProvider=connection.provider==="Microsoft"?new MicrosoftTenantProvider(context.tenantId,context.userEmail):new GoogleTenantProvider(context.tenantId,context.userEmail);
  try{
    const result=await provider.send(input);
    await getDb().insert(communicationMessages).values({tenantId:context.tenantId,customerId:input.customerId||"",playerId:input.playerId||"",programmeId:input.programmeId||"",venue:input.venue||"",recipient:result.actualRecipient,intendedRecipient:input.intendedRecipient||input.recipient,subject:input.subject,messageType:input.messageType||"General message",relatedInvoiceId:input.invoiceId,attachmentName:input.attachment?.name||"",sendingAccount:result.sendingAccount,deliveryMode:input.deliveryMode,sendStatus:"Sent",providerMessageId:result.messageId,sentAt:now,createdAt:now});
    return result;
  }catch(error){
    const message=error instanceof Error?error.message:"Email sending failed";
    await getDb().insert(communicationMessages).values({tenantId:context.tenantId,customerId:input.customerId||"",playerId:input.playerId||"",programmeId:input.programmeId||"",venue:input.venue||"",recipient:input.deliveryMode==="test"?context.userEmail:input.recipient,intendedRecipient:input.intendedRecipient||input.recipient,subject:input.subject,messageType:input.messageType||"General message",relatedInvoiceId:input.invoiceId,attachmentName:input.attachment?.name||"",sendingAccount:"",deliveryMode:input.deliveryMode,sendStatus:"Failed",failureReason:message,sentAt:now,createdAt:now});
    throw error;
  }
}

export async function disconnectTenantEmail(request:Request,providerName?:"Google"|"Microsoft"){
  const context=await ensureTenantForRequest(request),connections=await connectionsForTenant(context.tenantId),connection=providerName?connections.find(row=>row.provider===providerName):connections.find(row=>row.activeForSending)||connections.find(row=>row.connectionStatus==="Connected");
  if(connection)await getDb().update(emailConnections).set({encryptedAccessToken:"",encryptedRefreshToken:"",tokenExpiresAt:"",connectionStatus:"Not connected",connectedEmail:"",activeForSending:false,lastFailureCategory:"",updatedAt:new Date().toISOString()}).where(eq(emailConnections.id,connection.id));
}

export async function disconnectTenantGoogle(request:Request){return disconnectTenantEmail(request,"Google")}
