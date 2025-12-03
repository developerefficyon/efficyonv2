"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
} from "lucide-react"

export default function AdminAnalyticsPage() {
  const overviewStats = [
    {
      title: "Total Revenue",
      value: "$542.3K",
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      title: "Active Customers",
      value: "328",
      change: "+8.2%",
      trend: "up",
      icon: Users,
      color: "text-blue-400",
    },
    {
      title: "Avg Customer Value",
      value: "$1,653",
      change: "+5.1%",
      trend: "up",
      icon: TrendingUp,
      color: "text-cyan-400",
    },
    {
      title: "Churn Rate",
      value: "2.3%",
      change: "-0.8%",
      trend: "down",
      icon: TrendingDown,
      color: "text-orange-400",
    },
  ]

  const revenueByPlan = [
    { plan: "Startup", revenue: "$12.4K", percentage: 23, customers: 318 },
    { plan: "Growth", revenue: "$38.9K", percentage: 72, customers: 327 },
    { plan: "Enterprise", revenue: "$491K", percentage: 91, customers: 245 },
  ]

  const topCustomers = [
    { name: "Future Systems", revenue: "$60K", savings: "$450K", employees: 250 },
    { name: "TechStart Inc", revenue: "$24K", savings: "$125K", employees: 120 },
    { name: "Acme Corporation", revenue: "$14.3K", savings: "$47.5K", employees: 45 },
    { name: "Innovate Labs", revenue: "$14.3K", savings: "$28.3K", employees: 32 },
  ]

  const growthMetrics = [
    { month: "Jan", customers: 280, revenue: 420 },
    { month: "Feb", customers: 295, revenue: 445 },
    { month: "Mar", customers: 310, revenue: 468 },
    { month: "Apr", customers: 328, revenue: 495 },
    { month: "May", customers: 342, revenue: 520 },
    { month: "Jun", customers: 328, revenue: 542 },
  ]

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Analytics</h2>
          <p className="text-sm sm:text-base text-gray-400">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button variant="outline" className="border-white/10 bg-black/50 text-white text-xs sm:text-sm flex-1 sm:flex-none">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            <span className="hidden sm:inline">Last 30 days</span>
            <span className="sm:hidden">30 days</span>
          </Button>
          <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm flex-1 sm:flex-none">
            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.title}
              className="bg-black/80 backdrop-blur-xl border-white/10"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  {stat.title}
                </CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="flex items-center gap-1 text-xs mt-2">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="w-3 h-3 text-green-400" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-400" />
                  )}
                  <span
                    className={stat.trend === "up" ? "text-green-400" : "text-red-400"}
                  >
                    {stat.change}
                  </span>
                  <span className="text-gray-500">vs last month</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Revenue by Plan</CardTitle>
            <p className="text-sm text-gray-400">Monthly recurring revenue breakdown</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueByPlan.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{item.plan}</span>
                      <span className="text-gray-400">({item.customers} customers)</span>
                    </div>
                    <span className="text-white font-semibold">{item.revenue}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Growth Trend */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Growth Trend</CardTitle>
            <p className="text-sm text-gray-400">6-month customer and revenue growth</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {growthMetrics.map((metric, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-12 text-sm text-gray-400">{metric.month}</div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Customers</span>
                      <span className="text-white">{metric.customers}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{
                          width: `${(metric.customers / 350) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Revenue (K)</span>
                      <span className="text-white">${metric.revenue}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full"
                        style={{
                          width: `${(metric.revenue / 600) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Top Customers by Revenue</CardTitle>
          <p className="text-sm text-gray-400">Highest value customers this month</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCustomers.map((customer, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">
                    {customer.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{customer.name}</p>
                  <div className="flex items-center gap-2 sm:gap-4 text-xs text-gray-400 mt-1 flex-wrap">
                    <span>{customer.employees} employees</span>
                    <span className="hidden sm:inline">•</span>
                    <span>Saved: {customer.savings}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-white">{customer.revenue}</p>
                  <p className="text-xs text-gray-400">Monthly</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-sm">Customer Acquisition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">47</div>
            <p className="text-xs text-gray-400">New customers this month</p>
            <div className="flex items-center gap-1 text-xs mt-2">
              <ArrowUpRight className="w-3 h-3 text-green-400" />
              <span className="text-green-400">+12%</span>
              <span className="text-gray-500">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-sm">Average Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">$7,012</div>
            <p className="text-xs text-gray-400">Per customer per month</p>
            <div className="flex items-center gap-1 text-xs mt-2">
              <ArrowUpRight className="w-3 h-3 text-green-400" />
              <span className="text-green-400">+8.5%</span>
              <span className="text-gray-500">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-sm">Retention Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">97.7%</div>
            <p className="text-xs text-gray-400">Monthly retention</p>
            <div className="flex items-center gap-1 text-xs mt-2">
              <ArrowUpRight className="w-3 h-3 text-green-400" />
              <span className="text-green-400">+0.8%</span>
              <span className="text-gray-500">vs last month</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

