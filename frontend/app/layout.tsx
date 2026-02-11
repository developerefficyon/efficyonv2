import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import "./globals.css"

const siteUrl = "https://www.efficyon.com"

export const metadata: Metadata = {
  title: {
    default: "Efficyon - AI-Powered SaaS Cost Optimization",
    template: "%s | Efficyon",
  },
  description:
    "Turn SaaS sprawl into financial clarity. Efficyon compares SaaS spend with real usage to reveal unused licenses, overlapping tools, and hidden savings across your software stack.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Efficyon - AI-Powered SaaS Cost Optimization",
    description:
      "Turn SaaS sprawl into financial clarity. Efficyon compares SaaS spend with real usage to reveal unused licenses, overlapping tools, and hidden savings across your software stack.",
    siteName: "Efficyon",
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${GeistSans.variable} ${GeistMono.variable}`}>
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
