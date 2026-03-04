import type React from "react"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { ArrowRight, Linkedin, Twitter, Mail } from "lucide-react"

const footerLinks = {
  product: [
    { name: "SaaS Cost Optimization", href: "/features/saas-cost-optimization" },
    { name: "Subscription Tracking", href: "/features/subscription-tracking" },
    { name: "Duplicate Payment Detection", href: "/features/duplicate-payment-detection" },
    { name: "Unused License Detection", href: "/features/unused-license-detection" },
    { name: "SaaS Spend Management", href: "/features/saas-spend-management" },
    { name: "AI Cost Analysis", href: "/features/ai-cost-analysis" },
    { name: "Software Audit", href: "/features/software-audit" },
  ],
  solutions: [
    { name: "For Startups", href: "/solutions/for-startups" },
    { name: "For Finance Teams", href: "/solutions/for-finance-teams" },
    { name: "For IT Managers", href: "/solutions/for-it-managers" },
    { name: "For CFOs", href: "/solutions/for-cfo" },
    { name: "For Enterprise", href: "/solutions/for-enterprise" },
  ],
  resources: [
    { name: "Blog", href: "/blog" },
    { name: "ROI Calculator", href: "/calculator/roi" },
    { name: "SaaS Cost Calculator", href: "/calculator/saas-cost" },
    { name: "Waste Estimator", href: "/calculator/waste-estimator" },
    { name: "Benchmarks", href: "/benchmarks/saas-spend-by-company-size" },
    { name: "Compare Tools", href: "/compare/best-saas-cost-optimization-tools" },
    { name: "Integrations", href: "/integrations/fortnox" },
  ],
  company: [
    { name: "About", href: "/#contact" },
    { name: "Pricing", href: "/#pricing" },
    { name: "Contact", href: "/#contact" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
  ],
}

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <main>{children}</main>

      <footer className="relative py-20 bg-black border-t border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-black/90" />

        <div className="relative z-10 container mx-auto px-4">
          <div className="grid lg:grid-cols-5 md:grid-cols-2 gap-12">
            {/* Company Info */}
            <div className="lg:col-span-1 space-y-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white">Efficyon</h3>
                <p className="text-gray-300 leading-relaxed text-sm">
                  AI-powered SaaS cost optimization platform that helps businesses
                  identify unused licenses, overlapping tools, and hidden savings.
                </p>
              </div>

              <div className="flex space-x-4">
                <a
                  href="https://linkedin.com/company/efficyon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                <a
                  href="https://twitter.com/efficyon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
                  aria-label="Twitter"
                >
                  <Twitter className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-white">Product</h4>
              <ul className="space-y-3">
                {footerLinks.product.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-gray-400 hover:text-white transition-colors duration-300 flex items-center group text-sm"
                    >
                      <ArrowRight className="h-3 w-3 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Solutions */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-white">Solutions</h4>
              <ul className="space-y-3">
                {footerLinks.solutions.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-gray-400 hover:text-white transition-colors duration-300 flex items-center group text-sm"
                    >
                      <ArrowRight className="h-3 w-3 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-white">Resources</h4>
              <ul className="space-y-3">
                {footerLinks.resources.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-gray-400 hover:text-white transition-colors duration-300 flex items-center group text-sm"
                    >
                      <ArrowRight className="h-3 w-3 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-white">Company</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-gray-400 hover:text-white transition-colors duration-300 flex items-center group text-sm"
                    >
                      <ArrowRight className="h-3 w-3 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="pt-4">
                <div className="flex items-center space-x-3 text-gray-300">
                  <div className="p-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
                    <Mail className="h-4 w-4" />
                  </div>
                  <a
                    href="mailto:info@efficyon.com"
                    className="hover:text-white transition-colors duration-300 text-sm"
                  >
                    info@efficyon.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-white/10 mt-16 pt-8">
            <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
              <p className="text-gray-400 text-sm text-center lg:text-left">
                &copy; 2026 Efficyon. All rights reserved.
              </p>

              <div className="flex flex-wrap justify-center lg:justify-end space-x-8">
                <Link
                  href="/privacy"
                  className="text-gray-400 hover:text-white transition-colors duration-300 text-sm"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="text-gray-400 hover:text-white transition-colors duration-300 text-sm"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
