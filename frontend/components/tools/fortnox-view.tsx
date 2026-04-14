"use client"

/**
 * FortnoxView
 *
 * Detail-page body for the Fortnox accounting tool integration. Reads
 * company info, settings, customers, invoices, supplier invoices, accounts,
 * articles, and suppliers from the generic `useToolInfo` payload — see
 * `lib/tools/configs/fortnox.ts` for the endpoint declarations.
 *
 * UI mirrors the legacy inline JSX from `dashboard/tools/[id]/page.tsx`
 * (verbatim copy, only data-prop wiring changed).
 */

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Wallet,
  Users,
  FileText,
  Receipt,
  BookOpen,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react"
import { formatCurrencyForIntegration } from "@/lib/currency"
import type { ToolViewProps } from "@/lib/tools/types"

interface FortnoxInfo {
  company?: any
  settings?: any
  invoices?: any[]
  supplierInvoices?: any[]
  expenses?: any[]
  vouchers?: any[]
  accounts?: any[]
  articles?: any[]
  customers?: any[]
  suppliers?: any[]
}

const ITEMS_PER_PAGE = 10

const filterData = (data: any[], query: string) => {
  if (!query) return data
  const lowerQuery = query.toLowerCase()
  return data.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(lowerQuery),
  )
}

export function FortnoxView({ integration, info }: ToolViewProps) {
  const fortnoxInfo = (info || {}) as FortnoxInfo
  const [activeDataTab, setActiveDataTab] = useState<string>("company")
  const [infoSearchQuery, setInfoSearchQuery] = useState("")

  // Data tab pagination states
  const [customersPage, setCustomersPage] = useState(1)
  const [invoicesPage, setInvoicesPage] = useState(1)
  const [supplierInvoicesPage, setSupplierInvoicesPage] = useState(1)
  const [accountsPage, setAccountsPage] = useState(1)
  const [articlesPage, setArticlesPage] = useState(1)
  const [suppliersPage, setSuppliersPage] = useState(1)

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
        <Input
          type="search"
          placeholder="Search..."
          value={infoSearchQuery}
          onChange={(e) => setInfoSearchQuery(e.target.value)}
          className="pl-9 h-9 bg-white/[0.03] border-white/[0.06] text-white/80 placeholder:text-white/20 text-[12px] rounded-lg focus:border-emerald-500/30 focus:bg-white/[0.05] transition-all"
        />
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-lg border border-white/[0.06]">
          <button
            onClick={() => setActiveDataTab("company")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeDataTab === "company"
                ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">Company</span>
          </button>
          {fortnoxInfo.customers && fortnoxInfo.customers.length > 0 && (
            <button
              onClick={() => setActiveDataTab("customers")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeDataTab === "customers"
                  ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Customers</span>
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {fortnoxInfo.customers.length}
              </Badge>
            </button>
          )}
          {fortnoxInfo.invoices && fortnoxInfo.invoices.length > 0 && (
            <button
              onClick={() => setActiveDataTab("invoices")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeDataTab === "invoices"
                  ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Invoices</span>
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {fortnoxInfo.invoices.length}
              </Badge>
            </button>
          )}
          {fortnoxInfo.supplierInvoices && fortnoxInfo.supplierInvoices.length > 0 && (
            <button
              onClick={() => setActiveDataTab("supplierInvoices")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeDataTab === "supplierInvoices"
                  ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Supplier Inv.</span>
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {fortnoxInfo.supplierInvoices.length}
              </Badge>
            </button>
          )}
          {fortnoxInfo.accounts && fortnoxInfo.accounts.length > 0 && (
            <button
              onClick={() => setActiveDataTab("accounts")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeDataTab === "accounts"
                  ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Accounts</span>
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {fortnoxInfo.accounts.length}
              </Badge>
            </button>
          )}
          {fortnoxInfo.articles && fortnoxInfo.articles.length > 0 && (
            <button
              onClick={() => setActiveDataTab("articles")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeDataTab === "articles"
                  ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Articles</span>
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {fortnoxInfo.articles.length}
              </Badge>
            </button>
          )}
          {fortnoxInfo.suppliers && fortnoxInfo.suppliers.length > 0 && (
            <button
              onClick={() => setActiveDataTab("suppliers")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeDataTab === "suppliers"
                  ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Suppliers</span>
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {fortnoxInfo.suppliers.length}
              </Badge>
            </button>
          )}
        </div>
      </div>

      {/* Company Tab */}
      {activeDataTab === "company" && fortnoxInfo.company && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            Company Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(fortnoxInfo.company.CompanyName || fortnoxInfo.company.Name) && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Company Name</p>
                <p className="text-white font-medium">{fortnoxInfo.company.CompanyName || fortnoxInfo.company.Name}</p>
              </div>
            )}
            {fortnoxInfo.company.OrganisationNumber && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Organization Number</p>
                <p className="text-white font-medium">{fortnoxInfo.company.OrganisationNumber}</p>
              </div>
            )}
            {fortnoxInfo.company.Email && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email</p>
                <p className="text-white font-medium">{fortnoxInfo.company.Email}</p>
              </div>
            )}
            {(fortnoxInfo.company.Phone1 || fortnoxInfo.company.Phone) && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Phone</p>
                <p className="text-white font-medium">{fortnoxInfo.company.Phone1 || fortnoxInfo.company.Phone}</p>
              </div>
            )}
            {fortnoxInfo.company.Address && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Address</p>
                <p className="text-white font-medium">{fortnoxInfo.company.Address}</p>
              </div>
            )}
            {fortnoxInfo.company.City && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">City</p>
                <p className="text-white font-medium">{fortnoxInfo.company.City}</p>
              </div>
            )}
            {fortnoxInfo.company.ZipCode && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Zip Code</p>
                <p className="text-white font-medium">{fortnoxInfo.company.ZipCode}</p>
              </div>
            )}
            {fortnoxInfo.company.Country && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Country</p>
                <p className="text-white font-medium">{fortnoxInfo.company.Country}</p>
              </div>
            )}
            {fortnoxInfo.company.CountryCode && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Country Code</p>
                <p className="text-white font-medium">{fortnoxInfo.company.CountryCode}</p>
              </div>
            )}
            {fortnoxInfo.company.WWW && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Website</p>
                <p className="text-emerald-400 font-medium">{fortnoxInfo.company.WWW}</p>
              </div>
            )}
            {fortnoxInfo.company.VatNumber && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">VAT Number</p>
                <p className="text-white font-medium">{fortnoxInfo.company.VatNumber}</p>
              </div>
            )}
            {fortnoxInfo.company.DatabaseNumber && (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Database Number</p>
                <p className="text-white font-medium">{fortnoxInfo.company.DatabaseNumber}</p>
              </div>
            )}
          </div>

          {/* Settings sub-section */}
          {fortnoxInfo.settings && Object.keys(fortnoxInfo.settings).length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                Settings
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(fortnoxInfo.settings).map(([key, value]) => (
                  <div key={key} className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="text-white font-medium">
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value || 'N/A')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customers Tab */}
      {activeDataTab === "customers" && fortnoxInfo.customers && fortnoxInfo.customers.length > 0 && (() => {
        const filteredCustomers = filterData(fortnoxInfo.customers, infoSearchQuery)
        const totalCustomerPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE)
        const paginatedCustomers = filteredCustomers.slice(
          (customersPage - 1) * ITEMS_PER_PAGE,
          customersPage * ITEMS_PER_PAGE
        )
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Customers
                <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                  {filteredCustomers.length}
                </Badge>
              </h3>
              {totalCustomerPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomersPage(p => Math.max(1, p - 1))}
                    disabled={customersPage === 1}
                    className="h-8 w-8 p-0 border-white/[0.06] bg-white/[0.03] text-white/70 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400">
                    {customersPage} / {totalCustomerPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomersPage(p => Math.min(totalCustomerPages, p + 1))}
                    disabled={customersPage === totalCustomerPages}
                    className="h-8 w-8 p-0 border-white/[0.06] bg-white/[0.03] text-white/70 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Customer</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Number</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden sm:table-cell">Email</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden md:table-cell">City</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map((customer: any, idx: number) => (
                    <tr key={customer.CustomerNumber || idx} className="border-b border-white/[0.04] hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <p className="text-white font-medium">{customer.Name || 'N/A'}</p>
                        <p className="text-xs text-gray-500 sm:hidden">{customer.Email || '-'}</p>
                      </td>
                      <td className="p-3 text-gray-300">{customer.CustomerNumber || '-'}</td>
                      <td className="p-3 text-gray-300 hidden sm:table-cell">{customer.Email || '-'}</td>
                      <td className="p-3 text-gray-300 hidden md:table-cell">{customer.City || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Invoices Tab */}
      {activeDataTab === "invoices" && fortnoxInfo.invoices && fortnoxInfo.invoices.length > 0 && (() => {
        const filteredInvoices = filterData(fortnoxInfo.invoices, infoSearchQuery)
        const totalInvoicePages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE)
        const paginatedInvoices = filteredInvoices.slice(
          (invoicesPage - 1) * ITEMS_PER_PAGE,
          invoicesPage * ITEMS_PER_PAGE
        )
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Invoices
                <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                  {filteredInvoices.length}
                </Badge>
              </h3>
              {totalInvoicePages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInvoicesPage(p => Math.max(1, p - 1))}
                    disabled={invoicesPage === 1}
                    className="h-8 w-8 p-0 border-white/[0.06] bg-white/[0.03] text-white/70 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400">
                    {invoicesPage} / {totalInvoicePages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInvoicesPage(p => Math.min(totalInvoicePages, p + 1))}
                    disabled={invoicesPage === totalInvoicePages}
                    className="h-8 w-8 p-0 border-white/[0.06] bg-white/[0.03] text-white/70 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Invoice #</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Customer</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden sm:table-cell">Date</th>
                    <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Amount</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden md:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map((invoice: any, idx: number) => (
                    <tr key={invoice.DocumentNumber || idx} className="border-b border-white/[0.04] hover:bg-white/5 transition-colors">
                      <td className="p-3 text-white font-medium">{invoice.DocumentNumber || '-'}</td>
                      <td className="p-3">
                        <p className="text-gray-300">{invoice.CustomerName || '-'}</p>
                        <p className="text-xs text-gray-500 sm:hidden">{invoice.InvoiceDate || '-'}</p>
                      </td>
                      <td className="p-3 text-gray-300 hidden sm:table-cell">{invoice.InvoiceDate || '-'}</td>
                      <td className="p-3 text-right text-white font-medium">
                        {formatCurrencyForIntegration(invoice.Total, integration?.connection_type || 'fortnox')}
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <Badge className={
                          invoice.Cancelled ? "bg-red-500/10 text-red-400/80 border-red-500/15" :
                          invoice.Booked ? "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15" :
                          "bg-amber-500/10 text-amber-400/80 border-amber-500/15"
                        }>
                          {invoice.Cancelled ? 'Cancelled' : invoice.Booked ? 'Booked' : 'Draft'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Supplier Invoices Tab */}
      {activeDataTab === "supplierInvoices" && fortnoxInfo.supplierInvoices && fortnoxInfo.supplierInvoices.length > 0 && (() => {
        const filteredSupplierInvoices = filterData(fortnoxInfo.supplierInvoices, infoSearchQuery)
        const totalSupplierInvoicePages = Math.ceil(filteredSupplierInvoices.length / ITEMS_PER_PAGE)
        const paginatedSupplierInvoices = filteredSupplierInvoices.slice(
          (supplierInvoicesPage - 1) * ITEMS_PER_PAGE,
          supplierInvoicesPage * ITEMS_PER_PAGE
        )
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Supplier Invoices
                <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                  {filteredSupplierInvoices.length}
                </Badge>
              </h3>
              {totalSupplierInvoicePages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSupplierInvoicesPage(p => Math.max(1, p - 1))}
                    disabled={supplierInvoicesPage === 1}
                    className="h-8 w-8 p-0 border-white/[0.06] bg-white/[0.03] text-white/70 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400">
                    {supplierInvoicesPage} / {totalSupplierInvoicePages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSupplierInvoicesPage(p => Math.min(totalSupplierInvoicePages, p + 1))}
                    disabled={supplierInvoicesPage === totalSupplierInvoicePages}
                    className="h-8 w-8 p-0 border-white/[0.06] bg-white/[0.03] text-white/70 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Invoice #</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Supplier</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden sm:table-cell">Date</th>
                    <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Amount</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden md:table-cell">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSupplierInvoices.map((invoice: any, idx: number) => (
                    <tr key={invoice.GivenNumber || idx} className="border-b border-white/[0.04] hover:bg-white/5 transition-colors">
                      <td className="p-3 text-white font-medium">{invoice.GivenNumber || '-'}</td>
                      <td className="p-3">
                        <p className="text-gray-300">{invoice.SupplierName || '-'}</p>
                        <p className="text-xs text-gray-500 sm:hidden">{invoice.InvoiceDate || '-'}</p>
                      </td>
                      <td className="p-3 text-gray-300 hidden sm:table-cell">{invoice.InvoiceDate || '-'}</td>
                      <td className="p-3 text-right text-white font-medium">
                        {formatCurrencyForIntegration(invoice.Total, integration?.connection_type || 'fortnox')}
                      </td>
                      <td className="p-3 text-gray-300 hidden md:table-cell">{invoice.DueDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Accounts Tab */}
      {activeDataTab === "accounts" && fortnoxInfo.accounts && fortnoxInfo.accounts.length > 0 && (() => {
        const filteredAccounts = filterData(fortnoxInfo.accounts, infoSearchQuery)
        const totalAccountPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE)
        const paginatedAccounts = filteredAccounts.slice(
          (accountsPage - 1) * ITEMS_PER_PAGE,
          accountsPage * ITEMS_PER_PAGE
        )
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Accounts
                <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                  {filteredAccounts.length}
                </Badge>
              </h3>
              {totalAccountPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAccountsPage(p => Math.max(1, p - 1))}
                    disabled={accountsPage === 1}
                    className="h-8 w-8 p-0 border-white/[0.06] bg-white/[0.03] text-white/70 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400">
                    {accountsPage} / {totalAccountPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAccountsPage(p => Math.min(totalAccountPages, p + 1))}
                    disabled={accountsPage === totalAccountPages}
                    className="h-8 w-8 p-0 border-white/[0.06] bg-white/[0.03] text-white/70 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Account #</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Description</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden sm:table-cell">SRU</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden md:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAccounts.map((account: any, idx: number) => (
                    <tr key={account.Number || idx} className="border-b border-white/[0.04] hover:bg-white/5 transition-colors">
                      <td className="p-3 text-white font-medium">{account.Number || '-'}</td>
                      <td className="p-3 text-gray-300">{account.Description || '-'}</td>
                      <td className="p-3 text-gray-300 hidden sm:table-cell">{account.SRU || '-'}</td>
                      <td className="p-3 hidden md:table-cell">
                        <Badge className={account.Active ? "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}>
                          {account.Active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Articles Tab */}
      {activeDataTab === "articles" && fortnoxInfo.articles && fortnoxInfo.articles.length > 0 && (() => {
        const filteredArticles = filterData(fortnoxInfo.articles, infoSearchQuery)
        const totalArticlePages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE)
        const paginatedArticles = filteredArticles.slice(
          (articlesPage - 1) * ITEMS_PER_PAGE,
          articlesPage * ITEMS_PER_PAGE
        )
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                Articles
                <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                  {filteredArticles.length}
                </Badge>
              </h3>
              {totalArticlePages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setArticlesPage(p => Math.max(1, p - 1))}
                    disabled={articlesPage === 1}
                    className="h-8 w-8 p-0 border-white/[0.06] bg-white/[0.03] text-white/70 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400">
                    {articlesPage} / {totalArticlePages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setArticlesPage(p => Math.min(totalArticlePages, p + 1))}
                    disabled={articlesPage === totalArticlePages}
                    className="h-8 w-8 p-0 border-white/[0.06] bg-white/[0.03] text-white/70 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Article #</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Description</th>
                    <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden sm:table-cell">Price</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden md:table-cell">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedArticles.map((article: any, idx: number) => (
                    <tr key={article.ArticleNumber || idx} className="border-b border-white/[0.04] hover:bg-white/5 transition-colors">
                      <td className="p-3 text-white font-medium">{article.ArticleNumber || '-'}</td>
                      <td className="p-3 text-gray-300">{article.Description || '-'}</td>
                      <td className="p-3 text-right text-white font-medium hidden sm:table-cell">
                        {formatCurrencyForIntegration(article.SalesPrice, integration?.connection_type || 'fortnox')}
                      </td>
                      <td className="p-3 text-gray-300 hidden md:table-cell">{article.Unit || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Suppliers Tab */}
      {activeDataTab === "suppliers" && fortnoxInfo.suppliers && fortnoxInfo.suppliers.length > 0 && (() => {
        const filteredSuppliers = filterData(fortnoxInfo.suppliers, infoSearchQuery)
        const totalSupplierPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE)
        const paginatedSuppliers = filteredSuppliers.slice(
          (suppliersPage - 1) * ITEMS_PER_PAGE,
          suppliersPage * ITEMS_PER_PAGE
        )
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Suppliers
                <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                  {filteredSuppliers.length}
                </Badge>
              </h3>
              {totalSupplierPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSuppliersPage(p => Math.max(1, p - 1))}
                    disabled={suppliersPage === 1}
                    className="h-8 w-8 p-0 border-white/[0.06] bg-white/[0.03] text-white/70 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400">
                    {suppliersPage} / {totalSupplierPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSuppliersPage(p => Math.min(totalSupplierPages, p + 1))}
                    disabled={suppliersPage === totalSupplierPages}
                    className="h-8 w-8 p-0 border-white/[0.06] bg-white/[0.03] text-white/70 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Supplier</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3">Number</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden sm:table-cell">Email</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 hidden md:table-cell">City</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSuppliers.map((supplier: any, idx: number) => (
                    <tr key={supplier.SupplierNumber || idx} className="border-b border-white/[0.04] hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <p className="text-white font-medium">{supplier.Name || 'N/A'}</p>
                        <p className="text-xs text-gray-500 sm:hidden">{supplier.Email || '-'}</p>
                      </td>
                      <td className="p-3 text-gray-300">{supplier.SupplierNumber || '-'}</td>
                      <td className="p-3 text-gray-300 hidden sm:table-cell">{supplier.Email || '-'}</td>
                      <td className="p-3 text-gray-300 hidden md:table-cell">{supplier.City || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
