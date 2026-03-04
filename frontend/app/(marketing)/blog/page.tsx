import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Clock, Calendar, Tag } from "lucide-react"
import { blogPosts, getFeaturedPost } from "@/lib/blog-data"

export const metadata: Metadata = {
  title: "Blog - SaaS Cost Optimization Insights | Efficyon",
  description:
    "Expert insights on reducing software spend, eliminating SaaS waste, and maximizing ROI. Guides, analysis, and actionable tips from the Efficyon team.",
  openGraph: {
    title: "Blog - SaaS Cost Optimization Insights | Efficyon",
    description:
      "Expert insights on reducing software spend, eliminating SaaS waste, and maximizing ROI.",
    type: "website",
    url: "https://www.efficyon.com/blog",
  },
  alternates: {
    canonical: "/blog",
  },
}

const categoryColors: Record<string, string> = {
  Guide: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Analysis: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Tips: "bg-green-500/20 text-green-400 border-green-500/30",
  Industry: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Strategy: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function BlogPage() {
  const featuredPost = getFeaturedPost()
  const otherPosts = blogPosts.filter((post) => !post.featured)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Efficyon Blog",
    description:
      "Expert insights on SaaS cost optimization, software spend management, and maximizing ROI.",
    url: "https://www.efficyon.com/blog",
    publisher: {
      "@type": "Organization",
      name: "Efficyon",
      url: "https://www.efficyon.com",
    },
  }

  return (
    <div className="min-h-screen bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="pt-32 pb-16 border-b border-white/10">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            SaaS Cost Optimization Blog
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Expert insights on reducing software spend, eliminating waste, and
            maximizing ROI
          </p>
        </div>
      </section>

      {/* Featured Post */}
      {featuredPost && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <span className="text-sm font-medium text-cyan-400 uppercase tracking-wider">
                Featured Article
              </span>
            </div>
            <Link href={`/blog/${featuredPost.slug}`} className="group block">
              <article className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-8 md:p-12 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]">
                <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${categoryColors[featuredPost.category]}`}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {featuredPost.category}
                      </span>
                      <span className="flex items-center text-sm text-gray-500">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        {featuredPost.readTime}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white group-hover:text-cyan-400 transition-colors duration-300">
                      {featuredPost.title}
                    </h2>
                    <p className="text-gray-400 text-lg leading-relaxed">
                      {featuredPost.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        {formatDate(featuredPost.publishDate)}
                      </span>
                      <span>{featuredPost.author}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30 transition-all duration-300">
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-400 transition-colors duration-300" />
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          </div>
        </section>
      )}

      {/* All Posts Grid */}
      <section className="py-12 pb-24">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">All Articles</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block"
              >
                <article className="h-full rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04] flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${categoryColors[post.category]}`}
                    >
                      {post.category}
                    </span>
                    <span className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {post.readTime}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-cyan-400 transition-colors duration-300 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                    {post.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-white/5">
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(post.publishDate)}
                    </span>
                    <span className="flex items-center text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Read more
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Optimize Your SaaS Spend?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Join companies saving 25%+ on software costs with AI-powered
            optimization. Start your free analysis today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/25"
            >
              Start Free Analysis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/#calculator"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium border border-white/10 bg-white/5 text-gray-200 rounded-lg hover:border-white/20 hover:bg-white/10 transition-all duration-300"
            >
              Try ROI Calculator
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
