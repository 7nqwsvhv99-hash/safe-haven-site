import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, ContactRound, HeartHandshake, PawPrint, HandHeart, FileText, UsersRound } from "lucide-react";
import {
  airtableCreate, airtableList, airtableUpdate, asStrings, asText,
  requirePortalRole, TABLES,
} from "@/lib/portal";

function field(f:FormData,n:string){return String(f.get(n)||"").trim()}
function num(v:unknown){return typeof v==="number"?v:0}
function fmt(v:unknown,time=false){const s=asText(v);if(!s)return"";const d=new Date(s);if(Number.isNaN(d.getTime()))return s;return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",...(time?{hour:"numeric",minute:"2-digit"}:{}),timeZone:"America/Chicago"}).format(d)}
function money(v:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v)}
function intersects(a:string[],b:Set<string>){return a.some(x=>b.has(x))}
function Pill({children}:{children:ReactNode}){return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{children}</span>}

export default async function PersonProfilePage({params}:{params:Promise<{personId:string}>}){
  await requirePortalRole("Staff");
  const {personId}=await params;

  const [
    people,volunteers,volunteerHours,adoptionApps,adoptions,fosterApps,fosterPlacements,
    surrenders,intakes,donors,donations,documents,subscribers,contacts,animals
  ]=await Promise.all([
    airtableList(TABLES.people,[
      "Display Name","First Name","Last Name","Organization Name","Email","Phone","Street Address","City","State","ZIP",
      "Preferred Contact","Relationship Types","Newsletter Status","Do Not Solicit","Relationship Notes",
      "Volunteers","Adoption Applications","Foster Applications","Owner Surrender Requests","Donors","Newsletter Subscribers","Last Reconciled"
    ]),
    airtableList(TABLES.volunteers,["Volunteer Name","Email","Status","Start Date","Volunteer Areas","Preferred Contact","Volunteer Hours","Documents & Agreements"]),
    airtableList(TABLES.volunteerHours,["Volunteer","Date","Hours","Total Volunteer Hours","Volunteer Activity","Notes"],{sort:[{field:"Date",direction:"desc"}]}),
    airtableList(TABLES.adoptionApplications,["Application ID","Submitted At","Status","Preferred Animal","Adoptions","Reviewer Notes"]),
    airtableList(TABLES.adoptions,["Adoption ID","Adoption Date","Animal","Application","Follow-Up Status","Placement Notes","Documents & Agreements"],{sort:[{field:"Adoption Date",direction:"desc"}]}),
    airtableList(TABLES.fosterApplications,["Foster Application ID","Submitted At","Status","Foster Placements","Reviewer Notes"]),
    airtableList(TABLES.fosterPlacements,["Foster Placement ID","Animal","Foster Application","Placement Status","Placement Type","Start Date","End Date","Return / Outcome","Documents & Agreements"],{sort:[{field:"Start Date",direction:"desc"}]}),
    airtableList(TABLES.surrenderRequests,["Submitted At","Status","Animal Name","Species","Animal Intakes","Documents & Agreements","Staff Notes"],{sort:[{field:"Submitted At",direction:"desc"}]}),
    airtableList(TABLES.animalIntakes,["Animal","Intake Date","Intake Type","Related Surrender Request"]),
    airtableList(TABLES.donors,["Donor Name","Donor Type","Donations","Documents & Agreements","Newsletter Opt-In","Do Not Solicit","Relationship Notes"]),
    airtableList(TABLES.donations,["Donor","Donation Date","Amount","Donation Type","Payment Method","Campaign / Appeal","Receipt Status","Acknowledgment Status"],{sort:[{field:"Donation Date",direction:"desc"}]}),
    airtableList(TABLES.documents,["Document Type","Status","Animal","Adoption","Foster Placement","Volunteer","Donor","Surrender Request","Generated Date","Signed Date","Signed By","Document File"],{sort:[{field:"Generated Date",direction:"desc"}]}),
    airtableList(TABLES.newsletterSubscribers,["Email","First Name","Status","Subscribed At","Source","Unsubscribed At","Notes"]),
    airtableList(TABLES.contactLog,["Person","Date / Time","Contact Method","Direction","Subject / Summary","Notes","Completed By","Next Follow-Up Date","Follow-Up Status"],{sort:[{field:"Date / Time",direction:"desc"}]}),
    airtableList(TABLES.animals,["Animal ID","Pet Name","Species","Adoption Status","Housing Type"])
  ]);

  const person=people.find(r=>r.id===personId);if(!person)notFound();
  const animalById=new Map(animals.map(r=>[r.id,r]));
  const volunteerIds=new Set(asStrings(person.fields.Volunteers));
  const adoptionAppIds=new Set(asStrings(person.fields["Adoption Applications"]));
  const fosterAppIds=new Set(asStrings(person.fields["Foster Applications"]));
  const surrenderIds=new Set(asStrings(person.fields["Owner Surrender Requests"]));
  const donorIds=new Set(asStrings(person.fields.Donors));
  const subscriberIds=new Set(asStrings(person.fields["Newsletter Subscribers"]));

  const personVolunteers=volunteers.filter(r=>volunteerIds.has(r.id));
  const personHours=volunteerHours.filter(r=>intersects(asStrings(r.fields.Volunteer),volunteerIds));
  const personAdoptionApps=adoptionApps.filter(r=>adoptionAppIds.has(r.id));
  const personAdoptions=adoptions.filter(r=>intersects(asStrings(r.fields.Application),adoptionAppIds));
  const personFosterApps=fosterApps.filter(r=>fosterAppIds.has(r.id));
  const personFosters=fosterPlacements.filter(r=>intersects(asStrings(r.fields["Foster Application"]),fosterAppIds));
  const personSurrenders=surrenders.filter(r=>surrenderIds.has(r.id));
  const personIntakes=intakes.filter(r=>intersects(asStrings(r.fields["Related Surrender Request"]),surrenderIds));
  const personDonors=donors.filter(r=>donorIds.has(r.id));
  const personDonations=donations.filter(r=>intersects(asStrings(r.fields.Donor),donorIds));
  const personSubscribers=subscribers.filter(r=>subscriberIds.has(r.id));
  const personContacts=contacts.filter(r=>asStrings(r.fields.Person).includes(personId));

  const adoptionIds=new Set(personAdoptions.map(r=>r.id));
  const fosterPlacementIds=new Set(personFosters.map(r=>r.id));
  const personDocuments=documents.filter(r=>
    intersects(asStrings(r.fields.Volunteer),volunteerIds)||
    intersects(asStrings(r.fields.Donor),donorIds)||
    intersects(asStrings(r.fields.Adoption),adoptionIds)||
    intersects(asStrings(r.fields["Foster Placement"]),fosterPlacementIds)||
    intersects(asStrings(r.fields["Surrender Request"]),surrenderIds)
  );

  const animalIds=new Set<string>();
  for(const r of personAdoptionApps)for(const id of asStrings(r.fields["Preferred Animal"]))animalIds.add(id);
  for(const r of personAdoptions)for(const id of asStrings(r.fields.Animal))animalIds.add(id);
  for(const r of personFosters)for(const id of asStrings(r.fields.Animal))animalIds.add(id);
  for(const r of personIntakes)for(const id of asStrings(r.fields.Animal))animalIds.add(id);
  const relatedAnimals=Array.from(animalIds).map(id=>animalById.get(id)).filter(Boolean);

  const totalHours=personHours.reduce((sum,r)=>sum+(typeof r.fields["Total Volunteer Hours"]==="number"?r.fields["Total Volunteer Hours"]:num(r.fields.Hours)),0);
  const totalDonations=personDonations.reduce((sum,r)=>sum+num(r.fields.Amount),0);

  async function savePerson(formData:FormData){
    "use server";await requirePortalRole("Staff");
    const latest=await airtableList(TABLES.people,["Display Name"]);if(!latest.some(r=>r.id===personId))return;
    const first=field(formData,"firstName"),last=field(formData,"lastName"),org=field(formData,"organization"),email=field(formData,"email");
    await airtableUpdate(TABLES.people,personId,{
      "Display Name":[first,last].filter(Boolean).join(" ")||org||email||"Unnamed contact",
      "First Name":first,"Last Name":last,"Organization Name":org,Email:email,Phone:field(formData,"phone"),
      "Street Address":field(formData,"street"),City:field(formData,"city"),State:field(formData,"state"),ZIP:field(formData,"zip"),
      "Preferred Contact":field(formData,"preferredContact")||"No Preference",
      "Do Not Solicit":formData.get("doNotSolicit")==="on",
      "Relationship Notes":field(formData,"relationshipNotes"),
    },true);
    revalidatePath("/portal/staff/people/"+personId);revalidatePath("/portal/staff/people");
  }

  async function addContact(formData:FormData){
    "use server";const current=await requirePortalRole("Staff");
    const subject=field(formData,"subject");if(!subject)return;
    const latestContacts=await airtableList(TABLES.contactLog,["Person","Next Follow-Up Date","Follow-Up Status"]);
    const nowDate=new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"America/Chicago"}).format(new Date());
    for(const prior of latestContacts.filter(r=>asStrings(r.fields.Person).includes(personId)&&asText(r.fields["Follow-Up Status"])!=="Completed"&&asText(r.fields["Next Follow-Up Date"])&&asText(r.fields["Next Follow-Up Date"])<=nowDate)){
      await airtableUpdate(TABLES.contactLog,prior.id,{"Follow-Up Status":"Completed"},true);
    }
    const nextFollowUp=field(formData,"nextFollowUp");
    await airtableCreate(TABLES.contactLog,{
      Person:[personId],"Date / Time":new Date().toISOString(),
      "Contact Method":field(formData,"method")||"Email","Direction":field(formData,"direction")||"Outgoing",
      "Subject / Summary":subject,Notes:field(formData,"notes"),"Completed By":current.displayName,
      ...(nextFollowUp?{"Next Follow-Up Date":nextFollowUp,"Follow-Up Status":nextFollowUp<=nowDate?"Due":"Not Due"}:{"Follow-Up Status":"Completed"}),
    },true);
    revalidatePath("/portal/staff/people/"+personId);revalidatePath("/portal/staff/people");
  }

  async function completeContactFollowUp(formData:FormData){
    "use server";await requirePortalRole("Staff");
    const contactId=field(formData,"contactId");
    const latest=await airtableList(TABLES.contactLog,["Person"]);
    const contact=latest.find(r=>r.id===contactId&&asStrings(r.fields.Person).includes(personId));
    if(!contact)return;
    await airtableUpdate(TABLES.contactLog,contactId,{"Follow-Up Status":"Completed"},true);
    revalidatePath("/portal/staff/people/"+personId);revalidatePath("/portal/staff/people");
  }

  return <main className="min-h-screen bg-slate-50"><div className="container-custom py-10 md:py-12">
    <Link href="/portal/staff/people" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4"/> People & Contacts</Link>

    <header className="mb-8 rounded-3xl border bg-white p-7 shadow-sm md:p-9"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Unified Person Profile</p><div className="mt-3 flex flex-wrap items-start justify-between gap-5"><div><h1 className="text-4xl font-bold tracking-tight">{asText(person.fields["Display Name"])||asText(person.fields.Email)||"Unnamed contact"}</h1><p className="mt-2 text-muted-foreground">{asText(person.fields.Email)}{asText(person.fields.Phone)?" · "+asText(person.fields.Phone):""}</p></div><div className="flex flex-wrap gap-2">{asStrings(person.fields["Relationship Types"]).map(x=><Pill key={x}>{x}</Pill>)}</div></div><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs font-semibold uppercase text-muted-foreground">Newsletter</p><p className="mt-1 text-sm">{asText(person.fields["Newsletter Status"])||"Not Subscribed"}</p></div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Preferred contact</p><p className="mt-1 text-sm">{asText(person.fields["Preferred Contact"])||"Not specified"}</p></div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Volunteer hours</p><p className="mt-1 text-sm">{totalHours.toFixed(1)}</p></div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Lifetime donations</p><p className="mt-1 text-sm">{money(totalDonations)}</p></div></div></header>

    <nav className="mb-8 flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2 text-sm font-semibold shadow-sm">{[["overview","Overview"],["animals","Animals & Placements"],["volunteer","Volunteer"],["donations","Donations"],["documents","Documents"],["contacts","Contact Log"]].map(([id,label])=><a key={id} href={"#"+id} className="whitespace-nowrap rounded-xl px-4 py-2 hover:bg-slate-50 hover:text-primary">{label}</a>)}</nav>

    <section id="overview" className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8"><div className="mb-5 flex items-center gap-3"><UsersRound className="h-6 w-6 text-primary"/><h2 className="text-2xl font-bold">Overview</h2></div><form action={savePerson} className="space-y-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><label className="text-sm font-medium">First name<input name="firstName" defaultValue={asText(person.fields["First Name"])} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><label className="text-sm font-medium">Last name<input name="lastName" defaultValue={asText(person.fields["Last Name"])} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><label className="text-sm font-medium">Organization<input name="organization" defaultValue={asText(person.fields["Organization Name"])} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><label className="text-sm font-medium">Email<input name="email" type="email" defaultValue={asText(person.fields.Email)} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><label className="text-sm font-medium">Phone<input name="phone" defaultValue={asText(person.fields.Phone)} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><label className="text-sm font-medium">Preferred contact<select name="preferredContact" defaultValue={asText(person.fields["Preferred Contact"])||"No Preference"} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5">{["Email","Phone","Text","No Preference"].map(x=><option key={x}>{x}</option>)}</select></label><label className="text-sm font-medium">Street address<input name="street" defaultValue={asText(person.fields["Street Address"])} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><label className="text-sm font-medium">City<input name="city" defaultValue={asText(person.fields.City)} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><label className="text-sm font-medium">State<input name="state" defaultValue={asText(person.fields.State)} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><label className="text-sm font-medium">ZIP<input name="zip" defaultValue={asText(person.fields.ZIP)} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label></div><label className="flex items-center gap-2 text-sm"><input name="doNotSolicit" type="checkbox" defaultChecked={Boolean(person.fields["Do Not Solicit"])}/> Do not solicit</label><label className="block text-sm font-medium">Relationship notes<textarea name="relationshipNotes" rows={4} defaultValue={asText(person.fields["Relationship Notes"])} className="mt-2 w-full rounded-xl border px-3 py-2.5"/></label><button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">Save Person</button></form></section>

    <section id="animals" className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8"><div className="mb-5 flex items-center gap-3"><PawPrint className="h-6 w-6 text-primary"/><h2 className="text-2xl font-bold">Animals & Placements</h2></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{relatedAnimals.map(a=><Link key={a!.id} href={"/portal/staff/animals/"+a!.id} className="rounded-2xl bg-slate-50 p-5 hover:bg-slate-100"><h3 className="font-bold">{asText(a!.fields["Pet Name"])}</h3><p className="mt-1 text-sm text-muted-foreground">{asText(a!.fields["Animal ID"])} · {asText(a!.fields.Species)}</p><p className="mt-2 text-sm">{asText(a!.fields["Adoption Status"])} · {asText(a!.fields["Housing Type"])}</p></Link>)}{!relatedAnimals.length&&<p className="text-sm text-muted-foreground">No animals are linked to this person yet.</p>}</div><div className="mt-6 grid gap-5 lg:grid-cols-3"><div><h3 className="font-bold">Adoption</h3><div className="mt-3 space-y-2">{personAdoptionApps.map(r=><div key={r.id} className="rounded-xl bg-slate-50 p-4 text-sm"><strong>{asText(r.fields["Application ID"])}</strong><p className="mt-1 text-muted-foreground">{asText(r.fields.Status)} · {fmt(r.fields["Submitted At"])}</p></div>)}</div></div><div><h3 className="font-bold">Foster</h3><div className="mt-3 space-y-2">{personFosters.map(r=><div key={r.id} className="rounded-xl bg-slate-50 p-4 text-sm"><strong>{asText(r.fields["Foster Placement ID"])}</strong><p className="mt-1 text-muted-foreground">{asText(r.fields["Placement Status"])} · {fmt(r.fields["Start Date"])}{asText(r.fields["End Date"])?" to "+fmt(r.fields["End Date"]):""}</p></div>)}</div></div><div><h3 className="font-bold">Surrender history</h3><div className="mt-3 space-y-2">{personSurrenders.map(r=><div key={r.id} className="rounded-xl bg-slate-50 p-4 text-sm"><strong>{asText(r.fields["Animal Name"])||"Animal"}</strong><p className="mt-1 text-muted-foreground">{asText(r.fields.Status)} · {fmt(r.fields["Submitted At"])}</p></div>)}</div></div></div></section>

    <section id="volunteer" className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8"><div className="mb-5 flex items-center gap-3"><HeartHandshake className="h-6 w-6 text-primary"/><h2 className="text-2xl font-bold">Volunteer</h2></div>{personVolunteers.map(r=><div key={r.id} className="mb-4 rounded-2xl bg-slate-50 p-5"><p className="font-bold">{asText(r.fields["Volunteer Name"])}</p><p className="mt-1 text-sm text-muted-foreground">{asText(r.fields.Status)} · Started {fmt(r.fields["Start Date"])||"date not recorded"}</p><p className="mt-2 text-sm">{asStrings(r.fields["Volunteer Areas"]).join(", ")}</p></div>)}<div className="space-y-2">{personHours.slice(0,20).map(r=><div key={r.id} className="flex justify-between gap-4 rounded-xl border p-4 text-sm"><span>{fmt(r.fields.Date)} · {asText(r.fields["Volunteer Activity"])}</span><strong>{num(r.fields["Total Volunteer Hours"])||num(r.fields.Hours)} hrs</strong></div>)}</div>{!personVolunteers.length&&<p className="text-sm text-muted-foreground">No volunteer relationship is linked.</p>}</section>

    <section id="donations" className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8"><div className="mb-5 flex items-center gap-3"><HandHeart className="h-6 w-6 text-primary"/><div><h2 className="text-2xl font-bold">Donations</h2><p className="text-sm text-muted-foreground">{personDonations.length} gifts · {money(totalDonations)} total recorded</p></div></div><div className="space-y-2">{personDonations.map(r=><div key={r.id} className="flex flex-wrap justify-between gap-4 rounded-xl bg-slate-50 p-4 text-sm"><div><strong>{money(num(r.fields.Amount))}</strong><p className="mt-1 text-muted-foreground">{fmt(r.fields["Donation Date"])} · {asText(r.fields["Donation Type"])} · {asText(r.fields["Payment Method"])}</p></div><div className="text-right text-xs text-muted-foreground"><p>Receipt: {asText(r.fields["Receipt Status"])||"Not recorded"}</p><p>Acknowledgment: {asText(r.fields["Acknowledgment Status"])||"Not recorded"}</p></div></div>)}</div>{!personDonations.length&&<p className="text-sm text-muted-foreground">No donations are linked.</p>}</section>

    <section id="documents" className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8"><div className="mb-5 flex items-center gap-3"><FileText className="h-6 w-6 text-primary"/><h2 className="text-2xl font-bold">Documents</h2></div><div className="space-y-2">{personDocuments.map(r=><div key={r.id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-3"><strong>{asText(r.fields["Document Type"])}</strong><Pill>{asText(r.fields.Status)}</Pill></div><p className="mt-2 text-sm text-muted-foreground">{fmt(r.fields["Generated Date"])}{asText(r.fields["Signed Date"])?" · Signed "+fmt(r.fields["Signed Date"]):""}</p></div>)}</div>{!personDocuments.length&&<p className="text-sm text-muted-foreground">No documents are linked.</p>}</section>

    <section id="contacts" className="rounded-3xl border bg-white p-6 shadow-sm md:p-8"><div className="mb-5 flex items-center gap-3"><ContactRound className="h-6 w-6 text-primary"/><div><h2 className="text-2xl font-bold">Contact Log</h2><p className="text-sm text-muted-foreground">Meaningful relationship contacts and follow-up, not routine transactional email.</p></div></div><div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><div className="space-y-3">{personContacts.map(r=><article key={r.id} className="rounded-2xl bg-slate-50 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{asText(r.fields["Subject / Summary"])}</p><p className="mt-1 text-xs text-muted-foreground">{fmt(r.fields["Date / Time"],true)} · {asText(r.fields["Contact Method"])} · {asText(r.fields.Direction)}</p></div>{asText(r.fields["Next Follow-Up Date"])&&<Pill>{asText(r.fields["Follow-Up Status"])==="Completed"?"Follow-up completed":"Follow up "+fmt(r.fields["Next Follow-Up Date"])}</Pill>}</div>{asText(r.fields.Notes)&&<p className="mt-3 text-sm">{asText(r.fields.Notes)}</p>}<p className="mt-2 text-xs text-muted-foreground">By {asText(r.fields["Completed By"])||"Staff"}</p>{asText(r.fields["Next Follow-Up Date"])&&asText(r.fields["Follow-Up Status"])!=="Completed"&&<form action={completeContactFollowUp} className="mt-3"><input type="hidden" name="contactId" value={r.id}/><button className="rounded-full border px-3 py-1.5 text-xs font-semibold">Mark follow-up complete</button></form>}</article>)}{!personContacts.length&&<p className="text-sm text-muted-foreground">No contacts have been logged yet.</p>}</div><form action={addContact} className="h-fit space-y-3 rounded-2xl bg-slate-50 p-5"><h3 className="font-bold">Log Contact</h3><div className="grid gap-3 sm:grid-cols-2"><select name="method" defaultValue={asText(person.fields["Preferred Contact"])==="Phone"?"Phone":asText(person.fields["Preferred Contact"])==="Text"?"Text":"Email"} className="rounded-xl border bg-white px-3 py-2.5">{["Email","Phone","Text","In Person","Other"].map(x=><option key={x}>{x}</option>)}</select><select name="direction" defaultValue="Outgoing" className="rounded-xl border bg-white px-3 py-2.5"><option>Outgoing</option><option>Incoming</option></select></div><input name="subject" required placeholder="Subject / summary" className="w-full rounded-xl border bg-white px-3 py-2.5"/><textarea name="notes" rows={4} placeholder="Notes" className="w-full rounded-xl border bg-white px-3 py-2.5"/><label className="block text-sm font-medium">Next follow-up date<input name="nextFollowUp" type="date" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5"/></label><button className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white">Save Contact</button></form></div></section>
  </div></main>
}