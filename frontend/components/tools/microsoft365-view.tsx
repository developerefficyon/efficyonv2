"use client"

/**
 * Microsoft365View
 *
 * Detail-page body for the Microsoft 365 integration. Reads licenses and
 * users from the generic `useToolInfo` payload — see
 * `lib/tools/configs/microsoft365.ts` for the endpoint declarations.
 *
 * UI mirrors the legacy inline JSX from `dashboard/tools/[id]/page.tsx`
 * (verbatim copy, only data-prop wiring changed).
 */

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Key, Users, Search } from "lucide-react"
import type { ToolViewProps } from "@/lib/tools/types"

interface Microsoft365Info {
  licenses?: any[]
  users?: any[]
  usageReports?: any
}

const filterData = (data: any[], query: string) => {
  if (!query) return data
  const lowerQuery = query.toLowerCase()
  return data.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(lowerQuery),
  )
}

export function Microsoft365View({ info }: ToolViewProps) {
  const microsoft365Info = (info || {}) as Microsoft365Info
  const [activeDataTab, setActiveDataTab] = useState<string>("licenses")
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
            onClick={() => setActiveDataTab("licenses")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeDataTab === "licenses"
                ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Key className="w-4 h-4" />
            <span className="hidden sm:inline">Licenses</span>
            {microsoft365Info.licenses && microsoft365Info.licenses.length > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {microsoft365Info.licenses.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveDataTab("users")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeDataTab === "users"
                ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Users</span>
            {microsoft365Info.users && microsoft365Info.users.length > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {microsoft365Info.users.length}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Microsoft 365 Licenses Tab */}
      {activeDataTab === "licenses" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            Licenses
            {microsoft365Info.licenses && (
              <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                {microsoft365Info.licenses.length}
              </Badge>
            )}
          </h3>
          {microsoft365Info.licenses && microsoft365Info.licenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">License Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">SKU ID</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Consumed</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Available</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filterData(microsoft365Info.licenses, infoSearchQuery).map((license: any, idx: number) => (
                    <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/5">
                      <td className="py-3 px-4 text-white font-medium">
                        {license.skuPartNumber || license.displayName || "Unknown"}
                      </td>
                      <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                        {license.skuId?.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-right text-white">
                        {license.consumedUnits || 0}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400">
                        {(license.prepaidUnits?.enabled || 0) - (license.consumedUnits || 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400">
                        {license.prepaidUnits?.enabled || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No licenses found.
            </div>
          )}
        </div>
      )}

      {/* Microsoft 365 Users Tab */}
      {activeDataTab === "users" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Users
            {microsoft365Info.users && (
              <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                {microsoft365Info.users.length}
              </Badge>
            )}
          </h3>
          {microsoft365Info.users && microsoft365Info.users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Licenses</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Sign-In</th>
                  </tr>
                </thead>
                <tbody>
                  {filterData(microsoft365Info.users, infoSearchQuery).slice(0, 50).map((user: any, idx: number) => (
                    <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/5">
                      <td className="py-3 px-4 text-white font-medium">
                        {user.displayName || "Unknown"}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {user.mail || user.userPrincipalName || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={user.accountEnabled
                          ? "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15"
                          : "bg-red-500/10 text-red-400/80 border-red-500/15"
                        }>
                          {user.accountEnabled ? "Active" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-400">
                        {user.assignedLicenses?.length || 0}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">
                        {user.signInActivity?.lastSignInDateTime
                          ? new Date(user.signInActivity.lastSignInDateTime).toLocaleDateString()
                          : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {microsoft365Info.users.length > 50 && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  Showing 50 of {microsoft365Info.users.length} users. Use search to filter.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No users found.
            </div>
          )}
        </div>
      )}

      {/* Show message if no M365 data */}
      {Object.keys(microsoft365Info).length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No data available. Data is loading or integration needs to be reconnected.</p>
        </div>
      )}
    </div>
  )
}
