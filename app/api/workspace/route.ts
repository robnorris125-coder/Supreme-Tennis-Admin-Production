import { and, asc, eq } from "drizzle-orm";
import { getD1, getDb } from "../../../db";
import { attendance, campBookings, camps, customers, emailOutbox, enrolments, invoiceEmailLogs, invoiceItems, invoices, payments, programmeRegisterMarks, programmeRegisters, programmes, rolloverDecisions, sessions, settings, staff, termRollovers, terms, venues } from "../../../db/schema";
import { getInvoicePdf } from "../invoice/route";
import { gmailAccessToken, gmailStatus, sendGmailInvoice } from "../../../lib/gmail";
import { sendTenantEmail, tenantEmailStatus } from "../../../lib/tenant-email";
import { ensureTenantForRequest } from "../../../lib/tenant";
import { addGroupSessionCalendarEvent } from "../../../lib/google-calendar";

const now="2026-08-20T08:00:00Z";
const billingKey=(customerId:string,programmeId:string,termId:string)=>`${customerId}|${programmeId}|${termId}`;
const ageInMonths=(dob:string,onDate:string)=>{if(!dob||!onDate)return null;const birth=new Date(`${dob}T12:00:00Z`),date=new Date(`${onDate}T12:00:00Z`);if(Number.isNaN(birth.valueOf())||Number.isNaN(date.valueOf()))return null;return (date.getUTCFullYear()-birth.getUTCFullYear())*12+date.getUTCMonth()-birth.getUTCMonth()-(date.getUTCDate()<birth.getUTCDate()?1:0)};
const seedCustomers = [
  {id:"ST-1042",player:"Maya Patel",payer:"Priya Patel",email:"priya.patel@example.com",phone:"07700 900214",programme:"Orange & Green",balance:"£0.00",payment:"Paid",status:"Active",medical:"No medical needs recorded",emergency:"Priya Patel · 07700 900214",consent:"Complete",dateOfBirth:"2017-06-14",createdAt:now},
  {id:"ST-1048",player:"Leo Williams",payer:"Sophie Williams",email:"sophie.w@example.com",phone:"07700 900327",programme:"Mini Red",balance:"£132.00",payment:"Due",status:"Active",medical:"Asthma · inhaler kept courtside",emergency:"Sophie Williams · 07700 900327",consent:"Complete",dateOfBirth:"2018-11-15",createdAt:now},
  {id:"ST-1051",player:"Ruby Bennett",payer:"Daniel Bennett",email:"daniel.b@example.com",phone:"07700 900418",programme:"Performance",balance:"£0.00",payment:"Paid",status:"Active",medical:"No medical needs recorded",emergency:"Daniel Bennett · 07700 900418",consent:"Complete",dateOfBirth:"2012-04-08",createdAt:now},
  {id:"ST-1057",player:"Noah Clarke",payer:"Amelia Clarke",email:"amelia.c@example.com",phone:"07700 900529",programme:"Mini Red",balance:"£132.00",payment:"Due",status:"Trial",medical:"Nut allergy · parent carries medication",emergency:"Amelia Clarke · 07700 900529",consent:"Pending",dateOfBirth:"2020-02-01",createdAt:now},
  {id:"ST-1063",player:"Evie Hughes",payer:"Charlotte Hughes",email:"charlotte.h@example.com",phone:"07700 900631",programme:"Junior Development",balance:"£66.00",payment:"Part paid",status:"Active",medical:"No medical needs recorded",emergency:"Charlotte Hughes · 07700 900631",consent:"Complete",dateOfBirth:"2015-09-21",createdAt:now}
];
const seedTerms=[
  {id:"autumn-2026",name:"Autumn Term 2026",startDate:"2026-09-07",endDate:"2026-12-18",sessionCount:10,status:"Current",sortOrder:1},
  {id:"winter-2027",name:"Winter Term 2027",startDate:"2027-01-04",endDate:"2027-02-12",sessionCount:6,status:"Optional",sortOrder:2},
  {id:"spring-2027",name:"Spring Term 2027",startDate:"2027-02-22",endDate:"2027-04-01",sessionCount:6,status:"Next",sortOrder:3},
  {id:"summer-2027",name:"Summer Term 2027",startDate:"2027-04-19",endDate:"2027-07-23",sessionCount:12,status:"Planned",sortOrder:4}
];
const seedProgrammes=[
  {id:"mini-red",name:"Mini Red",type:"Junior course",weekday:0,startTime:"16:00",venue:"Warsash Tennis Club",coach:"Jake",capacity:12,pricePence:1200,tone:"yellow",status:"Active",minAgeYears:4,maxAgeYears:7,suggestedNextProgrammeId:"orange-green"},
  {id:"orange-green",name:"Orange & Green",type:"Junior course",weekday:0,startTime:"17:00",venue:"Warsash Tennis Club",coach:"Jake",capacity:12,pricePence:1200,tone:"green",status:"Active",minAgeYears:7,maxAgeYears:10,suggestedNextProgrammeId:"junior-development"},
  {id:"junior-development",name:"Junior Development",type:"Junior course",weekday:2,startTime:"16:30",venue:"Abshot Country Club",coach:"Jake",capacity:16,pricePence:1100,tone:"blue",status:"Active",minAgeYears:10,maxAgeYears:14,suggestedNextProgrammeId:"performance"},
  {id:"performance",name:"Performance",type:"Junior course",weekday:3,startTime:"17:00",venue:"Abshot Country Club",coach:"Dillon",capacity:8,pricePence:1500,tone:"purple",status:"Active",minAgeYears:12,maxAgeYears:18,suggestedNextProgrammeId:""}
];
const seedSessions=[
  {day:0,start:"16:00",title:"Mini Red",meta:"2 players",venue:"Warsash Tennis Club",coach:"Jake",tone:"yellow",termId:"autumn-2026",duration:60,sessionDate:"2026-08-17"},
  {day:0,start:"17:00",title:"Orange & Green",meta:"1 player",venue:"Warsash Tennis Club",coach:"Jake",tone:"green",termId:"autumn-2026",duration:60,sessionDate:"2026-08-17"},
  {day:1,start:"10:00",title:"Private Lesson",meta:"Maya Patel",venue:"Abshot Country Club",coach:"Dillon",tone:"blue",termId:"autumn-2026",duration:60,sessionDate:"2026-08-18"},
  {day:2,start:"16:30",title:"Junior Development",meta:"1 player",venue:"Abshot Country Club",coach:"Jake",tone:"blue",termId:"autumn-2026",duration:60,sessionDate:"2026-08-19"},
  {day:3,start:"17:00",title:"Performance",meta:"1 player",venue:"Abshot Country Club",coach:"Dillon",tone:"purple",termId:"autumn-2026",duration:90,sessionDate:"2026-08-20"}
];
const seedCamps=[
  {id:"october-2026",name:"October Half-Term Camp",startDate:"2026-10-27",endDate:"2026-10-29",venue:"Warsash Tennis Club",time:"09:00–15:00",capacity:24,dayPricePence:3500,fullPricePence:9500,status:"Open"},
  {id:"christmas-2026",name:"Christmas Tennis Morning",startDate:"2026-12-21",endDate:"2026-12-21",venue:"Abshot Country Club",time:"09:00–12:00",capacity:16,dayPricePence:2200,fullPricePence:2200,status:"Draft"},
  {id:"february-2027",name:"February Half-Term Camp",startDate:"2027-02-16",endDate:"2027-02-18",venue:"Warsash Tennis Club",time:"09:00–15:00",capacity:24,dayPricePence:3500,fullPricePence:9500,status:"Planned"}
];
const seedVenues=[{id:"warsash",name:"Warsash Tennis Club",courts:4,status:"Active"},{id:"abshot",name:"Abshot Country Club",courts:3,status:"Active"}];
const seedStaff=[
  {id:"jake",name:"Jake",role:"Head Coach",email:"jake@supremetennis.test",phone:"07700 900701",qualifications:"LTA Level 4",safeguarding:"DBS and safeguarding current",employmentStatus:"Contractor",payRatePence:3000,notes:"Lead junior coach",status:"Active"},
  {id:"dillon",name:"Dillon",role:"Coach",email:"dillon@supremetennis.test",phone:"07700 900702",qualifications:"LTA Level 3",safeguarding:"DBS current",employmentStatus:"Contractor",payRatePence:2500,notes:"Performance groups",status:"Active"}
];
const seedEnrolments=[
  {programmeId:"mini-red",customerId:"ST-1048",termId:"autumn-2026",status:"Active",trialSessionsAllowed:0,trialSessionsCompleted:0,trialStatus:"",nextTrialSession:""},{programmeId:"mini-red",customerId:"ST-1057",termId:"autumn-2026",status:"Trial",trialSessionsAllowed:2,trialSessionsCompleted:1,trialStatus:"In Progress",nextTrialSession:"2026-09-14"},
  {programmeId:"orange-green",customerId:"ST-1042",termId:"autumn-2026",status:"Active"},{programmeId:"junior-development",customerId:"ST-1063",termId:"autumn-2026",status:"Active"},
  {programmeId:"performance",customerId:"ST-1051",termId:"autumn-2026",status:"Active"}
];
const seedPayments=[
  {invoiceId:null,customerId:"ST-1042",amountPence:12000,method:"Test card",status:"Paid",reference:"PAY-TEST-041",paidAt:"2026-08-18"},
  {invoiceId:null,customerId:"ST-1063",amountPence:5400,method:"Test bank transfer",status:"Paid",reference:"PAY-TEST-046",paidAt:"2026-08-17"}
];

async function resetTestData(){
  const d1=getD1();
  const gmailRows=await d1.prepare("SELECT key, value FROM settings WHERE key LIKE 'gmail_%'").all<{key:string;value:string}>();
  const statements=[
    ...["programme_register_marks","programme_registers","attendance","invoice_email_logs","email_outbox","payments","invoice_items","invoices","camp_bookings","rollover_decisions","term_rollovers","enrolments","sessions","programmes","camps","terms","customers","venues","staff","settings"].map(table=>d1.prepare(`DELETE FROM ${table}`)),
    ...seedCustomers.map(c=>d1.prepare("INSERT INTO customers (id,player,payer,email,phone,programme,balance,payment,status,medical,emergency,consent,date_of_birth,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(c.id,c.player,c.payer,c.email,c.phone,c.programme,c.balance,c.payment,c.status,c.medical,c.emergency,c.consent,c.dateOfBirth,c.createdAt)),
    ...seedTerms.map(t=>d1.prepare("INSERT INTO terms (id,name,start_date,end_date,session_count,status,sort_order) VALUES (?,?,?,?,?,?,?)").bind(t.id,t.name,t.startDate,t.endDate,t.sessionCount,t.status,t.sortOrder)),
    ...seedProgrammes.map(p=>d1.prepare("INSERT INTO programmes (id,name,type,weekday,start_time,venue,coach,capacity,price_pence,tone,status,min_age_years,max_age_years,suggested_next_programme_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(p.id,p.name,p.type,p.weekday,p.startTime,p.venue,p.coach,p.capacity,p.pricePence,p.tone,p.status,p.minAgeYears,p.maxAgeYears,p.suggestedNextProgrammeId)),
    ...seedSessions.map(s=>d1.prepare("INSERT INTO sessions (day,start,title,meta,venue,coach,tone,term_id,duration,session_date) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(s.day,s.start,s.title,s.meta,s.venue,s.coach,s.tone,s.termId,s.duration,s.sessionDate)),
    ...seedCamps.map(c=>d1.prepare("INSERT INTO camps (id,name,start_date,end_date,venue,time,capacity,day_price_pence,full_price_pence,status) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(c.id,c.name,c.startDate,c.endDate,c.venue,c.time,c.capacity,c.dayPricePence,c.fullPricePence,c.status)),
    ...seedVenues.map(v=>d1.prepare("INSERT INTO venues (id,name,courts,status) VALUES (?,?,?,?)").bind(v.id,v.name,v.courts,v.status)),
    ...seedStaff.map(s=>d1.prepare("INSERT INTO staff (id,name,role,email,phone,qualifications,safeguarding,employment_status,pay_rate_pence,notes,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(s.id,s.name,s.role,s.email,s.phone,s.qualifications,s.safeguarding,s.employmentStatus,s.payRatePence,s.notes,s.status)),
    ...seedEnrolments.map(e=>d1.prepare("INSERT INTO enrolments (programme_id,customer_id,term_id,status,trial_sessions_allowed,trial_sessions_completed,trial_status,next_trial_session) VALUES (?,?,?,?,?,?,?,?)").bind(e.programmeId,e.customerId,e.termId,e.status,"trialSessionsAllowed" in e?e.trialSessionsAllowed:0,"trialSessionsCompleted" in e?e.trialSessionsCompleted:0,"trialStatus" in e?e.trialStatus:"","nextTrialSession" in e?e.nextTrialSession:"")),
    ...seedPayments.map(p=>d1.prepare("INSERT INTO payments (invoice_id,customer_id,amount_pence,method,status,reference,paid_at) VALUES (?,?,?,?,?,?,?)").bind(p.invoiceId,p.customerId,p.amountPence,p.method,p.status,p.reference,p.paidAt)),
    d1.prepare("INSERT INTO settings (key,value) VALUES (?,?)").bind("calendar_test_connected","false"),
    d1.prepare("INSERT INTO settings (key,value) VALUES (?,?)").bind("business_name","Supreme Tennis"),
    d1.prepare("INSERT INTO settings (key,value) VALUES (?,?)").bind("invoice_prefix","ST"),
    d1.prepare("INSERT INTO settings (key,value) VALUES (?,?)").bind("email_delivery_mode","test"),
    d1.prepare("INSERT INTO settings (key,value) VALUES (?,?)").bind("workspace_initialised","true"),
    ...gmailRows.results.map(row=>d1.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(row.key,row.value))
  ];
  await d1.batch(statements);
}

async function seedIfEmpty(){
  const db=getDb();
  const [initialised]=await db.select().from(settings).where(eq(settings.key,"workspace_initialised"));
  if(initialised) return;
  if(!(await db.select().from(customers).limit(1)).length) await db.insert(customers).values(seedCustomers);
  if(!(await db.select().from(terms).limit(1)).length) await db.insert(terms).values(seedTerms);
  if(!(await db.select().from(programmes).limit(1)).length) await db.insert(programmes).values(seedProgrammes);
  if(!(await db.select().from(sessions).limit(1)).length) await db.insert(sessions).values(seedSessions);
  if(!(await db.select().from(camps).limit(1)).length) await db.insert(camps).values(seedCamps);
  if(!(await db.select().from(venues).limit(1)).length) await db.insert(venues).values(seedVenues);
  if(!(await db.select().from(staff).limit(1)).length) await db.insert(staff).values(seedStaff);
  if(!(await db.select().from(enrolments).limit(1)).length) await db.insert(enrolments).values(seedEnrolments);
  if(!(await db.select().from(payments).limit(1)).length) await db.insert(payments).values(seedPayments);
  await db.insert(settings).values([{key:"calendar_test_connected",value:"false"},{key:"business_name",value:"Supreme Tennis"},{key:"invoice_prefix",value:"ST"},{key:"email_delivery_mode",value:"test"},{key:"workspace_initialised",value:"true"}]).onConflictDoNothing();
}

async function snapshot(){
  const db=getDb(); await seedIfEmpty();
  const programmeRows=await db.select().from(programmes).orderBy(asc(programmes.name));
  const enrolmentRows=await db.select().from(enrolments);
  const sessionRows=await db.select().from(sessions).orderBy(asc(sessions.id));
  const derivedSessions=sessionRows.map(session=>{
    const programme=programmeRows.find(row=>row.name===session.title);
    const count=programme?enrolmentRows.filter(row=>row.programmeId===programme.id&&row.termId===session.termId&&row.status!=="Inactive").length:0;
    return {...session,meta:`${count} player${count===1?"":"s"}`};
  });
  return {
    customers:await db.select().from(customers).orderBy(asc(customers.createdAt)), sessions:derivedSessions,
    terms:await db.select().from(terms).orderBy(asc(terms.sortOrder)), programmes:programmeRows,
    enrolments:enrolmentRows, camps:await db.select().from(camps).orderBy(asc(camps.startDate)), campBookings:await db.select().from(campBookings),
    attendance:await db.select().from(attendance),
    programmeRegisters:await db.select().from(programmeRegisters).orderBy(asc(programmeRegisters.weekNumber)),
    programmeRegisterMarks:await db.select().from(programmeRegisterMarks).orderBy(asc(programmeRegisterMarks.id)),
    invoices:await db.select().from(invoices).orderBy(asc(invoices.id)), invoiceItems:await db.select().from(invoiceItems),
    payments:await db.select().from(payments).orderBy(asc(payments.paidAt)), emailOutbox:await db.select().from(emailOutbox).orderBy(asc(emailOutbox.id)),
    invoiceEmailLogs:await db.select().from(invoiceEmailLogs).orderBy(asc(invoiceEmailLogs.id)),
    termRollovers:await db.select().from(termRollovers).orderBy(asc(termRollovers.id)),
    rolloverDecisions:await db.select().from(rolloverDecisions).orderBy(asc(rolloverDecisions.id)),
    venues:await db.select().from(venues), staff:await db.select().from(staff), settings:await db.select().from(settings)
  };
}

async function prepareInvoiceEmail(invoiceId:number){
  const db=getDb();
  const [invoice]=await db.select().from(invoices).where(eq(invoices.id,invoiceId));
  if(!invoice) throw new Error("Invoice not found");
  if(invoice.lifecycleStatus!=="Active")throw new Error(`${invoice.invoiceNumber} is ${invoice.lifecycleStatus.toLowerCase()} and cannot be prepared or sent.`);
  const [customer]=await db.select().from(customers).where(eq(customers.id,invoice.customerId));
  const [programme]=await db.select().from(programmes).where(eq(programmes.id,invoice.programmeId));
  const [term]=await db.select().from(terms).where(eq(terms.id,invoice.termId));
  const [item]=await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId,invoice.id));
  if(!customer||!programme||!term) throw new Error("Invoice details are incomplete");
  if(!customer.payer.trim()) throw new Error(`Add a parent or payer for ${customer.player}`);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) throw new Error(`Add a valid parent email for ${customer.player}`);
  const businessSettings=await db.select().from(settings),setting=(key:string,fallback:string)=>businessSettings.find(row=>row.key===key)?.value||fallback,businessName=setting("business_name","Your tennis business"),emailSignature=setting("email_signature",`Kind regards,\n${businessName}`);
  const formatDate=(value:string)=>new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
  const parentFirstName=customer.payer.trim().split(/\s+/)[0]||"Parent";
  const subject=`${businessName} invoice ${invoice.invoiceNumber} for ${customer.player} · ${programme.name}`;
  const billedSessions=item?.quantity??term.sessionCount;
  const body=`Hi ${parentFirstName},\n\nPlease find attached the invoice for ${customer.player}'s place on ${programme.name} for ${term.name}.\n\nPlayer: ${customer.player}\nProgramme: ${programme.name}\nVenue: ${programme.venue}\nCoach: ${programme.coach}\nTerm dates: ${formatDate(term.startDate)} to ${formatDate(term.endDate)}\nSessions billed: ${billedSessions} of ${term.sessionCount}\nPrice per session: £${(programme.pricePence/100).toFixed(2)}\nTotal due: £${(invoice.amountPence/100).toFixed(2)}\nInvoice number: ${invoice.invoiceNumber}\nPayment due: ${formatDate(invoice.dueDate)}\n\nThe invoice PDF is attached to this email.\n\nThis is an operational test invoice. No payment is required.\n\n${emailSignature}`;
  const existing=(await db.select().from(emailOutbox).where(eq(emailOutbox.customerId,customer.id))).find(e=>e.subject.includes(invoice.invoiceNumber));
  const preparedAt=new Date().toISOString();
  const row={recipient:customer.email.trim(),subject,body,status:"Ready to send",createdAt:preparedAt};
  if(existing) await db.update(emailOutbox).set(row).where(eq(emailOutbox.id,existing.id));
  else await db.insert(emailOutbox).values({customerId:customer.id,...row});
  await db.update(invoices).set({emailStatus:"Ready to send",pdfRef:`/api/invoice?invoiceId=${invoice.id}`}).where(eq(invoices.id,invoice.id));
}

async function validateInvoiceForSending(invoiceId:number,{allowSent=false}:{allowSent?:boolean}={}){
  const db=getDb(),d1=getD1();
  const [invoice]=await db.select().from(invoices).where(eq(invoices.id,invoiceId));
  if(!invoice)throw new Error("Invoice not found");
  if(invoice.lifecycleStatus!=="Active")throw new Error(`${invoice.invoiceNumber} is ${invoice.lifecycleStatus.toLowerCase()} and cannot be sent.`);
  if(invoice.emailStatus==="Sent"&&!allowSent)throw new Error(`${invoice.invoiceNumber} has already been sent. Use Resend invoice if another copy is required.`);
  const duplicate=await d1.prepare("SELECT COUNT(*) AS count FROM invoices WHERE customer_id = ? AND programme_id = ? AND term_id = ? AND lifecycle_status = 'Active'").bind(invoice.customerId,invoice.programmeId,invoice.termId).first<{count:number}>();
  if(Number(duplicate?.count??0)>1)throw new Error(`Duplicate invoice detected for ${invoice.invoiceNumber}. Choose the valid invoice and void the duplicate before sending.`);
  const [customer]=await db.select().from(customers).where(eq(customers.id,invoice.customerId));
  const [programme]=await db.select().from(programmes).where(eq(programmes.id,invoice.programmeId));
  const [term]=await db.select().from(terms).where(eq(terms.id,invoice.termId));
  if(!customer||!programme||!term)throw new Error(`${invoice.invoiceNumber} is missing its player, programme or term.`);
  if(!customer.payer.trim())throw new Error(`${invoice.invoiceNumber} needs one parent or payer.`);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim()))throw new Error(`${invoice.invoiceNumber} needs one valid recipient email.`);
  if(invoice.pdfRef!==`/api/invoice?invoiceId=${invoice.id}`)throw new Error(`${invoice.invoiceNumber} does not have its matching PDF ready.`);
  return {invoice,customer,programme,term};
}

async function validateInvoiceBatch(invoiceIds:number[]){
  const d1=getD1(),problems:string[]=[],validated:Awaited<ReturnType<typeof validateInvoiceForSending>>[]=[];
  for(const invoiceId of invoiceIds){try{validated.push(await validateInvoiceForSending(invoiceId))}catch(error){problems.push(error instanceof Error?error.message:`Invoice ${invoiceId} needs fixing.`)}}
  if(new Set(validated.map(row=>`${row.invoice.programmeId}|${row.invoice.termId}`)).size>1)problems.push("This group contains invoices from different programmes or terms. Send each programme and term separately.");
  if(validated.length){
    const {programmeId,termId}=validated[0].invoice;
    const groupDuplicates=await d1.prepare("SELECT customer_id FROM invoices WHERE programme_id = ? AND term_id = ? AND lifecycle_status = 'Active' GROUP BY customer_id, programme_id, term_id HAVING COUNT(*) > 1 LIMIT 1").bind(programmeId,termId).first<{customer_id:string}>();
    if(groupDuplicates)problems.push("Duplicate invoice detected in this programme and term. Resolve it before sending any group invoices.");
  }
  const placeholders=invoiceIds.map(()=>"?").join(",");
  if(placeholders){
    const duplicateNumbers=await d1.prepare(`SELECT invoice_number, COUNT(*) AS count FROM invoices WHERE id IN (${placeholders}) GROUP BY invoice_number HAVING COUNT(*) > 1`).bind(...invoiceIds).all<{invoice_number:string;count:number}>();
    for(const row of duplicateNumbers.results)problems.push(`Invoice number ${row.invoice_number} is not unique.`);
  }
  if(problems.length)throw new Error([...new Set(problems)].join(" "));
}

async function sendInvoiceRecord(request:Request,invoiceId:number,deliveryMode:"test"|"live",token?:string,allowResend=false){
  const db=getDb();
  await validateInvoiceForSending(invoiceId,{allowSent:allowResend});
  const result=await getInvoicePdf(invoiceId);
  await prepareInvoiceEmail(invoiceId);
  const drafts=await db.select().from(emailOutbox).where(eq(emailOutbox.customerId,result.customer.id));
  const draft=drafts.find(row=>row.subject.includes(result.invoice.invoiceNumber));
  if(!draft)throw new Error(`Email draft missing for ${result.customer.player}`);
  const attemptedAt=new Date().toISOString(),tenantStatus=await tenantEmailStatus(request).catch(()=>null),useTenant=Boolean(tenantStatus?.tenantConnected&&tenantStatus.activeForSending),gmail=await gmailStatus();
  const actualRecipient=deliveryMode==="test"?(useTenant?tenantStatus!.testRecipient:gmail.testRecipient):draft.recipient;
  try{
    const sent=useTenant?await sendTenantEmail(request,{recipient:draft.recipient,intendedRecipient:draft.recipient,subject:draft.subject,body:draft.body,messageType:"Invoice",deliveryMode,attachment:{name:`${result.invoice.invoiceNumber}.pdf`,mimeType:"application/pdf",bytes:result.bytes},customerId:result.customer.id,playerId:result.customer.id,programmeId:result.invoice.programmeId,invoiceId}):{messageId:await sendGmailInvoice({intendedRecipient:draft.recipient,subject:draft.subject,body:draft.body,invoiceNumber:result.invoice.invoiceNumber,pdf:result.bytes,deliveryMode},token),actualRecipient,sendingAccount:gmail.email};
    await db.insert(invoiceEmailLogs).values({invoiceId,playerId:result.customer.id,payerId:result.customer.id,intendedRecipient:draft.recipient,actualRecipient:sent.actualRecipient,sendingAccount:sent.sendingAccount,sendStatus:"Sent",sentAt:attemptedAt,gmailMessageId:sent.messageId,pdfAttached:true,failureReason:"",deliveryMode});
    await db.update(emailOutbox).set({status:"Sent",createdAt:attemptedAt}).where(eq(emailOutbox.id,draft.id));
    await db.update(invoices).set({status:"Sent",emailStatus:"Sent",sentAt:attemptedAt,pdfRef:`/api/invoice?invoiceId=${invoiceId}`}).where(eq(invoices.id,invoiceId));
    return {invoiceId,status:"Sent",sentAt:attemptedAt,gmailMessageId:sent.messageId,actualRecipient:sent.actualRecipient,pdfAttached:true};
  }catch(error){
    const reason=error instanceof Error?error.message:"Gmail did not accept the message";
    await db.insert(invoiceEmailLogs).values({invoiceId,playerId:result.customer.id,payerId:result.customer.id,intendedRecipient:draft.recipient,actualRecipient,sendingAccount:useTenant?tenantStatus?.email||"":gmail.email,sendStatus:"Failed",sentAt:attemptedAt,gmailMessageId:"",pdfAttached:true,failureReason:reason,deliveryMode});
    await db.update(emailOutbox).set({status:"Failed",createdAt:attemptedAt}).where(eq(emailOutbox.id,draft.id));
    await db.update(invoices).set({emailStatus:"Failed"}).where(eq(invoices.id,invoiceId));
    throw error;
  }
}

async function sendingConnection(request:Request){
  const tenant=await tenantEmailStatus(request).catch(()=>null);
  if(tenant?.tenantConnected&&tenant.activeForSending)return {deliveryMode:tenant.deliveryMode as "test"|"live",token:undefined};
  const legacy=await gmailStatus();
  if(!legacy.configured)throw new Error("Connect the business email in Settings before sending invoices");
  if(!legacy.connected)throw new Error("Connect Google in Settings before sending invoices");
  return {deliveryMode:legacy.deliveryMode,token:await gmailAccessToken()};
}

export async function GET(request:Request){try{await ensureTenantForRequest(request);return Response.json(await snapshot())}catch(error){return Response.json({error:error instanceof Error?error.message:"Database error"},{status:403})}}

export async function POST(request:Request){
  try{
    const { tenantId } = await ensureTenantForRequest(request);
    const db=getDb(); const body=await request.json() as {action:string;payload?:unknown}; const p=(body.payload??{}) as Record<string,unknown>;
    if(body.action==="addCustomer"){
      const row={...p,createdAt:new Date().toISOString()} as typeof customers.$inferInsert;
      await db.insert(customers).values(row).onConflictDoNothing();
      const [programme]=await db.select().from(programmes).where(eq(programmes.name,row.programme));
      if(programme&&row.status!=="Inactive") await db.insert(enrolments).values({programmeId:programme.id,customerId:row.id,termId:"autumn-2026",status:row.status==="Trial"?"Trial":"Active"}).onConflictDoNothing();
    }
    else if(body.action==="updateCustomer"){
      const row=p as typeof customers.$inferInsert; await db.update(customers).set(row).where(eq(customers.id,String(row.id)));
      if(row.status==="Inactive")await db.update(enrolments).set({status:"Inactive"}).where(eq(enrolments.customerId,String(row.id)));
      else{
        const [programme]=await db.select().from(programmes).where(eq(programmes.name,row.programme));
        if(programme){
          const [existing]=await db.select().from(enrolments).where(and(eq(enrolments.programmeId,programme.id),eq(enrolments.customerId,String(row.id)),eq(enrolments.termId,"autumn-2026")));
          if(!existing)await db.insert(enrolments).values({programmeId:programme.id,customerId:row.id,termId:"autumn-2026",status:row.status==="Trial"?"Trial":"Active"});
        }
      }
    }
    else if(body.action==="archiveCustomer"){
      const customerId=String(p.id??""); if(!customerId) throw new Error("Customer not found"); const d1=getD1();
      await d1.batch([d1.prepare("UPDATE customers SET status = ? WHERE id = ?").bind("Inactive",customerId),d1.prepare("UPDATE enrolments SET status = ? WHERE customer_id = ?").bind("Inactive",customerId)]);
    }
    else if(body.action==="deleteCustomer"){
      const customerId=String(p.id??""); if(!customerId) throw new Error("Customer not found"); const d1=getD1();
      await d1.batch([
        d1.prepare("DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE customer_id = ?)").bind(customerId),
        d1.prepare("DELETE FROM payments WHERE customer_id = ?").bind(customerId),d1.prepare("DELETE FROM invoices WHERE customer_id = ?").bind(customerId),
        d1.prepare("DELETE FROM email_outbox WHERE customer_id = ?").bind(customerId),d1.prepare("DELETE FROM attendance WHERE player_id = ?").bind(customerId),
        d1.prepare("DELETE FROM camp_bookings WHERE player_id = ?").bind(customerId),d1.prepare("DELETE FROM rollover_decisions WHERE customer_id = ?").bind(customerId),d1.prepare("DELETE FROM enrolments WHERE customer_id = ?").bind(customerId),
        d1.prepare("DELETE FROM customers WHERE id = ?").bind(customerId)
      ]);
    }
    else if(body.action==="addSession"){
      const session={...p,termId:p.termId??"autumn-2026"} as typeof sessions.$inferInsert;
      await db.insert(sessions).values(session);
      await addGroupSessionCalendarEvent(tenantId,{
        coach:String(session.coach??""),
        title:String(session.title??""),
        venue:String(session.venue??""),
        sessionDate:String(session.sessionDate??""),
        start:String(session.start??""),
        duration:Number(session.duration??60),
        meta:String(session.meta??"")
      });
    }
    else if(body.action==="addTerm"){
      const sessionCount=Number(p.sessionCount);
      if(!Number.isInteger(sessionCount)||sessionCount<1||sessionCount>14)throw new Error("A term must contain between 1 and 14 sessions");
      await db.insert(terms).values({...p,sessionCount} as typeof terms.$inferInsert);
    }
    else if(body.action==="updateTerm"){
      const termId=String(p.id??""),sessionCount=Number(p.sessionCount);
      if(!termId)throw new Error("Term not found");
      if(!Number.isInteger(sessionCount)||sessionCount<1||sessionCount>14)throw new Error("A term must contain between 1 and 14 sessions");
      await db.update(terms).set({name:String(p.name),startDate:String(p.startDate),endDate:String(p.endDate),sessionCount}).where(eq(terms.id,termId));
    }
    else if(body.action==="addProgramme") await db.insert(programmes).values(p as typeof programmes.$inferInsert);
    else if(body.action==="updateProgramme") await db.update(programmes).set(p as Partial<typeof programmes.$inferInsert>).where(eq(programmes.id,String(p.id)));
    else if(body.action==="addStaff") await db.insert(staff).values(p as typeof staff.$inferInsert);
    else if(body.action==="updateStaff") await db.update(staff).set(p as Partial<typeof staff.$inferInsert>).where(eq(staff.id,String(p.id)));
    else if(body.action==="updateSessionCoach") await db.update(sessions).set({coach:String(p.coach)}).where(eq(sessions.id,Number(p.id)));
    else if(body.action==="enrolCustomer"){
      const programmeId=String(p.programmeId??""),customerId=String(p.customerId??""),termId=String(p.termId??""),status=String(p.status??"Active");
      if(!programmeId||!customerId||!termId)throw new Error("Choose a player, programme and term");
      if(!["Trial","Active","Inactive"].includes(status))throw new Error("Choose a valid registration status");
      const [customer]=await db.select().from(customers).where(eq(customers.id,customerId));
      const [programme]=await db.select().from(programmes).where(eq(programmes.id,programmeId));
      if(!customer||customer.status==="Inactive")throw new Error("This customer is archived and cannot be registered");
      if(!programme)throw new Error("Programme not found");
      const [existing]=await db.select().from(enrolments).where(and(eq(enrolments.programmeId,programmeId),eq(enrolments.customerId,customerId),eq(enrolments.termId,termId)));
      if(existing&&existing.status!=="Inactive")throw new Error(`${customer.player} is already registered for ${programme.name}`);
      const trialSessionsAllowed=status==="Trial"?Math.max(1,Number(p.trialSessionsAllowed??1)):0;
      const trialValues={status,trialSessionsAllowed,trialSessionsCompleted:status==="Trial"?0:0,trialStatus:status==="Trial"?"In Progress":"",nextTrialSession:status==="Trial"?String(p.nextTrialSession??""):""};
      if(existing)await db.update(enrolments).set(trialValues).where(eq(enrolments.id,existing.id));
      else await db.insert(enrolments).values({programmeId,customerId,termId,...trialValues});
      await db.update(customers).set({programme:programme.name}).where(eq(customers.id,customerId));
    }
    else if(body.action==="createAndEnrolCustomer"){
      const customerInput=(p.customer??{}) as Record<string,unknown>,programmeId=String(p.programmeId??""),termId=String(p.termId??""),status=String(p.status??"Trial");
      if(!programmeId||!termId)throw new Error("Programme or term not found");
      if(!["Trial","Active"].includes(status))throw new Error("New registrations must be Trial or Active");
      const [programme]=await db.select().from(programmes).where(eq(programmes.id,programmeId));
      if(!programme)throw new Error("Programme not found");
      const row={...customerInput,programme:programme.name,status,createdAt:new Date().toISOString()} as typeof customers.$inferInsert;
      if(!row.id||!row.player?.trim()||!row.payer?.trim()||!row.email?.trim())throw new Error("Complete the player, parent and email details");
      const duplicate=(await db.select().from(customers)).find(item=>item.player.trim().toLowerCase()===row.player.trim().toLowerCase()&&item.payer.trim().toLowerCase()===row.payer.trim().toLowerCase());
      if(duplicate)throw new Error(`${duplicate.player} already has a customer record. Select the existing customer instead.`);
      await db.insert(customers).values(row);
      await db.insert(enrolments).values({programmeId,customerId:row.id,termId,status});
    }
    else if(body.action==="updateEnrolmentStatus"){
      const enrolmentId=Number(p.id),status=String(p.status??"");
      if(!Number.isInteger(enrolmentId)||!["Trial","Active","Inactive"].includes(status))throw new Error("Choose a valid registration status");
      await db.update(enrolments).set({status}).where(eq(enrolments.id,enrolmentId));
    }
    else if(body.action==="updateTrial"){
      const enrolmentId=Number(p.enrolmentId),action=String(p.trialAction??"");
      const [enrolment]=await db.select().from(enrolments).where(eq(enrolments.id,enrolmentId));
      if(!enrolment||enrolment.status!=="Trial")throw new Error("This trial registration could not be found");
      if(action==="completeSession"){
        const completed=Math.min(enrolment.trialSessionsAllowed,enrolment.trialSessionsCompleted+1);
        await db.update(enrolments).set({trialSessionsCompleted:completed,trialStatus:completed>=enrolment.trialSessionsAllowed?"Complete":"In Progress"}).where(eq(enrolments.id,enrolmentId));
      }else if(action==="makeActive"){
        await db.update(enrolments).set({status:"Active",trialStatus:"Converted",nextTrialSession:""}).where(eq(enrolments.id,enrolmentId));
        await db.update(customers).set({status:"Active"}).where(eq(customers.id,enrolment.customerId));
      }else if(action==="notJoining"){
        await db.update(enrolments).set({status:"Inactive",trialStatus:"Not Joining",nextTrialSession:""}).where(eq(enrolments.id,enrolmentId));
      }else if(action==="extend"){
        await db.update(enrolments).set({trialSessionsAllowed:enrolment.trialSessionsAllowed+Math.max(1,Number(p.sessions??1)),trialStatus:"Extended"}).where(eq(enrolments.id,enrolmentId));
      }else throw new Error("Choose a valid trial action");
    }
    else if(body.action==="prepareTermRollover"){
      const currentTermId=String(p.currentTermId??""),nextTermId=String(p.nextTermId??"");
      const [currentTerm]=await db.select().from(terms).where(eq(terms.id,currentTermId)),[nextTerm]=await db.select().from(terms).where(eq(terms.id,nextTermId));
      if(!currentTerm||!nextTerm||nextTerm.sortOrder<=currentTerm.sortOrder)throw new Error("Choose the next term after the current term");
      await db.insert(termRollovers).values({currentTermId,nextTermId,status:"Prepared",preparedAt:new Date().toISOString()}).onConflictDoUpdate({target:[termRollovers.currentTermId,termRollovers.nextTermId],set:{status:"Prepared",completedAt:null}});
      const [rollover]=await db.select().from(termRollovers).where(and(eq(termRollovers.currentTermId,currentTermId),eq(termRollovers.nextTermId,nextTermId)));
      const eligible=await db.select().from(enrolments).where(and(eq(enrolments.termId,currentTermId),eq(enrolments.status,"Active")));
      const customerRows=await db.select().from(customers),programmeRows=await db.select().from(programmes);
      for(const enrolment of eligible){
        const customer=customerRows.find(row=>row.id===enrolment.customerId),programme=programmeRows.find(row=>row.id===enrolment.programmeId);
        if(!customer||customer.status!=="Active"||!programme)continue;
        const months=ageInMonths(customer.dateOfBirth,nextTerm.startDate),outside=programme.type==="Junior course"&&months!==null&&(months<programme.minAgeYears*12||months>(programme.maxAgeYears+1)*12-1);
        await db.insert(rolloverDecisions).values({rolloverId:rollover.id,enrolmentId:enrolment.id,customerId:customer.id,currentProgrammeId:programme.id,nextProgrammeId:outside&&programme.suggestedNextProgrammeId?programme.suggestedNextProgrammeId:programme.id,continuationStatus:"Awaiting Confirmation",progressionStatus:outside?"Recommended":"Not Required",progressionReason:"",ageAtNextTermMonths:months,updatedAt:new Date().toISOString()}).onConflictDoUpdate({target:[rolloverDecisions.rolloverId,rolloverDecisions.enrolmentId],set:{ageAtNextTermMonths:months,updatedAt:new Date().toISOString()}});
      }
    }
    else if(body.action==="updateRolloverDecision"){
      const id=Number(p.id),continuationStatus=String(p.continuationStatus??"Awaiting Confirmation"),progressionStatus=String(p.progressionStatus??"Not Required"),nextProgrammeId=String(p.nextProgrammeId??""),progressionReason=String(p.progressionReason??"");
      if(!Number.isInteger(id)||!["Continuing","Not Continuing","Awaiting Confirmation"].includes(continuationStatus))throw new Error("Choose a valid continuation decision");
      if(!["Not Required","Recommended","Move Next Term","Keep Current Group","Review Later"].includes(progressionStatus))throw new Error("Choose a valid progression decision");
      const [decision]=await db.select().from(rolloverDecisions).where(eq(rolloverDecisions.id,id)); if(!decision)throw new Error("Progression review not found");
      await db.update(rolloverDecisions).set({continuationStatus,progressionStatus,nextProgrammeId:nextProgrammeId||decision.nextProgrammeId,progressionReason,updatedAt:new Date().toISOString()}).where(eq(rolloverDecisions.id,id));
    }
    else if(body.action==="completeTermRollover"){
      const rolloverId=Number(p.rolloverId),[rollover]=await db.select().from(termRollovers).where(eq(termRollovers.id,rolloverId));
      if(!rollover)throw new Error("Term rollover not found");
      const decisions=await db.select().from(rolloverDecisions).where(eq(rolloverDecisions.rolloverId,rolloverId));
      const unresolved=decisions.filter(row=>row.continuationStatus==="Awaiting Confirmation"||row.progressionStatus==="Recommended"||row.progressionStatus==="Review Later");
      if(unresolved.length)throw new Error(`Resolve ${unresolved.length} continuation or progression review${unresolved.length===1?"":"s"} first`);
      for(const decision of decisions.filter(row=>row.continuationStatus==="Continuing")) await db.insert(enrolments).values({programmeId:decision.nextProgrammeId,customerId:decision.customerId,termId:rollover.nextTermId,status:"Active"}).onConflictDoNothing();
      await db.update(termRollovers).set({status:"Complete",completedAt:new Date().toISOString()}).where(eq(termRollovers.id,rolloverId));
    }
    else if(body.action==="addCamp") await db.insert(camps).values(p as typeof camps.$inferInsert);
    else if(body.action==="bookCamp") await db.insert(campBookings).values({...p,createdAt:new Date().toISOString()} as typeof campBookings.$inferInsert);
    else if(body.action==="saveAttendance"){
      const rows=(p.rows??[]) as (typeof attendance.$inferInsert)[];
      for(const row of rows) await db.insert(attendance).values(row).onConflictDoUpdate({target:[attendance.sessionId,attendance.playerId],set:{mark:row.mark,attendedOn:row.attendedOn}});
    }
    else if(body.action==="prepareProgrammeRegisters"){
      const programmeId=String(p.programmeId??""),termId=String(p.termId??"");
      const [programme]=await db.select().from(programmes).where(eq(programmes.id,programmeId));
      const [term]=await db.select().from(terms).where(eq(terms.id,termId));
      if(!programme||!term)throw new Error("Programme or term not found");
      const first=new Date(`${term.startDate}T12:00:00Z`),targetDay=(programme.weekday+1)%7;
      first.setUTCDate(first.getUTCDate()+((targetDay-first.getUTCDay()+7)%7));
      for(let weekNumber=1;weekNumber<=term.sessionCount;weekNumber++){
        const date=new Date(first);date.setUTCDate(first.getUTCDate()+(weekNumber-1)*7);
        await db.insert(programmeRegisters).values({programmeId,termId,weekNumber,sessionDate:date.toISOString().slice(0,10),status:"Not started"}).onConflictDoNothing();
      }
    }
    else if(body.action==="saveProgrammeRegister"){
      const registerId=Number(p.registerId),rows=(p.rows??[]) as {playerId:string;mark:string;note?:string}[];
      const [register]=await db.select().from(programmeRegisters).where(eq(programmeRegisters.id,registerId));
      if(!register)throw new Error("Register week not found");
      if(!rows.length)throw new Error("There are no player marks to save");
      const markedAt=new Date().toISOString();
      for(const row of rows){
        if(!["Present","Late","Absent","Excused"].includes(row.mark))throw new Error("Choose a valid attendance mark");
        await db.insert(programmeRegisterMarks).values({registerId,playerId:row.playerId,mark:row.mark,note:row.note??"",markedAt}).onConflictDoUpdate({target:[programmeRegisterMarks.registerId,programmeRegisterMarks.playerId],set:{mark:row.mark,note:row.note??"",markedAt}});
      }
      await db.update(programmeRegisters).set({status:"Complete",completedAt:markedAt}).where(eq(programmeRegisters.id,registerId));
    }
    else if(body.action==="generateInvoices"){
      const customerIds=(p.customerIds??[]) as string[], programmeId=String(p.programmeId??"mini-red"), termId=String(p.termId??"autumn-2026");
      const requestedSessionCounts=(p.sessionCounts??{}) as Record<string,number>;
      const [programme]=await db.select().from(programmes).where(eq(programmes.id,programmeId)); const [term]=await db.select().from(terms).where(eq(terms.id,termId));
      if(!programme||!term) throw new Error("Programme or term not found");
      const uniqueCustomerIds=[...new Set(customerIds)];
      if(!uniqueCustomerIds.length) throw new Error("Select at least one player");
      const customerRows=[];
      for(const customerId of uniqueCustomerIds){
        const [customer]=await db.select().from(customers).where(eq(customers.id,customerId));
        if(!customer||customer.status==="Inactive") throw new Error("An active customer record could not be found");
        if(!customer.payer.trim()) throw new Error(`Add a parent or payer for ${customer.player}`);
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) throw new Error(`Add a valid parent email for ${customer.player}`);
        const [enrolment]=await db.select().from(enrolments).where(and(eq(enrolments.customerId,customerId),eq(enrolments.programmeId,programmeId),eq(enrolments.termId,termId)));
        if(!enrolment||enrolment.status!=="Active") throw new Error(`${customer.player} must have an Active registration in ${programme.name} before invoicing`);
        customerRows.push(customer);
      }
      for(let i=0;i<customerRows.length;i++){
        const customer=customerRows[i],customerId=customer.id;
        const existing=await getD1().prepare("SELECT id FROM invoices WHERE customer_id = ? AND programme_id = ? AND term_id = ? AND lifecycle_status = 'Active' LIMIT 1").bind(customerId,programmeId,termId).first<{id:number}>();
        if(existing) continue;
        const requested=Number(requestedSessionCounts[customerId]??term.sessionCount),sessionCount=Math.max(1,Math.min(term.sessionCount,Math.floor(requested)));
        if(!Number.isFinite(requested)||requested<1||requested>term.sessionCount)throw new Error(`Choose between 1 and ${term.sessionCount} sessions for ${customer.player}`);
        const amountPence=programme.pricePence*sessionCount, invoiceNumber=`ST-${Date.now().toString().slice(-6)}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;
        let invoice:typeof invoices.$inferSelect;
        try{[invoice]=await db.insert(invoices).values({invoiceNumber,customerId,programmeId,termId,amountPence,status:"Draft",emailStatus:"Draft",paymentStatus:"Outstanding",dueDate:"2026-09-01",note:"Operational test invoice",createdAt:new Date().toISOString(),lifecycleStatus:"Active",activeBillingKey:billingKey(customerId,programmeId,termId)}).returning()}
        catch(error){if(error instanceof Error&&(error.message.includes("UNIQUE")||error.message.includes("invoice_active_billing_key_idx")))continue;throw error}
        await db.insert(invoiceItems).values({invoiceId:invoice.id,description:`${programme.name} · ${term.name}${sessionCount<term.sessionCount?` · Pro-rata ${sessionCount} of ${term.sessionCount} sessions`:""}`,quantity:sessionCount,unitPence:programme.pricePence,totalPence:amountPence});
        await db.update(customers).set({balance:`£${(amountPence/100).toFixed(2)}`,payment:"Due"}).where(eq(customers.id,customerId));
        await prepareInvoiceEmail(invoice.id);
      }
    }
    else if(body.action==="refreshInvoiceEmail") await prepareInvoiceEmail(Number(p.invoiceId));
    else if(body.action==="sendInvoice"){
      const connection=await sendingConnection(request);
      const invoiceId=Number(p.invoiceId);
      if(!Number.isInteger(invoiceId))throw new Error("Select a valid invoice");
      await sendInvoiceRecord(request,invoiceId,connection.deliveryMode as "test"|"live",connection.token);
    }
    else if(body.action==="sendInvoiceBatch"){
      const connection=await sendingConnection(request),deliveryMode=connection.deliveryMode as "test"|"live";
      const invoiceIds=[...new Set(((p.invoiceIds??[]) as number[]).map(Number).filter(Number.isInteger))];
      if(!invoiceIds.length)throw new Error("There are no unsent invoices in this batch");
      await validateInvoiceBatch(invoiceIds);
      for(const invoiceId of invoiceIds){
        try{
          await sendInvoiceRecord(request,invoiceId,deliveryMode,connection.token);
        }catch(error){
          console.error("Invoice email send failed",invoiceId,error);
        }
      }
    }
    else if(body.action==="resendInvoice"){
      const connection=await sendingConnection(request);
      const invoiceId=Number(p.invoiceId);
      if(!Number.isInteger(invoiceId))throw new Error("Select a valid invoice");
      await sendInvoiceRecord(request,invoiceId,connection.deliveryMode as "test"|"live",connection.token,true);
    }
    else if(body.action==="resolveInvoiceDuplicates"){
      const keepInvoiceId=Number(p.keepInvoiceId);if(!Number.isInteger(keepInvoiceId))throw new Error("Choose the invoice to keep");
      const [keep]=await db.select().from(invoices).where(eq(invoices.id,keepInvoiceId));
      if(!keep||keep.lifecycleStatus!=="Active")throw new Error("The selected invoice is not active");
      const duplicateRows=await getD1().prepare("SELECT id FROM invoices WHERE customer_id = ? AND programme_id = ? AND term_id = ? AND lifecycle_status = 'Active' ORDER BY id").bind(keep.customerId,keep.programmeId,keep.termId).all<{id:number}>();
      if(duplicateRows.results.length<2)throw new Error("No active duplicate remains for this player, programme and term");
      const resolvedAt=new Date().toISOString(),d1=getD1();
      await d1.batch([
        d1.prepare("UPDATE invoices SET active_billing_key = NULL WHERE customer_id = ? AND programme_id = ? AND term_id = ? AND lifecycle_status = 'Active'").bind(keep.customerId,keep.programmeId,keep.termId),
        ...duplicateRows.results.filter(row=>row.id!==keepInvoiceId).map(row=>d1.prepare("UPDATE invoices SET lifecycle_status = 'Voided', status = 'Voided', active_billing_key = NULL, void_reason = ?, voided_at = ? WHERE id = ?").bind(`Duplicate resolved; ${keep.invoiceNumber} kept as the valid invoice`,resolvedAt,row.id)),
        d1.prepare("UPDATE invoices SET active_billing_key = ? WHERE id = ? AND lifecycle_status = 'Active'").bind(billingKey(keep.customerId,keep.programmeId,keep.termId),keepInvoiceId)
      ]);
    }
    else if(body.action==="createReplacementInvoice"){
      const originalId=Number(p.invoiceId);if(!Number.isInteger(originalId))throw new Error("Choose an invoice to replace");
      const [original]=await db.select().from(invoices).where(eq(invoices.id,originalId));
      if(!original||original.lifecycleStatus!=="Active")throw new Error("Only an active invoice can be replaced");
      const activeRows=await getD1().prepare("SELECT id FROM invoices WHERE customer_id = ? AND programme_id = ? AND term_id = ? AND lifecycle_status = 'Active'").bind(original.customerId,original.programmeId,original.termId).all<{id:number}>();
      if(activeRows.results.length!==1)throw new Error("Resolve duplicate invoices before creating a replacement");
      const createdAt=new Date().toISOString(),invoiceNumber=`ST-${Date.now().toString().slice(-6)}-${crypto.randomUUID().slice(0,4).toUpperCase()}`,key=billingKey(original.customerId,original.programmeId,original.termId);
      await db.update(invoices).set({lifecycleStatus:"Replaced",status:"Replaced",activeBillingKey:null,voidReason:"Replaced by a deliberately created invoice",voidedAt:createdAt}).where(eq(invoices.id,original.id));
      try{
        const [replacement]=await db.insert(invoices).values({invoiceNumber,customerId:original.customerId,programmeId:original.programmeId,termId:original.termId,amountPence:original.amountPence,status:"Draft",emailStatus:"Draft",paymentStatus:"Outstanding",dueDate:original.dueDate,note:`Replacement for ${original.invoiceNumber}`,createdAt,lifecycleStatus:"Active",activeBillingKey:key}).returning();
        const items=await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId,original.id));
        for(const item of items)await db.insert(invoiceItems).values({invoiceId:replacement.id,description:item.description,quantity:item.quantity,unitPence:item.unitPence,totalPence:item.totalPence});
        await db.update(invoices).set({replacedByInvoiceId:replacement.id}).where(eq(invoices.id,original.id));
        await prepareInvoiceEmail(replacement.id);
      }catch(error){await db.update(invoices).set({lifecycleStatus:"Active",status:original.status,activeBillingKey:key,voidReason:"",voidedAt:null}).where(eq(invoices.id,original.id));throw error}
    }
    else if(body.action==="recordPayment"){
      const amountPence=Number(p.amountPence), customerId=String(p.customerId), invoiceId=p.invoiceId?Number(p.invoiceId):null;
      if(!invoiceId)throw new Error("Choose an invoice");
      const [invoice]=await db.select().from(invoices).where(eq(invoices.id,invoiceId));
      if(!invoice||invoice.lifecycleStatus!=="Active")throw new Error("Voided or replaced invoices cannot receive payments");
      const previous=(await db.select().from(payments).where(eq(payments.invoiceId,invoiceId))).reduce((sum,row)=>sum+row.amountPence,0),remaining=Math.max(0,invoice.amountPence-previous);
      if(!Number.isFinite(amountPence)||amountPence<=0)throw new Error("Enter a payment amount");
      if(amountPence>remaining)throw new Error(`The payment is greater than the remaining balance of £${(remaining/100).toFixed(2)}`);
      await db.insert(payments).values({invoiceId,customerId,amountPence,method:String(p.method),status:"Recorded",reference:`PAY-${Date.now().toString().slice(-6)}`,paidAt:String(p.paidAt),notes:String(p.notes??"")});
      const invoicePaid=previous+amountPence,nextPaymentStatus=invoicePaid>=invoice.amountPence?"Paid":"Part Paid";
      await db.update(invoices).set({status:nextPaymentStatus,paymentStatus:nextPaymentStatus}).where(eq(invoices.id,invoiceId));
      const customerInvoices=(await db.select().from(invoices).where(eq(invoices.customerId,customerId))).filter(row=>row.lifecycleStatus==="Active"),allPayments=await db.select().from(payments);
      const customerBalance=customerInvoices.reduce((sum,row)=>sum+Math.max(0,row.amountPence-allPayments.filter(payment=>payment.invoiceId===row.id).reduce((paid,payment)=>paid+payment.amountPence,0)),0);
      await db.update(customers).set({balance:`£${(customerBalance/100).toFixed(2)}`,payment:customerBalance===0?"Paid":"Due"}).where(eq(customers.id,customerId));
    }
    else if(body.action==="queueEmails"){
      const customerIds=(p.customerIds??[]) as string[], subject=String(p.subject), template=String(p.body);
      for(const customerId of customerIds){const [c]=await db.select().from(customers).where(eq(customers.id,customerId));if(c)await db.insert(emailOutbox).values({customerId,recipient:c.email,subject,body:template.replaceAll("{{parent_first_name}}",c.payer.split(" ")[0]).replaceAll("{{player_first_name}}",c.player.split(" ")[0]).replaceAll("{{programme_name}}",c.programme),status:"Test prepared",createdAt:new Date().toISOString()});}
    }
    else if(body.action==="setSetting") await db.insert(settings).values({key:String(p.key),value:String(p.value)}).onConflictDoUpdate({target:settings.key,set:{value:String(p.value)}});
    else if(body.action==="setSettings"){
      const rows=Object.entries((p.values??{}) as Record<string,unknown>);
      if(!rows.length)throw new Error("No settings were supplied");
      const d1=getD1();
      await d1.batch(rows.map(([key,value])=>d1.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key,String(value??""))));
    }
    else if(body.action==="reset"){
      await resetTestData();
    }
    else if(body.action==="clearAll"){
      const d1=getD1();
      await d1.batch(["attendance","invoice_email_logs","email_outbox","payments","invoice_items","invoices","camp_bookings","rollover_decisions","term_rollovers","enrolments","customers"].map(table=>d1.prepare(`DELETE FROM ${table}`)));
    } else return Response.json({error:"Unknown action"},{status:400});
    return Response.json(await snapshot());
  }catch(error){console.error("Workspace action failed",error);return Response.json({error:error instanceof Error?error.message:"Database error"},{status:500})}
}
