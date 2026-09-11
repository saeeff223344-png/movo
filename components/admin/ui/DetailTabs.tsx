"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export type DetailTab = {
  id: string;
  label: string;
  content: ReactNode;
};

export function DetailTabs({ tabs, defaultTab }: { tabs: DetailTab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-border-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${
              activeTab?.id === tab.id
                ? "border-brand-500 text-brand-400"
                : "border-transparent text-muted hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-6">{activeTab?.content}</div>
    </div>
  );
}
