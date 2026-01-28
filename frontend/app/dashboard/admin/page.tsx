"use client"

import { useAuth } from "@/lib/auth-hooks"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
} from "lucide-react"

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, router])

  if (user?.role !== "admin") {
    return null
  }

  const stats = [
    {
      title: "Efficyon Employees",
      value: "47",
      change: "+2.5%",
      icon: Users,
      color: "text-cyan-400",
    },
    {
      title: "Customers",
      value: "342",
      change: "+8.2%",
      icon: Building2,
      color: "text-cyan-400",
    },
    {
      title: "Total Savings",
      value: "$2.4M",
      change: "+15.1%",
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      title: "Avg ROI",
      value: "285%",
      change: "+5.3%",
      icon: TrendingUp,
      color: "text-cyan-400",
    },
  ]

  const recentEmployees = [
    { name: "John Doe", email: "john@efficyon.com", role: "Developer", joined: "2 hours ago", status: "active" },
    { name: "Jane Smith", email: "jane@efficyon.com", role: "Analyst", joined: "5 hours ago", status: "active" },
    { name: "Mike Johnson", email: "mike@efficyon.com", role: "Support", joined: "1 day ago", status: "active" },
  ]

  const recentCustomers = [
    { name: "Acme Corp", email: "contact@acme.com", plan: "Growth", joined: "2 hours ago", status: "active" },
    { name: "TechStart Inc", email: "admin@techstart.com", plan: "Enterprise", joined: "5 hours ago", status: "active" },
    { name: "Global Solutions", email: "info@global.com", plan: "Startup", joined: "1 day ago", status: "pending" },
  ]

  const systemAlerts = [
    {
      type: "success",
      message: "System backup completed successfully",
      time: "10 minutes ago",
      icon: CheckCircle,
    },
    {
      type: "warning",
      message: "High server load detected",
      time: "1 hour ago",
      icon: AlertCircle,
    },
    {
      type: "info",
      message: "New feature deployment scheduled",
      time: "3 hours ago",
      icon: AlertCircle,
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Admin Dashboard
        </h2>
        <p className="text-sm sm:text-base text-gray-400">
          Manage employees, customers, and monitor system performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
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
                <div className="text-2xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="flex items-center gap-1 text-xs mt-2">
                  <ArrowUpRight className="w-3 h-3 text-green-400" />
                  <span className="text-green-400">{stat.change}</span>
                  <span className="text-gray-500">vs last month</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Employees */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recent Employees</CardTitle>
            <p className="text-sm text-gray-400">Efficyon team members</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEmployees.map((employee, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">
                      {employee.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {employee.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {employee.email}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {employee.role}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                      {employee.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {employee.joined}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <Link
                href="/dashboard/admin/users"
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View all employees →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Customers */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recent Customers</CardTitle>
            <p className="text-sm text-gray-400">Subscribers</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCustomers.map((customer, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">
                      {customer.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {customer.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {customer.email}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {customer.plan} Plan
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        customer.status === "active"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {customer.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {customer.joined}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <Link
                href="/dashboard/admin/customers"
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View all customers →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">System Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemAlerts.map((alert, index) => {
                const Icon = alert.icon
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      alert.type === "success"
                        ? "bg-green-500/10 border-green-500/30"
                        : alert.type === "warning"
                          ? "bg-yellow-500/10 border-yellow-500/30"
                          : "bg-blue-500/10 border-blue-500/30"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        alert.type === "success"
                          ? "text-green-400"
                          : alert.type === "warning"
                            ? "text-yellow-400"
                            : "text-blue-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {alert.time}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

