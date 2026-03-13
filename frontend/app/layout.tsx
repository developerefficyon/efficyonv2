import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import "./globals.css"

const siteUrl = "https://efficyon.com"

export const metadata: Metadata = {
  title: {
    default: "Efficyon - AI-Powered SaaS Cost Optimization Platform",
    template: "%s | Efficyon",
  },
  description:
    "Turn SaaS sprawl into financial clarity. Compare spend with real usage to reveal unused licenses and hidden savings.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Efficyon",
    description: "Your SaaS stack is leaking money. We'll find it.",
    siteName: "Efficyon",
    images: [
      {
        url: "/opengraph.jpeg",
        width: 1200,
        height: 630,
        alt: "Efficyon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Efficyon",
    description: "Your SaaS stack is leaking money. We'll find it.",
    images: ["/opengraph.jpeg"],
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
