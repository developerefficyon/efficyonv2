# Efficyon v2 - Codebase Analysis

## What is Efficyon?

**Efficyon** is a B2B SaaS platform designed to help businesses **detect cost leaks and optimize their software spending**. It connects to accounting systems (like Fortnox) to analyze financial data and uses AI to identify savings opportunities.

### Core Value Proposition

> "Stop paying for software you don't use. Efficyon automatically detects duplicate payments, unused subscriptions, and hidden cost leaks in your business."

---

## Platform Overview

### Target Users
- **SMBs and Enterprises** with multiple SaaS subscriptions
- **Finance Teams** looking to optimize software spend
- **Operations Managers** wanting visibility into tool usage

### Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| Cost Leak Detection | Automatically identifies duplicate payments, unusual charges, and recurring subscriptions | Working |
| Fortnox Integration | OAuth connection to Swedish accounting system for real-time data | Working |
| AI-Powered Insights | OpenAI-generated recommendations and savings estimates | Working |
| Stripe Billing | Subscription management with multiple pricing tiers | Working |
| Admin Dashboard | User management, customer oversight, analytics | Working |
| Onboarding Flow | 4-step guided setup with payment integration | Working |

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                    Next.js 16 + React 19                        │
│                    Tailwind CSS + Radix UI                      │
│                         Port: 3000                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│                      Express.js 5                               │
│                         Port: 4000                              │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Supabase │   │  Stripe  │   │  OpenAI  │
        │ (Auth+DB)│   │(Payments)│   │   (AI)   │
        └──────────┘   └──────────┘   └──────────┘
              │
              ▼
        ┌──────────┐
        │ Fortnox  │
        │(Accounting)│
        └──────────┘
```

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| React 19 | UI library |
| Tailwind CSS | Styling |
| Radix UI | Accessible component primitives |
| Stripe.js | Payment form integration |
| Recharts | Data visualization |
| Framer Motion | Animations |

### Backend
| Technology | Purpose |
|------------|---------|
| Express.js 5 | API server |
| Supabase JS | Database client & auth |
| Stripe SDK | Payment processing |
| Axios | HTTP client for external APIs |
| OpenAI API | AI analysis |

### Database (Supabase/PostgreSQL)
| Table | Purpose |
|-------|---------|
| `profiles` | User accounts with roles |
| `companies` | Customer organizations |
| `subscriptions` | Stripe subscription data |
| `company_integrations` | OAuth tokens for Fortnox |
| `company_plans` | Custom plan configurations |
| `company_alerts` | Notification preferences |

---

## User Roles

| Role | Access | Description |
|------|--------|-------------|
| `admin` | Full | Efficyon employees, system administrators |
| `customer` | Limited | Paying subscribers using the platform |
| `user` | Limited | Legacy role (same as customer) |

---

## Pricing Tiers

| Plan | Price | Tokens | Integrations | Target |
|------|-------|--------|--------------|--------|
| Free Trial | $0/7 days | Limited | 1 | New users |
| Startup | $29.99/mo | 10 | 5 | 1-10 employees |
| Growth | $99.99/mo | 50 | 15 | 11-50 employees |
| Enterprise | $299.99/mo | 200 | Unlimited | 50+ employees |

---

## Core Workflows

### 1. User Registration & Onboarding

```
Register → Verify Email → Login → Onboarding (4 steps) → Dashboard
                                       │
                                       ├── Step 1: Account Info
                                       ├── Step 2: Company Details
                                       ├── Step 3: Goals Selection
                                       └── Step 4: Plan & Payment
```

### 2. Cost Leak Analysis Flow

```
Connect Fortnox → Sync Data → Analyze Invoices → AI Enhancement → View Report
       │              │              │                  │              │
   OAuth 2.0    Fetch invoices  6 algorithms      OpenAI API    Dashboard
                & expenses      detect issues     recommendations
```

### 3. Analysis Algorithms

| Algorithm | What It Detects |
|-----------|-----------------|
| Duplicate Payments | Same supplier + amount within 30 days |
| Unusual Amounts | Statistical outliers (>2 std dev from mean) |
| Recurring Subscriptions | 3+ invoices with similar amounts at regular intervals |
| Overdue Invoices | Unpaid invoices past due date |
| Price Increases | Supplier invoice trends showing cost increases |
| Unused Licenses | (Planned) Software licenses without activity |

---

## API Endpoints Summary

### Authentication
- `POST /api/profiles/create-public` - Register new user
- `GET /api/profile` - Get current user profile

### Company Management
- `GET /api/company` - Get company info
- `POST /api/company` - Create/update company

### Integrations
- `GET /api/integrations/fortnox/oauth/start` - Start Fortnox OAuth
- `GET /api/integrations/fortnox/callback` - OAuth callback
- `GET /api/integrations/fortnox/invoices` - Fetch invoices
- `GET /api/integrations/fortnox/cost-leaks` - Run analysis

### Payments
- `POST /api/stripe/create-payment-intent` - Create checkout session
- `POST /api/stripe/webhook` - Handle Stripe events
- `GET /api/stripe/subscription` - Get subscription status

### AI
- `POST /api/ai/analyze` - Full AI analysis
- `POST /api/ai/chat` - Chat about findings
- `POST /api/ai/recommendations` - Get recommendations

### Admin
- `GET /api/admin/customers` - List all customers
- `GET /api/admin/employees` - List admin users
- `POST /api/admin/profiles/approve` - Approve user

---

## Project Structure

```
efficyonv2/
├── frontend/                    # Next.js application
│   ├── app/                     # App router pages
│   │   ├── page.tsx            # Landing page
│   │   ├── login/              # Authentication
│   │   ├── register/
│   │   ├── onboarding/         # 4-step onboarding
│   │   └── dashboard/          # Protected area
│   │       ├── page.tsx        # Main dashboard
│   │       ├── admin/          # Admin section
│   │       ├── integrations/   # Fortnox connection
│   │       ├── reports/        # Cost leak reports
│   │       └── settings/       # User settings
│   ├── components/             # Reusable UI components
│   │   └── ui/                 # Radix-based components
│   └── lib/                    # Utilities & clients
│       ├── auth-context.tsx    # Auth state management
│       └── supabaseClient.ts   # Supabase client
│
├── backend/                     # Express.js API
│   ├── src/
│   │   ├── server.js           # Entry point
│   │   ├── app.js              # Express setup
│   │   ├── routes/             # API routes
│   │   ├── controllers/        # Business logic
│   │   │   ├── apiController.js      # Main API
│   │   │   ├── stripeController.js   # Payments
│   │   │   └── aiController.js       # OpenAI
│   │   ├── services/
│   │   │   ├── costLeakAnalysis.js   # Detection algorithms
│   │   │   └── openaiService.js      # AI integration
│   │   └── middleware/
│   │       └── auth.js         # JWT validation
│   ├── sql/                    # Database migrations
│   └── scripts/                # Seeding & utilities
│
└── Documentation/              # Setup guides
```

---

## Known Issues & Technical Debt

### Critical
| Issue | Location | Impact |
|-------|----------|--------|
| Missing `company_plans` table | Supabase DB | Onboarding fails |
| Role filter mismatch | `apiController.js:53` | Customers not showing in admin |

### Architecture Concerns
| Issue | Details |
|-------|---------|
| Large controller file | `apiController.js` is 4,000+ lines - needs splitting |
| No TypeScript on backend | Frontend uses TS, backend is JS |
| No tests | No test coverage found |
| CORS too permissive | No origin whitelist in production |

---

## Environment Variables

### Frontend (.env)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

### Backend (.env)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=4000
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
OPENAI_API_KEY=
FORTNOX_REDIRECT_URI=
FORTNOX_OAUTH_SCOPE=
```

---

## Getting Started

```bash
# Backend
cd backend
npm install
npm run dev  # Runs on port 4000

# Frontend
cd frontend
npm install
npm run dev  # Runs on port 3000
```

---

## Business Model

```
┌─────────────────────────────────────────────────────────────────┐
│                      REVENUE STREAMS                            │
├─────────────────────────────────────────────────────────────────┤
│  1. Monthly Subscriptions ($29.99 - $299.99/mo)                │
│  2. Token-based usage (analysis credits)                        │
│  3. Enterprise custom pricing                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      VALUE DELIVERED                            │
├─────────────────────────────────────────────────────────────────┤
│  • Automated cost leak detection                                │
│  • AI-powered savings recommendations                           │
│  • Real-time accounting integration                             │
│  • Centralized SaaS spend visibility                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

Efficyon is a **cost optimization SaaS platform** that:

1. **Connects** to your accounting system (Fortnox)
2. **Analyzes** your invoices and expenses automatically
3. **Detects** duplicate payments, unused subscriptions, and cost anomalies
4. **Recommends** actions using AI to save money
5. **Tracks** your realized savings over time

The platform is built on a modern stack (Next.js + Express + Supabase) with integrations for payments (Stripe), accounting (Fortnox), and AI analysis (OpenAI).

---

*Last updated: December 2024*
