import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { SignJWT } from "jose"
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      onboardingCompleted: boolean
    } & DefaultSession["user"]
    backendToken: string
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    onboardingCompleted: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    onboardingCompleted: boolean
    backendToken: string
  }
}

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

async function generateBackendToken(payload: {
  sub: string
  email: string
  name: string
  role: string
}): Promise<string> {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET)
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret)
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const res = await fetch(`${apiBase}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "INVALID_CREDENTIALS")
        }

        const user = await res.json()
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          onboardingCompleted: user.onboardingCompleted,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.email = user.email as string
        token.name = user.name as string
        token.role = user.role
        token.onboardingCompleted = user.onboardingCompleted
      }

      // Generate a fresh backend token on every JWT callback
      token.backendToken = await generateBackendToken({
        sub: token.id,
        email: token.email as string,
        name: token.name as string,
        role: token.role,
      })

      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      session.user.onboardingCompleted = token.onboardingCompleted
      session.backendToken = token.backendToken
      return session
    },
  },
})
