import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface RelatedContentItem {
  title: string
  description: string
  href: string
  tag: string
}

interface RelatedContentProps {
  items: RelatedContentItem[]
  title?: string
}

export function RelatedContent({
  items,
  title = "Related Content",
}: RelatedContentProps) {
  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-12">
          {title}
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block rounded-xl border border-white/10 bg-black/50 p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/5"
            >
              <div className="space-y-4">
                <span className="inline-flex items-center rounded-md bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 text-xs font-medium text-cyan-400">
                  {item.tag}
                </span>

                <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors duration-300">
                  {item.title}
                </h3>

                <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                  {item.description}
                </p>

                <div className="flex items-center text-sm text-gray-400 group-hover:text-white transition-colors duration-300">
                  <span>Read more</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
