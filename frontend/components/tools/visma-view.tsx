"use client"

/**
 * VismaView
 *
 * Detail-page body for the Visma eAccounting integration. Reads company info,
 * customers, suppliers, customer invoices, supplier invoices, articles,
 * accounts, and vouchers from the generic `useToolInfo` payload — see
 * `lib/tools/configs/visma.ts` for the endpoint declarations.
 *
 * Visma's home currency varies by market (SEK/NOK/DKK/EUR). The status
 * endpoint reports the company's home currency and we surface it in the
 * header; line-level amounts render in their native currency from the API.
 */

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Wallet,
  Users,
  FileText,
  Receipt,
  BookOpen,
  Package,
  ScrollText,
  Search,
} from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import type { ToolViewProps } from "@/lib/tools/types"

interface VismaCompany {
  Name?: string
  CompanyName?: string
  OrganizationNumber?: string
  CorporateIdentityNumber?: string
  Currency?: string
  CurrencyCode?: string
  CountryCode?: string
  Email?: string
  Phone?: string
  Phone1?: string
  Address1?: string
  PostalCode?: string
  City?: string
  WebSiteUrl?: string
  VatNumber?: string
}

interface VismaInfo {
  company?: VismaCompany | null
  customers?: any[]
  suppliers?: any[]
  invoices?: any[]
  supplierInvoices?: any[]
  articles?: any[]
  accounts?: any[]
  vouchers?: any[]
}

const ITEMS_PER_PAGE = 10

const filterData = (data: any[], query: string) => {
  if (!query) return data
  const lower = query.toLowerCase()
  return data.filter((item) => JSON.stringify(item).toLowerCase().includes(lower))
}

function paginate<T>(items: T[], page: number, perPage = ITEMS_PER_PAGE): T[] {
  const start = (page - 1) * perPage
  return items.slice(start, start + perPage)
}

function Pager({
  page,
  total,
  onPage,
}: {
  page: number
  total: number
  onPage: (p: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
      <span>
        Page {page} of {pages} · {total} item{total !== 1 ? "s" : ""}
      </span>
      <div className="flex gap-1">
        <button
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
          className="px-2 py-1 rounded border border-white/10 disabled:opacity-30 hover:bg-white/5"
        >
          Prev
        </button>
        <button
          disabled={page === pages}
          onClick={() => onPage(page + 1)}
          className="px-2 py-1 rounded border border-white/10 disabled:opacity-30 hover:bg-white/5"
        >
          Next
        </button>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  Icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  Icon: typeof Wallet
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
        active
          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
          : "text-gray-400 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
      {count != null && count > 0 ? (
        <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">{count}</Badge>
      ) : null}
    </button>
  )
}

function Field({ label, value }: { label: string; value: any }) {
  if (value == null || value === "") return null
  return (
    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-white font-medium break-words">{String(value)}</p>
    </div>
  )
}

export function VismaView({ info }: ToolViewProps) {
  const data = (info || {}) as VismaInfo
  const company = data.company || null
  const homeCurrency = (company?.Currency || company?.CurrencyCode || "SEK").toUpperCase()
  const [activeTab, setActiveTab] = useState<string>("company")
  const [search, setSearch] = useState("")
  const [customersPage, setCustomersPage] = useState(1)
  const [suppliersPage, setSuppliersPage] = useState(1)
  const [invoicesPage, setInvoicesPage] = useState(1)
  const [supplierInvoicesPage, setSupplierInvoicesPage] = useState(1)
  const [articlesPage, setArticlesPage] = useState(1)
  const [accountsPage, setAccountsPage] = useState(1)
  const [vouchersPage, setVouchersPage] = useState(1)

  const customers = filterData(data.customers || [], search)
  const suppliers = filterData(data.suppliers || [], search)
  const invoices = filterData(data.invoices || [], search)
  const supplierInvoices = filterData(data.supplierInvoices || [], search)
  const articles = filterData(data.articles || [], search)
  const accounts = filterData(data.accounts || [], search)
  const vouchers = filterData(data.vouchers || [], search)

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
        <Input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 bg-white/[0.03] border-white/[0.06] text-white/80 placeholder:text-white/20 text-[12px] rounded-lg focus:border-rose-500/30 focus:bg-white/[0.05] transition-all"
        />
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-lg border border-white/[0.06]">
          <TabButton active={activeTab === "company"} onClick={() => setActiveTab("company")} Icon={Wallet} label="Company" />
          <TabButton active={activeTab === "customers"} onClick={() => setActiveTab("customers")} Icon={Users} label="Customers" count={data.customers?.length || 0} />
          <TabButton active={activeTab === "suppliers"} onClick={() => setActiveTab("suppliers")} Icon={Users} label="Suppliers" count={data.suppliers?.length || 0} />
          <TabButton active={activeTab === "invoices"} onClick={() => setActiveTab("invoices")} Icon={FileText} label="Invoices" count={data.invoices?.length || 0} />
          <TabButton active={activeTab === "supplierInvoices"} onClick={() => setActiveTab("supplierInvoices")} Icon={Receipt} label="Supplier Inv." count={data.supplierInvoices?.length || 0} />
          <TabButton active={activeTab === "articles"} onClick={() => setActiveTab("articles")} Icon={Package} label="Articles" count={data.articles?.length || 0} />
          <TabButton active={activeTab === "accounts"} onClick={() => setActiveTab("accounts")} Icon={BookOpen} label="Accounts" count={data.accounts?.length || 0} />
          <TabButton active={activeTab === "vouchers"} onClick={() => setActiveTab("vouchers")} Icon={ScrollText} label="Vouchers" count={data.vouchers?.length || 0} />
        </div>
      </div>

      {activeTab === "company" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-rose-400" />
            Company Information
          </h3>
          {company ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Company Name" value={company.Name || company.CompanyName} />
              <Field label="Organization Number" value={company.OrganizationNumber || company.CorporateIdentityNumber} />
              <Field label="Home Currency" value={homeCurrency} />
              <Field label="Country Code" value={company.CountryCode} />
              <Field label="Email" value={company.Email} />
              <Field label="Phone" value={company.Phone || company.Phone1} />
              <Field label="Address" value={company.Address1} />
              <Field label="Postal Code" value={company.PostalCode} />
              <Field label="City" value={company.City} />
              <Field label="VAT Number" value={company.VatNumber} />
              <Field label="Website" value={company.WebSiteUrl} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">Company info not yet loaded.</p>
          )}
        </div>
      )}

      {activeTab === "customers" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-400" />
            Customers ({customers.length})
          </h3>
          {customers.length === 0 ? (
            <p className="text-sm text-gray-500">No customers returned.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-white/[0.04]">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-400 bg-white/[0.02]">
                    <tr>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">City</th>
                      <th className="px-3 py-2">Country</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(customers, customersPage).map((c, i) => (
                      <tr key={c.Id || c.CustomerNumber || i} className="border-t border-white/[0.04]">
                        <td className="px-3 py-2 text-white">{c.Name || c.CustomerName || "—"}</td>
                        <td className="px-3 py-2 text-gray-300">{c.Email || c.EmailAddress || "—"}</td>
                        <td className="px-3 py-2 text-gray-300">{c.City || "—"}</td>
                        <td className="px-3 py-2 text-gray-300">{c.CountryCode || c.Country || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={customersPage} total={customers.length} onPage={setCustomersPage} />
            </>
          )}
        </div>
      )}

      {activeTab === "suppliers" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-400" />
            Suppliers ({suppliers.length})
          </h3>
          {suppliers.length === 0 ? (
            <p className="text-sm text-gray-500">No suppliers returned.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-white/[0.04]">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-400 bg-white/[0.02]">
                    <tr>
                      <th className="px-3 py-2">Supplier</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Country</th>
                      <th className="px-3 py-2">VAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(suppliers, suppliersPage).map((s, i) => (
                      <tr key={s.Id || s.SupplierNumber || i} className="border-t border-white/[0.04]">
                        <td className="px-3 py-2 text-white">{s.Name || s.SupplierName || "—"}</td>
                        <td className="px-3 py-2 text-gray-300">{s.Email || s.EmailAddress || "—"}</td>
                        <td className="px-3 py-2 text-gray-300">{s.CountryCode || s.Country || "—"}</td>
                        <td className="px-3 py-2 text-gray-300">{s.VatNumber || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={suppliersPage} total={suppliers.length} onPage={setSuppliersPage} />
            </>
          )}
        </div>
      )}

      {activeTab === "invoices" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-rose-400" />
            Customer Invoices ({invoices.length})
          </h3>
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-500">No customer invoices returned.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-white/[0.04]">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-400 bg-white/[0.02]">
                    <tr>
                      <th className="px-3 py-2">Invoice #</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Due</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(invoices, invoicesPage).map((inv, i) => {
                      const total = parseFloat(inv.TotalAmount ?? inv.Total ?? inv.GrossAmount ?? 0)
                      const remaining = parseFloat(inv.RemainingAmount ?? 0)
                      const currency = (inv.Currency || homeCurrency).toUpperCase()
                      return (
                        <tr key={inv.Id || inv.InvoiceNumber || i} className="border-t border-white/[0.04]">
                          <td className="px-3 py-2 text-white font-mono">{inv.InvoiceNumber || inv.DocumentNumber || "—"}</td>
                          <td className="px-3 py-2 text-gray-300">{inv.InvoiceCustomerName || inv.CustomerName || "—"}</td>
                          <td className="px-3 py-2 text-gray-300">{(inv.InvoiceDate || "").slice(0, 10) || "—"}</td>
                          <td className="px-3 py-2 text-gray-300">{(inv.DueDate || "").slice(0, 10) || "—"}</td>
                          <td className="px-3 py-2 text-white text-right">{formatCurrency(total, currency)}</td>
                          <td className="px-3 py-2 text-right">
                            {remaining > 0 ? (
                              <span className="text-amber-400">{formatCurrency(remaining, currency)}</span>
                            ) : (
                              <span className="text-emerald-400">paid</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pager page={invoicesPage} total={invoices.length} onPage={setInvoicesPage} />
            </>
          )}
        </div>
      )}

      {activeTab === "supplierInvoices" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-rose-400" />
            Supplier Invoices ({supplierInvoices.length})
          </h3>
          {supplierInvoices.length === 0 ? (
            <p className="text-sm text-gray-500">No supplier invoices returned.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-white/[0.04]">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-400 bg-white/[0.02]">
                    <tr>
                      <th className="px-3 py-2">Supplier</th>
                      <th className="px-3 py-2">Invoice Date</th>
                      <th className="px-3 py-2">Due</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Outstanding</th>
                      <th className="px-3 py-2">Bookkept</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(supplierInvoices, supplierInvoicesPage).map((inv, i) => {
                      const total = parseFloat(inv.Total ?? inv.TotalAmount ?? inv.GrossAmount ?? 0)
                      const remaining = parseFloat(inv.RemainingAmount ?? 0)
                      const currency = (inv.Currency || homeCurrency).toUpperCase()
                      const isBookkept = inv.IsBookkept === true || inv.IsBookkept === "true"
                      return (
                        <tr key={inv.Id || i} className="border-t border-white/[0.04]">
                          <td className="px-3 py-2 text-white">{inv.SupplierName || "—"}</td>
                          <td className="px-3 py-2 text-gray-300">{(inv.InvoiceDate || "").slice(0, 10) || "—"}</td>
                          <td className="px-3 py-2 text-gray-300">{(inv.DueDate || "").slice(0, 10) || "—"}</td>
                          <td className="px-3 py-2 text-white text-right">{formatCurrency(total, currency)}</td>
                          <td className="px-3 py-2 text-right">
                            {remaining > 0 ? (
                              <span className="text-amber-400">{formatCurrency(remaining, currency)}</span>
                            ) : (
                              <span className="text-emerald-400">paid</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isBookkept ? <span className="text-emerald-400">yes</span> : <span className="text-gray-500">no</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pager page={supplierInvoicesPage} total={supplierInvoices.length} onPage={setSupplierInvoicesPage} />
            </>
          )}
        </div>
      )}

      {activeTab === "articles" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-rose-400" />
            Articles ({articles.length})
          </h3>
          {articles.length === 0 ? (
            <p className="text-sm text-gray-500">No articles returned.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-white/[0.04]">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-400 bg-white/[0.02]">
                    <tr>
                      <th className="px-3 py-2">Number</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(articles, articlesPage).map((a, i) => {
                      const price = parseFloat(a.NetPrice ?? a.PriceAmount ?? a.Price ?? 0)
                      return (
                        <tr key={a.Id || a.ArticleNumber || i} className="border-t border-white/[0.04]">
                          <td className="px-3 py-2 text-white font-mono">{a.Number || a.ArticleNumber || "—"}</td>
                          <td className="px-3 py-2 text-gray-300">{a.Name || a.Description || "—"}</td>
                          <td className="px-3 py-2 text-white text-right">{formatCurrency(price, homeCurrency)}</td>
                          <td className="px-3 py-2 text-right text-gray-300">{a.QuantityInStock ?? a.StockQuantity ?? "—"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pager page={articlesPage} total={articles.length} onPage={setArticlesPage} />
            </>
          )}
        </div>
      )}

      {activeTab === "accounts" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-rose-400" />
            Accounts ({accounts.length})
          </h3>
          {accounts.length === 0 ? (
            <p className="text-sm text-gray-500">No accounts returned.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-white/[0.04]">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-400 bg-white/[0.02]">
                    <tr>
                      <th className="px-3 py-2">Number</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(accounts, accountsPage).map((a, i) => (
                      <tr key={a.Id || a.Number || i} className="border-t border-white/[0.04]">
                        <td className="px-3 py-2 text-white font-mono">{a.Number || a.AccountNumber || "—"}</td>
                        <td className="px-3 py-2 text-gray-300">{a.Name || a.Description || "—"}</td>
                        <td className="px-3 py-2 text-gray-300">{a.Type || a.AccountType || "—"}</td>
                        <td className="px-3 py-2">
                          {a.IsActive === false ? <span className="text-gray-500">no</span> : <span className="text-emerald-400">yes</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={accountsPage} total={accounts.length} onPage={setAccountsPage} />
            </>
          )}
        </div>
      )}

      {activeTab === "vouchers" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-rose-400" />
            Vouchers ({vouchers.length})
          </h3>
          {vouchers.length === 0 ? (
            <p className="text-sm text-gray-500">No vouchers returned.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-white/[0.04]">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-400 bg-white/[0.02]">
                    <tr>
                      <th className="px-3 py-2">Number</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(vouchers, vouchersPage).map((v, i) => {
                      const amount = parseFloat(v.Amount ?? v.TotalAmount ?? v.NumberSeries ?? 0)
                      return (
                        <tr key={v.Id || v.VoucherNumber || i} className="border-t border-white/[0.04]">
                          <td className="px-3 py-2 text-white font-mono">{v.VoucherNumber || v.Number || "—"}</td>
                          <td className="px-3 py-2 text-gray-300">{(v.VoucherDate || v.Date || "").slice(0, 10) || "—"}</td>
                          <td className="px-3 py-2 text-gray-300">{v.Description || v.Text || "—"}</td>
                          <td className="px-3 py-2 text-white text-right">
                            {Number.isFinite(amount) && amount !== 0 ? formatCurrency(amount, homeCurrency) : "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pager page={vouchersPage} total={vouchers.length} onPage={setVouchersPage} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
