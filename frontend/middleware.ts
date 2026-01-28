import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const publicPaths = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/verify",
  "/api/auth",
]

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Allow static assets and root
  if (
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Protect dashboard and onboarding routes
  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) &&
    !req.auth
  ) {
    const loginUrl = new URL("/login", req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
