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
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "growth":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "startup":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return "text-red-400"
    if (percent >= 70) return "text-orange-400"
    if (percent >= 50) return "text-yellow-400"
    return "text-green-400"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Token Management
          </h2>
          <p className="text-gray-400 mt-1">
            Monitor and manage customer token usage
          </p>
        </div>
        <Button
          onClick={fetchTokenUsage}
          variant="outline"
          className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Customers</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="p-3 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Tokens Allocated</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalTokensAllocated.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/30">
                <Coins className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Overall Usage</p>
                <p className="text-2xl font-bold text-white">
                  {stats.overallUsagePercent}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Low Token Alerts</p>
                <p className="text-2xl font-bold text-white">
                  {stats.lowTokenCustomers}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/20 border border-orange-500/30">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-black/50 border-white/10 text-white"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-black/50 border-white/10 text-white">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10">
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
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-cyan-400" />
            Customer Token Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Coins className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No customers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-gray-400">Customer</TableHead>
                    <TableHead className="text-gray-400">Plan</TableHead>
                    <TableHead className="text-gray-400 text-center">
                      Tokens
                    </TableHead>
                    <TableHead className="text-gray-400 text-center">
                      Usage
                    </TableHead>
                    <TableHead className="text-gray-400 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.userId}
                      className="border-white/10 hover:bg-white/5"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">
                            {customer.name || "Unknown"}
                          </p>
                          <p className="text-sm text-gray-400">{customer.email}</p>
                          {customer.company && (
                            <p className="text-xs text-gray-500">
                              {customer.company}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPlanBadgeColor(customer.planTier)}>
                          {customer.planTier === "custom"
                            ? "Enterprise"
                            : customer.planTier.charAt(0).toUpperCase() +
                              customer.planTier.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-white font-medium">
                            {customer.availableTokens} / {customer.totalTokens}
                          </span>
                          <span className="text-xs text-gray-500">available</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-1 min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${getUsageColor(customer.usagePercent)}`}
                            >
                              {customer.usagePercent}%
                            </span>
                            {customer.availableTokens <= 2 &&
                              customer.totalTokens > 0 && (
                                <AlertTriangle className="w-4 h-4 text-orange-400" />
                              )}
                          </div>
                          <Progress
                            value={customer.usagePercent}
                            className="h-1.5 w-full bg-white/10"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"
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
        <DialogContent className="bg-black border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Adjust Tokens</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add or remove tokens for {selectedCustomer?.name || selectedCustomer?.email}
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6 py-4">
              {/* Current Balance */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Current Balance</span>
                  <span className="text-white font-semibold">
                    {selectedCustomer.availableTokens} / {selectedCustomer.totalTokens}
                  </span>
                </div>
                <Progress
                  value={selectedCustomer.usagePercent}
                  className="h-2 bg-white/10"
                />
              </div>

              {/* Adjustment Amount */}
              <div className="space-y-2">
                <Label className="text-gray-300">Adjustment Amount</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="bg-transparent border-white/10 text-white hover:bg-red-500/20 hover:border-red-500/30 hover:text-white"
                    onClick={() => setAdjustmentAmount((prev) => prev - 10)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                    className="text-center bg-black/50 border-white/10 text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="bg-transparent border-white/10 text-white hover:bg-green-500/20 hover:border-green-500/30 hover:text-white"
                    onClick={() => setAdjustmentAmount((prev) => prev + 10)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Use positive numbers to add tokens, negative to remove
                </p>
              </div>

              {/* Preview */}
              {adjustmentAmount !== 0 && (
                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">New Balance</span>
                    <span className="text-cyan-400 font-semibold">
                      {Math.max(0, selectedCustomer.availableTokens + adjustmentAmount)} tokens
                    </span>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label className="text-gray-300">Reason (optional)</Label>
                <Input
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g., Customer support credit"
                  className="bg-black/50 border-white/10 text-white"
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
              className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjustTokens}
              disabled={adjustmentAmount === 0 || isAdjusting}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
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
