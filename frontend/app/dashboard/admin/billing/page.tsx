"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react"

export default function AdminBillingPage() {
  const billingStats = [
    {
      title: "Monthly Recurring Revenue",
      value: "$45.2K",
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      color: "text-cyan-400",
    },
    {
      title: "Churn Rate",
      value: "2.3%",
      change: "-0.8%",
      trend: "down",
      icon: TrendingDown,
      color: "text-green-400",
    },
    {
      title: "Active Subscriptions",
      value: "328",
      change: "+8.2%",
      trend: "up",
      icon: Users,
      color: "text-cyan-400",
    },
    {
      title: "Avg Revenue per Customer",
      value: "$138",
      change: "+5.1%",
      trend: "up",
      icon: TrendingUp,
      color: "text-cyan-400",
    },
  ]

  const activeSubscriptions = [
    {
      company: "Acme Corporation",
      plan: "Growth",
      amount: 119,
      status: "active",
      nextBilling: "2024-07-15",
      customerSince: "2024-01-15",
    },
    {
      company: "TechStart Inc",
      plan: "Enterprise",
      amount: 2000,
      status: "active",
      nextBilling: "2024-07-20",
      customerSince: "2023-11-20",
    },
    {
      company: "Global Solutions",
      plan: "Startup",
      amount: 39,
      status: "pending",
      nextBilling: "2024-07-10",
      customerSince: "2024-03-10",
    },
  ]

  const trials = [
    {
      company: "Innovate Labs",
      plan: "Growth",
      daysLeft: 5,
      email: "admin@innovatelabs.com",
    },
    {
      company: "Digital Dynamics",
      plan: "Startup",
      daysLeft: 12,
      email: "contact@digitaldynamics.com",
    },
  ]

  const failedPayments = [
    {
      company: "Future Systems",
      amount: 2000,
      failedDate: "2 days ago",
      reason: "Card declined",
      attempts: 2,
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Billing & Subscriptions</h2>
        <p className="text-sm sm:text-base text-gray-400">Monitor revenue, subscriptions, and payment issues</p>
      </div>

      {/* Billing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {billingStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.title}
              className="bg-black/95 backdrop-blur-xl border-white/10"
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
                    <TrendingUp className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-green-400" />
                  )}
                  <span className={stat.trend === "up" ? "text-cyan-400" : "text-green-400"}>
                    {stat.change}
                  </span>
                  <span className="text-gray-500">vs last month</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Trials Ending Soon */}
      {trials.length > 0 && (
        <Card className="bg-black/95 backdrop-blur-xl border-yellow-500/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <CardTitle className="text-white">Trials Ending Soon</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trials.map((trial, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-black/50 border border-yellow-500/20"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{trial.company}</p>
                    <p className="text-xs text-gray-400 truncate">{trial.email}</p>
                    <p className="text-xs text-gray-500 mt-1">{trial.plan} Plan</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-semibold text-yellow-400">
                      {trial.daysLeft} days left
                    </p>
                    <Button
                      size="sm"
                      className="mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white w-full sm:w-auto"
                    >
                      Contact
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Payments */}
      {failedPayments.length > 0 && (
        <Card className="bg-black/95 backdrop-blur-xl border-red-500/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <CardTitle className="text-white">Failed Payments</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {failedPayments.map((payment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-black/50 border border-red-500/20"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{payment.company}</p>
                    <p className="text-xs text-gray-400">
                      {payment.reason} • {payment.attempts} attempts
                    </p>
                    <p className="text-xs text-gray-500 mt-1">${payment.amount}/mo</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-gray-400">{payment.failedDate}</p>
                    <Button
                      size="sm"
                      className="mt-2 bg-gradient-to-r from-red-500 to-orange-600 text-white w-full sm:w-auto"
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Subscriptions */}
      <Card className="bg-black/95 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Active Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeSubscriptions.map((sub, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-medium text-white truncate">{sub.company}</p>
                    <Badge
                      className={
                        sub.status === "active"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }
                    >
                      {sub.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{sub.plan} Plan</span>
                    <span>•</span>
                    <span>Next billing: {sub.nextBilling}</span>
                    <span>•</span>
                    <span>Since: {sub.customerSince}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="text-lg font-bold text-white">${sub.amount}/mo</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-gray-400 hover:text-white hover:bg-white/5 w-full sm:w-auto"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

