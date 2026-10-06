"use client"

import type React from "react"
import { useState } from "react"
import { auth } from "@/lib/firebase"
import { addCustomer } from "@/lib/customers"
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

const EMPTY_FORM = { name: "", phone: "", address: "", notes: "" }

interface AddCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (customerId: string) => void
}

export function AddCustomerDialog({ open, onOpenChange, onCreated }: AddCustomerDialogProps) {
  const { ownerId } = useCurrentUser()
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return
    if (!next) {
      setFormData(EMPTY_FORM)
      setError("")
    }
    onOpenChange(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const userId = ownerId
    if (!userId) {
      setError("Please log in to add customers")
      return
    }
    if (!formData.name.trim()) {
      setError("Customer name is required")
      return
    }

    setIsSubmitting(true)
    try {
      const customerId = await addCustomer(formData, userId, auth?.currentUser?.displayName || "System")
      toast.success("Customer added")
      setFormData(EMPTY_FORM)
      onCreated(customerId)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Failed to add customer")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>The new customer will be selected for this sale.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <Input
              autoFocus
              value={formData.name}
              placeholder="e.g., Ali Traders"
              onChange={(e) => {
                const value = e.target.value
                if (value.length <= 40) setFormData({ ...formData, name: value })
              }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <Input
              value={formData.phone}
              placeholder="e.g., 0300 1234567"
              onChange={(e) => {
                const value = e.target.value
                if (value.length <= 20 && /^[0-9+\-\s]*$/.test(value)) setFormData({ ...formData, phone: value })
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <Input
              value={formData.address}
              placeholder="Customer address"
              onChange={(e) => {
                const value = e.target.value
                if (value.length <= 100) setFormData({ ...formData, address: value })
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <Input
              value={formData.notes}
              placeholder="Any notes about this customer"
              onChange={(e) => {
                const value = e.target.value
                if (value.length <= 100) setFormData({ ...formData, notes: value })
              }}
            />
          </div>

          {error && <div className="text-red-600 text-sm font-medium">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
