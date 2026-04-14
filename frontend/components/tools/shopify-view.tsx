"use client"

/**
 * ShopifyView
 *
 * Detail-page body for the Shopify e-commerce integration. Reads shop,
 * orders, products, and app charges from the generic `useToolInfo`
 * payload — see `lib/tools/configs/shopify.ts` for the endpoint
 * declarations.
 *
 * UI mirrors the legacy inline JSX from `dashboard/tools/[id]/page.tsx`
 * (verbatim copy, only data-prop wiring changed).
 */

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Settings, FileText, Package, CreditCard, Search } from "lucide-react"
import type { ToolViewProps } from "@/lib/tools/types"

interface ShopifyInfo {
  shop?: any
  orders?: any[]
  products?: any[]
  appCharges?: any[]
}

const filterData = (data: any[], query: string) => {
  if (!query) return data
  const lowerQuery = query.toLowerCase()
  return data.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(lowerQuery),
  )
}

export function ShopifyView({ info }: ToolViewProps) {
  const shopifyInfo = (info || {}) as ShopifyInfo
  const [activeDataTab, setActiveDataTab] = useState<string>("shop")
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
            onClick={() => setActiveDataTab("shop")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeDataTab === "shop"
                ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Shop Info</span>
          </button>
          <button
            onClick={() => setActiveDataTab("orders")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeDataTab === "orders"
                ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Orders</span>
            {shopifyInfo.orders && shopifyInfo.orders.length > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {shopifyInfo.orders.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveDataTab("products")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeDataTab === "products"
                ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Products</span>
            {shopifyInfo.products && shopifyInfo.products.length > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {shopifyInfo.products.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveDataTab("appCharges")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeDataTab === "appCharges"
                ? "bg-cyan-500/20 text-emerald-400 border border-cyan-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">App Subscriptions</span>
            {shopifyInfo.appCharges && shopifyInfo.appCharges.length > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-white/10 text-gray-300 border-white/20">
                {shopifyInfo.appCharges.length}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Shopify Shop Info Tab */}
      {activeDataTab === "shop" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-400" />
            Shop Information
          </h3>
          {shopifyInfo.shop ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shopifyInfo.shop.name && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Shop Name</p>
                  <p className="text-white font-medium">{shopifyInfo.shop.name}</p>
                </div>
              )}
              {shopifyInfo.shop.domain && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Domain</p>
                  <p className="text-white font-medium">{shopifyInfo.shop.domain}</p>
                </div>
              )}
              {shopifyInfo.shop.plan_name && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Plan</p>
                  <p className="text-white font-medium capitalize">{shopifyInfo.shop.plan_name}</p>
                </div>
              )}
              {shopifyInfo.shop.country_name && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Country</p>
                  <p className="text-white font-medium">{shopifyInfo.shop.country_name}</p>
                </div>
              )}
              {shopifyInfo.shop.currency && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Currency</p>
                  <p className="text-white font-medium">{shopifyInfo.shop.currency}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              Shop information not available.
            </div>
          )}
        </div>
      )}

      {/* Shopify Orders Tab */}
      {activeDataTab === "orders" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Orders
            {shopifyInfo.orders && (
              <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                {shopifyInfo.orders.length}
              </Badge>
            )}
          </h3>
          {shopifyInfo.orders && shopifyInfo.orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Order</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Created</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Total</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Payment</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Fulfillment</th>
                  </tr>
                </thead>
                <tbody>
                  {filterData(shopifyInfo.orders, infoSearchQuery).slice(0, 50).map((order: any, idx: number) => (
                    <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/5">
                      <td className="py-3 px-4 text-white font-medium">{order.name || "N/A"}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400">{order.total_price ?? "N/A"}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={
                          order.financial_status === "paid"
                            ? "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15"
                            : "bg-amber-500/10 text-amber-400/80 border-amber-500/15"
                        }>
                          {order.financial_status || "N/A"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={
                          order.fulfillment_status === "fulfilled"
                            ? "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15"
                            : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                        }>
                          {order.fulfillment_status || "unfulfilled"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shopifyInfo.orders.length > 50 && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  Showing 50 of {shopifyInfo.orders.length} orders. Use search to filter.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">No orders found.</div>
          )}
        </div>
      )}

      {/* Shopify Products Tab */}
      {activeDataTab === "products" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            Products
            {shopifyInfo.products && (
              <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                {shopifyInfo.products.length}
              </Badge>
            )}
          </h3>
          {shopifyInfo.products && shopifyInfo.products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Title</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Variants</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Price Range</th>
                  </tr>
                </thead>
                <tbody>
                  {filterData(shopifyInfo.products, infoSearchQuery).slice(0, 50).map((product: any, idx: number) => {
                    const prices = (product.variants || []).map((v: any) => parseFloat(v.price || "0")).filter((p: number) => !isNaN(p))
                    const minPrice = prices.length > 0 ? Math.min(...prices) : null
                    const maxPrice = prices.length > 0 ? Math.max(...prices) : null
                    return (
                      <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/5">
                        <td className="py-3 px-4 text-white font-medium">{product.title || "N/A"}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={
                            product.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15"
                              : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                          }>
                            {product.status || "N/A"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400">{product.variants?.length || 0}</td>
                        <td className="py-3 px-4 text-right text-white">
                          {minPrice !== null
                            ? minPrice === maxPrice
                              ? `${minPrice}`
                              : `${minPrice} - ${maxPrice}`
                            : "N/A"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {shopifyInfo.products.length > 50 && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  Showing 50 of {shopifyInfo.products.length} products. Use search to filter.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">No products found.</div>
          )}
        </div>
      )}

      {/* Shopify App Subscriptions Tab */}
      {activeDataTab === "appCharges" && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            App Subscriptions
            {shopifyInfo.appCharges && (
              <Badge className="bg-cyan-500/20 text-emerald-400 border-cyan-500/30 ml-2">
                {shopifyInfo.appCharges.length}
              </Badge>
            )}
          </h3>
          {shopifyInfo.appCharges && shopifyInfo.appCharges.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Price</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filterData(shopifyInfo.appCharges, infoSearchQuery).slice(0, 50).map((charge: any, idx: number) => (
                    <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/5">
                      <td className="py-3 px-4 text-white font-medium">{charge.name || "N/A"}</td>
                      <td className="py-3 px-4 text-right text-emerald-400">{charge.price ?? "N/A"}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={
                          charge.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15"
                            : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                        }>
                          {charge.status || "N/A"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">
                        {charge.created_at ? new Date(charge.created_at).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shopifyInfo.appCharges.length > 50 && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  Showing 50 of {shopifyInfo.appCharges.length} subscriptions. Use search to filter.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">No app subscriptions found.</div>
          )}
        </div>
      )}

      {/* Show message if no Shopify data */}
      {Object.keys(shopifyInfo).length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No data available. Data is loading or integration needs to be reconnected.</p>
        </div>
      )}
    </div>
  )
}
