"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  Users,
  UserPlus,
  Mail,
  Briefcase,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"

export default function TeamPage() {
  const teamMembers = [
    {
      id: 1,
      name: "John Doe",
      email: "john@company.com",
      role: "Developer",
      department: "Engineering",
      status: "active",
      tools: ["Slack", "Jira", "GitHub"],
      licenses: 3,
      lastActive: "2 hours ago",
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@company.com",
      role: "Product Manager",
      department: "Product",
      status: "active",
      tools: ["Slack", "Notion", "Figma"],
      licenses: 3,
      lastActive: "1 hour ago",
    },
    {
      id: 3,
      name: "Mike Johnson",
      email: "mike@company.com",
      role: "Sales Rep",
      department: "Sales",
      status: "inactive",
      tools: ["Slack", "HubSpot"],
      licenses: 2,
      lastActive: "45 days ago",
    },
    {
      id: 4,
      name: "Sarah Williams",
      email: "sarah@company.com",
      role: "Designer",
      department: "Design",
      status: "active",
      tools: ["Slack", "Figma", "Notion"],
      licenses: 3,
      lastActive: "30 minutes ago",
    },
    {
      id: 5,
      name: "David Brown",
      email: "david@company.com",
      role: "Marketing Manager",
      department: "Marketing",
      status: "active",
      tools: ["Slack", "HubSpot", "Mailchimp"],
      licenses: 3,
      lastActive: "5 hours ago",
    },
    {
      id: 6,
      name: "Emily Davis",
      email: "emily@company.com",
      role: "Analyst",
      department: "Operations",
      status: "inactive",
      tools: ["Slack", "Google Workspace"],
      licenses: 2,
      lastActive: "60 days ago",
    },
  ]

  const inactiveMembers = teamMembers.filter((m) => m.status === "inactive")
  const activeMembers = teamMembers.filter((m) => m.status === "active")

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Team Management</h2>
          <p className="text-sm sm:text-base text-gray-400">Manage team members and their tool access</p>
        </div>
        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white w-full sm:w-auto">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <p className="text-sm text-gray-400 mb-1">Total Members</p>
            <p className="text-2xl font-bold text-white">{teamMembers.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <p className="text-sm text-gray-400 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-400">{activeMembers.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <p className="text-sm text-gray-400 mb-1">Inactive</p>
            <p className="text-2xl font-bold text-red-400">{inactiveMembers.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <p className="text-sm text-gray-400 mb-1">Total Licenses</p>
            <p className="text-2xl font-bold text-cyan-400">
              {teamMembers.reduce((sum, m) => sum + m.licenses, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search team members..."
              className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inactive Members Alert */}
      {inactiveMembers.length > 0 && (
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <CardTitle className="text-white">Inactive Members Detected</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-300 mb-3">
              {inactiveMembers.length} team member(s) haven't been active in 30+ days. Consider
              removing their licenses to save costs.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
            >
              Review Inactive Members
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Team Members Table */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">All Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-gray-400 font-medium whitespace-nowrap">Member</TableHead>
                  <TableHead className="text-gray-400 font-medium whitespace-nowrap hidden md:table-cell">Email</TableHead>
                  <TableHead className="text-gray-400 font-medium whitespace-nowrap">Role</TableHead>
                  <TableHead className="text-gray-400 font-medium whitespace-nowrap hidden lg:table-cell">Department</TableHead>
                  <TableHead className="text-gray-400 font-medium whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-gray-400 font-medium whitespace-nowrap hidden lg:table-cell">Tools</TableHead>
                  <TableHead className="text-gray-400 font-medium whitespace-nowrap hidden md:table-cell">Licenses</TableHead>
                  <TableHead className="text-gray-400 font-medium whitespace-nowrap hidden lg:table-cell">Last Active</TableHead>
                  <TableHead className="text-gray-400 font-medium text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow
                  key={member.id}
                  className="border-white/10 hover:bg-white/5"
                >
                  <TableCell>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs sm:text-sm font-bold">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-white block truncate">
                          {member.name}
                        </span>
                        <span className="text-xs text-gray-400 md:hidden block truncate">
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1 text-sm text-gray-300">
                      <Mail className="w-3 h-3 text-gray-400" />
                      <span className="truncate max-w-[150px]">{member.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-300">
                      <Briefcase className="w-3 h-3 text-gray-400 hidden sm:inline" />
                      {member.role}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-gray-300">{member.department}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {member.status === "active" ? (
                        <>
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                          <span className="text-xs sm:text-sm text-green-400 hidden sm:inline">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                          <span className="text-xs sm:text-sm text-red-400 hidden sm:inline">Inactive</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {member.tools.map((tool, idx) => (
                        <Badge
                          key={idx}
                          className="bg-cyan-600/30 text-cyan-400 border-cyan-500/30 text-[10px]"
                        >
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-gray-300">{member.licenses}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-gray-400">{member.lastActive}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-white/5 text-xs sm:text-sm"
                    >
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

