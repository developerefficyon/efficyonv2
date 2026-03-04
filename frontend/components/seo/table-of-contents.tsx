"use client"

import { useState, useEffect, useCallback } from "react"

interface TOCHeading {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  headings: TOCHeading[]
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("")

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const visibleEntries = entries.filter((entry) => entry.isIntersecting)
      if (visibleEntries.length > 0) {
        setActiveId(visibleEntries[0].target.id)
      }
    },
    []
  )

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: "-80px 0px -70% 0px",
      threshold: 0,
    })

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      headings.forEach((heading) => {
        const element = document.getElementById(heading.id)
        if (element) {
          observer.unobserve(element)
        }
      })
    }
  }, [headings, handleObserver])

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      const offset = 100
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.scrollY - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })

      setActiveId(id)
    }
  }

  if (headings.length === 0) {
    return null
  }

  return (
    <nav
      className="sticky top-24 bg-black/50 border border-white/10 rounded-lg p-4"
      aria-label="Table of Contents"
    >
      <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
        On this page
      </h4>
      <ul className="space-y-2">
        {headings.map((heading) => {
          const isActive = activeId === heading.id
          const paddingLeft =
            heading.level === 2
              ? "pl-0"
              : heading.level === 3
                ? "pl-4"
                : "pl-8"

          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                onClick={(e) => handleClick(e, heading.id)}
                className={`block text-sm py-1 border-l-2 pl-3 transition-all duration-200 ${paddingLeft} ${
                  isActive
                    ? "text-white border-cyan-400 font-medium"
                    : "text-gray-400 border-transparent hover:text-white hover:border-white/30"
                }`}
              >
                {heading.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
