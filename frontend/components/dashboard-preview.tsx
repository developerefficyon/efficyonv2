"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Clock, AlertCircle, ArrowRight } from "lucide-react"

export function DashboardPreview() {
  return (
    <div className="max-w-4xl mx-auto">
      <Card className="bg-black/80 backdrop-blur-sm border-white/10 overflow-hidden">
        <CardContent className="p-0">
          {/* Dashboard Header */}
          <div className="bg-gradient-to-r from-blue-900/40 to-black/40 p-6 border-b border-white/10">
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-1">Monthly Savings</p>
                <p className="text-3xl font-bold text-white">$42,300</p>
                <p className="text-green-400 text-xs flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% vs last month
                </p>
              </div>
              <div className="text-center border-x border-white/10">
                <p className="text-gray-400 text-sm mb-1">Hours Saved</p>
                <p className="text-3xl font-bold text-white">156 hrs</p>
                <p className="text-gray-500 text-xs">Automated processes</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-1">Implemented</p>
                <p className="text-3xl font-bold text-white">8/12</p>
                <p className="text-gray-500 text-xs">Recommendations active</p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="p-6 space-y-4">
            <h4 className="text-white font-semibold">New recommendations this month</h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Consolidate development team licenses</p>
                    <p className="text-gray-400 text-sm">Potential: $8,500/month</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-red-900/40 text-red-400 text-xs rounded-full">High Priority</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-yellow-900/40 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Automate reporting workflow</p>
                    <p className="text-gray-400 text-sm">Potential: 32 hours/month</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-yellow-900/40 text-yellow-400 text-xs rounded-full">Medium Priority</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent mt-4"
            >
              See your own dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
