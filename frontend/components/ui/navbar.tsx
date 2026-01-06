"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"

const AnimatedNavLink = ({ href, children, isActive }: { href: string; children: React.ReactNode; isActive: boolean }) => {
  return (
    <a
      href={href}
      className={`group relative inline-block px-3 py-2 text-sm font-medium transition-all duration-300 ${isActive ? 'text-white' : 'text-gray-300 hover:text-white'}`}
    >
      <span className="relative z-10">{children}</span>
      <span className={`absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></span>
      <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 transition-transform duration-300 origin-left ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
    </a>
  )
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("")

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    const sectionIds = ["calculator", "services", "pricing", "faq"]
    const sectionRefs = new Map<string, boolean>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          sectionRefs.set(entry.target.id, entry.isIntersecting)
        })

        // Find the first section that is currently intersecting
        const activeId = sectionIds.find((id) => sectionRefs.get(id))
        setActiveSection(activeId ? `#${activeId}` : "")
      },
      {
        rootMargin: "-40% 0px -50% 0px",
        threshold: 0
      }
    )

    sectionIds.forEach((id) => {
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      sectionIds.forEach((id) => {
        const element = document.getElementById(id)
        if (element) {
          observer.unobserve(element)
        }
      })
    }
  }, [])

  const logoElement = (
    <div className="flex items-center gap-3">
      <div className="relative w-8 h-8 flex items-center justify-center">
        <div className="absolute inset-0 border border-white/20 rounded-lg opacity-80 backdrop-blur-sm"></div>
        <div className="absolute w-2.5 h-2.5 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full top-1 left-1 shadow-lg shadow-cyan-500/50"></div>
        <div className="absolute w-1.5 h-1.5 bg-white/60 rounded-full top-1 right-1"></div>
        <div className="absolute w-1.5 h-1.5 bg-white/60 rounded-full bottom-1 left-1"></div>
        <div className="absolute w-2.5 h-0.5 bg-white/60 bottom-1.5 right-1 rounded"></div>
      </div>
      <span className="text-white font-bold text-lg tracking-tight hidden sm:inline bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
        Efficyon
      </span>
    </div>
  )

  const navLinksData = [
    { label: "Calculator", href: "#calculator" },
    { label: "Features", href: "#services" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ]

  const loginButtonElement = (
    <a
      href="/login"
      className="px-5 py-2.5 text-sm font-medium border border-white/10 bg-white/5 backdrop-blur-sm text-gray-200 rounded-lg hover:border-white/20 hover:bg-white/10 hover:text-white transition-all duration-300 w-full sm:w-auto text-center shadow-lg shadow-black/20"
    >
      Login
    </a>
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
      <a
        href="/register"
        className="relative z-10 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 w-full sm:w-auto inline-block text-center shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105"
      >
        Get Started
      </a>
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

        <nav className="hidden sm:flex items-center space-x-4 sm:space-x-6 text-sm">
          {navLinksData.map((link) => (
            <AnimatedNavLink key={link.href} href={link.href} isActive={activeSection === link.href}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          {loginButtonElement}
          {signupButtonElement}
        </div>

        <button
          className="sm:hidden flex items-center justify-center w-10 h-10 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200 focus:outline-none"
          onClick={toggleMenu}
          aria-label={isOpen ? "Close Menu" : "Open Menu"}
        >
          {isOpen ? (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12M6 12h12"
              ></path>
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          )}
        </button>
      </div>

      <div
        className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden
                       ${isOpen ? "max-h-[1000px] opacity-100 pt-4" : "max-h-0 opacity-0 pt-0 pointer-events-none"}`}
      >
        <nav className="flex flex-col items-center space-y-2 text-base w-full py-4">
          {navLinksData.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg transition-all duration-200 w-full text-center font-medium ${activeSection === link.href ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-col items-center space-y-4 mt-4 w-full">
          {loginButtonElement}
          {signupButtonElement}
        </div>
      </div>
    </header>
  )
}
