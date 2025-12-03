"use client"

import { useEffect, useState } from "react"
import { getActivityLogs, type ActivityLog } from "@/lib/activity-logs"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { DateFilter, type DatePreset } from "@/components/date-filter"

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [allLogs, setAllLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState<string>("all")

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const logsList = await getActivityLogs()
      setAllLogs(logsList)
      setLogs(logsList)
    } catch (error) {
      console.error("Error fetching logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = (startDate: Date | null, endDate: Date | null, preset: DatePreset) => {
    if (!startDate || !endDate) {
      setLogs(allLogs)
      return
    }

    const filtered = allLogs.filter((log) => {
      const logDate = log.timestamp?.toDate?.()
      if (!logDate) return false
      return logDate >= startDate && logDate <= endDate
    })
    
    setLogs(filtered)
  }

  const filteredLogs = logs.filter((log) => {
    if (filterAction === "all") return true
    return log.action === filterAction
  })

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "ITEM_ADDED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "ITEM_UPDATED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "ITEM_DELETED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      case "SALE_COMPLETED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
      case "USER_LOGIN":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400"
      case "USER_LOGOUT":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Activity Logs</h1>
          <p className="text-muted-foreground mt-2">Track all system activities and changes</p>
        </div>

        {/* Date Filter */}
        <DateFilter onFilter={handleDateFilter} />

        {/* Action Filter */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Filter by Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full border border-input rounded-lg p-2 bg-background text-foreground"
              >
                <option value="all">All Actions</option>
                <option value="ITEM_ADDED">Item Added</option>
                <option value="ITEM_UPDATED">Item Updated</option>
                <option value="ITEM_DELETED">Item Deleted</option>
                <option value="SALE_COMPLETED">Sale Completed</option>
                <option value="USER_LOGIN">User Login</option>
                <option value="USER_LOGOUT">User Logout</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Activity Logs Table */}
        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading activity logs...</p>
          </Card>
        ) : filteredLogs.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No activity logs found.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Date & Time</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Action</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">User</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, index) => (
                    <tr 
                      key={log.id} 
                      className={`border-b border-border hover:bg-muted/30 transition-colors ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="text-xs text-muted-foreground">
                          <div>{log.timestamp?.toDate?.()?.toLocaleDateString() || "N/A"}</div>
                          <div className="text-[10px]">{log.timestamp?.toDate?.()?.toLocaleTimeString() || ""}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="text-sm font-medium">{log.userName || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground font-mono">{log.userId?.substring(0, 8) || "N/A"}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">{log.details}</div>
                        {log.metadata && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {log.metadata.itemId && <span>Item ID: {log.metadata.itemId.substring(0, 8)}</span>}
                            {log.metadata.saleId && <span>Sale ID: {log.metadata.saleId.substring(0, 8)}</span>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 border-t-2 border-border">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 font-semibold">
                      Total Activity Logs: {filteredLogs.length}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
      </main>
    </>
  )
}

