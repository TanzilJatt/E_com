"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type DatePreset = 
  | "today" 
  | "yesterday" 
  | "this_week" 
  | "last_week" 
  | "this_month" 
  | "last_month" 
  | "this_year" 
  | "last_year"
  | "custom"

interface DateFilterProps {
  onFilter: (startDate: Date | null, endDate: Date | null, preset: DatePreset) => void
  showPresets?: boolean
}

export function DateFilter({ onFilter, showPresets = true }: DateFilterProps) {
  const [preset, setPreset] = useState<DatePreset>("this_month")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  const getDateRange = (presetValue: DatePreset): [Date, Date] => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (presetValue) {
      case "today": {
        return [today, new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)]
      }
      
      case "yesterday": {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return [yesterday, new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)]
      }
      
      case "this_week": {
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)
        return [startOfWeek, endOfWeek]
      }
      
      case "last_week": {
        const startOfLastWeek = new Date(today)
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 7)
        const endOfLastWeek = new Date(startOfLastWeek)
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6)
        endOfLastWeek.setHours(23, 59, 59, 999)
        return [startOfLastWeek, endOfLastWeek]
      }
      
      case "this_month": {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        endOfMonth.setHours(23, 59, 59, 999)
        return [startOfMonth, endOfMonth]
      }
      
      case "last_month": {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        endOfLastMonth.setHours(23, 59, 59, 999)
        return [startOfLastMonth, endOfLastMonth]
      }
      
      case "this_year": {
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        const endOfYear = new Date(now.getFullYear(), 11, 31)
        endOfYear.setHours(23, 59, 59, 999)
        return [startOfYear, endOfYear]
      }
      
      case "last_year": {
        const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1)
        const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31)
        endOfLastYear.setHours(23, 59, 59, 999)
        return [startOfLastYear, endOfLastYear]
      }
      
      case "custom": {
        if (customStart && customEnd) {
          const start = new Date(customStart)
          const end = new Date(customEnd)
          end.setHours(23, 59, 59, 999)
          return [start, end]
        }
        return [new Date(0), new Date()]
      }
      
      default:
        return [new Date(0), new Date()]
    }
  }

  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset)
    if (newPreset !== "custom") {
      const [start, end] = getDateRange(newPreset)
      onFilter(start, end, newPreset)
    }
  }

  const handleCustomFilter = () => {
    if (customStart && customEnd) {
      const [start, end] = getDateRange("custom")
      onFilter(start, end, "custom")
    }
  }

  const handleClearFilter = () => {
    setPreset("this_month")
    setCustomStart("")
    setCustomEnd("")
    onFilter(null, null, "this_month")
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const getDateRangeText = (presetValue: DatePreset): string => {
    if (presetValue === "custom") return ""
    const [start, end] = getDateRange(presetValue)
    
    switch (presetValue) {
      case "today":
      case "yesterday":
        return `(${formatDate(start)})`
      case "this_week":
      case "last_week":
        return `(${formatDate(start)} - ${formatDate(end)})`
      case "this_month":
      case "last_month":
        return `(${start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })})`
      case "this_year":
      case "last_year":
        return `(${start.getFullYear()})`
      default:
        return ""
    }
  }

  return (
    <Card className="p-4 mb-6">
      <div className="space-y-4">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Filter by Date</label>
            <select
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
              className="w-full border-2 border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-2 bg-background text-foreground transition-colors outline-none"
            >
              <option value="today">Today {getDateRangeText("today")}</option>
              <option value="yesterday">Yesterday {getDateRangeText("yesterday")}</option>
              <option value="this_week">This Week {getDateRangeText("this_week")}</option>
              <option value="last_week">Last Week {getDateRangeText("last_week")}</option>
              <option value="this_month">This Month {getDateRangeText("this_month")}</option>
              <option value="last_month">Last Month {getDateRangeText("last_month")}</option>
              <option value="this_year">This Year {getDateRangeText("this_year")}</option>
              <option value="last_year">Last Year {getDateRangeText("last_year")}</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {preset === "custom" && (
            <>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium mb-2">End Date</label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  min={customStart}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleCustomFilter}
                  disabled={!customStart || !customEnd}
                >
                  Apply Filter
                </Button>
              </div>
            </>
          )}
          
          <div className="flex items-end">
            <Button variant="outline" onClick={handleClearFilter} style={{ padding: "21px 20px" }}>
              Clear Filter
            </Button>
          </div>
        </div>
        
        {preset !== "custom" && (
          <div className="text-sm text-muted-foreground">
            Showing data for: <span className="font-semibold">{preset.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

