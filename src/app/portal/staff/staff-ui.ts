/** Shared visual language for the Safe Haven staff portal.
 * These classes are presentation-only and do not change authorization or data writes.
 */
export const staffUi = {
  eyebrow:"text-xs font-bold uppercase tracking-[0.16em] text-primary",
  pageTitle:"text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl",
  sectionTitle:"text-xl font-bold tracking-tight text-slate-950",
  panel:"scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6",
  backLink:"text-sm font-semibold text-primary hover:underline",
  shortcut:"flex min-h-11 items-center justify-center rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  primaryButton:"inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  secondaryButton:"inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  attentionCard:"flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
} as const;
