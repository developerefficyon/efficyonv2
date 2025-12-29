"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Settings,
  Bell,
  Shield,
  Mail,
  Key,
  Database,
  Server,
  Users,
  Globe,
  Save,
} from "lucide-react"

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    systemAlerts: true,
    weeklyReports: false,
    maintenanceMode: false,
    twoFactorAuth: true,
    apiAccess: true,
  })

  const [formData, setFormData] = useState({
    companyName: "Efficyon",
    supportEmail: "support@efficyon.com",
    adminEmail: "admin@efficyon.com",
    maxUsers: "1000",
    sessionTimeout: "30",
  })

  const handleToggle = (key: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }))
  }

  const handleSave = () => {
    // Handle save logic
    alert("Settings saved successfully!")
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Settings</h2>
          <p className="text-sm sm:text-base text-gray-400">Manage system configuration and preferences</p>
        </div>
        <Button
          onClick={handleSave}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white w-full sm:w-auto"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <Card className="bg-black/80 backdrop-blur-xl border-white/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                <CardTitle className="text-white">General Settings</CardTitle>
              </div>
              <CardDescription className="text-gray-400">
                Basic system configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-gray-300">
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  className="bg-black/50 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail" className="text-gray-300">
                  Support Email
                </Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, supportEmail: e.target.value })
                  }
                  className="bg-black/50 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail" className="text-gray-300">
                  Admin Email
                </Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, adminEmail: e.target.value })
                  }
                  className="bg-black/50 border-white/10 text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUsers" className="text-gray-300">
                    Max Users
                  </Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) =>
                      setFormData({ ...formData, maxUsers: e.target.value })
                    }
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout" className="text-gray-300">
                    Session Timeout (min)
                  </Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={formData.sessionTimeout}
                    onChange={(e) =>
                      setFormData({ ...formData, sessionTimeout: e.target.value })
                    }
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="bg-black/80 backdrop-blur-xl border-white/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-cyan-400" />
                <CardTitle className="text-white">Notifications</CardTitle>
              </div>
              <CardDescription className="text-gray-400">
                Configure notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">Email Notifications</Label>
                  <p className="text-sm text-gray-400">
                    Receive email alerts for important events
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={() => handleToggle("emailNotifications")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">System Alerts</Label>
                  <p className="text-sm text-gray-400">
                    Get notified about system issues
                  </p>
                </div>
                <Switch
                  checked={settings.systemAlerts}
                  onCheckedChange={() => handleToggle("systemAlerts")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">Weekly Reports</Label>
                  <p className="text-sm text-gray-400">
                    Automatically send weekly summary reports
                  </p>
                </div>
                <Switch
                  checked={settings.weeklyReports}
                  onCheckedChange={() => handleToggle("weeklyReports")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-black/80 backdrop-blur-xl border-white/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <CardTitle className="text-white">Security</CardTitle>
              </div>
              <CardDescription className="text-gray-400">
                Manage security and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-400">
                    Require 2FA for all admin accounts
                  </p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={() => handleToggle("twoFactorAuth")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">API Access</Label>
                  <p className="text-sm text-gray-400">
                    Enable API access for integrations
                  </p>
                </div>
                <Switch
                  checked={settings.apiAccess}
                  onCheckedChange={() => handleToggle("apiAccess")}
                />
              </div>
              <div className="pt-4 border-t border-white/10">
                <Button variant="outline" className="border-white/10 bg-black/50 text-white">
                  <Key className="w-4 h-4 mr-2" />
                  Change Master Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card className="bg-black/80 backdrop-blur-xl border-white/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-400" />
                <CardTitle className="text-white">System</CardTitle>
              </div>
              <CardDescription className="text-gray-400">
                System-wide configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">Maintenance Mode</Label>
                  <p className="text-sm text-gray-400">
                    Temporarily disable access for maintenance
                  </p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={() => handleToggle("maintenanceMode")}
                />
              </div>
              <div className="pt-4 border-t border-white/10 space-y-3">
                <Button variant="outline" className="w-full border-white/10 bg-black/50 text-white">
                  <Database className="w-4 h-4 mr-2" />
                  Backup Database
                </Button>
                <Button variant="outline" className="w-full border-white/10 bg-black/50 text-white">
                  <Server className="w-4 h-4 mr-2" />
                  System Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="bg-black/80 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-white/10 bg-black/50 text-white justify-start"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/10 bg-black/50 text-white justify-start"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Settings
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/10 bg-black/50 text-white justify-start"
              >
                <Globe className="w-4 h-4 mr-2" />
                Regional Settings
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-black/80 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white">System Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Version</span>
                <span className="text-white">2.4.1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Updated</span>
                <span className="text-white">2024-06-15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-green-400">Operational</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Uptime</span>
                <span className="text-white">99.9%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

