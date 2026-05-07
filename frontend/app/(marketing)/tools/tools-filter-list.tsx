"use client"

import { useMemo, useState } from "react"
import { EditorialCard, GREEN } from "@/components/marketing/editorial"
import type { SaasToolData } from "@/lib/saas-tools-data"

interface ToolsFilterListProps {
  tools: SaasToolData[]
  categories: string[]
}

export function ToolsFilterList({ tools, categories }: ToolsFilterListProps) {
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("All")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tools.filter((t) => {
      if (activeCategory !== "All" && t.category !== activeCategory) return false
      if (!q) return true
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
    })
  }, [tools, query, activeCategory])

  const grouped = useMemo(() => {
    const map = new Map<string, SaasToolData[]>()
    for (const t of filtered) {
      const arr = map.get(t.category) ?? []
      arr.push(t)
      map.set(t.category, arr)
    }
    return categories
      .filter((c) => map.has(c))
      .map((c) => [c, map.get(c)!] as const)
  }, [filtered, categories])

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-12 grid gap-6 border-b border-white/[0.08] pb-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <label
            htmlFor="tools-search"
            className="mb-3 block font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45"
          >
            ✦ Search the directory
          </label>
          <input
            id="tools-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Slack, Salesforce, AWS…"
            className="w-full border-b border-white/15 bg-transparent pb-3 text-[clamp(22px,2.4vw,32px)] font-medium tracking-[-0.02em] text-white outline-none transition-colors placeholder:text-white/25 focus:border-[color:var(--green)]"
            style={
              { ["--green" as string]: GREEN } as React.CSSProperties
            }
          />
        </div>
        <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45 md:justify-self-end">
          {filtered.length} of {tools.length} tools
        </p>
      </div>

      {/* Category chips */}
      <div className="mb-16 flex flex-wrap gap-2">
        {(["All", ...categories] as const).map((cat) => {
          const active = cat === activeCategory
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] transition-all ${
                active
                  ? "border-transparent text-black"
                  : "border-white/[0.12] text-white/55 hover:border-white/30 hover:text-white"
              }`}
              style={active ? { background: GREEN } : undefined}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <div className="border-y border-white/[0.08] py-24 text-center">
          <p className="font-[family-name:var(--font-instrument-serif)] text-[clamp(28px,3vw,44px)] italic text-white/55">
            No tools match that search.
          </p>
          <p className="mt-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/40">
            Try a different category or clear the field.
          </p>
        </div>
      ) : (
        grouped.map(([category, list]) => (
          <div key={category} id={category.toLowerCase().replace(/\s+/g, "-")} className="mb-20 last:mb-0">
            <div className="mb-2 flex items-baseline justify-between gap-6 border-t border-white/[0.08] pt-10">
              <h2 className="text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.025em]">
                {category}
              </h2>
              <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/45">
                {list.length} {list.length === 1 ? "tool" : "tools"}
              </span>
            </div>
            <div className="border-t border-white/[0.08]">
              {list.map((tool, i) => (
                <EditorialCard
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  index={i}
                  title={tool.name}
                  body={tool.description}
                  meta={`From ${tool.startingPrice.split(";")[0].split("(")[0].trim()} · ${tool.pricingModel}`}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
