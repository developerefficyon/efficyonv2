"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Settings,
  Bell,
  CreditCard,
  Key,
  User,
  Mail,
  Building2,
  Save,
  Shield,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function SettingsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    weeklyReports: true,
    renewalReminders: true,
    recommendations: true,
    systemUpdates: false,
  })

  const [billing, setBilling] = useState({
    plan: "Growth",
    nextBilling: "2024-07-15",
    paymentMethod: "•••• •••• •••• 4242",
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Settings</h2>
        <p className="text-sm sm:text-base text-gray-400">Manage your account, billing, and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="bg-black/50 border border-white/10 mb-6 w-full sm:w-auto overflow-x-auto flex-wrap sm:flex-nowrap">
              <TabsTrigger 
                value="profile" 
                className="data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/50 text-gray-300 text-xs sm:text-sm"
              >
                <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger 
                value="billing"
                className="data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/50 text-gray-300 text-xs sm:text-sm"
              >
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Billing
              </TabsTrigger>
              <TabsTrigger 
                value="notifications"
                className="data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/50 text-gray-300 text-xs sm:text-sm"
              >
                <Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger 
                value="security"
                className="data-[state=active]:bg-cyan-600/30 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/50 text-gray-300 text-xs sm:text-sm"
              >
                <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-0">
              <Card className="bg-black/80 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-cyan-400" />
                    <CardTitle className="text-white">Profile</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Your account information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      defaultValue={user?.name}
                      className="bg-black/50 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={user?.email}
                      className="bg-black/50 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-gray-300">
                      Company Name
                    </Label>
                    <Input
                      id="company"
                      className="bg-black/50 border-white/10 text-white"
                      placeholder="Your Company"
                    />
                  </div>
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="mt-0">
              <Card className="bg-black/80 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-cyan-400" />
                    <CardTitle className="text-white">Billing</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Manage your subscription and payment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-medium text-white">Current Plan</p>
                        <p className="text-xs text-gray-400">{billing.plan} Plan</p>
                      </div>
                      <Button variant="outline" size="sm" className="border-white/10 bg-black/50 text-white w-full sm:w-auto">
                        Change Plan
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Next billing: {billing.nextBilling}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">Payment Method</p>
                        <p className="text-xs text-gray-400">{billing.paymentMethod}</p>
                      </div>
                      <Button variant="outline" size="sm" className="border-white/10 bg-black/50 text-white w-full sm:w-auto">
                        Update
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0">
              <Card className="bg-black/80 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-cyan-400" />
                    <CardTitle className="text-white">Notifications</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Configure your notification preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Email Alerts</Label>
                      <p className="text-sm text-gray-400">Receive email notifications</p>
                    </div>
                    <Switch
                      checked={notifications.emailAlerts}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, emailAlerts: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Weekly Reports</Label>
                      <p className="text-sm text-gray-400">Automated weekly summaries</p>
                    </div>
                    <Switch
                      checked={notifications.weeklyReports}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, weeklyReports: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Renewal Reminders</Label>
                      <p className="text-sm text-gray-400">Get notified before renewals</p>
                    </div>
                    <Switch
                      checked={notifications.renewalReminders}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, renewalReminders: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Recommendations</Label>
                      <p className="text-sm text-gray-400">New optimization suggestions</p>
                    </div>
                    <Switch
                      checked={notifications.recommendations}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, recommendations: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <Card className="bg-black/80 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-cyan-400" />
                    <CardTitle className="text-white">Security</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full border-white/10 bg-black/50 text-white">
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full border-white/10 bg-black/50 text-white">
                    <Shield className="w-4 h-4 mr-2" />
                    Enable Two-Factor Authentication
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="bg-black/80 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-sm">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/5"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Company Profile
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/5"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
