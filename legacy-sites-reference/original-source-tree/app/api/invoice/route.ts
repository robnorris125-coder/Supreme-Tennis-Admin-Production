import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { customers, invoiceItems, invoices, programmes, settings, terms } from "../../../db/schema";
import { ensureTenantForRequest } from "../../../lib/tenant";

const pdfSafe=(value:string)=>value.replaceAll("·"," - ").replaceAll("–","-").replaceAll("—","-").replaceAll("\\","\\\\").replaceAll("(","\\(").replaceAll(")","\\)").replaceAll("£","\\243");
const pdfDate=(value:string)=>new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
const money=(pence:number)=>`£${(pence/100).toFixed(2)}`;

function text(x:number,y:number,size:number,value:string,bold=false,colour="0.08 0.16 0.22"){
  return `BT /${bold?"F2":"F1"} ${size} Tf ${colour} rg ${x} ${y} Td (${pdfSafe(value)}) Tj ET`;
}

export function createInvoicePdf(details:{businessName:string;invoiceFooter:string;invoiceNumber:string;issued:string;due:string;parent:string;email:string;player:string;programme:string;venue:string;coach:string;term:string;items:{description:string;quantity:number;unitPence:number;totalPence:number}[];totalPence:number}){
  const navy="0.035 0.102 0.153",muted="0.38 0.45 0.50",white="1 1 1",yellow="1 0.79 0.12",green="0.05 0.55 0.34";
  const commands:string[]=[
    `q ${navy} rg 0 720 595 122 re f Q`,
    `q ${yellow} rg 48 758 46 6 re f Q`,
    text(48,795,24,details.businessName.toUpperCase(),true,white),
    text(48,773,10,"Professional tennis coaching",false,"0.77 0.83 0.87"),
    text(430,795,11,"INVOICE",true,yellow),
    text(430,775,10,details.invoiceNumber,false,white),
    text(48,675,9,"BILL TO",true,muted),
    text(48,651,15,details.parent,true),
    text(48,630,10,details.email,false,muted),
    text(48,603,9,"PLAYER",true,muted),
    text(48,581,12,details.player,true),
    text(330,675,9,"INVOICE DATE",true,muted),
    text(330,654,10,pdfDate(details.issued)),
    text(455,675,9,"PAYMENT DUE",true,muted),
    text(455,654,10,pdfDate(details.due)),
    `q 0.94 0.96 0.98 rg 40 512 515 42 re f Q`,
    text(52,529,9,"DESCRIPTION",true,muted),
    text(370,529,9,"QTY",true,muted),
    text(420,529,9,"RATE",true,muted),
    text(493,529,9,"AMOUNT",true,muted),
  ];
  let y=482;
  for(const item of details.items){
    commands.push(text(52,y,10,item.description,true),text(52,y-17,8,`${details.venue} | Coach: ${details.coach}`,false,muted),text(374,y,10,String(item.quantity)),text(420,y,10,money(item.unitPence)),text(493,y,10,money(item.totalPence),true));
    commands.push(`q 0.88 0.91 0.93 RG 0.5 w 40 ${y-35} m 555 ${y-35} l S Q`);y-=64;
  }
  commands.push(
    text(330,y-4,10,"Subtotal",false,muted),text(493,y-4,10,money(details.totalPence),true),
    `q ${navy} rg 320 ${y-62} 235 46 re f Q`,
    text(337,y-44,11,"TOTAL",true,white),text(470,y-45,16,money(details.totalPence),true,yellow),
    text(48,270,9,"PROGRAMME DETAILS",true,muted),
    text(48,246,10,details.programme,true),text(48,228,9,details.term,false,muted),
    `q 0.92 0.98 0.95 rg 40 155 515 54 re f Q`,
    text(55,187,10,"OPERATIONAL TEST INVOICE",true,green),
    text(55,169,9,"No payment is required for this test document.",false,"0.20 0.40 0.30"),
    `q ${yellow} rg 0 0 595 8 re f Q`,
    text(48,76,9,details.businessName,true),text(48,58,8,details.invoiceFooter,false,muted),
    text(455,58,8,"Page 1 of 1",false,muted)
  );
  const content=commands.join("\n"),encoder=new TextEncoder();
  const objects=[
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  ];
  let result="%PDF-1.4\n";const offsets=[0];
  objects.forEach((object,index)=>{offsets.push(encoder.encode(result).length);result+=`${index+1} 0 obj\n${object}\nendobj\n`});
  const xref=encoder.encode(result).length;
  result+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,"0")+" 00000 n ").join("\n")}\ntrailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return encoder.encode(result);
}

export async function getInvoicePdf(id:number){
  const db=getDb(),[invoice]=await db.select().from(invoices).where(eq(invoices.id,id));
  if(!invoice)throw new Error("Invoice not found");
  const [customer]=await db.select().from(customers).where(eq(customers.id,invoice.customerId));
  const [programme]=await db.select().from(programmes).where(eq(programmes.id,invoice.programmeId));
  const [term]=await db.select().from(terms).where(eq(terms.id,invoice.termId));
  const items=await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId,id));
  const businessSettings=await db.select().from(settings),setting=(key:string,fallback:string)=>businessSettings.find(row=>row.key===key)?.value||fallback;
  if(!customer||!programme||!term)throw new Error("Invoice details incomplete");
  const bytes=createInvoicePdf({businessName:setting("business_name","Your tennis business"),invoiceFooter:setting("invoice_footer","Thank you for your payment."),invoiceNumber:invoice.invoiceNumber,issued:invoice.createdAt.slice(0,10),due:invoice.dueDate,parent:customer.payer,email:customer.email,player:customer.player,programme:programme.name,venue:programme.venue,coach:programme.coach,term:term.name,items,totalPence:invoice.amountPence});
  return {invoice,customer,programme,term,bytes,fileName:`${invoice.invoiceNumber}.pdf`};
}

export async function GET(request:Request){
  const url=new URL(request.url),id=Number(url.searchParams.get("invoiceId")),download=url.searchParams.get("download")==="1";
  if(!id)return new Response("Invoice id required",{status:400});
  try{
    await ensureTenantForRequest(request);
    const result=await getInvoicePdf(id);
    return new Response(result.bytes,{headers:{"content-type":"application/pdf","content-disposition":`${download?"attachment":"inline"}; filename="${result.fileName}"`,"cache-control":"private, no-store"}});
  }catch(error){return new Response(error instanceof Error?error.message:"Invoice could not be created",{status:error instanceof Error&&error.message==="Invoice not found"?404:500})}
}
