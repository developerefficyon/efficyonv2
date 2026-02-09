import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spotlight } from "@/components/ui/spotlight"
import { AnimatedHeroVisual } from "@/components/animated-hero-visual"
import AnimatedGradientBackground from "@/components/ui/animated-gradient-background"
import { SparklesCore } from "@/components/ui/sparkles"
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"
import { Navbar } from "@/components/ui/navbar"
import { Pricing } from "@/components/ui/pricing"
import { ROICalculator } from "@/components/roi-calculator"
import { DashboardPreview } from "@/components/dashboard-preview"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import {
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  DollarSign,
  BarChart3,
  Workflow,
  Brain,
  Zap,
  Shield,
  Mail,
  Linkedin,
  Twitter,
  Facebook,
  Calculator,
  LineChart,
  Target,
} from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Navigation Component */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
        <div className="container mx-auto px-4">
          <Card className="w-full h-[500px] bg-black/[0.96] relative overflow-hidden border-none">
            <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" />

            <div className="flex h-full">
              {/* Left content */}
              <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
                <h1 className="text-4xl md:text-5xl font-bold text-white bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-balance">
                  Turn SaaS sprawl into financial clarity.
                </h1>
                <p className="mt-4 text-neutral-300 max-w-lg">
                  Efficyon compares SaaS spend with real usage across your tools to reveal unused licenses, mispriced
                  tools, and quiet inefficiencies across your software stack.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <Button size="lg" className="bg-white text-black hover:bg-gray-100">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-neutral-600 text-neutral-300 hover:bg-neutral-800 bg-transparent"
                  >
                    See How It Works
                  </Button>
                </div>

                <div className="flex items-center gap-8 text-sm text-neutral-400 mt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>90-Day Pilot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>AI-Driven Analysis</span>
                  </div>
                </div>
              </div>

              {/* Right content */}
              <div className="flex-1 relative">
                <AnimatedHeroVisual />
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Feature highlights Section */}
      <section className="py-16 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-green-900/40 rounded-full flex items-center justify-center mx-auto">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Cost meets usage</h3>
              <p className="text-gray-400 text-sm">
                SaaS spend shown alongside real usage data.
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-blue-900/40 rounded-full flex items-center justify-center mx-auto">
                <Brain className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Cross-tool visibility</h3>
              <p className="text-gray-400 text-sm">Insights that only appear when systems are viewed together.</p>
            </div>
            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-orange-900/40 rounded-full flex items-center justify-center mx-auto">
                <Target className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Clear, actionable insights</h3>
              <p className="text-gray-400 text-sm">Findings you can actually act on.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section id="calculator" className="py-24 bg-black">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Instant ROI Calculator</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              See your potential savings instantly. Adjust the sliders below - calculations update in real-time
            </p>
          </div>
          <ROICalculator />
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section id="dashboard" className="py-24 bg-black">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium mb-4">
              <Zap className="h-4 w-4" />
              Get AI Help - New!
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Dashboard Preview</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Real-time insights and intelligent recommendations. See exactly how Efficyon transforms your processes
              with live data and concrete action plans.
            </p>
          </div>
          <DashboardPreview />
        </div>
      </section>

      {/* Problem & Solution Section */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">Still paying for software you don&apos;t fully use?</h2>
              <div className="space-y-4 text-gray-300">
                <p className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✗</span>
                  Licenses that exist on paper but see little real activity
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✗</span>
                  Multiple tools covering the same jobs across teams
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✗</span>
                  Time lost moving between systems that don&apos;t talk to each other
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✗</span>
                  Limited visibility into how software spend relates to actual usage
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white">Efficyon Finds the Hidden Savings</h3>
              <div className="space-y-4 text-gray-300">
                <p className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Eliminate unused and underutilized licenses
                </p>
                <p className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Consolidate overlapping tools into optimized stacks
                </p>
                <p className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  Automate workflows to save hours every week
                </p>
                <p className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  ROI guarantee within 90 days
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-black">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white">How Efficyon Saves You Money</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Two main sources of savings through AI-powered analysis
            </p>
          </div>

          <BentoGrid className="lg:grid-rows-3">
            <BentoCard
              name="Direct License Savings"
              className="lg:row-start-1 lg:row-end-4 lg:col-start-2 lg:col-end-3"
              background={<div className="absolute inset-0 bg-black/80 backdrop-blur-sm border border-white/10" />}
              Icon={DollarSign}
              description="Reduce actual costs by ~25% of license expenses. Eliminate unused licenses, remove overlapping tools, and optimize license levels across your organization."
              href="#"
              cta="Learn more"
            />
            <BentoCard
              name="Time Savings Value"
              className="lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3"
              background={<div className="absolute inset-0 bg-black/80 backdrop-blur-sm border border-white/10" />}
              Icon={Clock}
              description="Recover productivity through faster workflows and less tool switching. Average savings of ~0.9 hours per month per employee."
              href="#"
              cta="Learn more"
            />
            <BentoCard
              name="AI-Powered Analysis"
              className="lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4"
              background={<div className="absolute inset-0 bg-black/80 backdrop-blur-sm border border-white/10" />}
              Icon={Brain}
              description="Intelligent algorithms continuously analyze your tool usage patterns to identify optimization opportunities."
              href="#"
              cta="Learn more"
            />
            <BentoCard
              name="Integration Analysis"
              className="lg:col-start-3 lg:col-end-3 lg:row-start-1 lg:row-end-2"
              background={<div className="absolute inset-0 bg-black/80 backdrop-blur-sm border border-white/10" />}
              Icon={Workflow}
              description="Connect with 50+ popular business tools including Microsoft 365, Slack, Salesforce, HubSpot, and more."
              href="#"
              cta="Learn more"
            />
            <BentoCard
              name="Actionable Recommendations"
              className="lg:col-start-3 lg:col-end-3 lg:row-start-2 lg:row-end-4"
              background={<div className="absolute inset-0 bg-black/80 backdrop-blur-sm border border-white/10" />}
              Icon={LineChart}
              description="Get prioritized, concrete action plans with estimated savings for each recommendation. Track implementation progress in real-time."
              href="#"
              cta="Learn more"
            />
          </BentoGrid>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-black">
        <Pricing
          title="Transparent Pricing"
          description="Simple pricing, guaranteed value. Our pricing is based on company size and complexity. All plans include ROI guarantee."
          plans={[
            {
              name: "Startup",
              price: "39",
              yearlyPrice: "31",
              period: "month",
              features: [
                "AI-driven process analysis",
                "Monthly optimization reports",
                "Email support",
                "Basic integrations",
                "ROI tracking",
                "5 integrations",
                "10 monthly tokens",
                "Up to 3 team members",
              ],
              description: "For companies with 1-10 employees",
              buttonText: "Try Free",
              href: "#contact",
              isPopular: false,
            },
            {
              name: "Growth",
              price: "119",
              yearlyPrice: "95",
              period: "month",
              features: [
                "Everything in Startup +",
                "Advanced AI analysis",
                "Custom automations",
                "Priority support",
                "API integrations",
                "Team training included",
                "15 integrations",
                "50 monthly tokens",
                "Up to 10 team members",
              ],
              description: "For companies with 11-50 employees",
              buttonText: "Try Free",
              href: "#contact",
              isPopular: true,
            },
            {
              name: "Enterprise",
              price: "Custom",
              yearlyPrice: "Custom",
              period: "month",
              features: [
                "Everything in Growth +",
                "Dedicated team",
                "Custom AI model",
                "On-premise deployment",
                "SLA guarantee",
                "Quarterly strategy review",
                "Unlimited integrations",
                "200 monthly credits",
                "Unlimited team members",
              ],
              description: "For companies with 50+ employees",
              buttonText: "Contact Us",
              href: "#contact",
              isPopular: false,
            },
          ]}
        />
        <p className="text-center text-gray-400 text-sm mt-4">
          <Shield className="inline h-4 w-4 mr-1" />
          All plans include 90-day ROI guarantee
        </p>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-black">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-300">Everything you need to know about Efficyon</p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How does the ROI guarantee work?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                We guarantee measurable ROI within 90 days of implementation. If you don't see the projected savings,
                we'll continue working with you at no additional cost until you do, or provide a full refund.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Which systems does Efficyon integrate with?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                We integrate with 50+ popular business tools including Microsoft 365, Google Workspace, Slack,
                Salesforce, HubSpot, Fortnox, Jira, Asana, Notion, and many more. Our API also allows custom
                integrations.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How quickly do we see results?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Most companies see their first actionable recommendations within 2 weeks. Full analysis and
                implementation typically takes 30-60 days, with measurable savings appearing within the first quarter.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                Is it secure to connect our systems?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Absolutely. We use bank-level encryption, are SOC 2 compliant, and never store sensitive business data.
                Our integrations use read-only access where possible, and all data is processed in secure, isolated
                environments.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                What does Efficyon cost after the pilot phase?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Pricing depends on company size and complexity. Startup plans begin at $39/month, Growth at $119/month,
                and Enterprise pricing is customized. All plans include our ROI guarantee.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border border-white/10 rounded-lg px-6 bg-black/50">
              <AccordionTrigger className="text-white hover:no-underline">
                How does Efficyon differ from traditional consulting?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Unlike traditional consultants who provide one-time recommendations, Efficyon's AI continuously monitors
                and optimizes your systems. You get real-time insights, automatic detection of new savings
                opportunities, and ongoing optimization - not just a static report.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <AnimatedGradientBackground
          Breathing={true}
          gradientColors={["#0A0A0A", "#2979FF", "#FF80AB", "#FF6D00", "#FFD600", "#00E676", "#3D5AFE"]}
          gradientStops={[35, 50, 60, 70, 80, 90, 100]}
        />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="relative h-32 w-full flex flex-col items-center justify-center">
              <div className="w-full absolute inset-0">
                <SparklesCore
                  id="ctasparticles"
                  background="transparent"
                  minSize={0.6}
                  maxSize={1.4}
                  particleDensity={100}
                  className="w-full h-full"
                  particleColor="#FFFFFF"
                  speed={0.8}
                />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 relative z-20 text-balance">
                Ready to optimize your business costs?
              </h2>
            </div>

            <p className="text-xl text-gray-300">
              Join leading companies that have increased efficiency by 25%+ and saved thousands annually with AI-powered
              cost optimization.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="bg-white text-black hover:bg-gray-100" asChild>
                <Link href="/register">
                  Start Free Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 bg-transparent" asChild>
                <Link href="#contact">
                  <Mail className="mr-2 h-4 w-4" />
                  Book a Demo
                </Link>
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
              <span>No credit card required</span>
              <span>•</span>
              <span>5-minute setup</span>
              <span>•</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-md">
          <div className="text-center space-y-4 mb-8">
            <h2 className="text-2xl font-bold text-white">Contact Us</h2>
            <p className="text-gray-300">Leave your details and we'll contact you</p>
          </div>

          <form className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Your name"
                className="bg-black/50 border-white/20 text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="your@email.com"
                className="bg-black/50 border-white/20 text-white placeholder:text-gray-500"
              />
            </div>
            <Button className="w-full bg-white text-black hover:bg-gray-100">Send</Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-20 bg-black border-t border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-black/90" />

        <div className="relative z-10 container mx-auto px-4">
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-12">
            {/* Company Info */}
            <div className="lg:col-span-1 space-y-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white">Efficyon</h3>
                <p className="text-gray-300 leading-relaxed">
                  AI-powered cost optimization platform that helps businesses identify savings and increase efficiency.
                </p>
              </div>

              <div className="flex space-x-4">
                <a
                  href="#"
                  className="p-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="p-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="p-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-white">Features</h4>
              <ul className="space-y-3">
                {[
                  "License Optimization",
                  "Workflow Analysis",
                  "AI Recommendations",
                  "ROI Tracking",
                  "Integration Hub",
                ].map((feature) => (
                  <li key={feature}>
                    <a
                      href="#services"
                      className="text-gray-400 hover:text-white transition-colors duration-300 flex items-center group"
                    >
                      <ArrowRight className="h-3 w-3 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {feature}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-white">Company</h4>
              <ul className="space-y-3">
                {[
                  { name: "About Us", href: "#" },
                  { name: "Pricing", href: "#pricing" },
                  { name: "FAQ", href: "#faq" },
                  { name: "Contact", href: "#contact" },
                ].map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-gray-400 hover:text-white transition-colors duration-300 flex items-center group"
                    >
                      <ArrowRight className="h-3 w-3 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-white">Get in Touch</h4>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-gray-300">
                  <div className="p-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
                    <Mail className="h-4 w-4" />
                  </div>
                  <a href="mailto:info@efficyon.com" className="hover:text-white transition-colors duration-300">
                    info@efficyon.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-white/10 mt-16 pt-8">
            <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
              <p className="text-gray-400 text-center lg:text-left">© 2025 Efficyon. All rights reserved.</p>

              <div className="flex flex-wrap justify-center lg:justify-end space-x-8">
                <a href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-300 text-sm">
                  Privacy Policy
                </a>
                <a href="/terms" className="text-gray-400 hover:text-white transition-colors duration-300 text-sm">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
