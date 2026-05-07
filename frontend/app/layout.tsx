import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { DM_Sans, Instrument_Serif } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import { CookieConsent } from "@/components/marketing/cookie-consent"
import { SITE_URL } from "@/lib/site"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
})

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
  weight: "400",
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: {
    default: "Efficyon - AI-Powered SaaS Cost Optimization Platform",
    template: "%s | Efficyon",
  },
  description:
    "Turn SaaS sprawl into financial clarity. Compare spend with real usage to reveal unused licenses and hidden savings.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "Efficyon",
    description: "Your SaaS stack is leaking money. We'll find it.",
    siteName: "Efficyon",
    images: [
      {
        url: "/og-image.png",
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
    images: ["/og-image.png"],
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
    <html lang="en" className="dark">
      <head>
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-XSFPYTCFEL" />
        <Script
          id="google-analytics"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XSFPYTCFEL');
            `,
          }}
        />
      </head>
      <body className={`font-sans antialiased ${GeistSans.variable} ${GeistMono.variable} ${dmSans.variable} ${instrumentSerif.variable}`}>
        <Providers>
          {children}
        </Providers>
        <CookieConsent />
        <Analytics />
      </body>
    </html>
  )
}
