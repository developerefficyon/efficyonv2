"use client"

/**
 * QuickBooksView
 *
 * Detail-page body for the QuickBooks accounting integration. Reads company,
 * invoices, bills, vendors, and accounts from the generic `useToolInfo`
 * payload — see `lib/tools/configs/quickbooks.ts` for the endpoint
 * declarations.
 *
 * UI mirrors the legacy inline JSX from `dashboard/tools/[id]/page.tsx`
 * (verbatim copy, only data-prop wiring changed).
 */

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Wallet, Users, FileText, Receipt, BookOpen, Search } from "lucide-react"
import type { ToolViewProps } from "@/lib/tools/types"

interface QuickBooksInfo {
  company?: any
  invoices?: any[]
  bills?: any[]
  vendors?: any[]
  accounts?: any[]
}

const filterData = (data: any[], query: string) => {
  if (!query) return data
  const lowerQuery = query.toLowerCase()
  return data.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(lowerQuery),
  )
}

export function QuickBooksView({ info }: ToolViewProps) {
  const quickbooksInfo = (info || {}) as QuickBooksInfo
  const [activeDataTab, setActiveDataTab] = useState<string>("company")
  const [infoSearchQuery, setInfoSearchQuery] = useState("")

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
            {quickbooksInfo.invoices && quickbooksInfo.invoices.length > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {quickbooksInfo.invoices.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveDataTab("bills")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeDataTab === "bills"
                ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span className="hidden sm:inline">Bills</span>
            {quickbooksInfo.bills && quickbooksInfo.bills.length > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {quickbooksInfo.bills.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveDataTab("vendors")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeDataTab === "vendors"
                ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Vendors</span>
            {quickbooksInfo.vendors && quickbooksInfo.vendors.length > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {quickbooksInfo.vendors.length}
              </Badge>
            )}
          </button>
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
            {quickbooksInfo.accounts && quickbooksInfo.accounts.length > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {quickbooksInfo.accounts.length}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* QuickBooks Company Tab */}
      {activeDataTab === "company" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            Company Information
          </h3>
          {quickbooksInfo.company ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(quickbooksInfo.company.CompanyName || quickbooksInfo.company.LegalName) && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Company Name</p>
                  <p className="text-white font-medium">{quickbooksInfo.company.CompanyName || quickbooksInfo.company.LegalName}</p>
                </div>
              )}
              {quickbooksInfo.company.CompanyAddr && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Address</p>
                  <p className="text-white font-medium">
                    {[quickbooksInfo.company.CompanyAddr.Line1, quickbooksInfo.company.CompanyAddr.City, quickbooksInfo.company.CompanyAddr.CountrySubDivisionCode].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}
              {quickbooksInfo.company.FiscalYearStartMonth && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fiscal Year Start</p>
                  <p className="text-white font-medium">Month {quickbooksInfo.company.FiscalYearStartMonth}</p>
                </div>
              )}
              {quickbooksInfo.company.Country && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Country</p>
                  <p className="text-white font-medium">{quickbooksInfo.company.Country}</p>
                </div>
              )}
              {quickbooksInfo.company.CompanyEmail?.Address && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-white font-medium">{quickbooksInfo.company.CompanyEmail.Address}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              Company information not available.
            </div>
          )}
        </div>
      )}

      {/* QuickBooks Invoices Tab */}
      {activeDataTab === "invoices" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Invoices
            {quickbooksInfo.invoices && (
              <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                {quickbooksInfo.invoices.length}
              </Badge>
            )}
          </h3>
          {quickbooksInfo.invoices && quickbooksInfo.invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Doc #</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Customer</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Total</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Balance</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Due Date</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Txn Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filterData(quickbooksInfo.invoices, infoSearchQuery).slice(0, 50).map((inv: any, idx: number) => (
                    <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/5">
                      <td className="py-3 px-4 text-white font-medium">{inv.DocNumber || "N/A"}</td>
                      <td className="py-3 px-4 text-gray-400">{inv.CustomerRef?.name || "N/A"}</td>
                      <td className="py-3 px-4 text-right text-emerald-400">{inv.TotalAmt ?? "N/A"}</td>
                      <td className="py-3 px-4 text-right text-white">{inv.Balance ?? "N/A"}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{inv.DueDate || "N/A"}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{inv.TxnDate || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {quickbooksInfo.invoices.length > 50 && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  Showing 50 of {quickbooksInfo.invoices.length} invoices. Use search to filter.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">No invoices found.</div>
          )}
        </div>
      )}

      {/* QuickBooks Bills Tab */}
      {activeDataTab === "bills" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            Bills
            {quickbooksInfo.bills && (
              <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                {quickbooksInfo.bills.length}
              </Badge>
            )}
          </h3>
          {quickbooksInfo.bills && quickbooksInfo.bills.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Doc #</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Vendor</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Total</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Balance</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Due Date</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Txn Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filterData(quickbooksInfo.bills, infoSearchQuery).slice(0, 50).map((bill: any, idx: number) => (
                    <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/5">
                      <td className="py-3 px-4 text-white font-medium">{bill.DocNumber || "N/A"}</td>
                      <td className="py-3 px-4 text-gray-400">{bill.VendorRef?.name || "N/A"}</td>
                      <td className="py-3 px-4 text-right text-emerald-400">{bill.TotalAmt ?? "N/A"}</td>
                      <td className="py-3 px-4 text-right text-white">{bill.Balance ?? "N/A"}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{bill.DueDate || "N/A"}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{bill.TxnDate || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {quickbooksInfo.bills.length > 50 && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  Showing 50 of {quickbooksInfo.bills.length} bills. Use search to filter.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">No bills found.</div>
          )}
        </div>
      )}

      {/* QuickBooks Vendors Tab */}
      {activeDataTab === "vendors" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Vendors
            {quickbooksInfo.vendors && (
              <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                {quickbooksInfo.vendors.length}
              </Badge>
            )}
          </h3>
          {quickbooksInfo.vendors && quickbooksInfo.vendors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Display Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Company</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Phone</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filterData(quickbooksInfo.vendors, infoSearchQuery).slice(0, 50).map((vendor: any, idx: number) => (
                    <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/5">
                      <td className="py-3 px-4 text-white font-medium">{vendor.DisplayName || "N/A"}</td>
                      <td className="py-3 px-4 text-gray-400">{vendor.CompanyName || "N/A"}</td>
                      <td className="py-3 px-4 text-gray-400">{vendor.PrimaryPhone?.FreeFormNumber || "N/A"}</td>
                      <td className="py-3 px-4 text-gray-400">{vendor.PrimaryEmailAddr?.Address || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {quickbooksInfo.vendors.length > 50 && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  Showing 50 of {quickbooksInfo.vendors.length} vendors. Use search to filter.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">No vendors found.</div>
          )}
        </div>
      )}

      {/* QuickBooks Accounts Tab */}
      {activeDataTab === "accounts" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Accounts
            {quickbooksInfo.accounts && (
              <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                {quickbooksInfo.accounts.length}
              </Badge>
            )}
          </h3>
          {quickbooksInfo.accounts && quickbooksInfo.accounts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filterData(quickbooksInfo.accounts, infoSearchQuery).slice(0, 50).map((acct: any, idx: number) => (
                    <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/5">
                      <td className="py-3 px-4 text-white font-medium">{acct.Name || "N/A"}</td>
                      <td className="py-3 px-4 text-gray-400">{acct.AccountType || "N/A"}</td>
                      <td className="py-3 px-4 text-right text-emerald-400">{acct.CurrentBalance ?? "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {quickbooksInfo.accounts.length > 50 && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  Showing 50 of {quickbooksInfo.accounts.length} accounts. Use search to filter.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">No accounts found.</div>
          )}
        </div>
      )}

      {/* Show message if no QuickBooks data */}
      {Object.keys(quickbooksInfo).length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No data available. Data is loading or integration needs to be reconnected.</p>
        </div>
      )}
    </div>
  )
}
