"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";

type TrainingResource = {
  id: string;
  title: string;
  resourceType: string;
  categories: string[];
  description: string;
  url: string;
  displayOrder: number;
};

const sections = [
  { label: "Clinic Education", category: "General Clinic Education" },
  { label: "Instrument Sterilization", category: "Instrument Sterilization" },
  { label: "General Volunteer", category: "General Volunteer" },
] as const;

export function TrainingResourceSections({ resources }: { resources: TrainingResource[] }) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {sections.map((section) => {
          const isOpen = openCategory === section.category;
          return (
            <button
              key={section.category}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenCategory(isOpen ? null : section.category)}
              className={`flex min-h-12 items-center justify-center rounded-2xl border border-primary px-4 py-3 text-center text-sm font-semibold transition ${
                isOpen ? "bg-primary text-white shadow-sm" : "bg-white text-primary hover:bg-primary/5"
              }`}
            >
              {section.label}
            </button>
          );
        })}
      </div>

      {sections.map((section) => {
        if (openCategory !== section.category) return null;
        const sectionResources = resources.filter((resource) =>
          resource.categories.includes(section.category)
        );

        return (
          <section key={section.category} className="mt-6 rounded-2xl border bg-white p-4 sm:p-5">
            <h3 className="text-lg font-bold">{section.label}</h3>
            {sectionResources.length ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {sectionResources.map((resource) => (
                  <article key={resource.id} className="rounded-2xl border bg-slate-50 p-4">
                    <p className="font-semibold">{resource.title}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      {resource.resourceType}
                    </p>
                    {resource.description && (
                      <p className="mt-3 text-sm text-muted-foreground">{resource.description}</p>
                    )}
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                      >
                        Open resource <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No published resources are available in this section yet.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
