"use client"

/**
 * HubSpotView
 *
 * Detail-page body for the HubSpot CRM/Marketing integration. Reads users
 * and account info from the generic `useToolInfo` payload — see
 * `lib/tools/configs/hubspot.ts` for the endpoint declarations.
 *
 * UI mirrors the legacy inline JSX from `dashboard/tools/[id]/page.tsx`
 * (verbatim copy, only data-prop wiring changed).
 */

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Users, Settings } from "lucide-react"
import type { ToolViewProps } from "@/lib/tools/types"

interface HubSpotInfo {
  users?: any[]
  accountInfo?: any
}

const filterData = (data: any[], query: string) => {
  if (!query) return data
  const lowerQuery = query.toLowerCase()
  return data.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(lowerQuery),
  )
}

export function HubSpotView({ info }: ToolViewProps) {
  const hubspotInfo = (info || {}) as HubSpotInfo
  const [activeDataTab, setActiveDataTab] = useState<string>("users")
  const [infoSearchQuery] = useState("")

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-lg border border-white/[0.06]">
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
            {hubspotInfo.users && hubspotInfo.users.length > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {hubspotInfo.users.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveDataTab("account")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeDataTab === "account"
                ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Account</span>
          </button>
        </div>
      </div>

      {/* HubSpot Users Tab */}
      {activeDataTab === "users" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            HubSpot Users
            {hubspotInfo.users && (
              <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                {hubspotInfo.users.length}
              </Badge>
            )}
          </h3>
          {hubspotInfo.users && hubspotInfo.users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Role</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {filterData(hubspotInfo.users, infoSearchQuery).slice(0, 50).map((user: any, idx: number) => (
                    <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/5">
                      <td className="py-3 px-4 text-white font-medium">
                        {user.email || "Unknown"}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {user.roleId || user.role || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={user.superAdmin
                          ? "bg-violet-500/10 text-violet-400/70 border-violet-500/15"
                          : "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15"
                        }>
                          {user.superAdmin ? "Super Admin" : "Active"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hubspotInfo.users.length > 50 && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  Showing 50 of {hubspotInfo.users.length} users. Use search to filter.
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

      {/* HubSpot Account Tab */}
      {activeDataTab === "account" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-400" />
            Account Information
          </h3>
          {hubspotInfo.accountInfo ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hubspotInfo.accountInfo.portalId && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Portal ID</p>
                  <p className="text-white font-medium">{hubspotInfo.accountInfo.portalId}</p>
                </div>
              )}
              {hubspotInfo.accountInfo.accountType && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Account Type</p>
                  <p className="text-white font-medium capitalize">{hubspotInfo.accountInfo.accountType}</p>
                </div>
              )}
              {hubspotInfo.accountInfo.timeZone && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Timezone</p>
                  <p className="text-white font-medium">{hubspotInfo.accountInfo.timeZone}</p>
                </div>
              )}
              {hubspotInfo.accountInfo.currency && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Currency</p>
                  <p className="text-white font-medium">{hubspotInfo.accountInfo.currency}</p>
                </div>
              )}
              {hubspotInfo.users && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Seats</p>
                  <p className="text-white font-medium">{hubspotInfo.users.length}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              Account information not available.
            </div>
          )}
        </div>
      )}

      {/* Show message if no HubSpot data */}
      {Object.keys(hubspotInfo).length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No data available. Data is loading or integration needs to be reconnected.</p>
        </div>
      )}
    </div>
  )
}
