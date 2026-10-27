import { redirect } from "next/navigation";
import { SaveCountButton } from "./save-count-button";
import { InventoryItemSelector } from "./inventory-item-selector";
import { InventoryItemEditor, type InventorySaveResult } from "@/components/inventory-item-editor";
import Link from "next/link";
import type { ReactNode } from "react";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Boxes, PackagePlus, AlertTriangle, History } from "lucide-react";
import { ShelterInventorySearch } from "./inventory-search";
import {
  airtableCreate, airtableDelete, airtableList, airtableUpdate, airtableUploadAttachment, asStrings, asText,
  requirePortalRole, TABLES,
} from "@/lib/portal";

function num(v: unknown){ return typeof v==="number"?v:0 }
function field(f:FormData,n:string){ return String(f.get(n)||"").trim() }
function optionalNumber(f:FormData,n:string){ const v=field(f,n); if(!v)return undefined; const x=Number(v); return Number.isFinite(x)?x:undefined }
function Pill({children}:{children:ReactNode}){return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{children}</span>}

export default async function ShelterInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ attention?: string; countSaved?: string }>;
}){
  const context=await requirePortalRole("Staff");
  const canManageInventory=context.isAdministrator||context.roles.includes("Shelter Manager");
  const canEditInventory=context.isAdministrator||context.roles.includes("Shelter Manager")||context.roles.includes("Staff");
  const canRequestReorder=canManageInventory;
  const query=await searchParams;
  const attentionOnly=query.attention==="1";
  const [items,transactions]=await Promise.all([
    airtableList(TABLES.inventory,[
      "Item Name","Area","Category","Unit of Measure","Reorder Point","Target Quantity",
      "Suggested Reorder Quantity","Preferred Vendor","Purchase URL","Typical Unit Cost",
      "Responsible Person","Responsible Email","Active","Track Lot / Expiration",
      "Last Ordered","Last Received","Last Counted At","Last Counted By","Recommended Reorder Quantity","Notes","Current Quantity","Inventory Status",
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
    ["Low Stock","Out of Stock","Not Counted"].includes(asText(r.fields["Inventory Status"])) ||
    ["Requested","Ordered"].includes(asText(r.fields["Reorder Request Status"]))
  );
  const active=shelterItems.filter(r=>Boolean(r.fields.Active));
  const visibleItems=attentionOnly?attention:shelterItems;
  const categories=Array.from(new Set(visibleItems.map(r=>asText(r.fields.Category)||"Other"))).sort((a,b)=>a.localeCompare(b));

  async function addItem(formData:FormData){
    "use server";
    const current=await requirePortalRole("Staff", "write");
    if(!current.isAdministrator&&!current.roles.includes("Shelter Manager")&&!current.roles.includes("Staff"))return;
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

  async function updateItem(formData:FormData): Promise<InventorySaveResult> {
    "use server";
    const current=await requirePortalRole("Staff", "write");
    if(!current.isAdministrator&&!current.roles.includes("Shelter Manager")&&!current.roles.includes("Staff"))return { ok: false, error: "This item could not be saved. Check the supply name and your inventory access, then try again." };
    const id=field(formData,"itemId");
    const latest=await airtableList(TABLES.inventory,["Area"]);
    if(!latest.some(r=>r.id===id&&asText(r.fields.Area)==="Shelter"))return { ok: false, error: "This item could not be saved. Check the supply name and your inventory access, then try again." };
    try {
      if (!field(formData,"itemName")) return { ok: false, error: "Enter a supply name before saving." };
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
      return { ok: true };
    } catch {
      return { ok: false, error: "Changes could not be saved. Your edits are still here. Please try again." };
    }
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
    await airtableUpdate(TABLES.inventory,id,{
      "Last Counted At":new Date().toISOString(),
      "Last Counted By":current.displayName||current.email,
    },true);
    revalidatePath("/portal/staff/inventory");
    revalidatePath("/portal/staff");
    redirect("/portal/staff/inventory?countSaved=1");
  }

  async function requestReorder(formData:FormData){
    "use server";
    const current=await requirePortalRole("Staff","write");
    if(!current.isAdministrator&&!current.roles.includes("Shelter Manager"))return;
    const id=field(formData,"itemId");
    const latest=await airtableList(TABLES.inventory,[
      "Area","Current Quantity","Reorder Point","Suggested Reorder Quantity","Recommended Reorder Quantity","Unit of Measure","Reorder Request Status"
    ]);
    const item=latest.find(r=>r.id===id&&asText(r.fields.Area)==="Shelter");
    if(!item)return;
    const status=asText(item.fields["Reorder Request Status"]);
    if(status==="Requested"||status==="Ordered")return;
    await airtableUpdate(TABLES.inventory,id,{
      "Reorder Request Status":"Requested",
      "Reorder Requested At":new Date().toISOString(),
      "Reorder Requested By":current.displayName||current.email,
      "Reorder Reason":`Manual reorder request from Shelter Inventory. Recommended reorder: ${num(item.fields["Recommended Reorder Quantity"])||num(item.fields["Suggested Reorder Quantity"])} ${asText(item.fields["Unit of Measure"])}.`,
      "Reorder Notification Sent":false,
    },true);
    revalidatePath("/portal/staff/inventory");
    revalidatePath("/portal/staff");
  }

  async function deleteItem(formData:FormData){
    "use server";
    const current=await requirePortalRole("Staff","write");
    if(!current.isAdministrator&&!current.roles.includes("Shelter Manager"))return;
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
    const current=await requirePortalRole("Staff","write");
    const itemId=field(formData,"itemId"),type=field(formData,"type");
    const manager=current.isAdministrator||current.roles.includes("Shelter Manager");
    if(type!=="Received"&&!manager)return;
    const qty=optionalNumber(formData,"quantity");
    if(!itemId||!type||qty===undefined||qty<=0)throw new Error("Choose an item and positive quantity.");
    const latest=await airtableList(TABLES.inventory,["Area","Item Name","Unit of Measure"]);
    const item=latest.find(r=>r.id===itemId&&asText(r.fields.Area)==="Shelter");
    if(!item)throw new Error("Select a valid shelter inventory item.");
    const file=formData.get("receipt");
    const receipt=file instanceof File&&file.size>0?file:null;
    const noReceipt=formData.get("noReceipt")==="on";
    if(type==="Received"&&!receipt&&!noReceipt)throw new Error("Attach a receipt or mark this as a donation with missing documentation.");
    if(noReceipt&&type==="Received"&&formData.get("donated")!=="on")throw new Error("Missing receipt exception is only available for donated supplies.");
    if(receipt&&!(receipt.type.startsWith("image/")||receipt.type==="application/pdf"))throw new Error("Receipt must be a photo or PDF.");
    if(receipt&&receipt.size>5*1024*1024)throw new Error("Receipt file must be 5MB or smaller.");
    const rec=await airtableCreate(TABLES.inventoryTransactions,{
      Item:[itemId],"Date / Time":new Date().toISOString(),"Transaction Type":type,
      "Quantity Change":qty,"Entered By":current.displayName||current.email,
      "Vendor / Source":field(formData,"vendor"),
      "Lot Number":field(formData,"lotNumber"),
      ...(field(formData,"expirationDate")?{"Expiration Date":field(formData,"expirationDate")}:{ }),
      ...(optionalNumber(formData,"cost")!==undefined?{Cost:optionalNumber(formData,"cost")}:{ }),
      ...(type==="Received"?{"Acquisition Type":formData.get("donated")==="on"?"Donated":"Purchased"}:{}),
      Notes:[formData.get("donated")==="on"?"Donated supplies":"",field(formData,"notes")].filter(Boolean).join("; "),
    },true);
    if(!rec)throw new Error("Could not create inventory transaction.");
    if(receipt)await airtableUploadAttachment(rec.id,"fld3abHZEWugl9CNQ",receipt,true);
    if(noReceipt){
      await airtableCreate(TABLES.staffTasks,{
        Task:"Obtain and attach documentation for donated inventory",
        Category:"Inventory",Status:"Open",Priority:"Important","Assigned Role":"Bookkeeper",
        "Related Record ID":rec.id,"Created By":current.displayName||current.email,
        Description:`Donated ${qty} ${asText(item.fields["Unit of Measure"])} of ${asText(item.fields["Item Name"])} were received without documentation. Obtain donor documentation or record that none is available, then attach supporting evidence to the original inventory transaction.`
      },true);
    }
    if(type==="Received")await airtableUpdate(TABLES.inventory,itemId,{"Last Received":new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago"}).format(new Date())},true);
    revalidatePath("/portal/staff/inventory");revalidatePath("/portal/staff");revalidatePath("/portal/staff/tasks");
  }

  async function resolveReorder(formData:FormData){
    "use server";
    const current=await requirePortalRole("Staff","write");
    if(!current.isAdministrator&&!current.roles.includes("Shelter Manager"))return;
    const id=field(formData,"itemId");
    const latest=await airtableList(TABLES.inventory,["Area","Reorder Request Status"]);
    const item=latest.find(r=>r.id===id&&asText(r.fields.Area)==="Shelter");
    if(!item||!["Requested","Ordered"].includes(asText(item.fields["Reorder Request Status"])))return;
    await airtableUpdate(TABLES.inventory,id,{"Reorder Request Status":"Resolved"},true);
    revalidatePath("/portal/staff/inventory");
    revalidatePath("/portal/staff");
  }

  return <main className="min-h-screen bg-slate-50"><div className="container-custom py-10 md:py-12">
    <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4"/> Staff Portal</Link>
    <header className="mb-8"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Shelter Operations</p><h1 className="text-4xl font-bold tracking-tight md:text-5xl">Shelter Inventory</h1><p className="mt-4 max-w-3xl text-muted-foreground">{attentionOnly ? "Showing only supplies that currently need attention." : "Manage shelter supplies through transaction history, reorder thresholds, vendors, and low-stock alerts. Clinic inventory remains separate."}</p>{attentionOnly&&<Link href="/portal/staff/inventory" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Show all inventory</Link>}</header>

    <section className="mb-8 grid gap-4 sm:grid-cols-3">
      {[
        ["Active shelter items",active.length,Boxes],
        ["Need reorder",attention.filter(r=>!["Requested","Ordered"].includes(asText(r.fields["Reorder Request Status"]))&&["Low Stock","Out of Stock"].includes(asText(r.fields["Inventory Status"]))).length,AlertTriangle],
        ["Orders in progress",active.filter(r=>["Requested","Ordered"].includes(asText(r.fields["Reorder Request Status"]))).length,PackagePlus],
      ].map(([label,count,Icon])=>{const I=Icon as typeof Boxes;return <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><I className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{String(count)}</p><p className="mt-1 text-sm text-muted-foreground">{String(label)}</p></div>})}
    </section>
    <div className="mb-4 flex flex-wrap gap-3"><Link className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary" href="/portal/staff/tasks">Tasks & Shift Handoffs</Link><Link className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary" href="/portal/staff/reports/inventory">Inventory Reports</Link></div>
    {attention.length>0&&<section className="mb-8 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
      <h2 className="font-bold text-amber-950">Needs Attention</h2><p className="mt-1 text-sm text-amber-900">This is a status overview. To update quantities, use the inventory actions below.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{attention.map(r=>{const status=asText(r.fields["Reorder Request Status"]),ordered=status==="Ordered",requested=status==="Requested";return <div key={r.id} className="rounded-xl bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{asText(r.fields["Item Name"])}</strong><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{asText(r.fields["Inventory Status"])}</span></div><p className="mt-2 text-sm text-muted-foreground">Current: {num(r.fields["Current Quantity"])} {asText(r.fields["Unit of Measure"])}. Suggested reorder: {num(r.fields["Recommended Reorder Quantity"])||num(r.fields["Suggested Reorder Quantity"])}.</p><p className="mt-2 text-sm font-semibold">{ordered?"Order confirmed, awaiting delivery":requested?"Reorder request submitted":asText(r.fields["Inventory Status"])==="Not Counted"?"Physical count required":"Low stock notification sent when alert conditions are met"}</p>{!ordered&&<Link className="mt-3 inline-block rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary" href={`/portal/staff/inventory/confirm-order?item=${r.id}`}>Confirm order placed</Link>}</div>})}</div></section>}

    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
        <h2 className="text-2xl font-bold">Inventory Items</h2>
        <p className="mt-2 text-sm text-muted-foreground">Review supplies and maintain item details. Use Count Inventory for physical counts and Receive Supplies when deliveries arrive.</p>
        <ShelterInventorySearch />
        <details className="mt-5 rounded-2xl border bg-white">
          <summary className="cursor-pointer px-4 py-4 font-semibold text-primary">Count Inventory</summary>
          <div className="space-y-2 border-t p-4">
            <p className="mb-3 text-sm text-muted-foreground">Use when you are physically checking stock. Example: the system shows 30 cans, but there are 28 on the shelf. Enter 28; the system records the correction.</p>
            {visibleItems.map(r=><form key={r.id} action={saveCurrentCount} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <input type="hidden" name="itemId" value={r.id}/>
              <div><p className="font-medium">{asText(r.fields["Item Name"])}</p><p className="text-xs text-muted-foreground">{asText(r.fields.Category)||"Other"}</p></div>
              <input name="count" type="number" min="0" step="1" defaultValue={num(r.fields["Current Quantity"])} className="w-28 rounded-lg border bg-white px-3 py-2 text-sm"/>
              <button className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">Save</button>
            </form>)}
          </div>
        </details>
        <div className="mt-5 space-y-3">
          {categories.map(category=>{
            const categoryItems=visibleItems.filter(r=>(asText(r.fields.Category)||"Other")===category);
            if(!categoryItems.length)return null;
            return <details key={category} name="shelter-inventory-categories" data-shelter-inventory-category className="rounded-2xl border bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                <span>{category}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-muted-foreground">{categoryItems.length}</span>
              </summary>
              <div className="space-y-3 border-t p-3">
              {categoryItems.map(r=>{
                const status=asText(r.fields["Inventory Status"]);
                const reorderStatus=asText(r.fields["Reorder Request Status"]);
                const low=["Low Stock","Out of Stock"].includes(status);
                const reorderActive=["Requested","Ordered"].includes(reorderStatus);
                return <details key={r.id} data-shelter-inventory-item data-inventory-search={`${asText(r.fields["Item Name"])} ${asText(r.fields.Category)} ${asText(r.fields["Unit of Measure"])} ${asText(r.fields["Preferred Vendor"])} ${status}`} className={`rounded-2xl border p-5 ${low||reorderActive?"border-orange-300 bg-orange-50/50":"bg-slate-50"}`}>
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{asText(r.fields["Item Name"])}</h3>
                    {asText(r.fields["Unit of Measure"])&&<p className="mt-1 text-sm text-muted-foreground">Unit: {asText(r.fields["Unit of Measure"])}</p>}
                    {asText(r.fields["Last Counted At"])&&<p className="mt-1 text-xs text-muted-foreground">Last counted {new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"America/Chicago"}).format(new Date(asText(r.fields["Last Counted At"])))}{asText(r.fields["Last Counted By"])?` by ${asText(r.fields["Last Counted By"])}`:""}</p>}
                    <p className={`mt-1 text-xs font-semibold ${low||reorderActive?"text-primary":"text-muted-foreground"}`}>{reorderActive?`Reorder ${reorderStatus.toLowerCase()}`:status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{num(r.fields["Current Quantity"])}</p>
                    <p className="text-xs text-muted-foreground">Reorder at {num(r.fields["Reorder Point"])} · Target {num(r.fields["Target Quantity"])} · Recommend {num(r.fields["Recommended Reorder Quantity"])}</p>
                  </div>
                </div>
              </summary>

              <div className="mt-5 grid gap-3 border-t pt-5 md:grid-cols-[1fr_auto]">
                <form action={saveCurrentCount} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="itemId" value={r.id}/>
                  <label className="text-xs font-medium">Current count<input name="count" type="number" min="0" step="1" defaultValue={num(r.fields["Current Quantity"])} className="mt-1 w-28 rounded-xl border bg-white px-3 py-2.5"/></label>
                  <SaveCountButton saved={query.countSaved==="1"}/>
                </form>
                {canRequestReorder&&<div className="flex flex-wrap items-end justify-end gap-2">
                  <Link href={`/portal/staff/inventory/confirm-order?item=${r.id}`} className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white">{reorderStatus==="Ordered"?"Review order":"Confirm order placed"}</Link>
                  {reorderActive&&<form action={resolveReorder} className="flex items-end">
                    <input type="hidden" name="itemId" value={r.id}/>
                    <button className="rounded-full border border-primary px-4 py-2.5 text-sm font-semibold text-primary">Resolved</button>
                  </form>}
                </div>}
              </div>
              {low&&!reorderActive&&<p className="mt-3 text-xs font-semibold text-primary">Low count detected. The responsible person receives an automatic email when the alert conditions are met.</p>}

              {canEditInventory&&<InventoryItemEditor action={updateItem} className="mt-5 border-t pt-4" deleteSection={
                <form action={deleteItem} className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <input type="hidden" name="itemId" value={r.id}/>
                  <p className="text-sm font-semibold text-red-800">Delete item</p>
                  <p className="mt-1 text-xs text-red-700">If this item has transaction history, it will be archived instead of permanently removed so inventory history remains intact.</p>
                  <label className="mt-3 flex items-start gap-2 text-xs text-red-800"><input required name="confirmDelete" type="checkbox" className="mt-0.5"/> I confirm that I want to remove this item from active inventory.</label>
                  <button className="mt-3 rounded-full border border-red-500 px-4 py-2 text-sm font-semibold text-red-700">Delete item</button>
                </form>
              }>

                  <input type="hidden" name="itemId" value={r.id}/>
                  <label className="text-xs font-medium">Supply name<input name="itemName" required defaultValue={asText(r.fields["Item Name"])} className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
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
              </InventoryItemEditor>}
                </details>
              })}
              </div>
            </details>
          })}
        </div>
      </section>

      <div className="space-y-6">
        {canEditInventory&&<section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex items-center gap-3"><PackagePlus className="h-6 w-6 text-primary"/><div><h2 className="text-2xl font-bold">Receive or Adjust Inventory</h2><p className="text-sm text-muted-foreground">Current quantity is calculated from these transactions.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">If an order arrives partially, record the quantity received and leave the reorder request unresolved until the remaining items arrive.</p></div></div>
          <div className="mb-4 space-y-2 text-sm text-slate-700"><p><strong>Receive:</strong> New supplies arrive. Example: 48 cans delivered; enter 48 cans.</p><p><strong>Count:</strong> Verify total physically present, using the Count Inventory section.</p><p><strong>Adjust:</strong> Record known losses or corrections, such as two damaged cans being discarded.</p><p>For unfinished receiving work, <Link className="font-semibold text-primary underline" href="/portal/staff/tasks">create a shift handoff</Link>.</p></div><form action={recordTransaction} encType="multipart/form-data" className="space-y-3">
            <InventoryItemSelector items={active.map(r=>({id:r.id,name:asText(r.fields["Item Name"]),unit:asText(r.fields["Unit of Measure"])}))}/>
            <label className="block text-xs font-medium">Transaction type<select name="type" required defaultValue="Received" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5">{(canManageInventory?["Received","Used","Adjustment +","Adjustment -","Damaged / Discarded","Expired"]:["Received"]).map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="block text-xs font-medium">Quantity in the selected item’s unit (for example, cans, not pallets)<input name="quantity" type="number" min="0.01" step="0.01" required className="mt-1 w-full rounded-xl border px-3 py-2.5"/></label>
            <div className="rounded-xl border bg-slate-50 p-3 space-y-2"><label className="flex items-center gap-2 text-sm"><input name="donated" type="checkbox"/> Donated supplies</label><label className="block text-sm font-medium">Receipt photograph or PDF<input name="receipt" type="file" accept="image/*,.pdf,application/pdf" className="mt-1 block w-full text-sm"/></label><label className="flex items-center gap-2 text-sm"><input name="noReceipt" type="checkbox"/> Donated supplies, no receipt provided (creates a bookkeeper follow-up task)</label><p className="text-xs text-slate-600">Required for received supplies unless donated supplies have no receipt. Maximum file size: 5 MB.</p></div><details className="rounded-2xl bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold">Receiving / exception details</summary><div className="mt-4 space-y-3">
              <label className="block text-xs font-medium">Vendor / source<input name="vendor" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
              <label className="block text-xs font-medium">Lot number<input name="lotNumber" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
              <label className="block text-xs font-medium">Expiration date<input name="expirationDate" type="date" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
              <label className="block text-xs font-medium">Cost<input name="cost" type="number" min="0" step="0.01" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
              <label className="block text-xs font-medium">Notes<textarea name="notes" rows={3} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
            </div></details>
            <button className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white">Save Inventory Transaction</button>
          </form>
        </section>}

        {canEditInventory&&<section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
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
        </section>}
      </div>
    </div>
  </div></main>
}
