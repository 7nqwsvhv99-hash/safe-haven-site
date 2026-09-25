import Link from "next/link";
import type { ReactNode } from "react";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Boxes, PackagePlus, AlertTriangle, History } from "lucide-react";
import {
  airtableCreate, airtableList, airtableUpdate, asStrings, asText,
  requirePortalRole, TABLES,
} from "@/lib/portal";

function num(v: unknown){ return typeof v==="number"?v:0 }
function field(f:FormData,n:string){ return String(f.get(n)||"").trim() }
function optionalNumber(f:FormData,n:string){ const v=field(f,n); if(!v)return undefined; const x=Number(v); return Number.isFinite(x)?x:undefined }
function Pill({children}:{children:ReactNode}){return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{children}</span>}

export default async function ShelterInventoryPage(){
  const context=await requirePortalRole("Staff");
  const [items,transactions]=await Promise.all([
    airtableList(TABLES.inventory,[
      "Item Name","Area","Category","Unit of Measure","Reorder Point","Target Quantity",
      "Suggested Reorder Quantity","Preferred Vendor","Purchase URL","Typical Unit Cost",
      "Responsible Person","Responsible Email","Active","Track Lot / Expiration",
      "Last Ordered","Last Received","Notes","Current Quantity","Inventory Status"
    ],{sort:[{field:"Item Name",direction:"asc"}]}),
    airtableList(TABLES.inventoryTransactions,[
      "Item","Date / Time","Transaction Type","Quantity Change","Entered By","Vendor / Source",
      "Lot Number","Expiration Date","Cost","Notes","Signed Quantity"
    ],{sort:[{field:"Date / Time",direction:"desc"}]})
  ]);
  const shelterItems=items.filter(r=>asText(r.fields.Area)==="Shelter");
  const itemById=new Map(items.map(r=>[r.id,r]));
  const attention=shelterItems.filter(r=>["Low Stock","Out of Stock"].includes(asText(r.fields["Inventory Status"])));
  const active=shelterItems.filter(r=>Boolean(r.fields.Active));

  async function addItem(formData:FormData){
    "use server";
    await requirePortalRole("Staff", "write");
    const name=field(formData,"itemName"); if(!name)return;
    await airtableCreate(TABLES.inventory,{
      "Item Name":name, Area:"Shelter", Category:field(formData,"category")||"Other",
      "Unit of Measure":field(formData,"unit"),
      ...(optionalNumber(formData,"reorderPoint")!==undefined?{"Reorder Point":optionalNumber(formData,"reorderPoint")}:{ }),
      ...(optionalNumber(formData,"targetQuantity")!==undefined?{"Target Quantity":optionalNumber(formData,"targetQuantity")}:{ }),
      "Preferred Vendor":field(formData,"vendor"),
      "Purchase URL":field(formData,"purchaseUrl"),
      ...(optionalNumber(formData,"unitCost")!==undefined?{"Typical Unit Cost":optionalNumber(formData,"unitCost")}:{ }),
      "Responsible Person":field(formData,"responsiblePerson"),
      "Responsible Email":field(formData,"responsibleEmail"),
      Active:true,
      "Track Lot / Expiration":formData.get("trackLot")==="on",
      Notes:field(formData,"notes"),
    },true);
    revalidatePath("/portal/staff/inventory");
  }

  async function updateItem(formData:FormData){
    "use server";
    await requirePortalRole("Staff", "write");
    const id=field(formData,"itemId");
    const latest=await airtableList(TABLES.inventory,["Area"]);
    if(!latest.some(r=>r.id===id&&asText(r.fields.Area)==="Shelter"))return;
    await airtableUpdate(TABLES.inventory,id,{
      "Item Name":field(formData,"itemName"),
      Category:field(formData,"category"),
      "Unit of Measure":field(formData,"unit"),
      "Reorder Point":optionalNumber(formData,"reorderPoint")??null,
      "Target Quantity":optionalNumber(formData,"targetQuantity")??null,
      "Preferred Vendor":field(formData,"vendor"),
      "Purchase URL":field(formData,"purchaseUrl"),
      "Typical Unit Cost":optionalNumber(formData,"unitCost")??null,
      "Responsible Person":field(formData,"responsiblePerson"),
      "Responsible Email":field(formData,"responsibleEmail"),
      Active:formData.get("active")==="on",
      "Track Lot / Expiration":formData.get("trackLot")==="on",
      Notes:field(formData,"notes"),
    },true);
    revalidatePath("/portal/staff/inventory");
  }

  async function recordTransaction(formData:FormData){
    "use server";
    const current=await requirePortalRole("Staff", "write");
    const itemId=field(formData,"itemId"), type=field(formData,"type");
    const qty=optionalNumber(formData,"quantity");
    if(!itemId||!type||qty===undefined||qty<=0)return;
    const latest=await airtableList(TABLES.inventory,["Area"]);
    if(!latest.some(r=>r.id===itemId&&asText(r.fields.Area)==="Shelter"))return;
    await airtableCreate(TABLES.inventoryTransactions,{
      Item:[itemId],"Date / Time":new Date().toISOString(),"Transaction Type":type,
      "Quantity Change":qty,"Entered By":current.displayName,
      "Vendor / Source":field(formData,"vendor"),
      "Lot Number":field(formData,"lotNumber"),
      ...(field(formData,"expirationDate")?{"Expiration Date":field(formData,"expirationDate")}:{ }),
      ...(optionalNumber(formData,"cost")!==undefined?{Cost:optionalNumber(formData,"cost")}:{ }),
      Notes:field(formData,"notes"),
    },true);
    if(type==="Received") await airtableUpdate(TABLES.inventory,itemId,{"Last Received":new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago"}).format(new Date())},true);
    revalidatePath("/portal/staff/inventory");
    revalidatePath("/portal/staff");
  }

  return <main className="min-h-screen bg-slate-50"><div className="container-custom py-10 md:py-12">
    <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4"/> Staff Portal</Link>
    <header className="mb-8"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Shelter Operations</p><h1 className="text-4xl font-bold tracking-tight md:text-5xl">Shelter Inventory</h1><p className="mt-4 max-w-3xl text-muted-foreground">Manage shelter supplies through transaction history, reorder thresholds, vendors, and low-stock alerts. Clinic inventory remains separate.</p></header>

    <section className="mb-8 grid gap-4 sm:grid-cols-3">
      {[
        ["Active shelter items",active.length,Boxes],
        ["Need attention",attention.length,AlertTriangle],
        ["Recent transactions",transactions.filter(t=>asStrings(t.fields.Item).some(id=>itemById.get(id)&&asText(itemById.get(id)?.fields.Area)==="Shelter")).slice(0,50).length,History],
      ].map(([label,count,Icon])=>{const I=Icon as typeof Boxes;return <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><I className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{String(count)}</p><p className="mt-1 text-sm text-muted-foreground">{String(label)}</p></div>})}
    </section>

    {attention.length>0&&<section className="mb-8 rounded-3xl border border-amber-200 bg-amber-50 p-6"><h2 className="font-bold text-amber-950">Reorder Attention</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{attention.map(r=><div key={r.id} className="rounded-xl bg-white p-4"><div className="flex justify-between gap-3"><strong>{asText(r.fields["Item Name"])}</strong><Pill>{asText(r.fields["Inventory Status"])}</Pill></div><p className="mt-2 text-sm text-muted-foreground">Current {num(r.fields["Current Quantity"])} {asText(r.fields["Unit of Measure"])} · Suggested reorder {num(r.fields["Suggested Reorder Quantity"])}</p>{asText(r.fields["Purchase URL"])&&<a href={asText(r.fields["Purchase URL"])} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">Open purchase link</a>}</div>)}</div></section>}

    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8"><h2 className="text-2xl font-bold">Inventory Items</h2><div className="mt-5 space-y-4">{shelterItems.map(r=><details key={r.id} className="rounded-2xl border p-5"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{asText(r.fields["Item Name"])}</h3><p className="mt-1 text-sm text-muted-foreground">{asText(r.fields.Category)} · {num(r.fields["Current Quantity"])} {asText(r.fields["Unit of Measure"])}</p></div><Pill>{asText(r.fields["Inventory Status"])}</Pill></div></summary><form action={updateItem} className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2"><input type="hidden" name="itemId" value={r.id}/><input name="itemName" defaultValue={asText(r.fields["Item Name"])} className="rounded-xl border px-3 py-2.5"/><select name="category" defaultValue={asText(r.fields.Category)} className="rounded-xl border bg-white px-3 py-2.5">{["Animal Food","Litter","Cleaning","Medical / Clinic Supply","PPE","Office","Laundry","Animal Care","Other"].map(x=><option key={x}>{x}</option>)}</select><input name="unit" defaultValue={asText(r.fields["Unit of Measure"])} placeholder="Unit of measure" className="rounded-xl border px-3 py-2.5"/><input name="reorderPoint" type="number" step="0.01" defaultValue={num(r.fields["Reorder Point"])||""} placeholder="Reorder point" className="rounded-xl border px-3 py-2.5"/><input name="targetQuantity" type="number" step="0.01" defaultValue={num(r.fields["Target Quantity"])||""} placeholder="Target quantity" className="rounded-xl border px-3 py-2.5"/><input name="vendor" defaultValue={asText(r.fields["Preferred Vendor"])} placeholder="Preferred vendor" className="rounded-xl border px-3 py-2.5"/><input name="purchaseUrl" defaultValue={asText(r.fields["Purchase URL"])} placeholder="Purchase URL" className="rounded-xl border px-3 py-2.5"/><input name="unitCost" type="number" step="0.01" defaultValue={num(r.fields["Typical Unit Cost"])||""} placeholder="Typical unit cost" className="rounded-xl border px-3 py-2.5"/><input name="responsiblePerson" defaultValue={asText(r.fields["Responsible Person"])} placeholder="Responsible person" className="rounded-xl border px-3 py-2.5"/><input name="responsibleEmail" defaultValue={asText(r.fields["Responsible Email"])} placeholder="Responsible email" className="rounded-xl border px-3 py-2.5"/><textarea name="notes" rows={2} defaultValue={asText(r.fields.Notes)} className="rounded-xl border px-3 py-2.5 sm:col-span-2"/><label className="text-sm"><input name="active" type="checkbox" defaultChecked={Boolean(r.fields.Active)} className="mr-2"/>Active</label><label className="text-sm"><input name="trackLot" type="checkbox" defaultChecked={Boolean(r.fields["Track Lot / Expiration"])} className="mr-2"/>Track lot / expiration</label><button className="w-fit rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary sm:col-span-2">Save Item</button></form></details>)}</div></section>

      <div className="space-y-6">
        <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8"><div className="mb-5 flex items-center gap-3"><PackagePlus className="h-6 w-6 text-primary"/><div><h2 className="text-2xl font-bold">Record Inventory Movement</h2><p className="text-sm text-muted-foreground">Current quantity is calculated from these transactions.</p></div></div><form action={recordTransaction} className="space-y-3"><select name="itemId" required defaultValue="" className="w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select shelter item</option>{active.map(r=><option key={r.id} value={r.id}>{asText(r.fields["Item Name"])}</option>)}</select><select name="type" required defaultValue="Received" className="w-full rounded-xl border bg-white px-3 py-2.5">{["Received","Used","Adjustment +","Adjustment -","Damaged / Discarded","Expired"].map(x=><option key={x}>{x}</option>)}</select><input name="quantity" type="number" min="0.01" step="0.01" required placeholder="Quantity" className="w-full rounded-xl border px-3 py-2.5"/><details className="rounded-2xl bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold">Receiving / exception details</summary><div className="mt-4 space-y-3"><input name="vendor" placeholder="Vendor / source" className="w-full rounded-xl border bg-white px-3 py-2.5"/><input name="lotNumber" placeholder="Lot number" className="w-full rounded-xl border bg-white px-3 py-2.5"/><input name="expirationDate" type="date" className="w-full rounded-xl border bg-white px-3 py-2.5"/><input name="cost" type="number" min="0" step="0.01" placeholder="Cost" className="w-full rounded-xl border bg-white px-3 py-2.5"/><textarea name="notes" rows={3} placeholder="Notes" className="w-full rounded-xl border bg-white px-3 py-2.5"/></div></details><button className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white">Save Transaction</button></form></section>

        <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8"><h2 className="text-2xl font-bold">Add Shelter Item</h2><form action={addItem} className="mt-5 space-y-3"><input name="itemName" required placeholder="Item name" className="w-full rounded-xl border px-3 py-2.5"/><select name="category" defaultValue="Other" className="w-full rounded-xl border bg-white px-3 py-2.5">{["Animal Food","Litter","Cleaning","Medical / Clinic Supply","PPE","Office","Laundry","Animal Care","Other"].map(x=><option key={x}>{x}</option>)}</select><input name="unit" placeholder="Unit of measure" className="w-full rounded-xl border px-3 py-2.5"/><div className="grid gap-3 sm:grid-cols-2"><input name="reorderPoint" type="number" step="0.01" placeholder="Reorder point" className="rounded-xl border px-3 py-2.5"/><input name="targetQuantity" type="number" step="0.01" placeholder="Target quantity" className="rounded-xl border px-3 py-2.5"/></div><input name="vendor" placeholder="Preferred vendor" className="w-full rounded-xl border px-3 py-2.5"/><input name="purchaseUrl" placeholder="Purchase URL" className="w-full rounded-xl border px-3 py-2.5"/><input name="unitCost" type="number" step="0.01" placeholder="Typical unit cost" className="w-full rounded-xl border px-3 py-2.5"/><input name="responsiblePerson" placeholder="Responsible person" className="w-full rounded-xl border px-3 py-2.5"/><input name="responsibleEmail" placeholder="Responsible email" className="w-full rounded-xl border px-3 py-2.5"/><label className="text-sm"><input name="trackLot" type="checkbox" className="mr-2"/>Track lot / expiration</label><textarea name="notes" rows={3} placeholder="Notes" className="w-full rounded-xl border px-3 py-2.5"/><button className="w-full rounded-full border border-primary px-5 py-3 font-semibold text-primary">Add Item</button></form></section>
      </div>
    </div>
  </div></main>
}