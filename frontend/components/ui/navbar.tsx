"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronDown } from "lucide-react"

interface DropdownItem {
  label: string
  href: string
  description?: string
}

interface NavItem {
  label: string
  href: string
  dropdown?: DropdownItem[]
}

const NavDropdown = ({ item, isOpen, onToggle }: { item: NavItem; isOpen: boolean; onToggle: () => void }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && isOpen) {
        onToggle()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onToggle])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className="group relative inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-all duration-300"
      >
        <span className="relative z-10">{item.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100"></span>
      </button>

      <div
        className={`absolute top-full left-0 mt-2 w-64 rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl shadow-black/50 transition-all duration-200 ${
          isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="p-2">
          {item.dropdown?.map((sub) => (
            <Link
              key={sub.href}
              href={sub.href}
              onClick={onToggle}
              className="flex flex-col gap-0.5 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              <span className="text-sm font-medium">{sub.label}</span>
              {sub.description && (
                <span className="text-xs text-gray-500">{sub.description}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

const AnimatedNavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  return (
    <Link
      href={href}
      className="group relative inline-block px-3 py-2 text-sm font-medium transition-all duration-300 text-gray-300 hover:text-white"
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100"></span>
      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 transition-transform duration-300 origin-left scale-x-0 group-hover:scale-x-100"></span>
    </Link>
  )
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)

  const toggleMenu = () => {
    setIsOpen(!isOpen)
    setMobileExpanded(null)
  }

  const navItems: NavItem[] = [
    {
      label: "Features",
      href: "/features",
      dropdown: [
        { label: "All Features", href: "/features", description: "Overview of all capabilities" },
        { label: "SaaS Cost Optimization", href: "/features/saas-cost-optimization", description: "AI-powered spend analysis" },
        { label: "Subscription Tracking", href: "/features/subscription-tracking", description: "Never miss a renewal" },
        { label: "Duplicate Detection", href: "/features/duplicate-payment-detection", description: "Stop paying twice" },
        { label: "Unused Licenses", href: "/features/unused-license-detection", description: "Find idle licenses" },
        { label: "Spend Management", href: "/features/saas-spend-management", description: "Complete spend visibility" },
      ],
    },
    {
      label: "Solutions",
      href: "/solutions",
      dropdown: [
        { label: "All Solutions", href: "/solutions", description: "Solutions by role" },
        { label: "For Startups", href: "/solutions/for-startups", description: "Extend your runway" },
        { label: "For Finance Teams", href: "/solutions/for-finance-teams", description: "Full spend visibility" },
        { label: "For IT Managers", href: "/solutions/for-it-managers", description: "Software asset management" },
        { label: "For CFOs", href: "/solutions/for-cfo", description: "Strategic cost intelligence" },
        { label: "For Enterprise", href: "/solutions/for-enterprise", description: "Scale with confidence" },
      ],
    },
    { label: "Pricing", href: "/#pricing" },
    {
      label: "Resources",
      href: "/blog",
      dropdown: [
        { label: "Blog", href: "/blog", description: "SaaS cost optimization insights" },
        { label: "Calculators", href: "/calculator", description: "Free SaaS cost tools" },
        { label: "Benchmarks", href: "/benchmarks", description: "Industry spend data" },
        { label: "Tool Analysis", href: "/tools", description: "50+ SaaS cost breakdowns" },
        { label: "Compare", href: "/compare", description: "See how we stack up" },
        { label: "Integrations", href: "/integrations", description: "Connect your tools" },
      ],
    },
  ]

  const logoElement = (
    <div className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="Efficyon"
        width={48}
        height={48}
        className="h-12 w-auto object-contain"
        priority
      />
      <span className="text-white font-bold text-lg tracking-tight hidden sm:inline bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
        Efficyon
      </span>
    </div>
  )

  const loginButtonElement = (
    <Link
      href="/login"
      className="px-5 py-2.5 text-sm font-medium border border-white/10 bg-white/5 backdrop-blur-sm text-gray-200 rounded-lg hover:border-white/20 hover:bg-white/10 hover:text-white transition-all duration-300 w-full sm:w-auto text-center shadow-lg shadow-black/20"
    >
      Login
    </Link>
  )

  const signupButtonElement = (
    <div className="relative group w-full sm:w-auto">
      <div
        className="absolute inset-0 -m-2 rounded-xl
                     hidden sm:block
                     bg-gradient-to-r from-cyan-500 to-blue-500
                     opacity-30 filter blur-xl pointer-events-none
                     transition-all duration-500 ease-out
                     group-hover:opacity-50 group-hover:blur-2xl group-hover:-m-3"
      ></div>
      <Link
        href="/register"
        className="relative z-10 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 w-full sm:w-auto inline-block text-center shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105"
      >
        Get Started
      </Link>
    </div>
  )

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50
                       flex flex-col items-center
                       px-4 sm:px-8 py-5 backdrop-blur-xl
                       border-b border-white/5 bg-gradient-to-b from-black/95 via-black/90 to-black/95
                       w-full
                       transition-all duration-300 ease-in-out
                       shadow-2xl shadow-black/50`}
    >
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-x-6 sm:gap-x-8">
        <Link href="/" className="flex items-center">
          {logoElement}
        </Link>

        <nav className="hidden lg:flex items-center space-x-1 text-sm">
          {navItems.map((item) =>
            item.dropdown ? (
              <NavDropdown
                key={item.label}
                item={item}
                isOpen={openDropdown === item.label}
                onToggle={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
              />
            ) : (
              <AnimatedNavLink key={item.href} href={item.href}>
                {item.label}
              </AnimatedNavLink>
            )
          )}
        </nav>

        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          {loginButtonElement}
          {signupButtonElement}
        </div>

        <button
          className="lg:hidden flex items-center justify-center w-10 h-10 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200 focus:outline-none"
          onClick={toggleMenu}
          aria-label={isOpen ? "Close Menu" : "Open Menu"}
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12M6 12h12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`lg:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden
                       ${isOpen ? "max-h-[2000px] opacity-100 pt-4" : "max-h-0 opacity-0 pt-0 pointer-events-none"}`}
      >
        <nav className="flex flex-col w-full py-4 space-y-1">
          {navItems.map((item) =>
            item.dropdown ? (
              <div key={item.label}>
                <button
                  onClick={() => setMobileExpanded(mobileExpanded === item.label ? null : item.label)}
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 font-medium"
                >
                  {item.label}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileExpanded === item.label ? "rotate-180" : ""}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${mobileExpanded === item.label ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="pl-4 py-1 space-y-1">
                    {item.dropdown.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={toggleMenu}
                        className="block px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={toggleMenu}
                className="px-4 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 font-medium"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>
        <div className="flex flex-col items-center space-y-4 mt-4 w-full sm:hidden">
          {loginButtonElement}
          {signupButtonElement}
        </div>
      </div>
    </header>
  )
}
