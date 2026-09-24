import Link from "next/link";
import { ArrowLeft, BarChart3, HeartHandshake, Home, ClipboardList, Activity, Boxes, FileText, CalendarDays, Mail, DollarSign } from "lucide-react";
import { StaffImpactDashboard } from "@/components/staff-impact-dashboard";
import { airtableList, asStrings, asText, requirePortalRole, TABLES } from "@/lib/portal";

function asNumber(v:unknown){return typeof v==="number"?v:0}
function inYear(v:unknown,year:number){const s=asText(v);if(!s)return false;const d=new Date(s);if(Number.isNaN(d.getTime()))return false;return Number(new Intl.DateTimeFormat("en-US",{year:"numeric",timeZone:"America/Chicago"}).format(d))===year}
function money(v:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v)}

export default async function ReportsPage(){
  await requirePortalRole("Staff");
  const currentYear=Number(new Intl.DateTimeFormat("en-US",{year:"numeric",timeZone:"America/Chicago"}).format(new Date()));

  const [
    animals,intakes,adoptions,fosterPlacements,adoptionApps,fosterApps,medical,
    surrenderRequests,inventory,documents,events,testimonials,subscribers,donations
  ]=await Promise.all([
    airtableList(TABLES.animals,["Species","Adoption Status","Housing Type","Website Listing Readiness","Public Listing"]),
    airtableList(TABLES.animalIntakes,["Animal","Intake Date","Intake Type"]),
    airtableList(TABLES.adoptions,["Animal","Adoption Date","Adoption Fee Paid","Payment Method"]),
    airtableList(TABLES.fosterPlacements,["Animal","Placement Status","Start Date","End Date","Return / Outcome"]),
    airtableList(TABLES.adoptionApplications,["Status","Submitted At","Follow-Up Status"]),
    airtableList(TABLES.fosterApplications,["Status","Submitted At","Follow-Up Status"]),
    airtableList(TABLES.medicalRecords,["Animal","Needs Veterinarian Review","Veterinary Review Status","Date / Time"]),
    airtableList(TABLES.surrenderRequests,["Status","Submitted At","Urgency","Follow-Up Status"]),
    airtableList(TABLES.inventory,["Area","Active","Inventory Status","Current Quantity","Typical Unit Cost"]),
    airtableList(TABLES.documents,["Status","Document Type","Generated Date","Signed Date"]),
    airtableList(TABLES.events,["Event Status","Start Date & Time","Publish on Website","Featured on Homepage"]),
    airtableList(TABLES.testimonials,["Website Permission","Approved for Website","Featured","Received Date"]),
    airtableList(TABLES.newsletterSubscribers,["Status","Subscribed At","Unsubscribed At"]),
    airtableList(TABLES.donations,["Donation Date","Amount","Donation Type","Payment Method","Receipt Status","Acknowledgment Status"])
  ]);

  const activeAnimals=animals.filter(r=>asText(r.fields["Adoption Status"])!=="Adopted");
  const inShelter=activeAnimals.filter(r=>asText(r.fields["Housing Type"])==="In Shelter");
  const inFoster=activeAnimals.filter(r=>asText(r.fields["Housing Type"])==="Foster Home");
  const cats=activeAnimals.filter(r=>asText(r.fields.Species)==="Cat").length;
  const dogs=activeAnimals.filter(r=>asText(r.fields.Species)==="Dog").length;
  const websiteReady=animals.filter(r=>asText(r.fields["Website Listing Readiness"])==="Ready").length;
  const publicListings=animals.filter(r=>Boolean(r.fields["Public Listing"])).length;

  const ytdIntakes=intakes.filter(r=>inYear(r.fields["Intake Date"],currentYear));
  const ytdAdoptions=adoptions.filter(r=>inYear(r.fields["Adoption Date"],currentYear));
  const activeFosters=fosterPlacements.filter(r=>["Planned","Active","Needs Attention"].includes(asText(r.fields["Placement Status"])));
  const openAdoptionApps=adoptionApps.filter(r=>!["Declined","Withdrawn","Adopted"].includes(asText(r.fields.Status)));
  const openFosterApps=fosterApps.filter(r=>!["Declined","Withdrawn","Approved"].includes(asText(r.fields.Status)));
  const medicalReview=medical.filter(r=>Boolean(r.fields["Needs Veterinarian Review"])&&!["Reviewed","Resolved"].includes(asText(r.fields["Veterinary Review Status"])));
  const pendingSurrenders=surrenderRequests.filter(r=>!["Declined","Withdrawn","Completed"].includes(asText(r.fields.Status)));
  const urgentSurrenders=pendingSurrenders.filter(r=>asText(r.fields.Urgency)==="Urgent");

  const shelterInventory=inventory.filter(r=>asText(r.fields.Area)==="Shelter"&&Boolean(r.fields.Active));
  const inventoryAttention=shelterInventory.filter(r=>["Low Stock","Out of Stock"].includes(asText(r.fields["Inventory Status"])));
  const awaitingSignature=documents.filter(r=>["Ready for Signature","Sent"].includes(asText(r.fields.Status)));
  const now=Date.now();
  const upcomingEvents=events.filter(r=>{const d=new Date(asText(r.fields["Start Date & Time"]));return !Number.isNaN(d.getTime())&&d.getTime()>=now&&asText(r.fields["Event Status"])!=="Cancelled"});
  const publishedEvents=events.filter(r=>Boolean(r.fields["Publish on Website"]));
  const publishedStories=testimonials.filter(r=>Boolean(r.fields["Approved for Website"])&&asText(r.fields["Website Permission"])==="Granted");
  const activeSubscribers=subscribers.filter(r=>asText(r.fields.Status)==="Subscribed");
  const ytdDonations=donations.filter(r=>inYear(r.fields["Donation Date"],currentYear));
  const ytdDonationTotal=ytdDonations.reduce((sum,r)=>sum+asNumber(r.fields.Amount),0);

  const intakeByType=new Map<string,number>();
  for(const r of ytdIntakes){const type=asText(r.fields["Intake Type"])||"Other";intakeByType.set(type,(intakeByType.get(type)||0)+1)}
  const adoptionByPayment=new Map<string,number>();
  for(const r of ytdAdoptions){const method=asText(r.fields["Payment Method"])||"Not recorded";adoptionByPayment.set(method,(adoptionByPayment.get(method)||0)+1)}
  const fosterOutcomes=new Map<string,number>();
  for(const r of fosterPlacements.filter(r=>inYear(r.fields["End Date"],currentYear))){const outcome=asText(r.fields["Return / Outcome"])||"Other";fosterOutcomes.set(outcome,(fosterOutcomes.get(outcome)||0)+1)}

  return <main className="min-h-screen bg-slate-50"><div className="container-custom py-10 md:py-12">
    <Link href="/portal/staff" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4"/> Staff Portal</Link>
    <header className="mb-8"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Management Visibility</p><h1 className="text-4xl font-bold tracking-tight md:text-5xl">Reporting & Dashboards</h1><p className="mt-4 max-w-3xl text-muted-foreground">Live operational reporting from the same records staff use every day, plus the reconciled Community and Clinic impact metrics already used on the public site.</p></header>

    <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Animals in care",activeAnimals.length,Home],
        [currentYear+" intakes",ytdIntakes.length,ClipboardList],
        [currentYear+" adoptions",ytdAdoptions.length,BarChart3],
        ["Active foster placements",activeFosters.length,HeartHandshake],
      ].map(([label,count,Icon])=>{const I=Icon as typeof Home;return <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><I className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{String(count)}</p><p className="mt-1 text-sm text-muted-foreground">{String(label)}</p></div>})}
    </section>

    <div className="mb-8 grid gap-6 xl:grid-cols-2">
      <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8"><h2 className="text-2xl font-bold">Shelter Population</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{inShelter.length}</p><p className="text-sm text-muted-foreground">In shelter</p></div><div className="rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{inFoster.length}</p><p className="text-sm text-muted-foreground">In foster</p></div><div className="rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{cats}</p><p className="text-sm text-muted-foreground">Cats in care</p></div><div className="rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{dogs}</p><p className="text-sm text-muted-foreground">Dogs in care</p></div><div className="rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{websiteReady}</p><p className="text-sm text-muted-foreground">Website ready</p></div><div className="rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{publicListings}</p><p className="text-sm text-muted-foreground">Public listings</p></div></div></section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8"><h2 className="text-2xl font-bold">Action Queues</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{[
        ["Open adoption applications",openAdoptionApps.length],
        ["Open foster applications",openFosterApps.length],
        ["Medical review",medicalReview.length],
        ["Pending surrender requests",pendingSurrenders.length],
        ["Urgent surrender requests",urgentSurrenders.length],
        ["Inventory attention",inventoryAttention.length],
        ["Documents awaiting signature",awaitingSignature.length],
        ["Upcoming events",upcomingEvents.length],
      ].map(([label,count])=><div key={String(label)} className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-bold">{String(count)}</p><p className="mt-1 text-sm text-muted-foreground">{String(label)}</p></div>)}</div></section>
    </div>

    <div className="mb-8 grid gap-6 xl:grid-cols-3">
      <section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Intakes by Type · {currentYear}</h2><div className="mt-4 space-y-3">{Array.from(intakeByType.entries()).sort((a,b)=>b[1]-a[1]).map(([label,count])=><div key={label} className="flex justify-between gap-4 rounded-xl bg-slate-50 p-3"><span>{label}</span><strong>{count}</strong></div>)}{!intakeByType.size&&<p className="text-sm text-muted-foreground">No intake records for {currentYear}.</p>}</div></section>
      <section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Foster Outcomes · {currentYear}</h2><div className="mt-4 space-y-3">{Array.from(fosterOutcomes.entries()).sort((a,b)=>b[1]-a[1]).map(([label,count])=><div key={label} className="flex justify-between gap-4 rounded-xl bg-slate-50 p-3"><span>{label}</span><strong>{count}</strong></div>)}{!fosterOutcomes.size&&<p className="text-sm text-muted-foreground">No completed foster placements for {currentYear}.</p>}</div></section>
      <section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Adoption Payments · {currentYear}</h2><div className="mt-4 space-y-3">{Array.from(adoptionByPayment.entries()).sort((a,b)=>b[1]-a[1]).map(([label,count])=><div key={label} className="flex justify-between gap-4 rounded-xl bg-slate-50 p-3"><span>{label}</span><strong>{count}</strong></div>)}{!adoptionByPayment.size&&<p className="text-sm text-muted-foreground">No adoptions recorded for {currentYear}.</p>}</div></section>
    </div>

    <section className="mb-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8"><h2 className="text-2xl font-bold">Website & Community Engagement</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl bg-slate-50 p-5"><CalendarDays className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{publishedEvents.length}</p><p className="text-sm text-muted-foreground">Published events</p></div><div className="rounded-2xl bg-slate-50 p-5"><FileText className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{publishedStories.length}</p><p className="text-sm text-muted-foreground">Published adoption stories</p></div><div className="rounded-2xl bg-slate-50 p-5"><Mail className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{activeSubscribers.length}</p><p className="text-sm text-muted-foreground">Newsletter subscribers</p></div><div className="rounded-2xl bg-slate-50 p-5"><DollarSign className="mb-3 h-5 w-5 text-primary"/><p className="text-3xl font-bold">{money(ytdDonationTotal)}</p><p className="text-sm text-muted-foreground">{currentYear} donations · {ytdDonations.length} gifts</p></div></div></section>

    <StaffImpactDashboard/>

    <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><Activity className="mt-1 h-5 w-5 text-primary"/><p className="text-sm text-muted-foreground">Operational counts on this page reflect records in the new Shelter Management system. Historical public impact totals are shown separately above through Safe Haven's existing reconciled impact APIs, which preserve approved historical baselines.</p></div></section>
  </div></main>
}