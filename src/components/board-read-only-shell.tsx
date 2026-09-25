"use client";

import { FormEvent, ReactNode, useEffect, useRef } from "react";

export function BoardReadOnlyShell({ readOnly, children }: { readOnly: boolean; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!readOnly || !root.current) return;
    const disableForms = () => {
      root.current
        ?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>(
          "form input, form select, form textarea, form button"
        )
        .forEach((element) => {
          element.disabled = true;
          element.setAttribute("aria-disabled", "true");
          element.title = "Board View is read-only";
        });
    };
    disableForms();
    const observer = new MutationObserver(disableForms);
    observer.observe(root.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [readOnly]);

  function preventSubmit(event: FormEvent<HTMLDivElement>) {
    if (readOnly) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  return (
    <div ref={root} onSubmitCapture={preventSubmit}>
      {readOnly && (
        <div className="sticky top-0 z-40 border-b border-primary/20 bg-primary/10 px-4 py-2 text-center text-sm font-semibold text-primary backdrop-blur">
          Board View · Read Only
        </div>
      )}
      {children}
    </div>
  );
}
