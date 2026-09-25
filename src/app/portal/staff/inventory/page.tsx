import Link from "next/link";
import type { ReactNode } from "react";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Boxes, PackagePlus, AlertTriangle, History } from "lucide-react";
import {
  airtableCreate, airtableDelete, airtableList, airtableUpdate, asStrings, asText,
  requirePortalRole, TABLES,
} from "@/lib/portal";

function num(v: unknown){ return typeof v==="number"?v:0 }
function field(f:FormData,n:string){ return String(f.get(n)||"").trim() }
function optionalNumber(f:FormData,n:string){ const v=field(f,n); if(!v)return undefined; const x=Number(v); return Number.isFinite(x)?x:undefined }
function Pill({children}:{children:ReactNode}){return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{children}</span>}

export default async function ShelterInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ attention?: string }>;
}){
  const context=await requirePortalRole("Staff");
  const query=await searchParams;
  const attentionOnly=query.attention==="1";
  const [items,transactions]=await Promise.all([
    airtableList(TABLES.inventory,[
      "Item Name","Area","Category","Unit of Measure","Reorder Point","Target Quantity",
      "Suggested Reorder Quantity","Preferred Vendor","Purchase URL","Typical Unit Cost",
      "Responsible Person","Responsible Email","Active","Track Lot / Expiration",
      "Last Ordered","Last Received","Notes","Current Quantity","Inventory Status",
      "Reorder Request Status","Reorder Requested At","Reorder Requested By","Reorder Reason"
    ],{sort:[{field:"Item Name",direction:"asc"}]}),
    airtableList(TABLES.inventoryTransactions,[
      "Item","Date / Time","Transaction Type","Quantity Change","Entered By","Vendor / Source",
      "Lot Number","Expiration Date","Cost","Notes","Signed Quantity"
    ],{sort:[{field:"Date / Time",direction:"desc"}]})
  ]);
  const shelterItems=items.filter(r=>asText(r.fields.Area)==="Shelter"&&Boolean(r.fields.Active));
  const itemById=new Map(items.map(r=>[r.id,r]));
  const attention=shelterItems.filter(r=>
    ["Low Stock","Out of Stock"].includes(asText(r.fields["Inventory Status"])) ||
    ["Requested","Ordered"].includes(asText(r.fields["Reorder Request Status"]))
  );
  const active=shelterItems.filter(r=>Boolean(r.fields.Active));
  const visibleItems=attentionOnly?attention:shelterItems;

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
      "Responsible Person":field(formData,"responsiblePerson")||"Sam Smith",
      "Responsible Email":field(formData,"responsibleEmail")||"sa7smith@msn.com",
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

  async function saveCurrentCount(formData:FormData){
    "use server";
    const current=await requirePortalRole("Staff","write");
    const id=field(formData,"itemId");
    const count=optionalNumber(formData,"count");
    if(!id||count===undefined||count<0)return;
    const latest=await airtableList(TABLES.inventory,["Area","Current Quantity","Inventory Status"]);
    const item=latest.find(r=>r.id===id&&asText(r.fields.Area)==="Shelter");
    if(!item)return;
    const existing=num(item.fields["Current Quantity"]);
    const delta=count-existing;
    if(delta!==0||asText(item.fields["Inventory Status"])==="Not Counted"){
      await airtableCreate(TABLES.inventoryTransactions,{
        Item:[id],
        "Date / Time":new Date().toISOString(),
        "Transaction Type":delta>=0?"Adjustment +":"Adjustment -",
        "Quantity Change":Math.abs(delta),
        "Entered By":current.displayName||current.email,
        Notes:asText(item.fields["Inventory Status"])==="Not Counted"?"Opening physical count entered from Shelter Inventory.":"Physical count adjustment entered from Shelter Inventory.",
      },true);
    }
    revalidatePath("/portal/staff/inventory");
    revalidatePath("/portal/staff");
  }

  async function requestReorder(formData:FormData){
    "use server";
    const current=await requirePortalRole("Staff","write");
    const id=field(formData,"itemId");
    const latest=await airtableList(TABLES.inventory,[
      "Area","Current Quantity","Reorder Point","Suggested Reorder Quantity","Unit of Measure","Reorder Request Status"
    ]);
    const item=latest.find(r=>r.id===id&&asText(r.fields.Area)==="Shelter");
    if(!item)return;
    const status=asText(item.fields["Reorder Request Status"]);
    if(status==="Requested"||status==="Ordered")return;
    await airtableUpdate(TABLES.inventory,id,{
      "Reorder Request Status":"Requested",
      "Reorder Requested At":new Date().toISOString(),
      "Reorder Requested By":current.displayName||current.email,
      "Reorder Reason":`Manual reorder request from Shelter Inventory. Suggested reorder: ${num(item.fields["Suggested Reorder Quantity"])} ${asText(item.fields["Unit of Measure"])}.`,
      "Reorder Notification Sent":false,
    },true);
    revalidatePath("/portal/staff/inventory");
    revalidatePath("/portal/staff");
  }

  async function deleteItem(formData:FormData){
    "use server";
    await requirePortalRole("Staff","write");
    const id=field(formData,"itemId");
    if(!id||formData.get("confirmDelete")!=="on")return;
    const [latest,tx]=await Promise.all([
      airtableList(TABLES.inventory,["Area"]),
      airtableList(TABLES.inventoryTransactions,["Item"])
    ]);
    const item=latest.find(r=>r.id===id&&asText(r.fields.Area)==="Shelter");
    if(!item)return;
    const hasHistory=tx.some(r=>asStrings(r.fields.Item).includes(id));
    if(hasHistory){
      await airtableUpdate(TABLES.inventory,id,{
        Active:false,
        "Reorder Request Status":"Resolved",
      },true);
    }else{
      await airtableDelete(TABLES.inventory,id);
    }
    revalidatePath("/portal/staff/inventory");
    revalidatePath("/portal/staff");
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
    <header className="mb-8"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Shelter Operations</p><h1 className="text-4xl font-bold tracking-tight md:text-5xl">Shelter Inventory</h1><p className="mt-4 max-w-3xl text-muted-foreground">{attentionOnly ? "Showing only supplies that currently need reorder attention." : "Manage shelter supplies through transaction history, reorder thresholds, vendors, and low-stock alerts. Clinic inventory remains separate."}</p>{attentionOnly&&<Link href="/portal/staff/inventory" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Show all inventory</Link>}</header>

    <section className="mb-8 grid gap-4 sm:grid-cols-3">
      {[
        ["Active shelter items",active.length,Boxes],
        ["Need attention",attention.length,AlertTriangle],
        ["Recent transactions",transactions.filter(t=>asStrings(t.fields.Item).some(id=>itemById.get(id)&&asText(itemById.get(id)?.fields.Area)==="Shelter")).slice(0,50).length,History],
      ].map(([label,count,Icon])=>{const I=Icon as typeof Boxes;return <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><I className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{String(count)}</p><p className="mt-1 text-sm text-muted-foreground">{String(label)}</p></div>})}
    </section>

    {attention.length>0&&<section className="mb-8 rounded-3xl border border-amber-200 bg-amber-50 p-6"><h2 className="font-bold text-amber-950">Reorder Attention</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{attention.map(r=><div key={r.id} className="rounded-xl bg-white p-4"><div className="flex justify-between gap-3"><strong>{asText(r.fields["Item Name"])}</strong><Pill>{asText(r.fields["Inventory Status"])}</Pill></div><p className="mt-2 text-sm text-muted-foreground">Current {num(r.fields["Current Quantity"])} {asText(r.fields["Unit of Measure"])} · Suggested reorder {num(r.fields["Suggested Reorder Quantity"])}</p>{asText(r.fields["Purchase URL"])&&<a href={asText(r.fields["Purchase URL"])} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">Open purchase link</a>}</div>)}</div></section>}

    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
        <h2 className="text-2xl font-bold">Inventory Items</h2>
        <p className="mt-2 text-sm text-muted-foreground">Update counts, request reorders, and maintain supply details. Low-stock items are highlighted automatically.</p>
        <div className="mt-5 space-y-4">
          {visibleItems.map(r=>{
            const status=asText(r.fields["Inventory Status"]);
            const reorderStatus=asText(r.fields["Reorder Request Status"]);
            const low=["Low Stock","Out of Stock"].includes(status);
            const reorderActive=["Requested","Ordered"].includes(reorderStatus);
            return <details key={r.id} className={`rounded-2xl border p-5 ${low||reorderActive?"border-orange-300 bg-orange-50/50":""}`}>
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{asText(r.fields["Item Name"])}</h3>
                    {asText(r.fields["Unit of Measure"])&&<p className="mt-1 text-sm text-muted-foreground">Unit: {asText(r.fields["Unit of Measure"])}</p>}
                    <p className={`mt-1 text-xs font-semibold ${low||reorderActive?"text-primary":"text-muted-foreground"}`}>{reorderActive?`Reorder ${reorderStatus.toLowerCase()}`:status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{num(r.fields["Current Quantity"])}</p>
                    <p className="text-xs text-muted-foreground">Reorder at {num(r.fields["Reorder Point"])} · Target {num(r.fields["Target Quantity"])}</p>
                  </div>
                </div>
              </summary>

              <div className="mt-5 grid gap-3 border-t pt-5 md:grid-cols-[1fr_auto]">
                <form action={saveCurrentCount} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="itemId" value={r.id}/>
                  <label className="text-xs font-medium">Current count<input name="count" type="number" min="0" step="1" defaultValue={num(r.fields["Current Quantity"])} className="mt-1 w-28 rounded-xl border bg-white px-3 py-2.5"/></label>
                  <button className="rounded-full border border-primary px-4 py-2.5 text-sm font-semibold text-primary">Save count</button>
                </form>
                <form action={requestReorder} className="flex items-end">
                  <input type="hidden" name="itemId" value={r.id}/>
                  <button disabled={reorderActive} className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">{reorderActive?(reorderStatus==="Ordered"?"Order in progress":"Reorder requested"):"Request reorder"}</button>
                </form>
              </div>
              {low&&!reorderActive&&<p className="mt-3 text-xs font-semibold text-primary">Low count detected. A reorder request is needed.</p>}

              <details className="mt-5 border-t pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-primary">Modify item</summary>
                <form action={updateItem} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="itemId" value={r.id}/>
                  <label className="text-xs font-medium">Supply name<input name="itemName" defaultValue={asText(r.fields["Item Name"])} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
                  <label className="text-xs font-medium">Category<select name="category" defaultValue={asText(r.fields.Category)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">{["Animal Food","Litter","Cleaning","Medical / Clinic Supply","PPE","Office","Laundry","Animal Care","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
                  <label className="text-xs font-medium">Unit of measure<input name="unit" defaultValue={asText(r.fields["Unit of Measure"])} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-medium">Reorder point<input name="reorderPoint" type="number" min="0" step="0.01" defaultValue={num(r.fields["Reorder Point"])||""} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
                    <label className="text-xs font-medium">Target quantity<input name="targetQuantity" type="number" min="0" step="0.01" defaultValue={num(r.fields["Target Quantity"])||""} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
                  </div>
                  <label className="text-xs font-medium">Preferred vendor<input name="vendor" defaultValue={asText(r.fields["Preferred Vendor"])} placeholder="Optional" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
                  <label className="text-xs font-medium">Purchase URL<input name="purchaseUrl" type="url" defaultValue={asText(r.fields["Purchase URL"])} placeholder="Optional" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
                  <label className="text-xs font-medium">Typical unit cost<input name="unitCost" type="number" min="0" step="0.01" defaultValue={num(r.fields["Typical Unit Cost"])||""} placeholder="Optional" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
                  <label className="text-xs font-medium">Responsible person<input name="responsiblePerson" defaultValue={asText(r.fields["Responsible Person"])||"Sam Smith"} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
                  <label className="text-xs font-medium">Responsible email<input name="responsibleEmail" type="email" defaultValue={asText(r.fields["Responsible Email"])||"sa7smith@msn.com"} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
                  <label className="flex items-center gap-2 text-sm"><input name="trackLot" type="checkbox" defaultChecked={Boolean(r.fields["Track Lot / Expiration"])}/> Track lot / expiration</label>
                  <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={Boolean(r.fields.Active)}/> Active</label>
                  <label className="text-xs font-medium sm:col-span-2">Notes<textarea name="notes" rows={3} defaultValue={asText(r.fields.Notes)} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
                  <button className="w-fit rounded-full border border-primary px-5 py-2.5 text-sm font-semibold text-primary sm:col-span-2">Save item changes</button>
                </form>

                <form action={deleteItem} className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <input type="hidden" name="itemId" value={r.id}/>
                  <p className="text-sm font-semibold text-red-800">Delete item</p>
                  <p className="mt-1 text-xs text-red-700">If this item has transaction history, it will be archived instead of permanently removed so inventory history remains intact.</p>
                  <label className="mt-3 flex items-start gap-2 text-xs text-red-800"><input required name="confirmDelete" type="checkbox" className="mt-0.5"/> I confirm that I want to remove this item from active inventory.</label>
                  <button className="mt-3 rounded-full border border-red-500 px-4 py-2 text-sm font-semibold text-red-700">Delete item</button>
                </form>
              </details>
            </details>
          })}
        </div>
      </section>

      <div className="space-y-6">
        <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex items-center gap-3"><PackagePlus className="h-6 w-6 text-primary"/><div><h2 className="text-2xl font-bold">Record Inventory Movement</h2><p className="text-sm text-muted-foreground">Current quantity is calculated from these transactions.</p></div></div>
          <form action={recordTransaction} className="space-y-3">
            <label className="block text-xs font-medium">Shelter item<select name="itemId" required defaultValue="" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"><option value="" disabled>Select shelter item</option>{active.map(r=><option key={r.id} value={r.id}>{asText(r.fields["Item Name"])}</option>)}</select></label>
            <label className="block text-xs font-medium">Transaction type<select name="type" required defaultValue="Received" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">{["Received","Used","Adjustment +","Adjustment -","Damaged / Discarded","Expired"].map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="block text-xs font-medium">Quantity<input name="quantity" type="number" min="0.01" step="0.01" required className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
            <details className="rounded-2xl bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold">Receiving / exception details</summary><div className="mt-4 space-y-3">
              <label className="block text-xs font-medium">Vendor / source<input name="vendor" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
              <label className="block text-xs font-medium">Lot number<input name="lotNumber" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
              <label className="block text-xs font-medium">Expiration date<input name="expirationDate" type="date" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
              <label className="block text-xs font-medium">Cost<input name="cost" type="number" min="0" step="0.01" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
              <label className="block text-xs font-medium">Notes<textarea name="notes" rows={3} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
            </div></details>
            <button className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white">Save Transaction</button>
          </form>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold">Add Shelter Item</h2>
          <form action={addItem} className="mt-5 space-y-3">
            <label className="block text-xs font-medium">Supply name<input name="itemName" required className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
            <label className="block text-xs font-medium">Category<select name="category" defaultValue="Other" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">{["Animal Food","Litter","Cleaning","Medical / Clinic Supply","PPE","Office","Laundry","Animal Care","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="block text-xs font-medium">Unit of measure<input name="unit" placeholder="e.g. case, bag, each" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium">Reorder point<input name="reorderPoint" type="number" min="0" step="0.01" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label><label className="text-xs font-medium">Target quantity<input name="targetQuantity" type="number" min="0" step="0.01" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label></div>
            <label className="block text-xs font-medium">Preferred vendor<input name="vendor" placeholder="Optional" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
            <label className="block text-xs font-medium">Purchase URL<input name="purchaseUrl" type="url" placeholder="Optional" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
            <label className="block text-xs font-medium">Typical unit cost<input name="unitCost" type="number" min="0" step="0.01" placeholder="Optional" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
            <label className="block text-xs font-medium">Responsible person<input name="responsiblePerson" defaultValue="Sam Smith" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
            <label className="block text-xs font-medium">Responsible email<input name="responsibleEmail" type="email" defaultValue="sa7smith@msn.com" className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
            <label className="text-sm"><input name="trackLot" type="checkbox" className="mr-2"/>Track lot / expiration</label>
            <label className="block text-xs font-medium">Notes<textarea name="notes" rows={3} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
            <button className="w-full rounded-full border border-primary px-5 py-3 font-semibold text-primary">Add Item</button>
          </form>
        </section>
      </div>
    </div>
  </div></main>
}