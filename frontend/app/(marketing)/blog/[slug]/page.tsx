import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Calendar,
  Tag,
  User,
  ChevronRight,
} from "lucide-react"
import { blogPosts, getBlogPost, getRelatedPosts } from "@/lib/blog-data"

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)

  if (!post) {
    return {
      title: "Post Not Found | Efficyon Blog",
    }
  }

  return {
    title: `${post.title} | Efficyon Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishDate,
      modifiedTime: post.updatedDate,
      authors: [post.author],
      tags: post.tags,
      url: `https://www.efficyon.com/blog/${post.slug}`,
    },
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
  }
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

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = getBlogPost(slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = getRelatedPosts(slug, 3)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Efficyon",
      url: "https://www.efficyon.com",
      logo: {
        "@type": "ImageObject",
        url: "https://www.efficyon.com/logo.png",
      },
    },
    datePublished: post.publishDate,
    dateModified: post.updatedDate,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://www.efficyon.com/blog/${post.slug}`,
    },
  }

  return (
    <div className="min-h-screen bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Article Header */}
      <header className="pt-32 pb-12 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4">
          {/* Breadcrumbs */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-sm text-gray-500 mb-8"
          >
            <Link
              href="/"
              className="hover:text-gray-300 transition-colors duration-200"
            >
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              href="/blog"
              className="hover:text-gray-300 transition-colors duration-200"
            >
              Blog
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-gray-400 truncate max-w-[200px]">
              {post.title}
            </span>
          </nav>

          {/* Category & Read Time */}
          <div className="flex items-center gap-3 mb-6">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${categoryColors[post.category]}`}
            >
              <Tag className="h-3 w-3 mr-1.5" />
              {post.category}
            </span>
            <span className="flex items-center text-sm text-gray-500">
              <Clock className="h-3.5 w-3.5 mr-1" />
              {post.readTime}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
            {post.title}
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-400 leading-relaxed mb-8">
            {post.description}
          </p>

          {/* Meta Bar */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Published {formatDate(post.publishDate)}
            </span>
            {post.updatedDate !== post.publishDate && (
              <span className="text-gray-600">
                Updated {formatDate(post.updatedDate)}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Article Content */}
      <article className="py-12">
        <div
          className="max-w-4xl mx-auto px-4 blog-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>

      {/* Tags */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-400 border border-white/10"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Author Card */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 flex items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <User className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">{post.author}</p>
            <p className="text-gray-400 text-sm">{post.authorRole}</p>
          </div>
        </div>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-12 border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-white mb-8">
              Related Articles
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="group block"
                >
                  <article className="h-full rounded-xl border border-white/10 bg-white/[0.02] p-5 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04] flex flex-col">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border w-fit mb-3 ${categoryColors[related.category]}`}
                    >
                      {related.category}
                    </span>
                    <h3 className="text-sm font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors duration-300 line-clamp-2">
                      {related.title}
                    </h3>
                    <p className="text-gray-500 text-xs leading-relaxed flex-1 line-clamp-2">
                      {related.description}
                    </p>
                    <span className="flex items-center text-xs text-gray-500 mt-3">
                      <Clock className="h-3 w-3 mr-1" />
                      {related.readTime}
                    </span>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="py-16 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Stop Overpaying for Software
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Efficyon uses AI to analyze your SaaS spend, identify waste, and
            deliver actionable optimization recommendations. See results within
            90 days or your money back.
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

      {/* Back to Blog */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all articles
        </Link>
      </div>
    </div>
  )
}
