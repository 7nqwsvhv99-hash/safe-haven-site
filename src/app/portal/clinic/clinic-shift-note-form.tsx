"use client";

import { useActionState, useEffect, useState } from "react";

type SaveState = { status: "idle" | "saved" | "error" };

export function ClinicShiftNoteForm({
  responseId,
  initialNote,
  saveAction,
}: {
  responseId: string;
  initialNote: string;
  saveAction: (previous: SaveState, formData: FormData) => Promise<SaveState>;
}) {
  const [state, submit, pending] = useActionState<SaveState, FormData>(saveAction, { status: "idle" });
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    if (state.status === "saved") setEdited(false);
  }, [state]);

  const saved = state.status === "saved" && !edited;
  const error = state.status === "error" && !edited;

  return (
    <form action={submit} className="mt-3 rounded-2xl border bg-slate-50 p-4">
      <input type="hidden" name="responseId" value={responseId} />
      <label htmlFor={`clinic-note-${responseId}`} className="block text-sm font-semibold">My shift note</label>
      <p className="mt-1 text-xs text-muted-foreground">Share timing or coverage details, such as needing to leave early. Your note appears on this clinic day’s staffing card.</p>
      <textarea
        id={`clinic-note-${responseId}`}
        name="note"
        rows={2}
        maxLength={1000}
        defaultValue={initialNote}
        onChange={() => setEdited(true)}
        className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm"
        placeholder="Example: I need to leave by 2:00 p.m."
      />
      <button
        type="submit"
        disabled={pending}
        className={`mt-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-70 ${saved ? "bg-green-600" : error ? "bg-red-600" : "bg-primary"}`}
        aria-live="polite"
      >
        {pending ? "Saving..." : saved ? "Saved" : error ? "Try again" : "Save note"}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">Your note could not be saved. Please try again.</p>}
    </form>
  );
}
