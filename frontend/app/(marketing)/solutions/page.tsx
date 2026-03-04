import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/ui/navbar"
import {
  ArrowRight,
  Rocket,
  Calculator,
  Monitor,
  TrendingUp,
  Building2,
  CheckCircle,
  Shield,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Solutions - SaaS Cost Optimization by Role",
  description:
    "Efficyon provides tailored SaaS cost optimization solutions for startups, finance teams, IT managers, CFOs, and enterprises. Find the right solution for your role and team size.",
  alternates: {
    canonical: "/solutions",
  },
  openGraph: {
    title: "Solutions - SaaS Cost Optimization by Role | Efficyon",
    description:
      "Efficyon provides tailored SaaS cost optimization solutions for startups, finance teams, IT managers, CFOs, and enterprises.",
    url: "https://www.efficyon.com/solutions",
    type: "website",
  },
}

const solutions = [
  {
    icon: Rocket,
    title: "For Startups",
    description:
      "Preserve runway and scale without waste. Identify the SaaS tools draining your budget before they drain your funding.",
    href: "/solutions/for-startups",
    bgClass: "bg-cyan-900/40",
    textClass: "text-cyan-400",
  },
  {
    icon: Calculator,
    title: "For Finance Teams",
    description:
      "Gain complete SaaS spend visibility. Automate categorization, eliminate surprise renewals, and stay audit-ready at all times.",
    href: "/solutions/for-finance-teams",
    bgClass: "bg-blue-900/40",
    textClass: "text-blue-400",
  },
  {
    icon: Monitor,
    title: "For IT Managers",
    description:
      "Take control of your software inventory. Detect shadow IT, ensure license compliance, and close security gaps across teams.",
    href: "/solutions/for-it-managers",
    bgClass: "bg-green-900/40",
    textClass: "text-green-400",
  },
  {
    icon: TrendingUp,
    title: "For CFOs",
    description:
      "Get strategic SaaS spend intelligence. Board-ready dashboards, accurate forecasting, and actionable benchmarking data.",
    href: "/solutions/for-cfo",
    bgClass: "bg-purple-900/40",
    textClass: "text-purple-400",
  },
  {
    icon: Building2,
    title: "For Enterprise",
    description:
      "Enterprise-grade SaaS management at scale. SSO, custom integrations, dedicated support, and compliance-ready from day one.",
    href: "/solutions/for-enterprise",
    bgClass: "bg-orange-900/40",
    textClass: "text-orange-400",
  },
]

export default function SolutionsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Solutions - SaaS Cost Optimization by Role | Efficyon",
    description:
      "Efficyon provides tailored SaaS cost optimization solutions for startups, finance teams, IT managers, CFOs, and enterprises.",
    url: "https://www.efficyon.com/solutions",
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
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-black">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent text-balance">
              SaaS Cost Optimization for Every Team
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Whether you are a startup founder watching every dollar or an enterprise CTO managing
              thousands of subscriptions, Efficyon adapts to your role, your scale, and your
              priorities.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400 pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>90-Day ROI Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-400" />
                <span>SOC 2 Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Cards */}
      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {solutions.map((solution) => (
              <Link
                key={solution.href}
                href={solution.href}
                className="group relative rounded-xl border border-white/10 bg-black/50 p-8 hover:border-white/20 hover:bg-white/5 transition-all duration-300"
              >
                <div className="space-y-4">
                  <div
                    className={`h-14 w-14 ${solution.bgClass} rounded-xl flex items-center justify-center`}
                  >
                    <solution.icon className={`h-7 w-7 ${solution.textClass}`} />
                  </div>
                  <h2 className="text-xl font-semibold text-white group-hover:text-white/90">
                    {solution.title}
                  </h2>
                  <p className="text-gray-400 leading-relaxed">{solution.description}</p>
                  <div className="flex items-center gap-2 text-sm font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors">
                    Learn more
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Not Sure Which Solution Fits?
            </h2>
            <p className="text-lg text-gray-300">
              Start with a free SaaS spend analysis. Our platform automatically identifies where
              your money is going and recommends the fastest path to savings, regardless of your
              role or company size.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100" asChild>
                <Link href="/register">
                  Start Free Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                asChild
              >
                <Link href="/#contact">Book a Demo</Link>
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              No credit card required. Setup takes less than 5 minutes.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
