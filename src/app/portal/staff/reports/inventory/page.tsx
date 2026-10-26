import Link from "next/link";
import { airtableList, asText, asStrings, requirePortalRole, TABLES } from "@/lib/portal";
type Rec={id:string;fields:Record<string,unknown>};
function n(v:unknown){return typeof v==="number"&&Number.isFinite(v)?v:0}
function period(v:unknown){if(typeof v!=="string")return null;const t=Date.parse(v);if(!Number.isFinite(t))return null;const d=new Date(t);return {month:new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit"}).format(d),year:new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",year:"numeric"}).format(d)};}
export default async function InventoryReporting(){
 await requirePortalRole("Staff");
 const [items,tx]=await Promise.all([
 airtableList(TABLES.inventory,["Item Name","Area","Unit of Measure","Active"]),
 airtableList(TABLES.inventoryTransactions,["Item","Date / Time","Transaction Type","Quantity Change","Cost","Vendor / Source"])
 ]);
 const itemMap=new Map((items as Rec[]).filter(x=>asText(x.fields.Area)==="Shelter").map(x=>[x.id,x]));
 type Group={id:string;name:string;unit:string;used:number;received:number;discarded:number;purchaseCost:number;costEntries:number;monthly:Record<string,number>};
 const rows=new Map<string,Group>();let missingCost=0,usedEvents=0;
 for(const t of tx as Rec[]){const p=period(t.fields["Date / Time"]);if(!p)continue;const type=asText(t.fields["Transaction Type"]);const qty=Math.abs(n(t.fields["Quantity Change"]));if(!qty)continue;for(const id of asStrings(t.fields.Item)){const item=itemMap.get(id);if(!item)continue;let x=rows.get(id);if(!x){x={id,name:asText(item.fields["Item Name"]),unit:asText(item.fields["Unit of Measure"])||"units",used:0,received:0,discarded:0,purchaseCost:0,costEntries:0,monthly:{}};rows.set(id,x)}if(type==="Used"){x.used+=qty;x.monthly[p.month]=(x.monthly[p.month]||0)+qty;usedEvents++}if(type==="Received"){x.received+=qty;if(n(t.fields.Cost)>0){x.purchaseCost+=n(t.fields.Cost);x.costEntries++}else missingCost++}if(type==="Expired"||type==="Damaged / Discarded")x.discarded+=qty;}}
 const results=[...rows.values()].sort((a,b)=>a.name.localeCompare(b.name));
 const totalUsed=results.reduce((v,x)=>v+x.used,0);
 return <main className="min-h-screen bg-slate-50"><div className="container-custom py-8 sm:py-12">
 <Link href="/portal/staff/reports" className="text-sm font-semibold text-primary">← Reporting & Dashboards</Link>
 <h1 className="mt-4 text-3xl font-bold">Shelter Inventory Reporting</h1>
 <p className="mt-2 max-w-3xl text-sm text-slate-600">Transactions grouped by inventory item. This is an initial reporting view for reviewing usage and purchasing documentation, not yet an audited budget forecast.</p>
 <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Different units cannot be totaled meaningfully. Usage below includes only transactions explicitly marked Used. Receipts, donations, corrections, and discards are kept separate. Missing costs: {missingCost} received transactions without a positive cost. Costs may represent different accounting conventions and require reconciliation.</div>
 <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-600">Shelter items with transactions</p><p className="mt-1 text-2xl font-bold">{results.length}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-600">Recorded usage events</p><p className="mt-1 text-2xl font-bold">{usedEvents}</p></div></div>
 <div className="mt-6 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b bg-slate-50"><th className="p-3">Supply</th><th className="p-3">Unit</th><th className="p-3">Used</th><th className="p-3">Received</th><th className="p-3">Discarded/expired</th><th className="p-3">Recorded receipt costs*</th></tr></thead><tbody>{results.map(x=><tr key={x.id} className="border-b"><td className="p-3 font-medium">{x.name}</td><td className="p-3">{x.unit}</td><td className="p-3">{x.used}</td><td className="p-3">{x.received}</td><td className="p-3">{x.discarded}</td><td className="p-3">{x.costEntries?x.purchaseCost.toLocaleString("en-US",{style:"currency",currency:"USD"}):"Not recorded"}</td></tr>)}</tbody></table></div>
 <p className="mt-4 text-xs text-slate-600">* Recorded costs are not verified spending or donation valuations. This view is an audit starting point; month/year filters, supplier/donor classification, and forecast projections require more complete transaction history.</p>
 </div></main>
}