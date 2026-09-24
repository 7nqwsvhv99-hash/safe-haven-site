import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowLeft, ContactRound, RefreshCw, Search, UsersRound, Mail, GitMerge } from "lucide-react";
import {
  airtableCreate, airtableList, airtableUpdate, asStrings, asText, normalizeEmail,
  requirePortalRole, TABLES,
} from "@/lib/portal";

function field(f:FormData,n:string){return String(f.get(n)||"").trim()}
function unique(values:string[]){return Array.from(new Set(values.filter(Boolean)))}
function normalizePhone(value:string){return value.replace(/\D/g,"")}
function displayName(first:string,last:string,org:string,email:string){return [first,last].filter(Boolean).join(" ")||org||email||"Unnamed contact"}
function isDue(value:unknown){const s=asText(value);if(!s)return false;const d=new Date(s+"T23:59:59");return !Number.isNaN(d.getTime())&&d.getTime()<=Date.now()}

type Aggregate={
  first:string;last:string;org:string;email:string;phone:string;street:string;city:string;state:string;zip:string;
  preferred:string;relations:Set<string>;newsletterStatus:string;doNotSolicit:boolean;notes:string;
  volunteers:string[];adoptionApps:string[];fosterApps:string[];surrenders:string[];donors:string[];subscribers:string[];
};

export default async function PeoplePage({searchParams}:{searchParams:Promise<{q?:string;relationship?:string;synced?:string}>}){
  await requirePortalRole("Staff");
  const query=await searchParams;

  const [people,contacts]=await Promise.all([
    airtableList(TABLES.people,[
      "Display Name","First Name","Last Name","Organization Name","Email","Phone","Street Address","City","State","ZIP",
      "Preferred Contact","Relationship Types","Newsletter Status","Do Not Solicit","Relationship Notes",
      "Volunteers","Adoption Applications","Foster Applications","Owner Surrender Requests","Donors","Newsletter Subscribers","Last Reconciled"
    ],{sort:[{field:"Display Name",direction:"asc"}]}),
    airtableList(TABLES.contactLog,["Person","Date / Time","Contact Method","Subject / Summary","Next Follow-Up Date"],{sort:[{field:"Date / Time",direction:"desc"}]})
  ]);

  async function reconcile(formData:FormData){
    "use server";
    await requirePortalRole("Staff");
    void formData;
    const [existing,volunteers,adoptionApps,fosterApps,surrenders,donors,subscribers]=await Promise.all([
      airtableList(TABLES.people,[
        "Display Name","First Name","Last Name","Organization Name","Email","Phone","Street Address","City","State","ZIP",
        "Preferred Contact","Relationship Types","Newsletter Status","Do Not Solicit","Relationship Notes",
        "Volunteers","Adoption Applications","Foster Applications","Owner Surrender Requests","Donors","Newsletter Subscribers"
      ]),
      airtableList(TABLES.volunteers,["Volunteer Name","Email","Cell Phone","Preferred Contact","Relationship Notes"]),
      airtableList(TABLES.adoptionApplications,["First Name","Last Name","Email","Phone","Preferred Contact","Street Address","City","State","ZIP"]),
      airtableList(TABLES.fosterApplications,["First Name","Last Name","Email","Phone","Preferred Contact","Street Address","City","State","ZIP"]),
      airtableList(TABLES.surrenderRequests,["Owner First Name","Owner Last Name","Email","Phone","Street Address","City","State","ZIP"]),
      airtableList(TABLES.donors,["Donor Name","First Name","Last Name","Organization Name","Email","Phone","Street Address","City","State","ZIP","Preferred Contact","Do Not Solicit","Relationship Notes"]),
      airtableList(TABLES.newsletterSubscribers,["Email","First Name","Status","Notes"])
    ]);

    const byEmail=new Map<string,Aggregate>();
    const get=(emailRaw:string)=>{
      const email=normalizeEmail(emailRaw);
      if(!email)return null;
      if(!byEmail.has(email))byEmail.set(email,{first:"",last:"",org:"",email,phone:"",street:"",city:"",state:"",zip:"",preferred:"",relations:new Set(),newsletterStatus:"Not Subscribed",doNotSolicit:false,notes:"",volunteers:[],adoptionApps:[],fosterApps:[],surrenders:[],donors:[],subscribers:[]});
      return byEmail.get(email)!;
    };
    const fill=(a:Aggregate,data:Partial<Aggregate>)=>{
      for(const key of ["first","last","org","phone","street","city","state","zip","preferred","notes"] as const){
        if(!a[key]&&data[key]) a[key]=String(data[key]);
      }
      if(data.doNotSolicit)a.doNotSolicit=true;
    };

    for(const r of volunteers){const a=get(asText(r.fields.Email));if(!a)continue;const name=asText(r.fields["Volunteer Name"]);fill(a,{phone:asText(r.fields["Cell Phone"]),preferred:asText(r.fields["Preferred Contact"]),notes:asText(r.fields["Relationship Notes"])});if(!a.first&&!a.last&&name)a.first=name;a.relations.add("Volunteer");a.volunteers.push(r.id)}
    for(const r of adoptionApps){const a=get(asText(r.fields.Email));if(!a)continue;fill(a,{first:asText(r.fields["First Name"]),last:asText(r.fields["Last Name"]),phone:asText(r.fields.Phone),street:asText(r.fields["Street Address"]),city:asText(r.fields.City),state:asText(r.fields.State),zip:asText(r.fields.ZIP),preferred:asText(r.fields["Preferred Contact"])});a.relations.add("Adopter / Applicant");a.adoptionApps.push(r.id)}
    for(const r of fosterApps){const a=get(asText(r.fields.Email));if(!a)continue;fill(a,{first:asText(r.fields["First Name"]),last:asText(r.fields["Last Name"]),phone:asText(r.fields.Phone),street:asText(r.fields["Street Address"]),city:asText(r.fields.City),state:asText(r.fields.State),zip:asText(r.fields.ZIP),preferred:asText(r.fields["Preferred Contact"])});a.relations.add("Foster");a.fosterApps.push(r.id)}
    for(const r of surrenders){const a=get(asText(r.fields.Email));if(!a)continue;fill(a,{first:asText(r.fields["Owner First Name"]),last:asText(r.fields["Owner Last Name"]),phone:asText(r.fields.Phone),street:asText(r.fields["Street Address"]),city:asText(r.fields.City),state:asText(r.fields.State),zip:asText(r.fields.ZIP)});a.relations.add("Surrendering Owner");a.surrenders.push(r.id)}
    for(const r of donors){const a=get(asText(r.fields.Email));if(!a)continue;fill(a,{first:asText(r.fields["First Name"]),last:asText(r.fields["Last Name"]),org:asText(r.fields["Organization Name"]),phone:asText(r.fields.Phone),street:asText(r.fields["Street Address"]),city:asText(r.fields.City),state:asText(r.fields.State),zip:asText(r.fields.ZIP),preferred:asText(r.fields["Preferred Contact"]),doNotSolicit:Boolean(r.fields["Do Not Solicit"]),notes:asText(r.fields["Relationship Notes"])});a.relations.add("Donor");a.donors.push(r.id)}
    for(const r of subscribers){const a=get(asText(r.fields.Email));if(!a)continue;fill(a,{first:asText(r.fields["First Name"]),notes:asText(r.fields.Notes)});a.relations.add("Newsletter Subscriber");a.newsletterStatus=asText(r.fields.Status)||"Subscribed";a.subscribers.push(r.id)}

    const existingByEmail=new Map(existing.map(r=>[normalizeEmail(asText(r.fields.Email)),r]).filter(([email])=>Boolean(email)));
    for(const [email,a] of byEmail){
      const current=existingByEmail.get(email);
      const payload:Record<string,unknown>={
        "Display Name":displayName(current?asText(current.fields["First Name"])||a.first:a.first,current?asText(current.fields["Last Name"])||a.last:a.last,current?asText(current.fields["Organization Name"])||a.org:a.org,email),
        "First Name":current?asText(current.fields["First Name"])||a.first:a.first,
        "Last Name":current?asText(current.fields["Last Name"])||a.last:a.last,
        "Organization Name":current?asText(current.fields["Organization Name"])||a.org:a.org,
        Email:email,
        Phone:current?asText(current.fields.Phone)||a.phone:a.phone,
        "Street Address":current?asText(current.fields["Street Address"])||a.street:a.street,
        City:current?asText(current.fields.City)||a.city:a.city,
        State:current?asText(current.fields.State)||a.state:a.state,
        ZIP:current?asText(current.fields.ZIP)||a.zip:a.zip,
        "Preferred Contact":current?asText(current.fields["Preferred Contact"])||a.preferred||"Email":a.preferred||"Email",
        "Relationship Types":unique([...(current?asStrings(current.fields["Relationship Types"]):[]),...Array.from(a.relations)]),
        "Newsletter Status":a.relations.has("Newsletter Subscriber")?a.newsletterStatus:(current?asText(current.fields["Newsletter Status"])||"Not Subscribed":"Not Subscribed"),
        "Do Not Solicit":current?Boolean(current.fields["Do Not Solicit"])||a.doNotSolicit:a.doNotSolicit,
        "Relationship Notes":current?asText(current.fields["Relationship Notes"])||a.notes:a.notes,
        Volunteers:unique([...(current?asStrings(current.fields.Volunteers):[]),...a.volunteers]),
        "Adoption Applications":unique([...(current?asStrings(current.fields["Adoption Applications"]):[]),...a.adoptionApps]),
        "Foster Applications":unique([...(current?asStrings(current.fields["Foster Applications"]):[]),...a.fosterApps]),
        "Owner Surrender Requests":unique([...(current?asStrings(current.fields["Owner Surrender Requests"]):[]),...a.surrenders]),
        Donors:unique([...(current?asStrings(current.fields.Donors):[]),...a.donors]),
        "Newsletter Subscribers":unique([...(current?asStrings(current.fields["Newsletter Subscribers"]):[]),...a.subscribers]),
        "Last Reconciled":new Date().toISOString(),
      };
      if(current) await airtableUpdate(TABLES.people,current.id,payload,true);
      else await airtableCreate(TABLES.people,payload,true);
    }
    revalidatePath("/portal/staff/people");
  }

  async function addPerson(formData:FormData){
    "use server";
    await requirePortalRole("Staff");
    const email=normalizeEmail(field(formData,"email"));
    const first=field(formData,"firstName"),last=field(formData,"lastName"),org=field(formData,"organization");
    if(!email&&!first&&!last&&!org)return;
    if(email){
      const existing=await airtableList(TABLES.people,["Email"]);
      if(existing.some(r=>normalizeEmail(asText(r.fields.Email))===email))return;
    }
    await airtableCreate(TABLES.people,{
      "Display Name":displayName(first,last,org,email),"First Name":first,"Last Name":last,"Organization Name":org,
      Email:email,Phone:field(formData,"phone"),"Preferred Contact":field(formData,"preferredContact")||"No Preference",
      "Relationship Types":formData.getAll("relationships").map(String),"Newsletter Status":"Not Subscribed",
      "Relationship Notes":field(formData,"notes"),
    },true);
    revalidatePath("/portal/staff/people");
  }

  const q=(query.q||"").trim().toLowerCase();
  const filtered=people.filter(r=>{
    const relations=asStrings(r.fields["Relationship Types"]);
    const hay=[asText(r.fields["Display Name"]),asText(r.fields.Email),asText(r.fields.Phone),asText(r.fields["Organization Name"]),relations.join(" ")].join(" ").toLowerCase();
    return (!q||hay.includes(q))&&(!query.relationship||relations.includes(query.relationship));
  });
  const multi=people.filter(r=>asStrings(r.fields["Relationship Types"]).length>1).length;
  const newsletterOnly=people.filter(r=>{const x=asStrings(r.fields["Relationship Types"]);return x.length===1&&x[0]==="Newsletter Subscriber"}).length;
  const followups=contacts.filter(r=>isDue(r.fields["Next Follow-Up Date"])).length;

  return <main className="min-h-screen bg-slate-50"><div className="container-custom py-10 md:py-12">
    <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4"/> Staff Portal</Link>
    <header className="mb-8"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Relationship Management</p><h1 className="text-4xl font-bold tracking-tight md:text-5xl">People & Contacts</h1><p className="mt-4 max-w-3xl text-muted-foreground">One human-centered view across volunteering, foster care, adoption, donations, surrender requests, newsletter subscriptions, and staff contact history.</p></header>

    <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ["People",people.length,UsersRound],["Multiple relationships",multi,GitMerge],["Newsletter only",newsletterOnly,Mail],["Contact follow-ups due",followups,ContactRound]
    ].map(([label,count,Icon])=>{const I=Icon as typeof UsersRound;return <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><I className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{String(count)}</p><p className="mt-1 text-sm text-muted-foreground">{String(label)}</p></div>})}</section>

    <section className="mb-8 rounded-3xl border bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-bold">Relationship Reconciliation</h2><p className="mt-1 text-sm text-muted-foreground">Matches records by email, links relationships, and fills missing profile details without overwriting existing staff-maintained values.</p></div><form action={reconcile}><button className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-white"><RefreshCw className="h-4 w-4"/> Refresh Relationships</button></form></div></section>

    <section className="mb-8 rounded-3xl border bg-white p-6 shadow-sm"><form className="grid gap-3 md:grid-cols-[1fr_240px_auto]"><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><input name="q" defaultValue={query.q||""} placeholder="Search name, email, phone, organization, or relationship" className="w-full rounded-xl border py-2.5 pl-9 pr-3"/></label><select name="relationship" defaultValue={query.relationship||""} className="rounded-xl border bg-white px-3 py-2.5"><option value="">All relationships</option>{["Volunteer","Foster","Adopter / Applicant","Donor","Surrendering Owner","Newsletter Subscriber","Other"].map(x=><option key={x}>{x}</option>)}</select><button className="rounded-xl border px-5 py-2.5 font-semibold">Filter</button></form></section>

    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8"><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-bold">People Directory</h2><p className="text-sm text-muted-foreground">{filtered.length} shown</p></div><div className="grid gap-3 md:grid-cols-2">{filtered.map(r=><Link key={r.id} href={"/portal/staff/people/"+r.id} className="rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md"><h3 className="font-bold">{asText(r.fields["Display Name"])||asText(r.fields.Email)||"Unnamed contact"}</h3><p className="mt-1 text-sm text-muted-foreground">{asText(r.fields.Email)}{asText(r.fields.Phone)? " · "+asText(r.fields.Phone):""}</p><div className="mt-3 flex flex-wrap gap-2">{asStrings(r.fields["Relationship Types"]).map(x=><span key={x} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{x}</span>)}</div>{asText(r.fields["Newsletter Status"])==="Subscribed"&&<p className="mt-3 text-xs font-semibold text-primary">Newsletter subscriber</p>}</Link>)}</div>{!filtered.length&&<p className="text-sm text-muted-foreground">No people match the selected filters.</p>}</section>

      <section className="h-fit rounded-3xl border bg-white p-6 shadow-sm md:p-8"><h2 className="text-2xl font-bold">Add Person</h2><p className="mt-2 text-sm text-muted-foreground">Manual creation is useful for contacts who have not yet entered through another Safe Haven workflow.</p><form action={addPerson} className="mt-5 space-y-3"><div className="grid gap-3 sm:grid-cols-2"><input name="firstName" placeholder="First name" className="rounded-xl border px-3 py-2.5"/><input name="lastName" placeholder="Last name" className="rounded-xl border px-3 py-2.5"/></div><input name="organization" placeholder="Organization" className="w-full rounded-xl border px-3 py-2.5"/><input name="email" type="email" placeholder="Email" className="w-full rounded-xl border px-3 py-2.5"/><input name="phone" placeholder="Phone" className="w-full rounded-xl border px-3 py-2.5"/><select name="preferredContact" defaultValue="No Preference" className="w-full rounded-xl border bg-white px-3 py-2.5">{["Email","Phone","Text","No Preference"].map(x=><option key={x}>{x}</option>)}</select><div className="rounded-xl bg-slate-50 p-4"><p className="mb-2 text-sm font-semibold">Relationship types</p>{["Volunteer","Foster","Adopter / Applicant","Donor","Surrendering Owner","Newsletter Subscriber","Other"].map(x=><label key={x} className="mr-4 inline-flex items-center gap-2 text-sm"><input type="checkbox" name="relationships" value={x}/>{x}</label>)}</div><textarea name="notes" rows={3} placeholder="Relationship notes" className="w-full rounded-xl border px-3 py-2.5"/><button className="w-full rounded-full border border-primary px-5 py-3 font-semibold text-primary">Add Person</button></form></section>
    </div>
  </div></main>
}