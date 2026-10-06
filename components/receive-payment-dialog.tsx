"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import type { Customer } from "@/lib/customers"
import { addCustomerPayment } from "@/lib/customer-payments"
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

interface ReceivePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customers: Customer[]
  balances: Record<string, number>
  defaultCustomerId?: string
  onSaved: () => void
}

const today = () => new Date().toISOString().split("T")[0]

export function ReceivePaymentDialog({
  open,
  onOpenChange,
  customers,
  balances,
  defaultCustomerId,
  onSaved,
}: ReceivePaymentDialogProps) {
  const [customerId, setCustomerId] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(today())
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset the form each time the dialog opens
  useEffect(() => {
    if (open) {
      setCustomerId(defaultCustomerId || "")
      setAmount("")
      setDate(today())
      setNote("")
      setError("")
    }
  }, [open, defaultCustomerId])

  const balance = customerId ? balances[customerId] || 0 : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const userId = auth?.currentUser?.uid
    const customer = customers.find((c) => c.id === customerId)
    const value = Number.parseFloat(amount)
    if (!userId) return setError("Please log in to record payments")
    if (!customer) return setError("Please select a customer")
    if (!(value > 0)) return setError("Enter an amount greater than 0")

    setIsSubmitting(true)
    try {
      // Use the current time on the chosen day so entries keep their order within the day
      const now = new Date()
      const [y, m, d] = date.split("-").map(Number)
      const paymentDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds())
      await addCustomerPayment(
        { customerId: customer.id, customerName: customer.name, amount: value, note, date: paymentDate },
        userId,
        auth?.currentUser?.displayName || "System",
      )
      toast.success(`Payment of RS ${value.toFixed(2)} recorded for ${customer.name}`)
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Failed to record payment")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Receive Payment</DialogTitle>
          <DialogDescription>Record money received from a customer against their credit balance.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full border-2 border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-2 bg-background text-foreground transition-colors outline-none"
            >
              <option value="">Choose a customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {customerId && (
              <p className="text-xs text-muted-foreground mt-1">
                Current balance: <span className="font-semibold">RS {balance.toFixed(2)}</span>
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Amount (RS) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                placeholder="0.00"
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          {customerId && Number.parseFloat(amount) > balance && (
            <p className="text-xs text-amber-600">
              This is more than the current balance; the extra will show as an advance (negative balance).
            </p>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Note</label>
            <Input
              value={note}
              placeholder="e.g., Cash received"
              onChange={(e) => e.target.value.length <= 100 && setNote(e.target.value)}
            />
          </div>

          {error && <div className="text-red-600 text-sm font-medium">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
