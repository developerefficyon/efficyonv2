/**
 * Mock Data Generator for Testing System
 * Generates realistic synthetic datasets per scenario profile with configurable anomaly injection.
 */

// ─── Scenario Profiles ───────────────────────────────────────────────

const SCENARIO_PROFILES = {
  startup_60: {
    employee_count: 60,
    supplier_count: 15,
    invoice_months: 12,
    invoices_per_supplier_range: [1, 3],
    customer_count: 25,
    customer_invoices_per_month_range: [5, 15],
    m365_license_mix: [
      { skuPartNumber: "SPE_E3", skuId: "05e9a617-0261-4cee-bb44-138d3ef5d965", pct: 0.50 },
      { skuPartNumber: "O365_BUSINESS_ESSENTIALS", skuId: "3b555118-da6a-4418-894f-7df1e2096870", pct: 0.30 },
      { skuPartNumber: "EXCHANGESTANDARD", skuId: "4b9405b0-7788-4568-add1-99614e613b69", pct: 0.10 },
      { skuPartNumber: "POWER_BI_PRO", skuId: "f8a1db68-be16-40ed-86d5-cb42ce701e65", pct: 0.10 },
    ],
    hubspot_tier: "professional",
    hubspot_user_count: 15,
    hubspot_admin_count: 2,
  },
  agency_25: {
    employee_count: 25,
    supplier_count: 10,
    invoice_months: 12,
    invoices_per_supplier_range: [1, 2],
    customer_count: 40,
    customer_invoices_per_month_range: [8, 20],
    m365_license_mix: [
      { skuPartNumber: "O365_BUSINESS_ESSENTIALS", skuId: "3b555118-da6a-4418-894f-7df1e2096870", pct: 0.50 },
      { skuPartNumber: "SMB_BUSINESS_PREMIUM", skuId: "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46", pct: 0.40 },
      { skuPartNumber: "VISIOCLIENT", skuId: "c5928f49-12ba-48f7-ada3-0d743a3601d5", pct: 0.10 },
    ],
    hubspot_tier: "starter",
    hubspot_user_count: 10,
    hubspot_admin_count: 1,
  },
  scaleup_200: {
    employee_count: 200,
    supplier_count: 50,
    invoice_months: 12,
    invoices_per_supplier_range: [1, 4],
    customer_count: 80,
    customer_invoices_per_month_range: [15, 40],
    m365_license_mix: [
      { skuPartNumber: "SPE_E5", skuId: "06ebc4ee-1bb5-47dd-8120-11324bc54e06", pct: 0.30 },
      { skuPartNumber: "SPE_E3", skuId: "05e9a617-0261-4cee-bb44-138d3ef5d965", pct: 0.40 },
      { skuPartNumber: "ENTERPRISEPACK", skuId: "6fd2c87f-b296-42f0-b197-1e91e994b900", pct: 0.10 },
      { skuPartNumber: "PROJECTPROFESSIONAL", skuId: "09015f9f-377f-4538-bbb5-f75ceb09358a", pct: 0.05 },
      { skuPartNumber: "POWER_BI_PRO", skuId: "f8a1db68-be16-40ed-86d5-cb42ce701e65", pct: 0.10 },
      { skuPartNumber: "VISIOCLIENT", skuId: "c5928f49-12ba-48f7-ada3-0d743a3601d5", pct: 0.05 },
    ],
    hubspot_tier: "enterprise",
    hubspot_user_count: 40,
    hubspot_admin_count: 5,
  },
}

// ─── Name & Reference Data ───────────────────────────────────────────

const SWEDISH_SUPPLIERS = [
  { name: "Telia Sverige AB", number: "1001", category: "telecom" },
  { name: "Dustin AB", number: "1002", category: "it" },
  { name: "Addtech AB", number: "1003", category: "it" },
  { name: "Visma Software AB", number: "1004", category: "saas" },
  { name: "Fortnox AB", number: "1005", category: "saas" },
  { name: "Securitas Sverige AB", number: "1006", category: "facility" },
  { name: "Castellum AB", number: "1007", category: "facility" },
  { name: "Wihlborgs Fastigheter AB", number: "1008", category: "facility" },
  { name: "Scandic Hotels AB", number: "1009", category: "travel" },
  { name: "PostNord Sverige AB", number: "1010", category: "logistics" },
  { name: "Atea Sverige AB", number: "1011", category: "it" },
  { name: "Adecco Sweden AB", number: "1012", category: "consulting" },
  { name: "Telenor Sverige AB", number: "1013", category: "telecom" },
  { name: "Ricoh Sverige AB", number: "1014", category: "it" },
  { name: "Coor Service Management AB", number: "1015", category: "facility" },
  { name: "KPMG AB", number: "1016", category: "consulting" },
  { name: "Deloitte AB", number: "1017", category: "consulting" },
  { name: "Grant Thornton Sweden AB", number: "1018", category: "consulting" },
  { name: "Sweco AB", number: "1019", category: "consulting" },
  { name: "WSP Sverige AB", number: "1020", category: "consulting" },
  { name: "Sigma IT Consulting AB", number: "1021", category: "it" },
  { name: "Knowit AB", number: "1022", category: "it" },
  { name: "Enento Group AB", number: "1023", category: "saas" },
  { name: "Lime Technologies AB", number: "1024", category: "saas" },
  { name: "Teamtailor AB", number: "1025", category: "saas" },
  { name: "Planview AB", number: "1026", category: "saas" },
  { name: "Zendesk Nordic AB", number: "1027", category: "saas" },
  { name: "HubSpot Sweden AB", number: "1028", category: "saas" },
  { name: "Salesforce Sweden AB", number: "1029", category: "saas" },
  { name: "AWS Sweden AB", number: "1030", category: "it" },
  { name: "Microsoft Sverige AB", number: "1031", category: "it" },
  { name: "Google Sweden AB", number: "1032", category: "it" },
  { name: "Kindred Group AB", number: "1033", category: "consulting" },
  { name: "Vattenfall AB", number: "1034", category: "utility" },
  { name: "Ellevio AB", number: "1035", category: "utility" },
  { name: "Stockholms Stad Facility", number: "1036", category: "facility" },
  { name: "ISS Facility Services AB", number: "1037", category: "facility" },
  { name: "Sodexo AB", number: "1038", category: "facility" },
  { name: "Loomis Sverige AB", number: "1039", category: "logistics" },
  { name: "DHL Express Sweden AB", number: "1040", category: "logistics" },
  { name: "Schenker AB", number: "1041", category: "logistics" },
  { name: "Ahlsell Sverige AB", number: "1042", category: "supplies" },
  { name: "Staples Sweden AB", number: "1043", category: "supplies" },
  { name: "Lyreco Sweden AB", number: "1044", category: "supplies" },
  { name: "Capgemini Sverige AB", number: "1045", category: "consulting" },
  { name: "Accenture AB", number: "1046", category: "consulting" },
  { name: "CGI Sverige AB", number: "1047", category: "it" },
  { name: "TietoEVRY Sweden AB", number: "1048", category: "it" },
  { name: "Softhouse Consulting AB", number: "1049", category: "consulting" },
  { name: "Nordic Medtest AB", number: "1050", category: "consulting" },
]

const SWEDISH_CUSTOMERS = [
  "Volvo Group AB", "H&M Hennes & Mauritz AB", "Ericsson AB", "Sandvik AB",
  "Atlas Copco AB", "Electrolux AB", "SKF AB", "Husqvarna AB", "Alfa Laval AB",
  "Getinge AB", "Epiroc AB", "Nibe Industrier AB", "Hexagon AB", "Essity AB",
  "ICA Gruppen AB", "Axfood AB", "Clas Ohlson AB", "Beijer Ref AB",
  "Indutrade AB", "Lagercrantz Group AB", "Haldex AB", "Trelleborg AB",
  "Boliden AB", "SSAB AB", "Holmen AB", "BillerudKorsnas AB",
  "Securitas AB", "Loomis AB", "Saab AB", "Thule Group AB",
  "Dometic Group AB", "Nederman Holding AB", "Munters Group AB",
  "Lindab International AB", "Sweco AB", "ByggPartner Gruppen AB",
  "NCC AB", "Peab AB", "Skanska AB", "JM AB",
  "Fastighets AB Balder", "Sagax AB", "Pandox AB", "Wallenstam AB",
  "Collector Bank AB", "Nordax Group AB", "TF Bank AB", "Klarna AB",
  "Spotify AB", "King Digital Entertainment AB", "Embracer Group AB",
  "Tobii AB", "Mycronic AB", "Elekta AB", "Biotage AB",
  "Orexo AB", "Swedish Orphan Biovitrum AB", "Vitrolife AB",
  "BioGaia AB", "Nolato AB", "Hexpol AB", "Ratos AB",
  "Kinnevik AB", "Investor AB", "Lundbergforetagen AB",
  "Latour AB", "Industrivarden AB", "Melker Schorling AB",
  "Creades AB", "Svolder AB", "Bure Equity AB",
  "Tele2 AB", "Millicom International", "Com Hem AB",
  "NetEnt AB", "Evolution Gaming AB", "Betsson AB",
  "Unibet Group AB", "Cherry AB", "Catena Media AB",
  "Storytel AB", "Readly International AB", "Vimla AB",
]

const FIRST_NAMES = [
  "Erik", "Anna", "Lars", "Maria", "Johan", "Eva", "Karl", "Karin",
  "Anders", "Sara", "Magnus", "Lisa", "Per", "Emma", "Olof", "Sofia",
  "Nils", "Ingrid", "Gustaf", "Hanna", "Fredrik", "Linnea", "Henrik", "Astrid",
  "Oscar", "Ebba", "Viktor", "Ella", "Alexander", "Alice", "William", "Maja",
  "Lucas", "Wilma", "Oliver", "Saga", "Hugo", "Freja", "Liam", "Selma",
]

const LAST_NAMES = [
  "Johansson", "Andersson", "Karlsson", "Nilsson", "Eriksson", "Larsson",
  "Olsson", "Persson", "Svensson", "Gustafsson", "Pettersson", "Jonsson",
  "Lindberg", "Lindqvist", "Magnusson", "Lindgren", "Axelsson", "Bergstrom",
  "Lundqvist", "Mattsson", "Berglund", "Fredriksson", "Sandberg", "Henriksson",
]

const DEPARTMENTS = [
  "Engineering", "Sales", "Marketing", "Finance", "HR",
  "Operations", "Product", "Customer Success", "Legal", "IT",
]

const JOB_TITLES = [
  "Software Engineer", "Account Manager", "Marketing Specialist",
  "Financial Analyst", "HR Coordinator", "Operations Manager",
  "Product Manager", "Customer Success Manager", "Legal Counsel",
  "IT Administrator", "Sales Director", "CEO", "CTO", "CFO",
  "Senior Developer", "UX Designer", "Data Analyst", "Project Manager",
]

const ACCOUNT_CODES = ["5010", "5020", "5410", "5460", "6110", "6210", "6310", "6570", "6991", "7010"]

// Amount ranges in SEK per supplier category
const AMOUNT_RANGES = {
  telecom: [3000, 15000],
  it: [5000, 50000],
  saas: [2000, 20000],
  facility: [15000, 120000],
  travel: [5000, 40000],
  logistics: [3000, 25000],
  consulting: [20000, 150000],
  utility: [5000, 30000],
  supplies: [2000, 15000],
}

// ─── Utility Functions ───────────────────────────────────────────────

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min, max, decimals = 2) {
  return parseFloat((min + Math.random() * (max - min)).toFixed(decimals))
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(n, arr.length))
}

function generateId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function dateMonthsAgo(months) {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d
}

function formatDate(date) {
  return date.toISOString().split("T")[0]
}

function formatDateTime(date) {
  return date.toISOString()
}

function randomDateInMonth(year, month) {
  const day = randInt(1, 28)
  return new Date(year, month - 1, day)
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function daysAgo(days) {
  return addDays(new Date(), -days)
}

function randomName() {
  return `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`
}

// ─── Fortnox Data Generator ─────────────────────────────────────────

function generateFortnoxData(config, anomalyConfig = {}) {
  const suppliers = pickN(SWEDISH_SUPPLIERS, config.supplier_count)
  const customers = pickN(SWEDISH_CUSTOMERS, config.customer_count)

  // Assign each supplier a base monthly amount from their category range
  const supplierAmounts = suppliers.map((s) => {
    const range = AMOUNT_RANGES[s.category] || [5000, 50000]
    return {
      ...s,
      baseAmount: randFloat(range[0], range[1], 0),
    }
  })

  // ── Generate supplier invoices ──
  const supplierInvoices = []
  let docNum = 10001

  const now = new Date()
  for (let m = config.invoice_months; m >= 1; m--) {
    const monthDate = dateMonthsAgo(m)
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth() + 1

    for (const supplier of supplierAmounts) {
      const count = randInt(config.invoices_per_supplier_range[0], config.invoices_per_supplier_range[1])
      for (let i = 0; i < count; i++) {
        const invoiceDate = randomDateInMonth(year, month)
        const dueDate = addDays(invoiceDate, 30)
        // Vary amount ±5% from base
        const total = Math.round(supplier.baseAmount * (0.95 + Math.random() * 0.10))
        const isPaid = dueDate < now
        const rowCount = randInt(1, 3)
        const rows = generateInvoiceRows(total, rowCount)

        supplierInvoices.push({
          SupplierNumber: supplier.number,
          SupplierName: supplier.name,
          InvoiceDate: formatDate(invoiceDate),
          DueDate: formatDate(dueDate),
          Total: total,
          TotalToPay: total,
          Balance: isPaid ? 0 : total,
          DocumentNumber: String(docNum++),
          Booked: isPaid,
          FinalPayDate: isPaid ? formatDate(addDays(dueDate, randInt(0, 5))) : null,
          SupplierInvoiceRows: rows,
        })
      }
    }
  }

  // ── Inject Fortnox anomalies ──

  // Duplicate invoices: pick random invoices, create near-duplicate
  if (anomalyConfig.duplicates !== false) {
    const dupCount = Math.max(3, Math.floor(supplierInvoices.length * 0.02))
    const candidates = pickN(supplierInvoices, dupCount)
    for (const original of candidates) {
      const dupDate = addDays(new Date(original.InvoiceDate), randInt(1, 15))
      supplierInvoices.push({
        ...original,
        DocumentNumber: String(docNum++),
        InvoiceDate: formatDate(dupDate),
        DueDate: formatDate(addDays(dupDate, 30)),
        // Exact same Total — analysis detects same supplier + same rounded amount within 30 days
      })
    }
  }

  // Unusual amounts: spike some invoices to 3x-5x
  if (anomalyConfig.unusualAmounts !== false) {
    const spikeCount = Math.max(2, Math.floor(supplierInvoices.length * 0.015))
    const indices = pickN(
      Array.from({ length: supplierInvoices.length }, (_, i) => i),
      spikeCount
    )
    for (const idx of indices) {
      const multiplier = randFloat(3, 5, 1)
      supplierInvoices[idx].Total = Math.round(supplierInvoices[idx].Total * multiplier)
      supplierInvoices[idx].TotalToPay = supplierInvoices[idx].Total
      supplierInvoices[idx].Balance = supplierInvoices[idx].Booked ? 0 : supplierInvoices[idx].Total
    }
  }

  // Overdue invoices: set balance > 0 with past due date
  if (anomalyConfig.overdueInvoices !== false) {
    const overdueCount = Math.max(4, Math.floor(supplierInvoices.length * 0.03))
    const recentInvoices = supplierInvoices.filter(
      (inv) => new Date(inv.DueDate) < now && inv.Balance === 0
    )
    const targets = pickN(recentInvoices, overdueCount)
    for (const inv of targets) {
      inv.Balance = inv.Total
      inv.Booked = false
      inv.FinalPayDate = null
    }
  }

  // Price drift: gradually increase totals for 2-3 suppliers
  if (anomalyConfig.priceDrift !== false) {
    const driftSupplierCount = Math.max(2, Math.floor(config.supplier_count * 0.15))
    const driftSuppliers = pickN(supplierAmounts, driftSupplierCount)
    for (const supplier of driftSuppliers) {
      const invs = supplierInvoices
        .filter((inv) => inv.SupplierNumber === supplier.number)
        .sort((a, b) => new Date(a.InvoiceDate) - new Date(b.InvoiceDate))

      if (invs.length < 3) continue
      const totalIncrease = randFloat(0.25, 0.50, 2) // 25-50% increase
      for (let i = 0; i < invs.length; i++) {
        const progress = i / (invs.length - 1) // 0 to 1
        const factor = 1 + totalIncrease * progress
        invs[i].Total = Math.round(invs[i].Total * factor)
        invs[i].TotalToPay = invs[i].Total
        if (invs[i].Balance > 0) invs[i].Balance = invs[i].Total
      }
    }
  }

  // ── Generate customer invoices ──
  const customerInvoices = []
  let custDocNum = 20001

  for (let m = config.invoice_months; m >= 1; m--) {
    const monthDate = dateMonthsAgo(m)
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth() + 1
    const count = randInt(config.customer_invoices_per_month_range[0], config.customer_invoices_per_month_range[1])

    for (let i = 0; i < count; i++) {
      const invoiceDate = randomDateInMonth(year, month)
      const dueDate = addDays(invoiceDate, 30)
      const total = randInt(5000, 500000)
      const isPaid = dueDate < now ? Math.random() > 0.1 : false

      customerInvoices.push({
        Total: total,
        CustomerName: pickRandom(customers),
        DueDate: formatDate(dueDate),
        Balance: isPaid ? 0 : total,
        DocumentNumber: String(custDocNum++),
        InvoiceDate: formatDate(invoiceDate),
      })
    }
  }

  return {
    supplier_invoices: supplierInvoices,
    invoices: customerInvoices,
  }
}

function generateInvoiceRows(total, count) {
  const rows = []
  let remaining = total
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1
    const amount = isLast ? remaining : Math.round(remaining * randFloat(0.2, 0.6, 2))
    remaining -= amount
    rows.push({
      Code: "",
      Total: amount,
      Debit: amount,
      Credit: 0,
      Price: amount,
      Account: pickRandom(ACCOUNT_CODES),
    })
  }
  return rows
}

// ─── Microsoft 365 Data Generator ────────────────────────────────────

function generateM365Data(config, anomalyConfig = {}) {
  const employeeCount = config.employee_count
  const licenseMix = config.m365_license_mix

  // ── Generate users ──
  const users = []
  const usedEmails = new Set()

  // Build license assignment plan: distribute licenses round-robin
  const licenseAssignments = []
  for (const lic of licenseMix) {
    const count = Math.max(1, Math.round(employeeCount * lic.pct))
    for (let i = 0; i < count && licenseAssignments.length < employeeCount; i++) {
      licenseAssignments.push({ skuId: lic.skuId })
    }
  }
  // Fill any remaining spots with the first license type
  while (licenseAssignments.length < employeeCount) {
    licenseAssignments.push({ skuId: licenseMix[0].skuId })
  }

  for (let i = 0; i < employeeCount; i++) {
    const firstName = pickRandom(FIRST_NAMES)
    const lastName = pickRandom(LAST_NAMES)
    let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@testcompany.se`
    // Ensure unique emails
    let suffix = 2
    while (usedEmails.has(email)) {
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@testcompany.se`
      suffix++
    }
    usedEmails.add(email)

    const createdDate = daysAgo(randInt(30, 730))
    const lastSignIn = daysAgo(randInt(0, 7)) // Active by default

    users.push({
      id: generateId(),
      accountEnabled: true,
      displayName: `${firstName} ${lastName}`,
      mail: email,
      userPrincipalName: email,
      assignedLicenses: [licenseAssignments[i]],
      signInActivity: { lastSignInDateTime: formatDateTime(lastSignIn) },
      createdDateTime: formatDateTime(createdDate),
      department: pickRandom(DEPARTMENTS),
      jobTitle: pickRandom(JOB_TITLES),
    })
  }

  // ── Inject M365 anomalies ──

  // Inactive users: set last sign-in to 45-120 days ago
  if (anomalyConfig.inactiveUsers !== false) {
    const inactiveCount = Math.max(2, Math.floor(employeeCount * 0.12))
    const targets = pickN(
      Array.from({ length: users.length }, (_, i) => i),
      inactiveCount
    )
    for (const idx of targets) {
      users[idx].signInActivity = {
        lastSignInDateTime: formatDateTime(daysAgo(randInt(45, 120))),
      }
    }
  }

  // Orphaned licenses: disable account but keep licenses
  if (anomalyConfig.orphanedLicenses !== false) {
    const orphanCount = Math.max(2, Math.floor(employeeCount * 0.04))
    // Pick from non-inactive users to avoid overlap
    const activeIndices = users
      .map((u, i) => ({ i, lastSign: new Date(u.signInActivity.lastSignInDateTime) }))
      .filter((x) => x.lastSign > daysAgo(30))
      .map((x) => x.i)
    const targets = pickN(activeIndices, orphanCount)
    for (const idx of targets) {
      users[idx].accountEnabled = false
      // Keep assignedLicenses — this is what analysis detects
    }
  }

  // Over-provisioned: give E5 to users who don't need it (only for scaleup with E5)
  if (anomalyConfig.overProvisioned !== false) {
    const e5Sku = licenseMix.find((l) => l.skuPartNumber === "SPE_E5")
    if (e5Sku) {
      // E5 users are already assigned via the mix — analysis will flag them
      // No extra injection needed; the license mix itself creates over-provisioning findings
    }
  }

  // ── Generate license summary objects ──
  const licenseCountMap = {}
  for (const user of users) {
    for (const lic of user.assignedLicenses) {
      if (!licenseCountMap[lic.skuId]) licenseCountMap[lic.skuId] = 0
      licenseCountMap[lic.skuId]++
    }
  }

  const licenses = licenseMix.map((lic) => ({
    skuId: lic.skuId,
    skuPartNumber: lic.skuPartNumber,
    consumedUnits: licenseCountMap[lic.skuId] || 0,
    prepaidUnits: {
      enabled: (licenseCountMap[lic.skuId] || 0) + randInt(2, 8),
    },
    appliesTo: "User",
    capabilityStatus: "Enabled",
  }))

  return {
    licenses,
    users,
  }
}

// ─── HubSpot Data Generator ─────────────────────────────────────────

function generateHubSpotData(config, anomalyConfig = {}) {
  const userCount = config.hubspot_user_count
  const adminCount = config.hubspot_admin_count

  // ── Generate account ──
  const hubspot_account = {
    portalId: String(40000000 + randInt(0, 9999999)),
    companyName: `TestCo ${config.hubspot_tier.charAt(0).toUpperCase() + config.hubspot_tier.slice(1)}`,
    timeZone: "Europe/Stockholm",
    currency: "SEK",
  }

  // ── Generate users ──
  const hubspot_users = []
  const usedEmails = new Set()

  for (let i = 0; i < userCount; i++) {
    const firstName = pickRandom(FIRST_NAMES)
    const lastName = pickRandom(LAST_NAMES)
    let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@testco.se`
    let suffix = 2
    while (usedEmails.has(email)) {
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@testco.se`
      suffix++
    }
    usedEmails.add(email)

    const isAdmin = i < adminCount
    const createdAt = daysAgo(randInt(30, 540))
    const lastLogin = daysAgo(randInt(0, 14)) // Active by default
    const updatedAt = daysAgo(randInt(0, 7))

    hubspot_users.push({
      id: String(1001 + i),
      email,
      firstName,
      lastName,
      lastLoginAt: formatDateTime(lastLogin),
      userProvisioningState: "ACTIVE",
      status: "ACTIVE",
      createdAt: formatDateTime(createdAt),
      updatedAt: formatDateTime(updatedAt),
      superAdmin: isAdmin,
      roleId: isAdmin ? null : String(200000 + randInt(0, 999)),
      primaryTeamId: String(100 + randInt(0, 9)),
    })
  }

  // ── Inject HubSpot anomalies ──

  // Inactive users: set last login to 45-120 days ago
  if (anomalyConfig.inactiveUsers !== false) {
    const inactiveCount = Math.max(2, Math.floor(userCount * 0.25))
    // Skip admins (superAdmin users are always considered active)
    const nonAdminIndices = hubspot_users
      .map((u, i) => ({ i, isAdmin: u.superAdmin }))
      .filter((x) => !x.isAdmin)
      .map((x) => x.i)
    const targets = pickN(nonAdminIndices, inactiveCount)
    for (const idx of targets) {
      hubspot_users[idx].lastLoginAt = formatDateTime(daysAgo(randInt(45, 120)))
    }
  }

  // Unassigned roles: remove role from some users
  if (anomalyConfig.unassignedRoles !== false) {
    const unassignedCount = Math.max(1, Math.floor(userCount * 0.12))
    const nonAdminIndices = hubspot_users
      .map((u, i) => ({ i, isAdmin: u.superAdmin }))
      .filter((x) => !x.isAdmin)
      .map((x) => x.i)
    const targets = pickN(nonAdminIndices, unassignedCount)
    for (const idx of targets) {
      hubspot_users[idx].roleId = null
      hubspot_users[idx].primaryTeamId = null
    }
  }

  // Pending invitations: set provisioning state to PENDING
  if (anomalyConfig.pendingInvitations !== false) {
    const pendingCount = Math.max(1, Math.ceil(userCount * 0.08))
    const nonAdminIndices = hubspot_users
      .map((u, i) => ({ i, isAdmin: u.superAdmin }))
      .filter((x) => !x.isAdmin)
      .map((x) => x.i)
    const targets = pickN(nonAdminIndices, pendingCount)
    for (const idx of targets) {
      hubspot_users[idx].userProvisioningState = "PENDING"
      hubspot_users[idx].status = "PENDING"
      hubspot_users[idx].lastLoginAt = null
      // createdAt === updatedAt signals never accepted
      hubspot_users[idx].updatedAt = hubspot_users[idx].createdAt
    }
  }

  return {
    hubspot_users,
    hubspot_account,
  }
}

// ─── Orchestrator ────────────────────────────────────────────────────

function generateAllData(scenarioProfile, overrides = {}, anomalyConfig = {}, integrations = []) {
  const baseConfig = SCENARIO_PROFILES[scenarioProfile] || SCENARIO_PROFILES.startup_60
  const config = { ...baseConfig, ...overrides }
  const result = {}

  if (integrations.includes("Fortnox")) {
    result.Fortnox = generateFortnoxData(config, anomalyConfig.fortnox || {})
  }
  if (integrations.includes("Microsoft365")) {
    result.Microsoft365 = generateM365Data(config, anomalyConfig.microsoft365 || {})
  }
  if (integrations.includes("HubSpot")) {
    result.HubSpot = generateHubSpotData(config, anomalyConfig.hubspot || {})
  }

  return result
}

module.exports = {
  generateAllData,
  generateFortnoxData,
  generateM365Data,
  generateHubSpotData,
  SCENARIO_PROFILES,
}
