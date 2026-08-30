import { eq } from "drizzle-orm";
import { getDb, getRuntimeEnv } from "../db";
import { settings } from "../db/schema";

const SENDER_EMAIL="robnorris125@gmail.com";
export const TEST_RECIPIENT="robnorris125@gmail.com";

const bytesToBase64=(bytes:Uint8Array)=>{
  let binary="";
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
};
const base64ToBytes=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const utf8Base64=(value:string)=>bytesToBase64(new TextEncoder().encode(value));
const base64Url=(value:string)=>value.replaceAll("+","-").replaceAll("/","_").replace(/=+$/g,"");
const wrap=(value:string)=>value.match(/.{1,76}/g)?.join("\r\n")??"";

async function setting(key:string){
  const [row]=await getDb().select().from(settings).where(eq(settings.key,key));
  return row?.value??"";
}

async function saveSetting(key:string,value:string){
  await getDb().insert(settings).values({key,value}).onConflictDoUpdate({target:settings.key,set:{value}});
}

async function tokenKey(){
  const secret=getRuntimeEnv().GMAIL_TOKEN_KEY;
  if(!secret)throw new Error("Gmail token protection is not configured");
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw",digest,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}

async function encrypt(value:string){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},await tokenKey(),new TextEncoder().encode(value));
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

async function decrypt(value:string){
  const [iv,cipher]=value.split(".");
  if(!iv||!cipher)throw new Error("Stored Gmail connection is invalid");
  const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv:base64ToBytes(iv)},await tokenKey(),base64ToBytes(cipher));
  return new TextDecoder().decode(clear);
}

export async function platformGoogleCredentials(){
  const env=getRuntimeEnv();
  const storedClientId=await setting("gmail_oauth_client_id");
  const storedClientSecret=await setting("gmail_oauth_client_secret");
  return {
    clientId:env.TENNIS_GROWTH_GOOGLE_CLIENT_ID||env.GOOGLE_GMAIL_CLIENT_ID||storedClientId,
    clientSecret:env.TENNIS_GROWTH_GOOGLE_CLIENT_SECRET||env.GOOGLE_GMAIL_CLIENT_SECRET||(storedClientSecret?await decrypt(storedClientSecret):"")
  };
}

async function gmailCredentials(){return platformGoogleCredentials()}

export async function gmailConfigured(){
  const credentials=await gmailCredentials();
  return Boolean(credentials.clientId&&credentials.clientSecret&&getRuntimeEnv().GMAIL_TOKEN_KEY);
}

export async function saveGmailSetup(clientId:string,clientSecret:string){
  const cleanId=clientId.trim(),cleanSecret=clientSecret.trim();
  if(!cleanId.endsWith(".apps.googleusercontent.com"))throw new Error("Enter the OAuth client ID issued by Google");
  if(cleanSecret.length<10)throw new Error("Enter the OAuth client secret issued by Google");
  if(!getRuntimeEnv().GMAIL_TOKEN_KEY)throw new Error("Secure Gmail storage is not available yet");
  await saveSetting("gmail_oauth_client_id",cleanId);
  await saveSetting("gmail_oauth_client_secret",await encrypt(cleanSecret));
  await saveSetting("gmail_connected_email","");
  await saveSetting("gmail_refresh_token","");
}

export async function gmailStatus(){
  const connectedEmail=await setting("gmail_connected_email");
  const deliveryMode=await setting("email_delivery_mode")==="live"?"live":"test";
  return {configured:await gmailConfigured(),connected:connectedEmail===SENDER_EMAIL,email:connectedEmail||SENDER_EMAIL,testRecipient:TEST_RECIPIENT,deliveryMode};
}

export async function gmailAuthorisationUrl(request:Request){
  const credentials=await gmailCredentials();
  if(!await gmailConfigured())throw new Error("Gmail connection setup is required");
  const state=crypto.randomUUID();
  await saveSetting("gmail_oauth_state",state);
  const redirectUri = "https://supreme-tennis-admin-production.vercel.app/api/gmail/callback";
  const params=new URLSearchParams({client_id:credentials.clientId,redirect_uri:redirectUri,response_type:"code",scope:"openid email https://www.googleapis.com/auth/gmail.send",access_type:"offline",prompt:"consent",include_granted_scopes:"true",login_hint:SENDER_EMAIL,state});
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function completeGmailAuthorisation(request:Request){
  const url=new URL(request.url),code=url.searchParams.get("code"),state=url.searchParams.get("state");
  if(!code||!state||state!==await setting("gmail_oauth_state"))throw new Error("Gmail authorisation could not be verified");
  const credentials=await gmailCredentials(),redirectUri="https://supreme-tennis-admin-production.vercel.app/api/gmail/callback";
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:credentials.clientId,client_secret:credentials.clientSecret,redirect_uri:redirectUri,grant_type:"authorization_code"})});
  const token=await response.json() as {access_token?:string;refresh_token?:string;error_description?:string};
  if(!response.ok||!token.access_token||!token.refresh_token)throw new Error(token.error_description||"Google did not return a reusable Gmail connection");
  const profileResponse=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{authorization:`Bearer ${token.access_token}`}});
  const profile=await profileResponse.json() as {email?:string;error_description?:string};
  if(!profileResponse.ok)throw new Error(profile.error_description||"Google could not confirm the connected email address");
  if(profile.email?.toLowerCase()!==SENDER_EMAIL)throw new Error(`Connect ${SENDER_EMAIL}, not a different Google account`);
  await saveSetting("gmail_refresh_token",await encrypt(token.refresh_token));
  await saveSetting("gmail_connected_email",SENDER_EMAIL);
  await saveSetting("gmail_oauth_state","");
}

async function accessToken(){
  const credentials=await gmailCredentials(),stored=await setting("gmail_refresh_token");
  if(!stored)throw new Error("Connect Gmail in Settings before sending invoices");
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:credentials.clientId,client_secret:credentials.clientSecret,refresh_token:await decrypt(stored),grant_type:"refresh_token"})});
  const token=await response.json() as {access_token?:string;error_description?:string};
  if(!response.ok||!token.access_token)throw new Error(token.error_description||"Gmail connection needs to be renewed");
  return token.access_token;
}

export async function gmailAccessToken(){return accessToken()}

export async function sendGmailInvoice(input:{intendedRecipient:string;subject:string;body:string;invoiceNumber:string;pdf:Uint8Array;deliveryMode:"test"|"live"},providedToken?:string){
  const token=providedToken??await accessToken(),boundary=`supreme_tennis_${crypto.randomUUID().replaceAll("-","")}`;
  const isTest=input.deliveryMode==="test",recipient=isTest?TEST_RECIPIENT:input.intendedRecipient;
  const testNotice=isTest?`TEST DELIVERY\n\nThis email was redirected to ${TEST_RECIPIENT}. In live mode it would be sent to ${input.intendedRecipient}.\n\n`:"";
  const mime=[
    `From: Supreme Tennis <${SENDER_EMAIL}>`,
    `To: ${recipient}`,
    `Subject: =?UTF-8?B?${utf8Base64(`${isTest?"[TEST] ":""}${input.subject}`)}?=`,
    "MIME-Version: 1.0",
    `X-Supreme-Tennis-Delivery-Mode: ${input.deliveryMode}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap(utf8Base64(testNotice+input.body.replace("The invoice PDF has been created in Supreme Tennis Admin. Attach the downloaded PDF to this email before sending.","The invoice PDF is attached to this email."))),
    `--${boundary}`,
    "Content-Type: application/pdf",
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${input.invoiceNumber}.pdf"`,
    "",
    wrap(bytesToBase64(input.pdf)),
    `--${boundary}--`,
    ""
  ].join("\r\n");
  const response=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify({raw:base64Url(utf8Base64(mime))})});
  const result=await response.json() as {id?:string;error?:{message?:string}};
  if(!response.ok||!result.id)throw new Error(result.error?.message||"Gmail did not accept the invoice email");
  return result.id;
}
