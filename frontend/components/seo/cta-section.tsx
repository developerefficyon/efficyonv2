import Link from "next/link"
import { ArrowRight, Mail, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CTAButton {
  text: string
  href: string
}

interface CTASectionProps {
  title?: string
  description?: string
  primaryButton?: CTAButton
  secondaryButton?: CTAButton
}

export function CTASection({
  title = "Ready to optimize your SaaS costs?",
  description = "Join leading companies that have reduced SaaS spend by 25%+ with AI-powered cost optimization.",
  primaryButton = { text: "Start Free Analysis", href: "/register" },
  secondaryButton = { text: "Book a Demo", href: "/#contact" },
}: CTASectionProps) {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/40 via-black to-blue-950/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.08),transparent_70%)]" />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            {title}
          </h2>

          <p className="text-xl text-gray-300">{description}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-black hover:bg-gray-100"
              asChild
            >
              <Link href={primaryButton.href}>
                {primaryButton.text}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
              asChild
            >
              <Link href={secondaryButton.href}>
                <Mail className="mr-2 h-4 w-4" />
                {secondaryButton.text}
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-gray-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              <span>No credit card required</span>
            </div>
            <span className="text-gray-600">&bull;</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              <span>5-minute setup</span>
            </div>
            <span className="text-gray-600">&bull;</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
