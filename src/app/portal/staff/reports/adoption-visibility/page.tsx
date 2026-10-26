import Link from "next/link";
import { airtableList, asText, requirePortalRole, TABLES } from "@/lib/portal";

type Rec = { id: string; fields: Record<string, unknown> };
const DAY = 86400000;
function ms(v: unknown): number | null {
  if (typeof v !== "string" || !v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}
function days(start: number, end: number): number { return Math.max(0, Math.floor((end-start)/DAY)); }
function linked(v: unknown): string[] { return Array.isArray(v) ? v.filter((s):s is string=>typeof s==="string") : []; }
function median(values: number[]): number | null {
  if (!values.length) return null;
  const a=[...values].sort((x,y)=>x-y),mid=Math.floor(a.length/2);
  return a.length%2?a[mid]:(a[mid-1]+a[mid])/2;
}
function percentile(values:number[], p:number):number|null {
  if(!values.length)return null;
  const a=[...values].sort((x,y)=>x-y), i=(a.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);
  return Math.round((a[lo]+(a[hi]-a[lo])*(i-lo))*10)/10;
}
function fmt(n:number|null){return n===null?"Not available":n.toLocaleString("en-US",{maximumFractionDigits:1})+" days";}
const threshold=90; // Provisional attention threshold, not a clinical or SAC standard.
export default async function AdoptionVisibilityDashboard() {
  await requirePortalRole("Staff");
  const [animals,intakes,adoptions]=await Promise.all([
    airtableList(TABLES.animals,["Pet Name","Species","Adoption Status","Housing Type","Available Since","Animal Intakes","Adoptions"]),
    airtableList(TABLES.animalIntakes,["Animal","Intake Date"]),
    airtableList(TABLES.adoptions,["Animal","Adoption Date","Legacy Adoption"]),
  ]);
  const animalById=new Map((animals as Rec[]).map(a=>[a.id,a]));
  const intakesByAnimal=new Map<string,number[]>();
  for(const i of intakes as Rec[]){const date=ms(i.fields["Intake Date"]);if(date===null)continue;for(const aid of linked(i.fields.Animal)){const a=intakesByAnimal.get(aid)||[];a.push(date);intakesByAnimal.set(aid,a);}}
  const now=Date.now();
  const sections=(["Cat","Dog"] as const).map(species=>{
    const current=(animals as Rec[]).filter(a=>asText(a.fields.Species)===species&&!["Adopted","Deceased","Transferred","Returned to Owner","Euthanized"].includes(asText(a.fields["Adoption Status"])));
    const currentStays=current.map(a=>{
      const starts=(intakesByAnimal.get(a.id)||[]).filter(t=>t<=now).sort((a,b)=>b-a);
      const fallback=ms(a.fields["Available Since"]);
      const start=starts[0]??fallback;
      return { id:a.id,name:asText(a.fields["Pet Name"])||"Unnamed",days:start===null?null:days(start,now) };
    });
    const completed:number[]=[];
    for(const adoption of adoptions as Rec[]){
      const date=ms(adoption.fields["Adoption Date"]);if(date===null)continue;
      for(const aid of linked(adoption.fields.Animal)){
        if(asText(animalById.get(aid)?.fields.Species)!==species)continue;
        const starts=(intakesByAnimal.get(aid)||[]).filter(t=>t<=date).sort((a,b)=>b-a);
        // Do not manufacture completed lengths of stay from availability dates or legacy records.
        if(starts.length)completed.push(days(starts[0],date));
      }
    }
    const long=currentStays.filter(a=>a.days!==null&&a.days>=threshold);
    return {species,currentStays,completed,long,known:currentStays.filter(a=>a.days!==null).length,
      mean:completed.length?completed.reduce((a,b)=>a+b,0)/completed.length:null,
      med:median(completed),p90:percentile(completed,.9)};
  });
  return <main className="min-h-screen bg-slate-50"><div className="container-custom py-8 sm:py-12">
    <Link href="/portal/staff/reports" className="text-sm font-semibold text-primary">← Staff reports</Link>
    <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Adoption Visibility</h1>
    <p className="mt-3 max-w-3xl text-sm text-slate-600">Current animals and completed adoption stays are different measures. This view keeps them separate and does not discard unusually long stays. Days are approximate, based on recorded intake and adoption dates.</p>
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Reporting preview: the historical intake and outcome records must be reconciled before using these figures for board or SAC reporting. Long-stay attention threshold: {threshold} days, configurable in a future release. Unmatched legacy stays are excluded from completed statistics.</div>
    {sections.map(s=><section key={s.species} className="mt-7 rounded-2xl border bg-white p-4 shadow-sm sm:p-7">
      <h2 className="text-2xl font-semibold">{s.species==="Cat"?"Cats":"Dogs"}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Median completed stay",fmt(s.med)],["Mean completed stay",fmt(s.mean)],["90th-percentile stay",fmt(s.p90)],
          ["Current animals",String(s.currentStays.length)],["Current long-stay animals",String(s.long.length)]
        ].map(([label,value])=><div key={label} className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-600">{label}</div><div className="mt-2 text-xl font-semibold">{value}</div></div>)}
      </div>
      <p className="mt-3 text-xs text-slate-600">Completed stays with valid intake/outcome dates: {s.completed.length}. Current stays with a known start date: {s.known} of {s.currentStays.length}. Long-stay share among current animals with known start date: {s.known?Math.round(100*s.long.length/s.known)+"%":"Not available"}.</p>
      <h3 className="mt-6 font-semibold">Longest-waiting animals</h3>
      <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[320px] text-left text-sm"><thead><tr className="border-b text-slate-600"><th className="py-2">Animal</th><th className="py-2">Current days in care</th><th className="py-2">Action</th></tr></thead><tbody>
        {s.currentStays.filter(a=>a.days!==null).sort((a,b)=>(b.days??0)-(a.days??0)).slice(0,12).map(a=><tr key={a.id} className="border-b"><td className="py-3">{a.name}</td><td>{a.days}</td><td><Link className="text-primary underline" href={`/portal/staff/animals/${a.id}`}>Review record</Link></td></tr>)}
      </tbody></table></div>
      {!s.known&&<p className="mt-3 text-sm text-slate-500">No current animals have usable intake dates.</p>}
    </section>)}
    <p className="mt-6 text-xs text-slate-600">Methodology: completed stays use the latest recorded intake on/before adoption, and current stays use the latest recorded intake or, if unavailable, available-since as a provisional fallback. The 90th percentile uses linear interpolation. This dashboard does not yet measure public-feature history, inquiries, or standardized SAC outcomes.</p>
  </div></main>;
}
