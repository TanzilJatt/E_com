"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addCustomer, updateCustomer, deleteCustomer, getCustomers, type Customer } from "@/lib/customers"
import { getSales, type Sale } from "@/lib/sales"
import { getCustomerPayments, type CustomerPayment } from "@/lib/customer-payments"
import { getCustomerBalances } from "@/lib/ledger"
import { ReceivePaymentDialog } from "@/components/receive-payment-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BookOpen, HandCoins, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

const EMPTY_FORM = { name: "", phone: "", address: "", notes: "" }

function CustomersContent() {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [payments, setPayments] = useState<CustomerPayment[]>([])
  const [paymentCustomerId, setPaymentCustomerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!auth) return
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUserId(user ? user.uid : null))
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (currentUserId) fetchData()
  }, [currentUserId])

  const fetchData = async () => {
    if (!currentUserId) return
    try {
      setLoading(true)
      const [customerList, saleList, paymentList] = await Promise.all([
        getCustomers(currentUserId),
        getSales(currentUserId),
        getCustomerPayments(currentUserId),
      ])
      setCustomers(customerList)
      setSales(saleList)
      setPayments(paymentList)
    } catch (err: any) {
      console.error("Error loading customers:", err)
      setError(err.message || "Failed to load customers")
    } finally {
      setLoading(false)
    }
  }

  // Outstanding credit per customer (credit sales minus payments received)
  const balances = useMemo(() => getCustomerBalances(sales, payments), [sales, payments])
  const totalOutstanding = Object.values(balances).reduce((sum, b) => sum + b, 0)
  const balanceClass = (balance: number) => (balance > 0 ? "text-red-600" : balance < 0 ? "text-green-600" : "")

  const renderActions = (customer: Customer) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={`Actions for ${customer.name}`}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => setPaymentCustomerId(customer.id)}>
          <HandCoins />
          Receive Payment
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push(`/ledger?customer=${customer.id}`)}>
          <BookOpen />
          View Ledger
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleEdit(customer)}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => handleDelete(customer)}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.toLowerCase()
    return (
      c.name.toLowerCase().includes(term) ||
      (c.phone || "").toLowerCase().includes(term) ||
      (c.address || "").toLowerCase().includes(term)
    )
  })

  const resetForm = () => {
    setFormData(EMPTY_FORM)
    setEditingId(null)
    setIsAdding(false)
    setError("")
  }

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      address: customer.address || "",
      notes: customer.notes || "",
    })
    setEditingId(customer.id)
    setIsAdding(true)
    setError("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete customer "${customer.name}"? Their past sales and ledger entries will keep the customer name.`)) return
    try {
      await deleteCustomer(customer.id, customer.name)
      toast.success("Customer deleted")
      await fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete customer")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!currentUserId) return
    if (!formData.name.trim()) {
      setError("Customer name is required")
      return
    }

    setIsSubmitting(true)
    try {
      if (editingId) {
        await updateCustomer(editingId, formData, currentUserId)
        toast.success("Customer updated")
      } else {
        await addCustomer(formData, currentUserId, auth?.currentUser?.displayName || "System")
        toast.success("Customer added")
      }
      resetForm()
      await fetchData()
    } catch (err: any) {
      setError(err.message || "Failed to save customer")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="md:pl-64">
        <main className="w-full px-4 sm:px-6 lg:px-10 py-4 sm:py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Customers</h1>
              <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
                Manage customers and their agreed prices
              </p>
            </div>
            <Button onClick={() => (isAdding ? resetForm() : setIsAdding(true))} className="w-full sm:w-auto">
              {isAdding ? "Cancel" : "+ Add Customer"}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Card className="p-4 sm:p-6">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Total Customers</div>
              <div className="text-2xl sm:text-3xl font-bold text-primary mt-1 sm:mt-2">{customers.length}</div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Total Outstanding Balance</div>
              <div className={`text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 ${balanceClass(totalOutstanding) || "text-primary"}`}>
                RS {totalOutstanding.toFixed(2)}
              </div>
            </Card>
          </div>

          {/* Add / Edit form */}
          {isAdding && (
            <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">{editingId ? "Edit Customer" : "Add New Customer"}</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <Input
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
                </div>

                {error && <div className="text-red-600 text-sm font-medium">{error}</div>}

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : editingId ? "Update Customer" : "Add Customer"}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1" onClick={resetForm} disabled={isSubmitting}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Search by name, phone, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-md h-11"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              {customers.length === 0 ? "No customers yet. Add your first customer." : "No customers match your search."}
            </Card>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="lg:hidden space-y-3">
                {filteredCustomers.map((customer) => {
                  return (
                    <Card key={customer.id} className="p-4">
                      <h3 className="font-semibold text-lg">{customer.name}</h3>
                      <div className="text-sm text-muted-foreground space-y-1 mt-2">
                        {customer.phone && <p>Phone: {customer.phone}</p>}
                        {customer.address && <p>Address: {customer.address}</p>}
                        <p>
                          Balance:{" "}
                          <span className={`font-semibold ${balanceClass(balances[customer.id] || 0)}`}>
                            RS {(balances[customer.id] || 0).toFixed(2)}
                          </span>
                        </p>
                      </div>
                      <div className="flex justify-end pt-3 mt-3 border-t">{renderActions(customer)}</div>
                    </Card>
                  )
                })}
              </div>

              {/* Desktop table */}
              <Card className="hidden lg:block overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold text-sm">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Phone</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Address</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Notes</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm">Balance</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer, index) => {
                        return (
                          <tr
                            key={customer.id}
                            className={`border-b border-border hover:bg-muted/30 transition-colors ${
                              index % 2 === 0 ? "bg-background" : "bg-muted/10"
                            }`}
                          >
                            <td className="py-3 px-4 font-medium">{customer.name}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">{customer.phone || "—"}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs">
                              <span className="line-clamp-2">{customer.address || "—"}</span>
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs">
                              <span className="line-clamp-2">{customer.notes || "—"}</span>
                            </td>
                            <td className={`py-3 px-4 text-right font-semibold ${balanceClass(balances[customer.id] || 0)}`}>
                              RS {(balances[customer.id] || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex justify-center">{renderActions(customer)}</div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          <ReceivePaymentDialog
            open={paymentCustomerId !== null}
            onOpenChange={(open) => !open && setPaymentCustomerId(null)}
            customers={customers}
            balances={balances}
            defaultCustomerId={paymentCustomerId || undefined}
            onSaved={fetchData}
          />
        </main>
      </div>
    </>
  )
}

export default function Customers() {
  return <CustomersContent />
}
