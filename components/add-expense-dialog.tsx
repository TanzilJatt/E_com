"use client"

import type React from "react"
import { useState } from "react"
import { Timestamp } from "firebase/firestore"
import { addExpense, EXPENSE_CATEGORIES } from "@/lib/expenses"
import { useCurrentUser } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const today = () => new Date().toISOString().split("T")[0]
const emptyForm = () => ({ name: "", category: "Other", amount: "", description: "", date: today() })

interface AddExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

export function AddExpenseDialog({ open, onOpenChange, onCreated }: AddExpenseDialogProps) {
  const { user, profile, ownerId, isStaff } = useCurrentUser()
  const [formData, setFormData] = useState(emptyForm)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return
    if (!next) {
      setFormData(emptyForm())
      setError("")
    }
    onOpenChange(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!user || !ownerId) {
      setError("Please log in to add expenses")
      return
    }
    const amount = Number.parseFloat(formData.amount)
    if (!formData.name.trim() || !(amount > 0)) {
      setError("Enter a name and an amount greater than 0")
      return
    }

    setIsSubmitting(true)
    try {
      // Time of entry, on the chosen day
      const date = new Date(`${formData.date}T${new Date().toTimeString().split(" ")[0]}`)
      await addExpense(
        {
          name: formData.name.trim(),
          category: formData.category,
          amount,
          description: formData.description.trim(),
          date: Timestamp.fromDate(date),
        },
        ownerId,
        profile?.name || user.displayName || "System",
        isStaff ? user.uid : undefined,
      )
      toast.success("Expense added")
      setFormData(emptyForm())
      onCreated?.()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Failed to add expense")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>Record money spent, e.g. fuel, delivery or loading charges.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Expense Name <span className="text-red-500">*</span>
            </label>
            <Input
              autoFocus
              value={formData.name}
              placeholder="e.g., Delivery fuel"
              onChange={(e) => {
                const value = e.target.value
                if (value.length <= 30 && /^[a-zA-Z0-9\s]*$/.test(value)) setFormData({ ...formData, name: value })
              }}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-9 border border-input rounded-md px-2 text-sm bg-background text-foreground"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Amount (RS) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                placeholder="0.00"
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <Input
              type="date"
              value={formData.date}
              max={today()}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input
              value={formData.description}
              placeholder="Additional notes..."
              onChange={(e) => {
                const value = e.target.value
                if (value.length <= 100) setFormData({ ...formData, description: value })
              }}
            />
          </div>

          {error && <div className="text-red-600 text-sm font-medium">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
