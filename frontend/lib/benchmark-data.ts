export interface CompanySizeBenchmark {
  size: string
  employees: string
  monthlySpend: string
  toolCount: string
  perEmployeeMonthly: string
  wastePercentage: string
  optimizationTarget: string
}

export interface IndustryBenchmark {
  industry: string
  avgSpendPerEmployee: string
  commonCategories: string[]
  typicalWaste: string
  topTools: string[]
  notes: string
}

export interface DepartmentBenchmark {
  department: string
  avgCostPerEmployee: string
  commonTools: string[]
  typicalWaste: string
  optimizationPotential: string
}

export interface BenchmarkPageData {
  slug: string
  title: string
  description: string
  lastUpdated: string
}

export const benchmarkPages: BenchmarkPageData[] = [
  {
    slug: "saas-spend-by-company-size",
    title: "Average SaaS Spend by Company Size: 2026 Benchmarks",
    description:
      "Comprehensive benchmarks for SaaS spending by company size. See how your software costs compare to industry averages for startups through enterprises.",
    lastUpdated: "2026-03-01",
  },
  {
    slug: "saas-spend-by-industry",
    title: "SaaS Spend Benchmarks by Industry: 2026 Data",
    description:
      "Industry-specific SaaS spending benchmarks covering technology, finance, healthcare, marketing, e-commerce, education, and manufacturing sectors.",
    lastUpdated: "2026-03-01",
  },
  {
    slug: "subscription-cost-per-employee",
    title: "Software Cost Per Employee: What's Normal in 2026?",
    description:
      "Benchmark data on software subscription costs per employee by department. Learn what companies typically spend and how to optimize your per-employee software costs.",
    lastUpdated: "2026-03-01",
  },
]

export const companySizeBenchmarks: CompanySizeBenchmark[] = [
  {
    size: "Micro",
    employees: "1-10",
    monthlySpend: "$1,000-$3,000",
    toolCount: "15-25",
    perEmployeeMonthly: "$150-$300",
    wastePercentage: "20-30%",
    optimizationTarget: "Consolidate overlapping tools; use free tiers where possible",
  },
  {
    size: "Small",
    employees: "11-50",
    monthlySpend: "$3,000-$15,000",
    toolCount: "25-60",
    perEmployeeMonthly: "$120-$250",
    wastePercentage: "25-35%",
    optimizationTarget: "Right-size licenses; eliminate duplicate subscriptions across teams",
  },
  {
    size: "Mid-Market",
    employees: "51-200",
    monthlySpend: "$15,000-$60,000",
    toolCount: "60-120",
    perEmployeeMonthly: "$100-$200",
    wastePercentage: "25-40%",
    optimizationTarget: "Implement license management; negotiate enterprise agreements",
  },
  {
    size: "Upper Mid-Market",
    employees: "201-500",
    monthlySpend: "$60,000-$200,000",
    toolCount: "100-200",
    perEmployeeMonthly: "$120-$250",
    wastePercentage: "30-40%",
    optimizationTarget: "Centralize procurement; deploy SaaS management platform",
  },
  {
    size: "Enterprise",
    employees: "500+",
    monthlySpend: "$200,000+",
    toolCount: "200+",
    perEmployeeMonthly: "$150-$350",
    wastePercentage: "30-45%",
    optimizationTarget: "Enterprise license optimization; vendor consolidation strategy",
  },
]

export const industryBenchmarks: IndustryBenchmark[] = [
  {
    industry: "Technology",
    avgSpendPerEmployee: "$200-$350/month",
    commonCategories: ["Development", "Cloud Infrastructure", "Communication", "Project Management"],
    typicalWaste: "30-40%",
    topTools: ["GitHub", "AWS/GCP/Azure", "Slack", "Jira", "Datadog", "Figma"],
    notes:
      "Tech companies tend to have the highest per-employee SaaS spend due to expensive developer tooling and cloud infrastructure costs. Over-provisioned cloud resources are the single largest source of waste.",
  },
  {
    industry: "Finance & Banking",
    avgSpendPerEmployee: "$180-$300/month",
    commonCategories: ["Security", "CRM", "Productivity", "Analytics"],
    typicalWaste: "25-35%",
    topTools: ["Salesforce", "Microsoft 365", "Bloomberg Terminal", "Okta", "Snowflake"],
    notes:
      "Financial services firms invest heavily in security and compliance tools. Redundant legacy systems running alongside modern SaaS platforms are a common source of waste.",
  },
  {
    industry: "Healthcare",
    avgSpendPerEmployee: "$120-$220/month",
    commonCategories: ["Security", "Productivity", "Communication", "Customer Support"],
    typicalWaste: "25-35%",
    topTools: ["Microsoft 365", "Zoom", "Salesforce Health Cloud", "Okta", "Zendesk"],
    notes:
      "Healthcare organizations prioritize HIPAA-compliant tools, often paying premium prices. Compliance requirements limit the ability to switch to cheaper alternatives.",
  },
  {
    industry: "Marketing & Agencies",
    avgSpendPerEmployee: "$200-$400/month",
    commonCategories: ["Design", "Marketing", "Project Management", "Communication"],
    typicalWaste: "30-45%",
    topTools: ["Adobe Creative Cloud", "HubSpot", "Figma", "Semrush", "Asana", "Canva"],
    notes:
      "Marketing agencies often have the highest waste percentage due to tool proliferation across client accounts and creative teams experimenting with new tools frequently.",
  },
  {
    industry: "E-commerce",
    avgSpendPerEmployee: "$150-$280/month",
    commonCategories: ["Finance", "Marketing", "Customer Support", "Analytics"],
    typicalWaste: "25-35%",
    topTools: ["Shopify", "Stripe", "Zendesk", "Mailchimp", "Google Analytics", "Klaviyo"],
    notes:
      "E-commerce companies accumulate SaaS costs across the entire customer journey from acquisition to fulfillment. Overlapping marketing and analytics tools are common waste sources.",
  },
  {
    industry: "Education",
    avgSpendPerEmployee: "$80-$150/month",
    commonCategories: ["Productivity", "Communication", "Project Management"],
    typicalWaste: "20-30%",
    topTools: ["Google Workspace", "Zoom", "Slack", "Canvas LMS", "Notion"],
    notes:
      "Educational institutions typically have lower per-employee spend but often struggle with unused licenses during off-peak academic periods.",
  },
  {
    industry: "Manufacturing",
    avgSpendPerEmployee: "$80-$160/month",
    commonCategories: ["Productivity", "CRM", "Finance", "Project Management"],
    typicalWaste: "20-30%",
    topTools: ["Microsoft 365", "Salesforce", "SAP", "AutoCAD", "Monday.com"],
    notes:
      "Manufacturing companies have lower SaaS density but often maintain expensive legacy ERP and CAD software licenses that are underutilized across frontline workers.",
  },
]

export const departmentBenchmarks: DepartmentBenchmark[] = [
  {
    department: "Engineering",
    avgCostPerEmployee: "$250-$450/month",
    commonTools: ["GitHub/GitLab", "Jira/Linear", "AWS/GCP/Azure", "Datadog", "Figma", "Slack"],
    typicalWaste: "30-40%",
    optimizationPotential:
      "Cloud infrastructure right-sizing, unused IDE licenses, over-provisioned monitoring",
  },
  {
    department: "Sales",
    avgCostPerEmployee: "$150-$300/month",
    commonTools: ["Salesforce/HubSpot", "LinkedIn Sales Navigator", "Outreach/Salesloft", "Gong", "Calendly"],
    typicalWaste: "25-35%",
    optimizationPotential:
      "CRM license tier optimization, unused prospecting tools, overlapping engagement platforms",
  },
  {
    department: "Marketing",
    avgCostPerEmployee: "$200-$400/month",
    commonTools: ["HubSpot", "Semrush/Ahrefs", "Canva/Adobe CC", "Mailchimp", "Google Ads", "Social media tools"],
    typicalWaste: "30-45%",
    optimizationPotential:
      "Duplicate analytics and SEO tools, unused creative licenses, overlapping email platforms",
  },
  {
    department: "HR & People",
    avgCostPerEmployee: "$80-$150/month",
    commonTools: ["BambooHR/Workday", "Greenhouse/Lever", "Lattice/15Five", "Slack", "Zoom"],
    typicalWaste: "20-30%",
    optimizationPotential:
      "Seasonal recruiting tool subscriptions, underused performance management platforms",
  },
  {
    department: "Finance & Accounting",
    avgCostPerEmployee: "$100-$200/month",
    commonTools: ["QuickBooks/Xero", "Stripe", "Expensify/Ramp", "Microsoft 365", "DocuSign"],
    typicalWaste: "20-25%",
    optimizationPotential:
      "Legacy accounting software, redundant expense management tools, over-provisioned ERP seats",
  },
  {
    department: "Customer Support",
    avgCostPerEmployee: "$120-$250/month",
    commonTools: ["Zendesk/Intercom", "Freshdesk", "Slack", "Zoom", "Knowledge base tools"],
    typicalWaste: "25-35%",
    optimizationPotential:
      "Support platform tier optimization, unused agent seats, overlapping chat and ticketing tools",
  },
]

export const yearOverYearGrowth = [
  { year: "2022", avgPerEmployee: "$120/month", growth: "—" },
  { year: "2023", avgPerEmployee: "$135/month", growth: "+12.5%" },
  { year: "2024", avgPerEmployee: "$150/month", growth: "+11.1%" },
  { year: "2025", avgPerEmployee: "$165/month", growth: "+10.0%" },
  { year: "2026 (projected)", avgPerEmployee: "$178/month", growth: "+7.9%" },
]
