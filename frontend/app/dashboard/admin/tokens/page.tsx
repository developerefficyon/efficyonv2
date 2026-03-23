"use client"

import { useEffect, useState, useMemo } from "react"
import { getBackendToken } from "@/lib/auth-hooks"
import { getCache, setCache } from "@/lib/use-api-cache"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Coins,
  Search,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  Plus,
  Minus,
  RefreshCw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"

interface CustomerTokenData {
  userId: string
  email: string
  name: string
  company: string | null
  planTier: string
  totalTokens: number
  usedTokens: number
  availableTokens: number
  usagePercent: number
  updatedAt: string
}

export default function AdminTokensPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [planFilter, setPlanFilter] = useState<string>("all")
  const cachedTokenData = getCache<CustomerTokenData[]>("admin-token-usage")
  const [customers, setCustomers] = useState<CustomerTokenData[]>(cachedTokenData || [])
  const [isLoading, setIsLoading] = useState(!cachedTokenData)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerTokenData | null>(null)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0)
  const [adjustmentReason, setAdjustmentReason] = useState("")
  const [isAdjusting, setIsAdjusting] = useState(false)

  // Fetch token usage data
  const fetchTokenUsage = async () => {
    if (!getCache("admin-token-usage")) {
      setIsLoading(true)
    }
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired")
        return
      }

      const response = await fetch(`${apiBase}/api/admin/tokens/usage`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (response.ok) {
        const data = await response.json()
        const tokenCustomers = data.customers || []
        setCustomers(tokenCustomers)
        setCache("admin-token-usage", tokenCustomers)
      } else {
        const error = await response.json()
        toast.error("Failed to fetch token usage", { description: error.error })
      }
    } catch (error) {
      console.error("Error fetching token usage:", error)
      toast.error("Failed to fetch token usage")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTokenUsage()
  }, [])

  // Handle token adjustment
  const handleAdjustTokens = async () => {
    if (!selectedCustomer || adjustmentAmount === 0) {
      toast.error("Please enter an adjustment amount")
      return
    }

    setIsAdjusting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired")
        return
      }

      const response = await fetch(`${apiBase}/api/admin/tokens/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: selectedCustomer.userId,
          adjustment: adjustmentAmount,
          reason: adjustmentReason || "Admin adjustment",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Tokens adjusted successfully", {
          description: `New balance: ${data.balanceAfter} tokens`,
        })
        setIsAdjustModalOpen(false)
        setAdjustmentAmount(0)
        setAdjustmentReason("")
        setSelectedCustomer(null)
        // Refresh the data
        fetchTokenUsage()
      } else {
        const error = await response.json()
        toast.error("Failed to adjust tokens", { description: error.error })
      }
    } catch (error) {
      console.error("Error adjusting tokens:", error)
      toast.error("Failed to adjust tokens")
    } finally {
      setIsAdjusting(false)
    }
  }

  // Filter and search customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        searchQuery === "" ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesPlan =
        planFilter === "all" || customer.planTier === planFilter

      return matchesSearch && matchesPlan
    })
  }, [customers, searchQuery, planFilter])

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = customers.length
    const totalTokensAllocated = customers.reduce((sum, c) => sum + c.totalTokens, 0)
    const totalTokensUsed = customers.reduce((sum, c) => sum + c.usedTokens, 0)
    const lowTokenCustomers = customers.filter(
      (c) => c.availableTokens <= 2 && c.totalTokens > 0
    ).length
    const highUsageCustomers = customers.filter((c) => c.usagePercent >= 80).length

    return {
      total,
      totalTokensAllocated,
      totalTokensUsed,
      overallUsagePercent:
        totalTokensAllocated > 0
          ? Math.round((totalTokensUsed / totalTokensAllocated) * 100)
          : 0,
      lowTokenCustomers,
      highUsageCustomers,
    }
  }, [customers])

  const getPlanBadgeColor = (planTier: string) => {
    switch (planTier) {
      case "custom":
        return "bg-purple-500/10 text-purple-400/80 border-purple-500/15"
      case "growth":
        return "bg-blue-500/10 text-blue-400/80 border-blue-500/15"
      case "startup":
        return "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15"
      default:
        return "bg-white/[0.04] text-white/40 border-white/[0.08]"
    }
  }

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return "text-red-400/80"
    if (percent >= 70) return "text-orange-400/80"
    if (percent >= 50) return "text-yellow-400/80"
    return "text-emerald-400/80"
  }

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-slide-up delay-0">
        <div>
          <p className="text-[13px] text-white/30 font-medium mb-1">Resource Management</p>
          <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight">
            Token <span className="italic text-emerald-400/90">Management</span>
          </h2>
          <p className="text-[14px] text-white/35 mt-1">Monitor and manage customer token usage</p>
        </div>
        <Button
          onClick={fetchTokenUsage}
          variant="outline"
          className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white/80"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-1">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-cyan-500/10 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-cyan-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Total Customers</span>
            </div>
            <p className="text-3xl font-semibold text-white tracking-tight">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Coins className="w-3.5 h-3.5 text-blue-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Tokens Allocated</span>
            </div>
            <p className="text-3xl font-semibold text-white tracking-tight">
              {stats.totalTokensAllocated.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-3">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Overall Usage</span>
            </div>
            <p className="text-3xl font-semibold text-white tracking-tight">
              {stats.overallUsagePercent}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-4">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Low Token Alerts</span>
            </div>
            <p className="text-3xl font-semibold text-white tracking-tight">
              {stats.lowTokenCustomers}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-5">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <Input
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white/[0.03] border-white/[0.06] text-white">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-white/[0.08]">
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="startup">Startup</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="custom">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Token Usage Table */}
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-6">
        <CardHeader>
          <CardTitle className="text-[12px] text-white/40 font-medium uppercase tracking-wider">
            Customer Token Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 bg-white/[0.04] rounded animate-pulse" />
                    <div className="h-2.5 w-48 bg-white/[0.03] rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-16 bg-white/[0.04] rounded-full animate-pulse" />
                  <div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" />
                  <div className="space-y-1.5 w-24">
                    <div className="h-3 w-12 bg-white/[0.04] rounded animate-pulse mx-auto" />
                    <div className="h-1.5 w-full bg-white/[0.04] rounded-full animate-pulse" />
                  </div>
                  <div className="h-7 w-16 bg-white/[0.04] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Coins className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-[13px]">No customers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium">Customer</TableHead>
                    <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium">Plan</TableHead>
                    <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium text-center">
                      Tokens
                    </TableHead>
                    <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium text-center">
                      Usage
                    </TableHead>
                    <TableHead className="text-white/40 text-[11px] uppercase tracking-wider font-medium text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.userId}
                      className="border-white/[0.06] hover:bg-white/[0.02]"
                    >
                      <TableCell>
                        <div>
                          <p className="text-[13px] font-medium text-white/80">
                            {customer.name || "Unknown"}
                          </p>
                          <p className="text-[12px] text-white/40">{customer.email}</p>
                          {customer.company && (
                            <p className="text-[11px] text-white/25">
                              {customer.company}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getPlanBadgeColor(customer.planTier)} text-[10px]`}>
                          {customer.planTier === "custom"
                            ? "Enterprise"
                            : customer.planTier.charAt(0).toUpperCase() +
                              customer.planTier.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-[13px] text-white/70 font-medium">
                            {customer.availableTokens} / {customer.totalTokens}
                          </span>
                          <span className="text-[11px] text-white/25">available</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-1 min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[13px] font-medium ${getUsageColor(customer.usagePercent)}`}
                            >
                              {customer.usagePercent}%
                            </span>
                            {customer.availableTokens <= 2 &&
                              customer.totalTokens > 0 && (
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-400/70" />
                              )}
                          </div>
                          <Progress
                            value={customer.usagePercent}
                            className="h-1.5 w-full bg-white/[0.04]"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white/80"
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setIsAdjustModalOpen(true)
                          }}
                        >
                          Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjust Tokens Modal */}
      <Dialog open={isAdjustModalOpen} onOpenChange={setIsAdjustModalOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white">Adjust Tokens</DialogTitle>
            <DialogDescription className="text-white/40">
              Add or remove tokens for {selectedCustomer?.name || selectedCustomer?.email}
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6 py-4">
              {/* Current Balance */}
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/40 text-[13px]">Current Balance</span>
                  <span className="text-white font-semibold text-[13px]">
                    {selectedCustomer.availableTokens} / {selectedCustomer.totalTokens}
                  </span>
                </div>
                <Progress
                  value={selectedCustomer.usagePercent}
                  className="h-2 bg-white/[0.04]"
                />
              </div>

              {/* Adjustment Amount */}
              <div className="space-y-2">
                <Label className="text-white/50 text-[13px]">Adjustment Amount</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="bg-white/[0.04] border-white/[0.08] text-white/60 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400/80"
                    onClick={() => setAdjustmentAmount((prev) => prev - 10)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                    className="text-center bg-white/[0.03] border-white/[0.06] text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="bg-white/[0.04] border-white/[0.08] text-white/60 hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400/80"
                    onClick={() => setAdjustmentAmount((prev) => prev + 10)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-white/25">
                  Use positive numbers to add tokens, negative to remove
                </p>
              </div>

              {/* Preview */}
              {adjustmentAmount !== 0 && (
                <div className="p-4 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-[13px]">New Balance</span>
                    <span className="text-emerald-400/80 font-semibold text-[13px]">
                      {Math.max(0, selectedCustomer.availableTokens + adjustmentAmount)} tokens
                    </span>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label className="text-white/50 text-[13px]">Reason (optional)</Label>
                <Input
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g., Customer support credit"
                  className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAdjustModalOpen(false)
                setAdjustmentAmount(0)
                setAdjustmentReason("")
              }}
              className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white/80"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjustTokens}
              disabled={adjustmentAmount === 0 || isAdjusting}
              className="bg-gradient-to-r from-emerald-600/80 to-cyan-600/80 hover:from-emerald-500/80 hover:to-cyan-500/80 text-white border-0"
            >
              {isAdjusting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adjusting...
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4 mr-2" />
                  Apply Adjustment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
