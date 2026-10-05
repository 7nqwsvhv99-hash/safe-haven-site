"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type InventorySaveResult = { ok: boolean; error?: string };

function snapshot(form: HTMLFormElement) {
  return Array.from(new FormData(form).entries()).map(([name, value]) => [name, String(value)] as const);
}

export function InventoryItemEditor({
  action, children, deleteSection, className = "mt-4 border-t pt-4",
}: {
  action: (data: FormData) => Promise<InventorySaveResult>;
  children: ReactNode;
  deleteSection: ReactNode;
  className?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const baseline = useRef<ReturnType<typeof snapshot>>([]);
  const dirty = useRef(false);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const details = detailsRef.current!;
    const form = formRef.current!;
    baseline.current = snapshot(form);

    function discard() {
      const values = new Map(baseline.current);
      for (const element of Array.from(form.elements)) {
        if (element instanceof HTMLInputElement) {
          if (element.type === "checkbox" || element.type === "radio") {
            element.checked = values.get(element.name) === element.value;
          } else element.value = values.get(element.name) ?? "";
        } else if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
          element.value = values.get(element.name) ?? "";
        }
      }
      dirty.current = false;
      setStatus("idle");
      setError("");
    }

    function guardClick(event: MouseEvent) {
      if (!details.open || !(event.target instanceof Element)) return;
      const summary = event.target.closest("summary");
      const targetDetails = summary?.parentElement;
      const otherEditor = targetDetails?.hasAttribute("data-inventory-editor") && targetDetails !== details;
      const parentClosing = targetDetails instanceof HTMLDetailsElement && targetDetails.open && targetDetails.contains(details);
      const groupSwitch = targetDetails instanceof HTMLDetailsElement && Boolean(targetDetails.name) &&
        Array.from(document.querySelectorAll<HTMLDetailsElement>("details[name]"))
          .some(group => group.name === targetDetails.name && group !== targetDetails && group.open && group.contains(details));
      const clinicCategorySwitch = targetDetails instanceof HTMLDetailsElement &&
        targetDetails.hasAttribute("data-clinic-inventory-category") && !targetDetails.contains(details) &&
        Boolean(details.closest("[data-clinic-inventory-category]"));
      const selfClosing = targetDetails === details;
      const leaving = event.target.closest("a[href]");
      if (!otherEditor && !parentClosing && !groupSwitch && !clinicCategorySwitch && !selfClosing && !leaving) return;
      if (saving.current || (dirty.current && !window.confirm(
        "You have unsaved item changes. Discard those changes and continue? Choose Cancel to keep editing."
      ))) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (dirty.current) discard();
      if (otherEditor || groupSwitch || clinicCategorySwitch) details.open = false;
    }

    function beforeUnload(event: BeforeUnloadEvent) {
      if (!dirty.current && !saving.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    document.addEventListener("click", guardClick, true);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      document.removeEventListener("click", guardClick, true);
      window.removeEventListener("beforeunload", beforeUnload);
      clearTimeout(timer.current);
    };
  }, []);

  function changed() {
    dirty.current = JSON.stringify(snapshot(formRef.current!)) !== JSON.stringify(baseline.current);
    clearTimeout(timer.current);
    setStatus("idle");
    setError("");
  }

  return (
    <details ref={detailsRef} data-inventory-editor className={className}>
      <summary className="cursor-pointer text-sm font-semibold text-primary">Modify item</summary>
      <form ref={formRef} onChange={changed} onSubmit={async event => {
        event.preventDefault();
        if (saving.current) return;
        const form = event.currentTarget;
        const data = new FormData(form);
        saving.current = true;
        clearTimeout(timer.current);
        setStatus("saving");
        setError("");
        try {
          const result = await action(data);
          if (!result.ok) {
            setError(result.error || "Changes could not be saved. Your edits are still here. Please try again.");
            setStatus("error");
            return;
          }
          baseline.current = Array.from(data.entries()).map(([name, value]) => [name, String(value)] as const);
          dirty.current = false;
          setStatus("saved");
          timer.current = setTimeout(() => setStatus("idle"), 5000);
        } catch {
          setError("Changes could not be saved. Your edits are still here. Please try again.");
          setStatus("error");
        } finally {
          saving.current = false;
        }
      }}>
        <fieldset disabled={status === "saving"} className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
          {children}
          <button type="submit" disabled={status === "saving"} aria-live="polite" aria-busy={status === "saving"}
            className={`w-fit rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-70 sm:col-span-2 ${status === "saved" ? "border-green-700 bg-green-50 text-green-800" : "border-primary text-primary"}`}>
            {status === "saving" ? "Saving…" : status === "saved" ? "✓ Changes saved" : "Save item changes"}
          </button>
          {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
        </fieldset>
      </form>
      {deleteSection}
    </details>
  );
}
