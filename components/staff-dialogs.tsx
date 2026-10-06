"use client"

import type React from "react"
import { useEffect, useState } from "react"
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
import { useCurrentUser } from "@/components/auth-guard"
import {
  createStaffAccount,
  deleteStaffAccount,
  setStaffPassword,
  updateStaffName,
  type UserProfile,
} from "@/lib/users"
import { transferStock, type StaffStock } from "@/lib/staff-stock"
import type { Item } from "@/lib/items"
import { toast } from "sonner"

const ErrorText = ({ message }: { message: string }) =>
  message ? <div className="text-red-600 text-sm font-medium">{message}</div> : null

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-sm font-medium mb-1">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
)

// Runs a save action with a busy flag and an error message
function useSubmit() {
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const run = async (action: () => Promise<void>) => {
    setError("")
    setBusy(true)
    try {
      await action()
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setBusy(false)
    }
  }
  return { error, setError, busy, run }
}

export function AddStaffDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const { ownerId } = useCurrentUser()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const { error, setError, busy, run } = useSubmit()

  useEffect(() => {
    if (open) {
      setForm({ name: "", email: "", password: "" })
      setError("")
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerId) return
    run(async () => {
      await createStaffAccount(form, ownerId)
      toast.success(`Staff account created for ${form.name.trim()}`)
      onOpenChange(false)
      onCreated()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Staff</DialogTitle>
          <DialogDescription>Creates a login for your staff member. Share the email and password with them.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label required>Name</Label>
            <Input
              autoFocus
              value={form.name}
              placeholder="e.g., Ahmed"
              onChange={(e) => e.target.value.length <= 30 && setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label required>Email</Label>
            <Input
              type="email"
              value={form.email}
              placeholder="staff@example.com"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <Label required>Password</Label>
            <Input
              type="text"
              value={form.password}
              placeholder="At least 6 characters"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required
            />
          </div>
          <ErrorText message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create Staff"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditStaffDialog({
  staff,
  onClose,
  onSaved,
}: {
  staff: UserProfile | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const { error, setError, busy, run } = useSubmit()

  useEffect(() => {
    if (staff) {
      setName(staff.name)
      setError("")
    }
  }, [staff])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!staff) return
    run(async () => {
      await updateStaffName(staff.id, name)
      toast.success("Staff updated")
      onClose()
      onSaved()
    })
  }

  return (
    <Dialog open={!!staff} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Staff</DialogTitle>
          <DialogDescription>{staff?.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label required>Name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => e.target.value.length <= 30 && setName(e.target.value)}
              required
            />
          </div>
          <ErrorText message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteStaffDialog({
  staff,
  onClose,
  onDeleted,
}: {
  staff: UserProfile | null
  onClose: () => void
  onDeleted: () => void
}) {
  const { error, setError, busy, run } = useSubmit()

  useEffect(() => {
    if (staff) setError("")
  }, [staff])

  const handleDelete = () => {
    if (!staff) return
    run(async () => {
      await deleteStaffAccount(staff.id)
      toast.success(`${staff.name} deleted`)
      onClose()
      onDeleted()
    })
  }

  return (
    <Dialog open={!!staff} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {staff?.name}?</DialogTitle>
          <DialogDescription>
            Their login ({staff?.email}) is removed and they can no longer sign in. Their sales and expenses stay in your
            records. Any stock they hold must be taken back first.
          </DialogDescription>
        </DialogHeader>
        <ErrorText message={error} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={busy}>
            {busy ? "Deleting..." : "Delete Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ResetPasswordDialog({ staff, onClose }: { staff: UserProfile | null; onClose: () => void }) {
  const [password, setPassword] = useState("")
  const { error, setError, busy, run } = useSubmit()

  useEffect(() => {
    if (staff) {
      setPassword("")
      setError("")
    }
  }, [staff])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!staff) return
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    run(async () => {
      await setStaffPassword(staff.id, password)
      toast.success(`Password changed for ${staff.name}`)
      onClose()
    })
  }

  return (
    <Dialog open={!!staff} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password for {staff?.name}</DialogTitle>
          <DialogDescription>
            Set a new password for {staff?.email}. Share it with them; the old password stops working.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label required>New Password</Label>
            <Input
              autoFocus
              type="text"
              value={password}
              placeholder="At least 6 characters"
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <ErrorText message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Set Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export type TransferMode = "send" | "return"

export function TransferStockDialog({
  transfer,
  items,
  staffStock,
  onClose,
  onDone,
}: {
  transfer: { staff: UserProfile; mode: TransferMode } | null
  items: Item[]
  staffStock: StaffStock[]
  onClose: () => void
  onDone: () => void
}) {
  const { ownerId, profile, user } = useCurrentUser()
  const [itemId, setItemId] = useState("")
  const [quantity, setQuantity] = useState("")
  const { error, setError, busy, run } = useSubmit()

  useEffect(() => {
    if (transfer) {
      setItemId("")
      setQuantity("")
      setError("")
    }
  }, [transfer])

  // Items that can be sent (main stock) or taken back (staff member's stock)
  const options = !transfer
    ? []
    : transfer.mode === "send"
      ? items.filter((i) => i.quantity > 0).map((i) => ({ id: i.id, name: i.name, available: i.quantity }))
      : staffStock
          .filter((s) => s.staffId === transfer.staff.id && s.quantity > 0)
          .map((s) => ({ id: s.itemId, name: s.itemName, available: s.quantity }))
  const selected = options.find((o) => o.id === itemId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!transfer || !ownerId) return
    const boxes = Number.parseInt(quantity)
    if (!selected || !(boxes > 0)) {
      setError("Choose an item and enter the number of boxes")
      return
    }
    if (boxes > selected.available) {
      setError(`Only ${selected.available} boxes available`)
      return
    }
    run(async () => {
      await transferStock(
        {
          adminId: ownerId,
          staffId: transfer.staff.id,
          staffName: transfer.staff.name,
          itemId: selected.id,
          quantity: transfer.mode === "send" ? boxes : -boxes,
        },
        profile?.name || user?.displayName || "Admin",
      )
      toast.success(
        transfer.mode === "send"
          ? `Sent ${boxes} boxes of ${selected.name} to ${transfer.staff.name}`
          : `Took back ${boxes} boxes of ${selected.name} from ${transfer.staff.name}`,
      )
      onClose()
      onDone()
    })
  }

  return (
    <Dialog open={!!transfer} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {transfer?.mode === "send" ? `Send Stock to ${transfer?.staff.name}` : `Take Back from ${transfer?.staff.name}`}
          </DialogTitle>
          <DialogDescription>
            {transfer?.mode === "send"
              ? "Boxes are moved out of your inventory into this staff member's stock."
              : "Boxes are moved from this staff member back into your inventory."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Item</Label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full h-9 border border-input rounded-md px-2 text-sm bg-background text-foreground"
            >
              <option value="">{options.length ? "Choose an item..." : "No stock available"}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} — {o.available} boxes
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Number of Boxes</Label>
            <Input
              inputMode="numeric"
              value={quantity}
              placeholder={selected ? `Up to ${selected.available}` : "Enter number of boxes"}
              onChange={(e) => /^\d*$/.test(e.target.value) && setQuantity(e.target.value)}
            />
          </div>
          <ErrorText message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : transfer?.mode === "send" ? "Send" : "Take Back"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
