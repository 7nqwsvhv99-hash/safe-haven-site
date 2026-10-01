"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

export function InventorySearch() {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  useEffect(() => {
    const normalized = query.trim().toLowerCase();
    const items = Array.from(
      document.querySelectorAll<HTMLElement>("[data-clinic-inventory-item]")
    );
    const groups = Array.from(
      document.querySelectorAll<HTMLDetailsElement>("[data-clinic-inventory-category]")
    );

    let visible = 0;
    items.forEach((item) => {
      const searchable = (item.dataset.inventorySearch || "").toLowerCase();
      const matches = !normalized || searchable.includes(normalized);
      item.hidden = !matches;
      if (matches) visible += 1;
    });

    groups.forEach((group) => {
      const groupItems = Array.from(
        group.querySelectorAll<HTMLElement>("[data-clinic-inventory-item]")
      );
      const hasMatch = groupItems.some((item) => !item.hidden);

      group.hidden = normalized ? !hasMatch : false;

      if (normalized && hasMatch) {
        if (!group.open) {
          group.dataset.searchOpened = "true";
          group.open = true;
        }
      } else if (!normalized && group.dataset.searchOpened === "true") {
        group.open = false;
        delete group.dataset.searchOpened;
      }
    });

    setVisibleCount(visible);
  }, [query]);

  useEffect(() => {
    const groups = Array.from(
      document.querySelectorAll<HTMLDetailsElement>("[data-clinic-inventory-category]")
    );

    const handleToggle = (event: Event) => {
      const openedGroup = event.currentTarget as HTMLDetailsElement;
      if (!openedGroup.open || query.trim()) return;

      groups.forEach((group) => {
        if (group !== openedGroup) group.open = false;
      });
    };

    groups.forEach((group) => group.addEventListener("toggle", handleToggle));
    return () => {
      groups.forEach((group) => group.removeEventListener("toggle", handleToggle));
    };
  }, [query]);

  return (
    <div className="mb-5">
      <label htmlFor="clinic-inventory-search" className="sr-only">
        Search clinic inventory
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id="clinic-inventory-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search inventory"
          autoComplete="off"
          className="w-full rounded-2xl border bg-white py-3 pl-10 pr-11 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear inventory search"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-slate-100 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {query && visibleCount === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          No inventory items match “{query}”.
        </p>
      )}
    </div>
  );
}
