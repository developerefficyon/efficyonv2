import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  EditorialSection,
  EditorialEyebrow,
  EditorialMonoLabel,
  EditorialCard,
  EditorialFinalCTA,
  GREEN,
} from "@/components/marketing/editorial"
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Article hero */}
      <section className="relative z-10 mx-auto max-w-[1240px] px-6 pb-16 pt-[160px] md:px-12 md:pb-20 md:pt-[180px]">
        {/* Breadcrumb / eyebrow */}
        <nav
          aria-label="Breadcrumb"
          className="mb-10 flex items-center gap-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45"
        >
          <Link href="/blog" className="transition-colors hover:text-white">
            ← Blog
          </Link>
          <span className="text-white/25">/</span>
          <span style={{ color: GREEN }}>✦ {post.category}</span>
        </nav>

        <h1 className="max-w-[22ch] text-[clamp(40px,5.5vw,76px)] font-medium leading-[0.98] tracking-[-0.04em]">
          {post.title.split(":").map((part, idx, arr) => {
            if (idx === arr.length - 1 && arr.length > 1) {
              return (
                <span key={idx}>
                  :{" "}
                  <span
                    className="font-[family-name:var(--font-instrument-serif)] font-normal italic"
                    style={{ color: GREEN }}
                  >
                    {part.trim()}
                  </span>
                </span>
              )
            }
            return idx === 0 ? part : `: ${part}`
          })}
        </h1>

        <p className="mt-8 max-w-[68ch] text-[18px] font-light leading-[1.7] text-white/65">
          {post.description}
        </p>

        {/* Byline + meta */}
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/[0.08] pt-8">
          <EditorialMonoLabel>By {post.author}</EditorialMonoLabel>
          <EditorialMonoLabel>
            Published {formatDate(post.publishDate)}
          </EditorialMonoLabel>
          {post.updatedDate !== post.publishDate && (
            <EditorialMonoLabel>
              Updated {formatDate(post.updatedDate)}
            </EditorialMonoLabel>
          )}
          <EditorialMonoLabel>{post.readTime}</EditorialMonoLabel>
        </div>
      </section>

      {/* Article content */}
      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-20 md:px-12 md:py-24">
        <article
          className="blog-content mx-auto max-w-[68ch] font-[family-name:var(--font-dm-sans)] text-[17px] leading-[1.8] text-white/75"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mx-auto mt-16 max-w-[68ch] border-t border-white/[0.08] pt-8">
            <p className="mb-4 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45">
              Filed under
            </p>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border border-white/[0.12] px-3 py-1.5 text-[12px] text-white/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Author */}
        <div className="mx-auto mt-12 max-w-[68ch] border-t border-white/[0.08] pt-8">
          <EditorialEyebrow>Written by</EditorialEyebrow>
          <p className="text-[22px] font-medium tracking-[-0.02em]">
            {post.author}{" "}
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/55">
              — {post.authorRole}
            </span>
          </p>
        </div>
      </section>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <EditorialSection>
          <div className="mb-10">
            <EditorialEyebrow>Related reading</EditorialEyebrow>
            <h2 className="text-[clamp(32px,3.6vw,52px)] font-medium leading-[1.04] tracking-[-0.03em]">
              Keep going,{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-white/85">
                if you're enjoying it.
              </span>
            </h2>
          </div>
          <div className="border-t border-white/[0.08]">
            {relatedPosts.map((related, i) => (
              <EditorialCard
                key={related.slug}
                href={`/blog/${related.slug}`}
                index={i}
                title={related.title}
                body={related.description}
                meta={`${formatDate(related.publishDate)} · ${related.category} · ${related.readTime}`}
              />
            ))}
          </div>
        </EditorialSection>
      )}

      <EditorialFinalCTA
        title="Found a leak in your stack?"
        italic="Let's measure it."
        body="Connect one system and run a scan in 10 minutes. Read-only OAuth, no credit card, no commitment. See what we surface against your real data."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Back to all articles →", href: "/blog" }}
      />
    </>
  )
}
