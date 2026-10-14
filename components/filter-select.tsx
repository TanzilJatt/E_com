"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
}

interface FilterSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: FilterOption[]
  placeholder?: string
  className?: string
  "aria-label"?: string
}

export const PAYMENT_METHOD_OPTIONS: FilterOption[] = [
  { value: "all", label: "All Methods" },
  { value: "cash", label: "Cash Only" },
  { value: "credit", label: "Credit Only" },
  { value: "both", label: "Cash + Credit" },
]

// Toolbar dropdown whose arrow flips while the list is open
export function FilterSelect({ value, onValueChange, options, placeholder, className, ...props }: FilterSelectProps) {
  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={options.length === 0}>
      <SelectTrigger
        aria-label={props["aria-label"]}
        className={cn(
          "h-9 border border-border/60 hover:border-border rounded-md px-2 text-sm bg-background text-foreground shadow-none",
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
