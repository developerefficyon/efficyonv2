import type { Metadata } from "next"
import {
  EditorialPageHero,
  EditorialSection,
  EditorialSectionIntro,
  EditorialCard,
  EditorialFinalCTA,
} from "@/components/marketing/editorial"
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <EditorialPageHero
        eyebrow="Field notes · Cost intelligence"
        title="Where the money"
        italic="quietly leaks."
        body="Long-form pieces, short reads, and working notes on SaaS waste, AI burn, renewal economics, and the boring middle of finance ops. Written from Gothenburg, Sweden — for teams who like their numbers honest."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "See pricing", href: "/#pricing" }}
      />

      {featuredPost && (
        <EditorialSection>
          <EditorialSectionIntro
            eyebrow="Featured"
            title="This month's"
            italic="long read."
            body="The piece worth printing — our take on the topic finance and IT teams keep landing on this quarter."
          />
          <div className="border-t border-white/[0.08]">
            <EditorialCard
              href={`/blog/${featuredPost.slug}`}
              title={featuredPost.title}
              italic="✦ featured"
              body={featuredPost.description}
              meta={`${formatDate(featuredPost.publishDate)} · ${featuredPost.category} · ${featuredPost.readTime}`}
            />
          </div>
        </EditorialSection>
      )}

      <EditorialSection>
        <EditorialSectionIntro
          eyebrow="The archive"
          title="Everything else"
          italic="we've published."
          body="Filed by date, not by funnel stage. Read what's useful, ignore what isn't."
        />
        <div className="border-t border-white/[0.08]">
          {otherPosts.map((post, i) => (
            <EditorialCard
              key={post.slug}
              href={`/blog/${post.slug}`}
              index={i}
              title={post.title}
              body={post.description}
              meta={`${formatDate(post.publishDate)} · ${post.category} · ${post.readTime}`}
            />
          ))}
        </div>
      </EditorialSection>

      <EditorialFinalCTA
        title="Reading is free."
        italic="So is your first scan."
        body="Connect one system, run an analysis in 10 minutes, and see what we surface against your own data. Read-only access. Cancel anytime."
        primaryCta={{ label: "Start free analysis", href: "/register" }}
        secondaryCta={{ label: "Try the ROI calculator →", href: "/calculator/roi" }}
      />
    </>
  )
}
