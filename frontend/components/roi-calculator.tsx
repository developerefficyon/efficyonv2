"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight, DollarSign, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

const tools = [
  {
    name: "Microsoft 365",
    category: "Productivity",
    costPerUser: 15,
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
  },
  {
    name: "HubSpot",
    category: "CRM/Marketing",
    costPerUser: 20,
    logo: "https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png",
  },
  {
    name: "QuickBooks",
    category: "Finance",
    costPerUser: 10,
    logo: "https://cdn.worldvectorlogo.com/logos/quickbooks-1.svg",
  },
  {
    name: "Slack",
    category: "Communication",
    costPerUser: 8,
    logo: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg",
  },
  {
    name: "Salesforce",
    category: "CRM",
    costPerUser: 25,
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg",
  },
  {
    name: "Google Workspace",
    category: "Productivity",
    costPerUser: 12,
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg",
  },
  {
    name: "Zoom",
    category: "Communication",
    costPerUser: 6,
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/11/Zoom_Logo_2022.svg",
  },
  {
    name: "Asana",
    category: "Project Mgmt",
    costPerUser: 10,
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/3b/Asana_logo.svg",
  },
  {
    name: "Jira",
    category: "Project Mgmt",
    costPerUser: 8,
    logo: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Jira_Logo.svg",
  },
  {
    name: "Notion",
    category: "Productivity",
    costPerUser: 8,
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
  },
  {
    name: "Dropbox",
    category: "Storage",
    costPerUser: 6,
    logo: "https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg",
  },
  {
    name: "Adobe Creative",
    category: "Design",
    costPerUser: 30,
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/ac/Creative_Cloud.svg",
  },
  {
    name: "Monday.com",
    category: "Project Mgmt",
    costPerUser: 10,
    logo: "https://dapulse-res.cloudinary.com/image/upload/f_auto,q_auto/remote_mondaycom_static/img/monday-logo-x2.png",
  },
  {
    name: "Zendesk",
    category: "Support",
    costPerUser: 15,
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Zendesk_logo.svg",
  },
  {
    name: "Mailchimp",
    category: "Marketing",
    costPerUser: 5,
    logo: "https://cdn.brandfetch.io/idM48WPRsa/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1668402334931",
  },
  {
    name: "Fortnox",
    category: "Accounting",
    costPerUser: 12,
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Fortnox_logo.svg/512px-Fortnox_logo.svg.png",
  },
  {
    name: "Xero",
    category: "Accounting",
    costPerUser: 14,
    logo: "https://upload.wikimedia.org/wikipedia/en/9/9f/Xero_software_logo.svg",
  },
  {
    name: "Freshdesk",
    category: "Support",
    costPerUser: 12,
    logo: "https://cdn.worldvectorlogo.com/logos/freshdesk-logo.svg",
  },
  {
    name: "Trello",
    category: "Project Mgmt",
    costPerUser: 5,
    logo: "https://upload.wikimedia.org/wikipedia/en/8/8c/Trello_logo.svg",
  },
  {
    name: "Intercom",
    category: "Support",
    costPerUser: 20,
    logo: "https://cdn.worldvectorlogo.com/logos/intercom-2.svg",
  },
  {
    name: "Figma",
    category: "Design",
    costPerUser: 15,
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg",
  },
  {
    name: "Airtable",
    category: "Database",
    costPerUser: 10,
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Airtable_Logo.svg",
  },
  {
    name: "Confluence",
    category: "Documentation",
    costPerUser: 6,
    logo: "https://cdn.worldvectorlogo.com/logos/confluence-1.svg",
  },
  {
    name: "Miro",
    category: "Collaboration",
    costPerUser: 8,
    logo: "https://cdn.worldvectorlogo.com/logos/miro-2.svg",
  },
]

export function ROICalculator() {
  const [employees, setEmployees] = useState(25)
  const [selectedTools, setSelectedTools] = useState<string[]>(["Microsoft 365", "HubSpot", "QuickBooks"])

  const toggleTool = (toolName: string) => {
    setSelectedTools((prev) => (prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]))
  }

  // Calculate costs
  const selectedToolsData = tools.filter((t) => selectedTools.includes(t.name))
  const monthlyCost = selectedToolsData.reduce((acc, tool) => acc + tool.costPerUser * employees, 0)
  const licenseSavings = Math.round(monthlyCost * 12 * 0.25) // 25% license savings
  const hoursSaved = Math.round(employees * 0.9 * 12) // 0.9 hours per employee per month
  const timeSavingsValue = hoursSaved * 50 // $50 per hour
  const annualSavings = licenseSavings + timeSavingsValue
  const efficyonCost = employees <= 10 ? 39 * 12 : employees <= 50 ? 119 * 12 : 2000 * 12
  const netSavings = annualSavings - efficyonCost
  const paybackMonths = Math.ceil(efficyonCost / (annualSavings / 12))

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Left: Controls */}
      <Card className="bg-black/80 backdrop-blur-sm border-white/10">
        <CardContent className="p-6 space-y-8">
          {/* Employee Slider */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-white font-medium">Number of Employees</label>
              <span className="text-2xl font-bold text-white">{employees}</span>
            </div>
            <Slider
              value={[employees]}
              onValueChange={(value) => setEmployees(value[0])}
              min={5}
              max={500}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-gray-400 text-sm">
              <span>5</span>
              <span>500 employees</span>
            </div>
          </div>

          {/* Tool Selection */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-white font-medium">Select Your Tools & Systems</label>
              <span className="text-gray-400 text-sm">{selectedTools.length} selected</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tools.map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => toggleTool(tool.name)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all duration-200",
                    selectedTools.includes(tool.name)
                      ? "border-blue-400 bg-blue-400/10 text-white"
                      : "border-white/10 bg-black/50 text-gray-400 hover:border-white/30",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {selectedTools.includes(tool.name) ? (
                      <Check className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 flex-shrink-0 relative">
                        <Image
                          src={tool.logo || "/placeholder.svg"}
                          alt={`${tool.name} logo`}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tool.name}</p>
                      <p className="text-xs text-gray-500">{tool.category}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right: Results - All currency displays now use USD */}
      <div className="space-y-6">
        {/* Monthly Cost */}
        <Card className="bg-black/80 backdrop-blur-sm border-white/10">
          <CardContent className="p-6">
            <p className="text-gray-400 text-sm mb-2">Estimated Monthly Cost</p>
            <p className="text-3xl font-bold text-white">${monthlyCost.toLocaleString()}</p>
            <p className="text-gray-500 text-sm">Based on {employees} employees × selected tools</p>
          </CardContent>
        </Card>

        {/* Annual Savings */}
        <Card className="bg-gradient-to-br from-green-800/70 to-green-900/50 border-green-700/60">
          <CardContent className="p-6">
            <p className="text-green-400 text-sm mb-2">Your Potential Annual Savings</p>
            <p className="text-4xl font-bold text-white">${annualSavings.toLocaleString()}</p>
            <p className="text-green-400 text-sm">${Math.round(annualSavings / 12).toLocaleString()} saved per month</p>
          </CardContent>
        </Card>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-black/80 backdrop-blur-sm border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-blue-400" />
                <p className="text-gray-400 text-xs">License Savings</p>
              </div>
              <p className="text-xl font-bold text-white">${licenseSavings.toLocaleString()}</p>
              <p className="text-gray-500 text-xs">~25% of license costs</p>
            </CardContent>
          </Card>

          <Card className="bg-black/80 backdrop-blur-sm border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-orange-400" />
                <p className="text-gray-400 text-xs">Time Savings Value</p>
              </div>
              <p className="text-xl font-bold text-white">${timeSavingsValue.toLocaleString()}</p>
              <p className="text-gray-500 text-xs">{hoursSaved} hours × $50/hr</p>
            </CardContent>
          </Card>
        </div>

        {/* Net Profit & Payback */}
        <Card className="bg-black/80 backdrop-blur-sm border-blue-500/30">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-sm">Net Profit (after Efficyon cost)</p>
              <p className="text-2xl font-bold text-white">${netSavings.toLocaleString()}/year</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Payback Period</p>
              <p className="text-2xl font-bold text-blue-400">{paybackMonths} mo</p>
            </div>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full bg-white text-black hover:bg-gray-100">
          Get Started Free
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-center text-gray-500 text-xs">
          * Calculations based on industry benchmarks. Actual results may vary.
        </p>
      </div>
    </div>
  )
}
