"use client";

import { useMemo, useRef, useState } from "react";
import type { CageCard, ClinicDayOption } from "@/lib/clinicday-cage-cards";

type Props = { data: { days: ClinicDayOption[]; cards: CageCard[] } };
type PrintedCard = CageCard & { printedServices: string[]; continuation: boolean };
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[ch] || ch);

function handling(raw: string): [string, string] {
  const value = raw.toLowerCase();
  if (/red|high.risk|aggress/.test(value)) return ["RED", "High-Risk"];
  if (/yellow|caution/.test(value)) return ["YELLOW", "Caution"];
  if (/green|easy/.test(value)) return ["GREEN", "Easy"];
  return [raw || "UNSET", raw ? "" : "Check handling"];
}
function splitIntoCards(card: CageCard): PrintedCard[] {
  const services = card.services.length ? card.services : ["SERVICES NOT RECORDED"];
  const parts: PrintedCard[] = [];
  for (let start = 0; start < services.length; start += 8) {
    parts.push({ ...card, printedServices: services.slice(start, start + 8), continuation: start > 0 });
  }
  return parts;
}
function cardHtml(c: PrintedCard): string {
  const [color, descriptor] = handling(c.handling);
  const female = /female|spayed female|\bf\b/i.test(c.sex);
  const isCat = c.species.toLowerCase() === "cat";
  const lifestyle = c.lifestyle.replace(/\b(Indoor|Outdoor) Only\b/gi, "$1");
  const details = [c.sex, c.breed].filter(Boolean).join(" · ");
  const lifestyleLine = isCat ? [
    lifestyle ? `Cat Lifestyle: ${lifestyle}` : "",
    female && c.pregnant ? `Pregnant: ${c.pregnant}` : "",
  ].filter(Boolean).join(" · ") : "";
  const left = c.printedServices.slice(0, 4);
  const right = c.printedServices.slice(4);
  const dense = c.printedServices.length > 6 || c.client.length > 36 || c.breed.length > 40;
  return `<article class="cc-card${dense ? " cc-dense" : ""}">
    <div class="cc-top">
      <div class="cc-case">CASE ${escapeHtml(c.caseNumber)}</div>
      <div class="cc-name">${escapeHtml(c.name)}</div>
      <div class="cc-info">${escapeHtml(details)}</div>
      ${lifestyleLine ? `<div class="cc-info">${escapeHtml(lifestyleLine)}</div>` : ""}
      <div class="cc-info cc-client">Client: ${escapeHtml(c.client)}</div>
      <div class="cc-handling"><strong>${escapeHtml(color)}</strong><span>${escapeHtml(descriptor)}</span></div>
    </div>
    ${c.continuation ? `<div class="cc-continued">SERVICES CONTINUED</div>` : ""}
    <div class="cc-services${right.length ? "" : " cc-one-column"}">
      <div class="cc-service-column">${left.map(x => `<div>${escapeHtml(x)}</div>`).join("")}</div>
      ${right.length ? `<div class="cc-service-column">${right.map(x => `<div>${escapeHtml(x)}</div>`).join("")}</div>` : ""}
    </div>
    ${c.earTip ? `<div class="cc-ear">EAR TIP</div>` : ""}
  </article>`;
}
const PRINT_CSS = `
@page { size: letter portrait; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #000; }
body { font-family: Arial, Helvetica, sans-serif; }
.cc-sheet { width: 8.5in; height: 11in; padding: .25in; display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(4, minmax(0, 1fr));
  break-after: page; page-break-after: always; }
.cc-sheet:last-child { break-after: auto; page-break-after: auto; }
.cc-card { min-width: 0; min-height: 0; overflow: hidden; border: 1.3px solid black;
  position: relative; padding: .09in; display: flex; flex-direction: column; break-inside: avoid; }
.cc-top { position: relative; border-bottom: 1px solid #111; padding-bottom: 4px; }
.cc-case { font-size: 11.5pt; line-height: 1.05; max-width: calc(100% - 1.12in); }
.cc-name { font-size: 27pt; line-height: 1.04; font-weight: 800; max-width: calc(100% - 1.12in);
  overflow-wrap: anywhere; margin: 1px 0 3px; }
.cc-info { font-size: 11.5pt; line-height: 1.1; overflow-wrap: anywhere; }
.cc-info + .cc-info { margin-top: 1px; }
.cc-client { font-size: 12pt; margin-top: 2px !important; margin-bottom: 1px; }
.cc-handling { position: absolute; top: 0; right: 0; border: 1.4px solid #111;
  min-width: .95in; max-width: 1.04in; min-height: .56in; padding: 4px 6px 3px;
  display: flex; align-items: center; justify-content: center; flex-direction: column;
  text-align: center; line-height: 1.05; }
.cc-handling strong { font-size: 15pt; font-weight: 800; letter-spacing: -.2px; white-space: nowrap; }
.cc-handling span { font-size: 9pt; margin-top: 2px; }
.cc-services { min-height: 0; padding-top: 5px; padding-bottom: .31in; display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 6px; flex: 1; }
.cc-one-column { grid-template-columns: minmax(0, 1fr); }
.cc-service-column { min-width: 0; font-size: 15pt; font-weight: 800; line-height: 1.08; overflow-wrap: break-word; }
.cc-dense .cc-service-column { font-size: 13.5pt; line-height: 1.05; }
.cc-dense .cc-info { font-size: 11pt; line-height: 1.06; }
.cc-ear { position: absolute; right: .09in; bottom: .085in; border: 1.5px solid #000;
  padding: 4px 8px; background: white; font-size: 12pt; font-weight: 800; line-height: 1; }
.cc-continued { font-size: 8.5pt; font-weight: bold; padding-top: 3px; }
@media screen { body { background: #e5e7eb; } .cc-sheet { background: #fff; margin: 15px auto; box-shadow: 0 2px 12px #0002; } }
@media print { html, body { width: 8.5in; background: #fff; }
  .cc-sheet { margin: 0 !important; box-shadow: none !important; }
}`;
function documentHtml(cards: PrintedCard[]): string {
  let sheets = "";
  for (let n = 0; n < cards.length; n += 8) {
    sheets += `<section class="cc-sheet">${cards.slice(n, n + 8).map(cardHtml).join("")}</section>`;
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
  <title>Safe Haven Cage Cards</title><style>${PRINT_CSS}</style></head>
  <body>${sheets || "<p>No cards selected</p>"}</body></html>`;
}

export function CageCardPrintClient({ data }: Props) {
  const defaultDay = data.days.find(d => !["Complete", "Cancelled"].includes(d.status))?.id || data.days.at(-1)?.id || "";
  const [day, setDay] = useState(defaultDay);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const printPending = useRef(false);
  const records = useMemo(() => data.cards.filter(c => c.clinicIds.includes(day) && !/^(cancelled|no show)$/i.test(c.arrival))
    .sort((a, b) => a.caseNumber.localeCompare(b.caseNumber, undefined, {numeric: true})), [data.cards, day]);
  const selected = records.filter(c => !excluded.includes(c.id));
  const cards = selected.flatMap(splitIntoCards);
  const html = useMemo(() => documentHtml(cards), [cards]);
  const visible = records.filter(c => `${c.caseNumber} ${c.name} ${c.client}`.toLowerCase().includes(filter.toLowerCase()));
  const flip = (id: string) => setExcluded(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]);
  const print = () => {
    if (!cards.length) return;
    printPending.current = true;
    const frame = iframeRef.current;
    if (frame) {
      // Set srcdoc afresh so onLoad fires only after all selected cards exist.
      frame.srcdoc = html;
    }
  };
  const onPrintFrameLoad = () => {
    if (!printPending.current) return;
    printPending.current = false;
    const frameWindow = iframeRef.current?.contentWindow;
    if (frameWindow) window.setTimeout(() => { frameWindow.focus(); frameWindow.print(); }, 100);
  };
  return <div className="mt-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-orange-600">Clinic Team Portal</p>
        <h1 className="mt-3 text-3xl font-bold">Print Cage Cards</h1>
        <p className="mt-3 text-sm text-slate-600">Print eight equal-size cards per US Letter sheet. Handling boxes can be highlighted by volunteers.</p>
      </div>
      <button disabled={!cards.length} onClick={print}
        className="rounded-full bg-orange-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-orange-600 focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-50">
        Print {cards.length} Cage Cards
      </button>
    </div>
    <div className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border bg-white p-5">
      <label className="flex min-w-[240px] flex-1 flex-col gap-2 text-sm font-semibold">Clinic day
        <select value={day} onChange={e => {setDay(e.target.value);setExcluded([]);}}
          className="rounded-xl border px-3 py-3 font-normal">
          {data.days.map(d => <option key={d.id} value={d.id}>{d.date} · {d.type} · {d.status}</option>)}
        </select>
      </label>
      <label className="flex min-w-[180px] flex-1 flex-col gap-2 text-sm font-semibold">Find patient
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Name or case number"
          className="rounded-xl border px-3 py-3 font-normal" />
      </label>
      <span className="pb-3 text-sm">{selected.length} patients · {cards.length} cards · {Math.ceil(cards.length / 8)} sheets</span>
      <button className="rounded-full border px-4 py-2 text-sm hover:bg-slate-50" onClick={() => setExcluded([])}>Select all</button>
      <button className="rounded-full border px-4 py-2 text-sm hover:bg-slate-50" onClick={() => setExcluded(records.map(r => r.id))}>Clear</button>
    </div>
    {!records.length && <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm">No scheduled patients were found for this ClinicDay date. Confirm that the Clinic Days match the selected date.</p>}
    <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map(c => <label key={c.id} className="flex items-center gap-3 rounded-xl border bg-white p-3">
        <input type="checkbox" checked={!excluded.includes(c.id)} onChange={() => flip(c.id)} />
        <span className="flex-1 text-sm"><strong>#{c.caseNumber} · {c.name}</strong><span className="block text-xs text-slate-500">{c.client}</span></span>
        <span className="text-xs text-slate-500">{c.services.length} services</span>
      </label>)}
    </div>
    {selected.some(c => !c.handling || !c.services.length) && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">Some selected patients are missing a handling level or services. Review their ClinicDay records before printing.</p>}
    {selected.some(c => c.services.length > 8) && <p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm">Patients with more than eight services will receive an additional continuation card so no service is omitted.</p>}
    <div className="mt-8 flex items-baseline justify-between"><h2 className="text-xl font-bold">Card preview</h2><span className="text-xs text-slate-500">Letter · 2 columns × 4 rows</span></div>
    <div className="mt-3 overflow-x-auto rounded-2xl bg-slate-100 p-2">
      <iframe title="Cage-card print preview" srcDoc={html} className="block mx-auto border-0 bg-white"
        style={{ width: "8.5in", height: `${Math.max(1, Math.ceil(cards.length / 8)) * 11.2}in`, maxWidth: "none" }} />
    </div>
    <iframe ref={iframeRef} title="Cage-card print document" onLoad={onPrintFrameLoad}
      aria-hidden="true" tabIndex={-1} className="fixed -left-[10000px] top-0 h-0 w-0 border-0" />
  </div>;
}
