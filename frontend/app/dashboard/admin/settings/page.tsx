"use client"

import { useState } from "react"
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
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-slide-up delay-0">
        <div>
          <p className="text-[13px] text-white/30 font-medium mb-1">System Configuration</p>
          <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight">
            Admin <span className="italic text-violet-400/90">Settings</span>
          </h2>
          <p className="text-[14px] text-white/35 mt-1">Manage system configuration and preferences</p>
        </div>
        <Button
          onClick={handleSave}
          className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white/80 w-full sm:w-auto"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl animate-slide-up delay-1">
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-cyan-500/10 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-cyan-400/70" />
                </div>
                <div>
                  <h3 className="text-[14px] font-medium text-white/80">General Settings</h3>
                  <p className="text-[12px] text-white/25">Basic system configuration</p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-[12px] text-white/50">
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail" className="text-[12px] text-white/50">
                  Support Email
                </Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, supportEmail: e.target.value })
                  }
                  className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail" className="text-[12px] text-white/50">
                  Admin Email
                </Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, adminEmail: e.target.value })
                  }
                  className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUsers" className="text-[12px] text-white/50">
                    Max Users
                  </Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) =>
                      setFormData({ ...formData, maxUsers: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout" className="text-[12px] text-white/50">
                    Session Timeout (min)
                  </Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={formData.sessionTimeout}
                    onChange={(e) =>
                      setFormData({ ...formData, sessionTimeout: e.target.value })
                    }
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl animate-slide-up delay-2">
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-amber-400/70" />
                </div>
                <div>
                  <h3 className="text-[14px] font-medium text-white/80">Notifications</h3>
                  <p className="text-[12px] text-white/25">Configure notification preferences</p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[13px] text-white/70">Email Notifications</Label>
                  <p className="text-[12px] text-white/25">
                    Receive email alerts for important events
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={() => handleToggle("emailNotifications")}
                />
              </div>
              <div className="border-t border-white/[0.04]" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[13px] text-white/70">System Alerts</Label>
                  <p className="text-[12px] text-white/25">
                    Get notified about system issues
                  </p>
                </div>
                <Switch
                  checked={settings.systemAlerts}
                  onCheckedChange={() => handleToggle("systemAlerts")}
                />
              </div>
              <div className="border-t border-white/[0.04]" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[13px] text-white/70">Weekly Reports</Label>
                  <p className="text-[12px] text-white/25">
                    Automatically send weekly summary reports
                  </p>
                </div>
                <Switch
                  checked={settings.weeklyReports}
                  onCheckedChange={() => handleToggle("weeklyReports")}
                />
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl animate-slide-up delay-3">
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-red-500/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-red-400/70" />
                </div>
                <div>
                  <h3 className="text-[14px] font-medium text-white/80">Security</h3>
                  <p className="text-[12px] text-white/25">Manage security and access controls</p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[13px] text-white/70">Two-Factor Authentication</Label>
                  <p className="text-[12px] text-white/25">
                    Require 2FA for all admin accounts
                  </p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={() => handleToggle("twoFactorAuth")}
                />
              </div>
              <div className="border-t border-white/[0.04]" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[13px] text-white/70">API Access</Label>
                  <p className="text-[12px] text-white/25">
                    Enable API access for integrations
                  </p>
                </div>
                <Switch
                  checked={settings.apiAccess}
                  onCheckedChange={() => handleToggle("apiAccess")}
                />
              </div>
              <div className="pt-4 border-t border-white/[0.04]">
                <Button variant="outline" className="bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70">
                  <Key className="w-4 h-4 mr-2" />
                  Change Master Password
                </Button>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl animate-slide-up delay-4">
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center">
                  <Server className="w-4 h-4 text-violet-400/70" />
                </div>
                <div>
                  <h3 className="text-[14px] font-medium text-white/80">System</h3>
                  <p className="text-[12px] text-white/25">System-wide configuration</p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[13px] text-white/70">Maintenance Mode</Label>
                  <p className="text-[12px] text-white/25">
                    Temporarily disable access for maintenance
                  </p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={() => handleToggle("maintenanceMode")}
                />
              </div>
              <div className="pt-4 border-t border-white/[0.04] space-y-3">
                <Button variant="outline" className="w-full bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70">
                  <Database className="w-4 h-4 mr-2" />
                  Backup Database
                </Button>
                <Button variant="outline" className="w-full bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70">
                  <Server className="w-4 h-4 mr-2" />
                  System Status
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl animate-slide-up delay-2">
            <div className="p-6 pb-4">
              <h3 className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Quick Actions</h3>
            </div>
            <div className="px-6 pb-6 space-y-3">
              <Button
                variant="outline"
                className="w-full bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70 justify-start"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
              <Button
                variant="outline"
                className="w-full bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70 justify-start"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Settings
              </Button>
              <Button
                variant="outline"
                className="w-full bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70 justify-start"
              >
                <Globe className="w-4 h-4 mr-2" />
                Regional Settings
              </Button>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl animate-slide-up delay-3">
            <div className="p-6 pb-4">
              <h3 className="text-[12px] text-white/40 font-medium uppercase tracking-wider">System Info</h3>
            </div>
            <div className="px-6 pb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-[12px] text-white/25">Version</span>
                <span className="text-[13px] text-white/60">2.4.1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[12px] text-white/25">Last Updated</span>
                <span className="text-[13px] text-white/60">2024-06-15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[12px] text-white/25">Status</span>
                <span className="text-[13px] text-emerald-400/80">Operational</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[12px] text-white/25">Uptime</span>
                <span className="text-[13px] text-white/60">99.9%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
