"use client"

import { useEffect, useRef, useState } from "react"
import { db, auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSale, getSales, getStaffSales, updateSale, deleteSale, type SaleItem, type Sale } from "@/lib/sales"
import { getItems, type Item } from "@/lib/items"
import { getStaffStock } from "@/lib/staff-stock"
import { useCurrentUser } from "@/components/auth-guard"
import { AddExpenseDialog } from "@/components/add-expense-dialog"
import { getCustomers, saveCustomerItemPrices, type Customer } from "@/lib/customers"
import { AddCustomerDialog } from "@/components/add-customer-dialog"
import { DateFilter, type DatePreset } from "@/components/date-filter"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// Older box sales stored quantity in pieces, with 12 pieces per box
const LEGACY_BOX_SIZE = 12

// Boxes and price per box for a sale line, handling older sales saved in pieces
const getBoxInfo = (sale: Sale, item: SaleItem) => {
  const unitPrice = item.sellingPricePerUnit || (item.quantity > 0 ? item.totalPrice / item.quantity : 0) || 0
  if (item.unit === "box") return { boxes: item.quantity, boxPrice: unitPrice }
  if (sale.type === "box") return { boxes: item.quantity / LEGACY_BOX_SIZE, boxPrice: unitPrice * LEGACY_BOX_SIZE }
  return null // old retail sale: quantity is in pieces
}

function SalesContent() {
  // View state
  const [activeView, setActiveView] = useState<"record" | "list">("list")
  const [authReady, setAuthReady] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  // Staff sell from the stock their admin sent them and record sales into the admin's data
  const { isStaff, ownerId, profile } = useCurrentUser()
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)

  // Record Sale State
  const [items, setItems] = useState<Item[]>([])
  const [cart, setCart] = useState<SaleItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState("")
  const [quantity, setQuantity] = useState<number | "">("")
  const [pricePerBox, setPricePerBox] = useState<number | "">("")
  const [cashPrice, setCashPrice] = useState<number | "">("")
  const [creditPrice, setCreditPrice] = useState<number | "">("")
  const [paymentCash, setPaymentCash] = useState(true)
  const [paymentCredit, setPaymentCredit] = useState(false)
  const [cashAmount, setCashAmount] = useState<number | "">("")
  const [creditAmount, setCreditAmount] = useState<number | "">("")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  // Staff type the buyer's name; it is not linked to the admin's customer list
  const [customerName, setCustomerName] = useState("")
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  // Sale being edited (null when recording a new sale)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  // Set while loading a sale for editing so its saved cash/credit split isn't overwritten
  const keepPaymentRef = useRef(false)
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Sales List State
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"all" | "cash" | "credit" | "both">("all")
  const [customerFilter, setCustomerFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [loading, setLoading] = useState(false)

  // Listen for auth state changes
  useEffect(() => {
    if (!auth) {
      setAuthReady(true)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid)
        setAuthReady(true)
      } else {
        setCurrentUserId(null)
        setAuthReady(true)
      }
    })

    return () => unsubscribe()
  }, [])

  // /sales?new=1 opens straight into the new sale form
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new")) setActiveView("record")
  }, [])

  // Fetch data when auth is ready and user is logged in
  useEffect(() => {
    if (authReady && currentUserId) {
      fetchItems()
      fetchSales()
      fetchCustomers()
    }
  }, [authReady, currentUserId])

  const fetchCustomers = async () => {
    try {
      if (!ownerId || isStaff) return
      setCustomers(await getCustomers(ownerId))
    } catch (error: any) {
      console.error("Error fetching customers:", error)
      toast.error(`Could not load customers: ${error.message || error}`)
    }
  }

  // Boxes available for an item; when editing, the boxes already in that sale count as available
  const getAvailable = (item: Item) =>
    item.quantity +
    (editingSale?.items.filter((i) => i.itemId === item.id).reduce((sum, i) => sum + i.quantity, 0) || 0)

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)
  const customerPrice = selectedCustomer && selectedItemId ? selectedCustomer.itemPrices?.[selectedItemId] : undefined

  // Fill in the customer's agreed price when the customer or item changes
  useEffect(() => {
    if (customerPrice !== undefined) setPricePerBox(customerPrice)
  }, [selectedCustomerId, selectedItemId, customerPrice])

  // Items to sell from: a staff member's own stock, or for an admin the main inventory
  // (or the staff member's stock when editing a sale that staff member made)
  const fetchItems = async (saleBeingEdited: Sale | null = null) => {
    try {
      if (!db || !currentUserId || !ownerId) {
        return
      }

      const staffId = isStaff ? currentUserId : saleBeingEdited?.staffId
      if (staffId) {
        const stock = await getStaffStock({ staffId })
        setItems(stock.map((s) => ({ id: s.itemId, name: s.itemName, quantity: s.quantity }) as Item))
        return
      }

      setItems(await getItems(ownerId))
    } catch (error) {
      console.error("Error fetching items:", error)
    }
  }

  const fetchSales = async () => {
    try {
      if (!currentUserId) {
        return
      }
      setLoading(true)
      const salesList = isStaff ? await getStaffSales(currentUserId) : await getSales(currentUserId)
      setSales(salesList)
      setFilteredSales(salesList)
    } catch (error) {
      console.error("Error fetching sales:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter sales whenever filters change
  useEffect(() => {
    let filtered = [...sales]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((sale) =>
        sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.items.some(item => item.itemName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.purchaserName && sale.purchaserName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.description && sale.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    // Ensure unique results by ID
    filtered = filtered.filter((sale, index, self) =>
      index === self.findIndex((s) => s.id === sale.id)
    )


    // Customer filter
    if (customerFilter === "none") {
      filtered = filtered.filter((sale) => !sale.customerId)
    } else if (customerFilter !== "all") {
      filtered = filtered.filter((sale) => sale.customerId === customerFilter)
    }

    // Payment method filter
    if (paymentMethodFilter !== "all") {
      filtered = filtered.filter((sale) => {
        // Skip sales without payment method data
        if (!sale.paymentMethod) return false
        
        if (paymentMethodFilter === "both") {
          return sale.paymentMethod.cash && sale.paymentMethod.credit
        } else if (paymentMethodFilter === "cash") {
          return sale.paymentMethod.cash && !sale.paymentMethod.credit
        } else if (paymentMethodFilter === "credit") {
          return sale.paymentMethod.credit && !sale.paymentMethod.cash
        }
        return true
      })
    }

    // Date filter
    if (dateFilter.start && dateFilter.end) {
      filtered = filtered.filter((sale) => {
        const saleDate = sale.transactionDate?.toDate ? sale.transactionDate.toDate() : new Date(sale.transactionDate)
        return saleDate >= dateFilter.start! && saleDate <= dateFilter.end!
      })
    }

    setFilteredSales(filtered)
  }, [sales, searchTerm, paymentMethodFilter, customerFilter, dateFilter])

  const handleAddToCart = () => {
    setError("")
    if (!selectedItemId || !quantity || quantity <= 0) {
      setError("Please select an item and enter a valid quantity")
      return
    }

    // Validate that sellingPrice is entered
    if (pricePerBox === "" || pricePerBox <= 0) {
      setError("Please enter a valid price per box")
      return
    }

    const item = items.find((i) => i.id === selectedItemId)
    if (!item) {
      setError("Item not found")
      return
    }

    // Item quantity is counted in boxes, so boxes are deducted from stock directly
    const boxes = typeof quantity === 'number' ? quantity : 0
    const boxPrice = typeof pricePerBox === 'number' ? pricePerBox : 0
    const actualQuantity = boxes
    const totalPrice = boxes * boxPrice
    const sellingPricePerUnit = boxPrice

    if (actualQuantity > getAvailable(item)) {
      setError(`Not enough stock available. Available: ${getAvailable(item)} boxes`)
      return
    }

    const existingItem = cart.find((c) => c.itemId === selectedItemId)
    if (existingItem) {
      if (existingItem.quantity + actualQuantity > getAvailable(item)) {
        setError("Not enough stock available")
        return
      }
      // For simplicity, replace the existing item with new pricing
      setError("Item already in cart. Please remove it first to change pricing.")
      return
    } else {
      console.log(`Adding to cart: itemName=${item.name}, sellingPricePerUnit=${sellingPricePerUnit}, totalPrice=${totalPrice}`)
      setCart([
        ...cart,
        {
          itemId: selectedItemId,
          itemName: item.name,
          quantity: actualQuantity,
          unit: "box",
          sellingPricePerUnit: sellingPricePerUnit,
          cashPrice: undefined,
          creditPrice: undefined,
          totalPrice,
        },
      ])
    }

    setSelectedItemId("")
    setQuantity("")
    setPricePerBox("")
  }

  const handleRemoveFromCart = (itemId: string) => {
    const newCart = cart.filter((c) => c.itemId !== itemId)
    setCart(newCart)
    
    // Update payment method selections based on remaining items
    const hasCash = newCart.some(c => c.cashPrice !== undefined)
    const hasCredit = newCart.some(c => c.creditPrice !== undefined)
    setPaymentCash(hasCash)
    setPaymentCredit(hasCredit)
  }

  const handleCompleteSale = async () => {
    setError("")
    setSuccess("")

    if (cart.length === 0) {
      setError("Cart is empty")
      return
    }

    // Every sale is recorded against a customer so it appears in their ledger
    if (isStaff && !customerName.trim()) {
      setError("Please enter the customer name")
      return
    }
    if (!isStaff && !selectedCustomer) {
      setError("Please select a customer for this sale")
      return
    }

    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0)
    // No quantity restrictions - users can select any number of items

    // Validate payment method is selected
    if (!paymentCash && !paymentCredit) {
      setError("Please select at least one payment method")
      return
    }

    // Calculate final amounts based on what's entered
    const finalCashAmount = (paymentCash && cashAmount !== "" && typeof cashAmount === 'number') ? cashAmount : 0
    const finalCreditAmount = (paymentCredit && creditAmount !== "" && typeof creditAmount === 'number') ? creditAmount : 0
    const totalAmount = finalCashAmount + finalCreditAmount
    
    // Validate that payment equals grand total
    if (Math.abs(totalAmount - grandTotal) > 0.01) {
      setError(`Total payment (RS ${totalAmount.toFixed(2)}) must equal grand total (RS ${grandTotal.toFixed(2)})`)
      return
    }

    setIsLoading(true)

    try {
      const saleData = {
        type: "box" as const,
        items: cart,
        totalAmount,
        paymentMethod: {
          cash: paymentCash,
          credit: paymentCredit,
          cashAmount: finalCashAmount,
          creditAmount: finalCreditAmount,
        },
        customerId: isStaff ? undefined : selectedCustomer?.id,
        purchaserName: isStaff ? customerName.trim() : selectedCustomer?.name,
        description: description || undefined,
      }
      let saleId: string | null
      if (editingSale) {
        await updateSale(editingSale, saleData)
        saleId = editingSale.id
      } else {
        saleId = await createSale(
          { ...saleData, userId: "", userName: "", staffId: isStaff ? currentUserId || undefined : undefined },
          ownerId || "system",
          profile?.name || auth?.currentUser?.displayName || "System",
        )
      }

      if (saleId) {
        // Remember the prices used so they are filled in next time for this customer
        if (selectedCustomer) {
          try {
            await saveCustomerItemPrices(
              selectedCustomer.id,
              Object.fromEntries(cart.filter((c) => c.unit === "box").map((c) => [c.itemId, c.sellingPricePerUnit]))
            )
            fetchCustomers()
          } catch (priceError) {
            console.error("Error saving customer prices:", priceError)
          }
        }
        setSuccess(
          editingSale
            ? `Sale #${(editingSale.saleNumber || 0).toString().padStart(4, "0")} updated successfully!`
            : `Sale completed successfully! Transaction ID: ${saleId}`
        )
        setEditingSale(null)
        setCart([])
        setSelectedItemId("")
        setQuantity("")
        setPricePerBox("")
        setPaymentCash(true)
        setPaymentCredit(false)
        setCashAmount("")
        setCreditAmount("")
        setSelectedCustomerId("")
        setCustomerName("")
        setDescription("")
        fetchItems(null)
        fetchSales() // Refresh sales list
        
        // Redirect to list view after a short delay
        setTimeout(() => {
          setSuccess("")
          setActiveView("list")
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0)
  
  // Calculate grand total from cart items
  const grandTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)

  // Auto-fill cash amount with grand total when cart changes
  useEffect(() => {
    if (keepPaymentRef.current) {
      keepPaymentRef.current = false
      return
    }
    if (cart.length > 0 && grandTotal > 0) {
      setCashAmount(grandTotal)
      setPaymentCash(true)
      // Reset credit if cash equals total
      if (grandTotal === cashAmount) {
        setCreditAmount("")
        setPaymentCredit(false)
      }
    } else {
      setCashAmount("")
      setCreditAmount("")
      setPaymentCash(true)
      setPaymentCredit(false)
    }
  }, [grandTotal, cart.length])

  // Auto-calculate credit amount when cash amount changes
  useEffect(() => {
    if (grandTotal > 0 && cashAmount !== "" && typeof cashAmount === 'number') {
      const remaining = grandTotal - cashAmount
      if (remaining > 0.01) {
        // There's a remaining amount - set credit
        setCreditAmount(remaining)
        setPaymentCredit(true)
      } else if (remaining < -0.01) {
        // Cash amount exceeds total - reset to total
        setCashAmount(grandTotal)
        setCreditAmount("")
        setPaymentCredit(false)
      } else {
        // Cash equals total (within tolerance)
        setCreditAmount("")
        setPaymentCredit(false)
      }
    } else if (cashAmount === "") {
      // Cash cleared - reset
      setCreditAmount("")
      setPaymentCredit(false)
    }
  }, [cashAmount, grandTotal])

  const resetSaleForm = () => {
    keepPaymentRef.current = false
    setCart([])
    setSelectedItemId("")
    setQuantity("")
    setPricePerBox("")
    setPaymentCash(true)
    setPaymentCredit(false)
    setCashAmount("")
    setCreditAmount("")
    setSelectedCustomerId("")
    setCustomerName("")
    setDescription("")
    setError("")
    setSuccess("")
  }

  const handleBackToList = () => {
    if (editingSale) {
      if (editingSale.staffId) fetchItems(null)
      setEditingSale(null)
      resetSaleForm()
    }
    setActiveView("list")
  }

  // Only sales recorded in boxes (with the box marker) can be edited
  const canEditSale = (sale: Sale) => sale.items.length > 0 && sale.items.every((item) => item.unit === "box")
  // Staff can only add sales; editing and deleting is for admins
  const canManageSales = !isStaff

  const handleEditSale = (sale: Sale) => {
    resetSaleForm()
    keepPaymentRef.current = true
    setEditingSale(sale)
    if (sale.staffId) fetchItems(sale)
    setCart(sale.items.map((item) => ({ ...item })))
    setSelectedCustomerId(sale.customerId || "")
    setDescription(sale.description || "")
    setPaymentCash(!!sale.paymentMethod?.cash)
    setPaymentCredit(!!sale.paymentMethod?.credit)
    // Cash is always a number here: an empty cash field would make the auto-fill clear the credit amount
    setCashAmount(sale.paymentMethod?.cash ? sale.paymentMethod.cashAmount || 0 : 0)
    setCreditAmount(sale.paymentMethod?.credit ? sale.paymentMethod.creditAmount || 0 : "")
    setActiveView("record")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDeleteSale = async (sale: Sale) => {
    const label = `#${(sale.saleNumber || 0).toString().padStart(4, "0")}`
    if (!confirm(`Delete sale ${label}${sale.purchaserName ? ` for ${sale.purchaserName}` : ""}? Its items will be returned to stock.`)) return
    try {
      await deleteSale(sale)
      toast.success(`Sale ${label} deleted`)
      await Promise.all([fetchSales(), fetchItems(null)])
    } catch (err: any) {
      toast.error(err.message || "Failed to delete sale")
    }
  }

  const handleDateFilter = (start: Date | null, end: Date | null, preset: DatePreset) => {
    setDateFilter({ start, end })
  }

  const exportSalesToPDF = () => {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(18)
    doc.text("Sales Report", 14, 22)
    
    // Add date range if filtered
    doc.setFontSize(10)
    if (dateFilter.start && dateFilter.end) {
      doc.text(
        `Date Range: ${dateFilter.start.toLocaleDateString()} - ${dateFilter.end.toLocaleDateString()}`,
        14,
        30
      )
    } else {
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)
    }
    
    // Add filter info
    let filterInfo = []
    if (customerFilter === "none") filterInfo.push("Customer: None")
    else if (customerFilter !== "all") filterInfo.push(`Customer: ${customers.find((c) => c.id === customerFilter)?.name || "Unknown"}`)
    if (paymentMethodFilter !== "all") filterInfo.push(`Payment: ${paymentMethodFilter}`)
    if (searchTerm) filterInfo.push(`Search: "${searchTerm}"`)
    if (filterInfo.length > 0) {
      doc.text(`Filters: ${filterInfo.join(", ")}`, 14, 36)
    }
    
    // Prepare table data
    const tableData = filteredSales.map((sale, index) => {
      const date = sale.transactionDate?.toDate 
        ? new Date(sale.transactionDate.toDate()).toLocaleDateString()
        : new Date(sale.transactionDate).toLocaleDateString()
      
      const itemsList = sale.items.map((item) => {
        const sellingPrices = []
        if (item.cashPrice) sellingPrices.push(`Cash: RS ${(item.cashPrice || 0).toFixed(2)}`)
        if (item.creditPrice) sellingPrices.push(`Credit: RS ${(item.creditPrice || 0).toFixed(2)}`)
        const unitPrice = item.sellingPricePerUnit || 0
        const totalPrice = unitPrice * item.quantity
        const priceInfo = sellingPrices.length > 0 ? ` - ${sellingPrices.join(", ")}` : ""
        const boxInfo = getBoxInfo(sale, item)
        if (boxInfo) {
          return `${item.itemName} (${boxInfo.boxes} boxes @ RS ${boxInfo.boxPrice.toFixed(2)} per box = RS ${totalPrice.toFixed(2)})${priceInfo}`
        }
        return `${item.itemName} (x${item.quantity} @ RS ${unitPrice.toFixed(2)} each = RS ${totalPrice.toFixed(2)})${priceInfo}`
      }).join("\n")
      
      let paymentInfo = ""
      if (sale.paymentMethod) {
        if (sale.paymentMethod.cash && sale.paymentMethod.credit) {
          paymentInfo = `Cash: RS ${(sale.paymentMethod.cashAmount || 0).toFixed(2)}\nCredit: RS ${(sale.paymentMethod.creditAmount || 0).toFixed(2)}`
        } else if (sale.paymentMethod.cash) {
          paymentInfo = "Cash"
        } else if (sale.paymentMethod.credit) {
          paymentInfo = "Credit"
        }
      }
      
      return [
        `#${(index + 1).toString().padStart(4, '0')}`,
        date,
        sale.type.toUpperCase(),
        sale.purchaserName || "-",
        sale.description || "-",
        itemsList,
        paymentInfo,
        `RS ${(sale.totalAmount || 0).toFixed(2)}`
      ]
    })
    
    // Add table
    autoTable(doc, {
      startY: filterInfo.length > 0 ? 42 : 36,
      head: [["#", "Date", "Type", "Customer", "Description", "Items", "Payment", "Total"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 22 },
        2: { cellWidth: 15 },
        3: { cellWidth: 22 },
        4: { cellWidth: 25 },
        5: { cellWidth: 45 },
        6: { cellWidth: 25 },
        7: { cellWidth: 22 }
      }
    })
    
    // Add summary
    const finalY = (doc as any).lastAutoTable.finalY || 42
    doc.setFontSize(12)
    doc.text(`Total Sales: ${filteredSales.length}`, 14, finalY + 10)
    const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
    doc.text(`Grand Total: RS ${(totalAmount || 0).toFixed(2)}`, 14, finalY + 18)
    
    // Save PDF
    const fileName = `sales-report-${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(fileName)
  }

  if (!authReady) {
    return (
      <>
        <Navbar />
        <div className="md:pl-64">
        <main className="w-full px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
        </div>
      </>
    )
  }

  if (!currentUserId) {
    return (
      <>
        <Navbar />
        <div className="md:pl-64">
        <main className="w-full px-4 sm:px-6 lg:px-10 py-8">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Please log in to access sales.</p>
          </div>
        </main>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="md:pl-64">
      <main className="w-full p-3 sm:p-6 lg:px-10">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Sales Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              {isStaff ? "Record sales from the stock assigned to you" : "Record and view sales transactions"}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="lg" className="flex-1 sm:flex-none" onClick={() => setIsAddExpenseOpen(true)}>
              + Add Expense
            </Button>
            {activeView === "list" && (
              <Button
                onClick={() => setActiveView("record")}
                size="lg"
                className="flex-1 sm:flex-none"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Sale
              </Button>
            )}
          </div>
        </div>

        <AddExpenseDialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen} />

        {/* Record Sale View */}
        {activeView === "record" && (
          <div>
            {/* Back Button */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={handleBackToList}
                className="gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {editingSale ? "Cancel Edit" : "Back to Sales"}
              </Button>
            </div>

            {editingSale && (
              <Card className="p-4 mb-4 sm:mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Editing Sale #{(editingSale.saleNumber || 0).toString().padStart(4, "0")}</strong> — change the
                  customer, items or payment, then click Update Sale. Stock is adjusted by the difference.
                </p>
              </Card>
            )}

        <AddCustomerDialog
          open={isAddCustomerOpen}
          onOpenChange={setIsAddCustomerOpen}
          onCreated={async (customerId) => {
            await fetchCustomers()
            setSelectedCustomerId(customerId)
          }}
        />

        {/* Customer Information */}
        <Card className="p-4 sm:p-6 mb-4 sm:mb-8">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Customer <span className="text-red-500">*</span></label>
                {!isStaff && (
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerOpen(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    + Add new customer
                  </button>
                )}
              </div>
              {isStaff ? (
                <Input
                  value={customerName}
                  placeholder="Enter customer name"
                  onChange={(e) => e.target.value.length <= 40 && setCustomerName(e.target.value)}
                />
              ) : (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full border-2 border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-2 bg-background text-foreground transition-colors outline-none"
                >
                  <option value="">Choose a customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description </label>
              <Input
                value={description}
                onChange={(e) => {
                  const value = e.target.value
                  // Allow letters, numbers, spaces, and common punctuation, max 100 characters
                  if (value.length <= 100) {
                    setDescription(value)
                  }
                }}
                placeholder={description ? "" : "Enter sale description"}
              />
              {/* <p className="text-xs text-muted-foreground mt-1">
                {description.length}/100 characters
              </p> */}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items Selection */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Add Items to Sale</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Select Item</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full border-2 border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-2 bg-background text-foreground transition-colors outline-none"
                  >
                    <option value="">
                      {isStaff && items.every((item) => getAvailable(item) <= 0)
                        ? "No stock assigned to you yet"
                        : "Choose an item..."}
                    </option>
                    {items.filter((item) => getAvailable(item) > 0).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - Available: {getAvailable(item)} boxes
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Number of Boxes <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={quantity}
                    placeholder="Enter number of boxes"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value
                      // Allow only numbers
                      if (val === "" || /^\d+$/.test(val)) {
                        setQuantity(val === "" ? "" : Number.parseInt(val))
                      }
                    }}
                  />
                </div>
                  
                  <div>
                  <label className="block text-sm font-medium mb-1">
                    Price Per Box (RS) <span className="text-red-500">*</span>
                  </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                    placeholder="Enter price per box"
                    value={pricePerBox === "" ? "" : pricePerBox}
                    onChange={(e) => setPricePerBox(e.target.value === "" ? "" : Number.parseFloat(e.target.value))}
                    className="font-semibold"
                    />
                    {selectedCustomer && selectedItemId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {customerPrice !== undefined
                          ? `${selectedCustomer.name}'s price: RS ${customerPrice.toFixed(2)} per box`
                          : `No saved price for ${selectedCustomer.name} yet — this sale's price will be saved`}
                      </p>
                    )}
                  </div>
                  
                  <div>
                  <label className="block text-sm font-medium mb-1">Total Amount</label>
                  <div className="w-full border-2 border-primary/30 bg-primary/5 rounded-lg p-3">
                    <p className="text-2xl font-bold text-primary">
                      RS {
                        (pricePerBox !== "" && quantity !== "" && typeof quantity === 'number' && typeof pricePerBox === 'number')
                          ? (pricePerBox * quantity).toFixed(2)
                          : "0.00"
                      }
                    </p>
                    {pricePerBox !== "" && quantity !== "" && typeof quantity === 'number' && typeof pricePerBox === 'number' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        RS {(pricePerBox || 0).toFixed(2)} × {quantity} boxes
                      </p>
                    )}
                  </div>
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                {success && <div className="text-green-600 text-sm">{success}</div>}
                <Button onClick={handleAddToCart} className="w-full">
                  Add to Cart
                </Button>
              </div>
            </Card>

            {/* Cart Items */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Cart Items</h2>
              {cart.length === 0 ? (
                <p className="text-muted-foreground">No items in cart</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.itemId} className="flex justify-between items-center p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{item.itemName}</p>
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            Boxes: <span className="font-semibold text-foreground">{item.quantity}</span>
                          </span>
                          <span className="text-muted-foreground">×</span>
                          <span className="text-muted-foreground">
                            Box Price: <span className="font-semibold text-foreground">RS {(() => {
                              const unitPrice = item.sellingPricePerUnit || (item.quantity > 0 ? item.totalPrice / item.quantity : 0) || 0
                              return unitPrice.toFixed(2)
                            })()}</span>
                          </span>
                          <span className="text-muted-foreground">=</span>
                          <span className="text-primary font-bold">
                            RS {(item.totalPrice || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleRemoveFromCart(item.itemId)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="p-4 sm:p-6 sticky top-20">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Order Summary</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Items:</span>
                  <span className="font-semibold">{cart.length}</span>
                </div>
                <div className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Total Quantity:</span>
                  <span className="font-semibold">{totalQuantity}</span>
                </div>
                <div className="border-t-2 border-primary/30 pt-3 mt-3">
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                  <span className="font-semibold">Grand Total:</span>
                    <span className="text-3xl font-bold text-primary">RS {(grandTotal || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
                <h3 className="text-sm font-semibold mb-3">💰 Payment Method</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Cash is selected by default. Reduce cash amount to split with credit.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={paymentCash}
                        onChange={(e) => {
                          setPaymentCash(e.target.checked)
                          if (!e.target.checked) {
                            setCashAmount("")
                            // If unchecking cash, set credit to full amount
                            if (grandTotal > 0) {
                              setCreditAmount(grandTotal)
                              setPaymentCredit(true)
                            }
                          } else {
                            // If checking cash, set to full amount
                            setCashAmount(grandTotal)
                            setCreditAmount("")
                            setPaymentCredit(false)
                          }
                        }}
                        disabled={cart.length === 0}
                      className="w-4 h-4"
                    />
                      <span className="text-sm font-medium">💵 Cash Payment</span>
                  </label>
                    {paymentCash && (
                      <div>
                        <Input
                          type="number"
                          min="0"
                          max={grandTotal}
                          step="0.01"
                          placeholder="Enter cash amount"
                          value={cashAmount === "" ? "" : cashAmount}
                          onChange={(e) => setCashAmount(e.target.value === "" ? "" : Number.parseFloat(e.target.value))}
                          className="mt-2 font-semibold"
                        />
                        {cashAmount !== "" && typeof cashAmount === 'number' && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Cash: RS {(cashAmount || 0).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={paymentCredit}
                        onChange={(e) => {
                          setPaymentCredit(e.target.checked)
                          if (!e.target.checked) setCreditAmount("")
                        }}
                        disabled={cart.length === 0}
                      className="w-4 h-4"
                    />
                      <span className="text-sm font-medium">💳 Credit Payment</span>
                      {creditAmount !== "" && typeof creditAmount === 'number' && creditAmount > 0 && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                          (Auto-calculated)
                    </span>
                      )}
                  </label>
                    {paymentCredit && (
                      <div>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Credit amount"
                          value={creditAmount === "" ? "" : creditAmount}
                          onChange={(e) => {
                            const newCreditAmount = e.target.value === "" ? "" : Number.parseFloat(e.target.value)
                            setCreditAmount(newCreditAmount)
                            // Adjust cash amount accordingly
                            if (newCreditAmount !== "" && typeof newCreditAmount === 'number') {
                              const newCashAmount = grandTotal - newCreditAmount
                              if (newCashAmount >= 0) {
                                setCashAmount(newCashAmount)
                              }
                            }
                          }}
                          className="mt-2 font-semibold bg-blue-50 dark:bg-blue-950/20"
                        />
                        {creditAmount !== "" && typeof creditAmount === 'number' && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Credit: RS {(creditAmount || 0).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {cart.length === 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-3">
                    Add items to cart first
                  </p>
                )}
                
                {paymentCash && paymentCredit && cashAmount !== "" && creditAmount !== "" && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                      💡 Split Payment:
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Cash: RS {typeof cashAmount === 'number' ? cashAmount.toFixed(2) : '0.00'} + Credit: RS {typeof creditAmount === 'number' ? creditAmount.toFixed(2) : '0.00'} = RS {(grandTotal || 0).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>


              <Button onClick={handleCompleteSale} disabled={isLoading || cart.length === 0} className="w-full">
                {isLoading ? "Processing..." : editingSale ? "Update Sale" : "Complete Sale"}
              </Button>
            </Card>
          </div>
        </div>
        </div>
        )}

        {/* Sales List View */}
        {activeView === "list" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="text"
                placeholder="Search user, item, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full sm:w-64 text-sm"
              />
              {!isStaff && (
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="h-9 border border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-md px-2 text-sm bg-background text-foreground transition-colors outline-none max-w-[180px]"
              >
                <option value="all">All Customers</option>
                <option value="none">No customer (older sales)</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              )}
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
                className="h-9 border border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-md px-2 text-sm bg-background text-foreground transition-colors outline-none"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash Only</option>
                <option value="credit">Credit Only</option>
                <option value="both">Cash + Credit</option>
              </select>
              <DateFilter compact onFilter={handleDateFilter} />
            </div>

            {/* Sales List */}
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h2 className="text-xl font-semibold">Sales List</h2>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredSales.length} of {sales.length} sales
                  </div>
                  <Button onClick={exportSalesToPDF} disabled={filteredSales.length === 0}>
                    Export PDF
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading sales...</div>
              ) : filteredSales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No sales found</div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-[960px]">
                    <thead className="bg-muted/50">
                      <tr className="border-b border-border text-sm">
                        <th className="text-left py-3 px-4 font-semibold">Sale #</th>
                        <th className="text-left py-3 px-4 font-semibold">Date</th>
                        <th className="text-left py-3 px-4 font-semibold">Customer</th>
                        <th className="text-left py-3 px-4 font-semibold">Items</th>
                        <th className="text-right py-3 px-4 font-semibold">Cash</th>
                        <th className="text-right py-3 px-4 font-semibold">Credit</th>
                        <th className="text-right py-3 px-4 font-semibold">Total</th>
                        {canManageSales && <th className="text-left py-3 px-4 font-semibold">By</th>}
                        {canManageSales && <th className="py-3 px-4"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.map((sale, index) => {
                        const saleDate = sale.transactionDate?.toDate
                          ? sale.transactionDate.toDate()
                          : new Date(sale.transactionDate)
                        const cash = sale.paymentMethod?.cash ? sale.paymentMethod.cashAmount || 0 : 0
                        const credit = sale.paymentMethod?.credit ? sale.paymentMethod.creditAmount || 0 : 0
                        return (
                          <tr
                            key={sale.id}
                            className={`border-b border-border align-top text-sm hover:bg-muted/30 transition-colors ${
                              index % 2 === 0 ? "bg-background" : "bg-muted/10"
                            }`}
                          >
                            <td className="py-3 px-4 font-semibold whitespace-nowrap">
                              #{(sale.saleNumber || index + 1).toString().padStart(4, "0")}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div>{saleDate.toLocaleDateString()}</div>
                              <div className="text-xs text-muted-foreground">
                                {saleDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{sale.purchaserName || "—"}</div>
                              {sale.description && (
                                <div className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]">{sale.description}</div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-0.5">
                                {sale.items.map((item, idx) => {
                                  const boxInfo = getBoxInfo(sale, item)
                                  const unitPrice =
                                    item.sellingPricePerUnit || (item.quantity > 0 ? item.totalPrice / item.quantity : 0) || 0
                                  return (
                                    <div key={idx}>
                                      <span className="font-medium">{item.itemName}</span>{" "}
                                      <span className="text-muted-foreground">
                                        {boxInfo
                                          ? `× ${boxInfo.boxes} boxes @ RS ${boxInfo.boxPrice.toFixed(2)}`
                                          : `× ${item.quantity} @ RS ${unitPrice.toFixed(2)}`}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 whitespace-nowrap">
                              {cash ? `RS ${cash.toFixed(2)}` : "—"}
                            </td>
                            <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400 whitespace-nowrap">
                              {credit ? `RS ${credit.toFixed(2)}` : "—"}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-primary whitespace-nowrap">
                              RS {(sale.totalAmount || 0).toFixed(2)}
                            </td>
                            {canManageSales && <td className="py-3 px-4 text-muted-foreground">{sale.userName || "Unknown"}</td>}
                            {canManageSales && (
                            <td className="py-3 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    aria-label={`Actions for sale ${sale.saleNumber || index + 1}`}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem disabled={!canEditSale(sale)} onSelect={() => handleEditSale(sale)}>
                                    <Pencil />
                                    {canEditSale(sale) ? "Edit" : "Edit (older sale)"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem variant="destructive" onSelect={() => handleDeleteSale(sale)}>
                                    <Trash2 />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t-2 border-border text-sm">
                      <tr>
                        <td colSpan={4} className="py-3 px-4 font-semibold">
                          Total ({filteredSales.length} sales)
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                          RS {filteredSales.reduce((sum, sale) => sum + (sale.paymentMethod?.cash ? sale.paymentMethod.cashAmount || 0 : 0), 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          RS {filteredSales.reduce((sum, sale) => sum + (sale.paymentMethod?.credit ? sale.paymentMethod.creditAmount || 0 : 0), 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-primary whitespace-nowrap">
                          RS {filteredSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0).toFixed(2)}
                        </td>
                        {canManageSales && <td colSpan={2}></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </main>
      </div>
    </>
  )
}

export default function Sales() {
  return <SalesContent />
}
