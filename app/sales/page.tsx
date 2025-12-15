"use client"

import { useEffect, useState } from "react"
import { db, auth } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSale, getSales, type SaleItem, type Sale } from "@/lib/sales"
import type { Item } from "@/lib/items"
import { DateFilter, type DatePreset } from "@/components/date-filter"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

function SalesContent() {
  // View state
  const [activeView, setActiveView] = useState<"record" | "list">("record")
  const [authReady, setAuthReady] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Record Sale State
  const [items, setItems] = useState<Item[]>([])
  const [saleType, setSaleType] = useState<"wholesale" | "retail">("retail")
  const [cart, setCart] = useState<SaleItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState("")
  const [quantity, setQuantity] = useState<number | "">("")
  const [cashPrice, setCashPrice] = useState<number | "">("")
  const [creditPrice, setCreditPrice] = useState<number | "">("")
  const [paymentCash, setPaymentCash] = useState(false)
  const [paymentCredit, setPaymentCredit] = useState(false)
  const [purchaserName, setPurchaserName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Sales List State
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [saleTypeFilter, setSaleTypeFilter] = useState<"all" | "retail" | "wholesale">("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"all" | "cash" | "credit" | "both">("all")
  const [dateFilter, setDateFilter] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [dateFilterKey, setDateFilterKey] = useState(0)
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

  // Fetch data when auth is ready and user is logged in
  useEffect(() => {
    if (authReady && currentUserId) {
      fetchItems()
      fetchSales()
    }
  }, [authReady, currentUserId])

  const fetchItems = async () => {
    try {
      if (!db || !currentUserId) {
        return
      }
      
      // Import getItems function to use user filtering
      const { getItems } = await import("@/lib/items")
      const itemsList = await getItems(currentUserId)
      
      // Filter items with quantity > 0
      const availableItems = itemsList.filter((item) => item.quantity > 0)
      setItems(availableItems)
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
      const salesList = await getSales(currentUserId)
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
        sale.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.items.some(item => item.itemName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.purchaserName && sale.purchaserName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.description && sale.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Sale type filter
    if (saleTypeFilter !== "all") {
      filtered = filtered.filter((sale) => sale.type === saleTypeFilter)
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
  }, [sales, searchTerm, saleTypeFilter, paymentMethodFilter, dateFilter])

  const handleAddToCart = () => {
    setError("")
    if (!selectedItemId || quantity <= 0) {
      setError("Please select an item and enter a valid quantity")
      return
    }

    // Validate that at least one price is entered
    if (cashPrice === "" && creditPrice === "") {
      setError("Please enter at least one price (Cash or Credit)")
      return
    }

    const item = items.find((i) => i.id === selectedItemId)
    if (!item) {
      setError("Item not found")
      return
    }

    if (quantity && quantity > item.quantity) {
      setError("Not enough stock available")
      return
    }

    // Use default price if neither custom price is set
    const effectiveCashPrice = cashPrice !== "" ? cashPrice : item.price
    const effectiveCreditPrice = creditPrice !== "" ? creditPrice : item.price
    
    // Ensure quantity is a valid number
    const qty = typeof quantity === 'number' ? quantity : 0
    
    // Determine which price to use for totalPrice based on what's entered
    let totalPrice = 0
    if (cashPrice !== "" && creditPrice !== "") {
      // Both prices entered - use average for display, will be split later
      totalPrice = qty * ((effectiveCashPrice + effectiveCreditPrice) / 2)
    } else if (cashPrice !== "") {
      totalPrice = qty * effectiveCashPrice
    } else {
      totalPrice = qty * effectiveCreditPrice
    }

    const existingItem = cart.find((c) => c.itemId === selectedItemId)
    if (existingItem) {
      if (existingItem.quantity + qty > item.quantity) {
        setError("Not enough stock available")
        return
      }
      // For simplicity, replace the existing item with new pricing
      setError("Item already in cart. Please remove it first to change pricing.")
      return
    } else {
      setCart([
        ...cart,
        {
          itemId: selectedItemId,
          itemName: item.name,
          quantity: qty,
          pricePerUnit: item.price,
          cashPrice: cashPrice !== "" ? cashPrice : undefined,
          creditPrice: creditPrice !== "" ? creditPrice : undefined,
          totalPrice,
        },
      ])
    }

    setSelectedItemId("")
    setQuantity("")
    setCashPrice("")
    setCreditPrice("")
    
    // Auto-select payment methods based on prices in cart
    const hasCash = cashPrice !== "" || cart.some(c => c.cashPrice !== undefined)
    const hasCredit = creditPrice !== "" || cart.some(c => c.creditPrice !== undefined)
    if (hasCash) setPaymentCash(true)
    if (hasCredit) setPaymentCredit(true)
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

    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0)
    // No quantity restrictions - users can select any number of items

    // Validate payment method matches entered prices
    if (!paymentCash && !paymentCredit) {
      setError("Please select at least one payment method")
      return
    }

    // Validate payment selection matches available prices
    if (paymentCash && cashTotal === 0) {
      setError("No cash prices entered. Please enter cash prices for items or uncheck Cash payment.")
      return
    }
    
    if (paymentCredit && creditTotal === 0) {
      setError("No credit prices entered. Please enter credit prices for items or uncheck Credit payment.")
      return
    }
    
    // Calculate final amounts based on payment selection
    let finalCashAmount = 0
    let finalCreditAmount = 0
    
    if (paymentCash && !paymentCredit) {
      // Cash only - use all cash prices
      finalCashAmount = cashTotal
    } else if (paymentCredit && !paymentCash) {
      // Credit only - use all credit prices
      finalCreditAmount = creditTotal
    } else if (paymentCash && paymentCredit) {
      // Both selected - use both totals
      finalCashAmount = cashTotal
      finalCreditAmount = creditTotal
    }
    
    const totalAmount = finalCashAmount + finalCreditAmount

    setIsLoading(true)

    try {
      const saleId = await createSale(
        {
          type: saleType,
          items: cart,
          totalAmount,
          paymentMethod: {
            cash: paymentCash,
            credit: paymentCredit,
            cashAmount: finalCashAmount,
            creditAmount: finalCreditAmount,
          },
          purchaserName: purchaserName || undefined,
          description: description || undefined,
          userId: "",
          userName: "",
        },
        auth?.currentUser?.uid || "system",
        auth?.currentUser?.displayName || "System",
      )

      if (saleId) {
        setSuccess(`Sale completed successfully! Transaction ID: ${saleId}`)
        setCart([])
        setSelectedItemId("")
        setQuantity("")
        setCashPrice("")
        setCreditPrice("")
        setPaymentCash(false)
        setPaymentCredit(false)
        setPurchaserName("")
        setDescription("")
        fetchItems()
        fetchSales() // Refresh sales list
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0)
  
  // Calculate totals based on payment method selection
  const calculateTotals = () => {
    let cashTotal = 0
    let creditTotal = 0
    
    cart.forEach(item => {
      if (item.cashPrice !== undefined) {
        cashTotal += item.cashPrice * item.quantity
      }
      if (item.creditPrice !== undefined) {
        creditTotal += item.creditPrice * item.quantity
      }
    })
    
    return { cashTotal, creditTotal, grandTotal: cashTotal + creditTotal }
  }
  
  const { cashTotal, creditTotal, grandTotal } = calculateTotals()
  const totalAmount = grandTotal

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
    if (saleTypeFilter !== "all") filterInfo.push(`Type: ${saleTypeFilter}`)
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
        const prices = []
        if (item.cashPrice) prices.push(`Cash: RS ${item.cashPrice.toFixed(2)}`)
        if (item.creditPrice) prices.push(`Credit: RS ${item.creditPrice.toFixed(2)}`)
        return `${item.name} (x${item.quantity}) - ${prices.join(", ")}`
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
        `RS ${sale.totalAmount.toFixed(2)}`
      ]
    })
    
    // Add table
    autoTable(doc, {
      startY: filterInfo.length > 0 ? 42 : 36,
      head: [["#", "Date", "Type", "Purchaser", "Description", "Items", "Payment", "Total"]],
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
    doc.text(`Grand Total: RS ${totalAmount.toFixed(2)}`, 14, finalY + 18)
    
    // Save PDF
    const fileName = `sales-report-${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(fileName)
  }

  if (!authReady) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
      </>
    )
  }

  if (!currentUserId) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Please log in to access sales.</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Sales Management</h1>
          <p className="text-muted-foreground mt-2">Record and view sales transactions</p>
        </div>

        {/* View Toggle */}
        <div className="mb-6 flex gap-2">
          <Button
            onClick={() => setActiveView("record")}
            variant={activeView === "record" ? "default" : "outline"}
          >
            Record Sale
          </Button>
          <Button
            onClick={() => setActiveView("list")}
            variant={activeView === "list" ? "default" : "outline"}
          >
            View All Sales
          </Button>
        </div>

        {/* Record Sale View */}
        {activeView === "record" && (
          <div>

        {/* Sale Type Selector */}
        <Card className="p-6 mb-8">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="retail"
                checked={saleType === "retail"}
                onChange={(e) => setSaleType(e.target.value as "retail" | "wholesale")}
              />
              <span>Retail</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="wholesale"
                checked={saleType === "wholesale"}
                onChange={(e) => setSaleType(e.target.value as "retail" | "wholesale")}
              />
              <span>Wholesale</span>
            </label>
          </div>
        </Card>

        {/* Purchaser Information */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Purchaser Information (Optional)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Purchaser Name</label>
              <Input
                value={purchaserName}
                onChange={(e) => setPurchaserName(e.target.value)}
                placeholder={purchaserName ? "" : "Enter purchaser name"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={description ? "" : "Enter sale description"}
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items Selection */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Add Items to Sale</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Select Item</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full border-2 border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-2 bg-background text-foreground transition-colors outline-none"
                  >
                    <option value="">Choose an item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - RS {item.price} ({item.quantity} available)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <Input
                    type="text"
                    value={quantity}
                    placeholder="0.00"
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
                
                <div className="p-4 rounded-lg space-y-3">
                  <p className="text-sm font-semibold">Price Entry Options</p>
                  <p className="text-xs text-muted-foreground">
                    Enter one or both prices. You may choose Cash Price, Credit Price, or both if applicable.
                  </p>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Cash Price {cashPrice === "" && creditPrice === "" && <span className="text-red-500">*</span>}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="00.0"
                      value={cashPrice === "" ? "" : cashPrice}
                      onChange={(e) => setCashPrice(e.target.value === "" ? "" : Number.parseFloat(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Credit Price {cashPrice === "" && creditPrice === "" && <span className="text-red-500">*</span>}
                    </label>
                  <Input
                    type="number"
                      min="0"
                      step="0.01"
                      placeholder="00.0"
                      value={creditPrice === "" ? "" : creditPrice}
                      onChange={(e) => setCreditPrice(e.target.value === "" ? "" : Number.parseFloat(e.target.value))}
                  />
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
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Cart Items</h2>
              {cart.length === 0 ? (
                <p className="text-muted-foreground">No items in cart</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.itemId} className="flex justify-between items-center p-3 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity}
                        </p>
                        {item.cashPrice !== undefined && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Cash: RS {item.cashPrice.toFixed(2)} × {item.quantity} = RS {(item.cashPrice * item.quantity).toFixed(2)}
                          </p>
                        )}
                        {item.creditPrice !== undefined && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            Credit: RS {item.creditPrice.toFixed(2)} × {item.quantity} = RS {(item.creditPrice * item.quantity).toFixed(2)}
                        </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 bg-transparent"
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
            <Card className="p-6 sticky top-20">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items:</span>
                  <span className="font-semibold">{cart.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Quantity:</span>
                  <span className="font-semibold">{totalQuantity}</span>
                </div>
                {cashTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400">Cash Total:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">RS {cashTotal.toFixed(2)}</span>
                  </div>
                )}
                {creditTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600 dark:text-blue-400">Credit Total:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">RS {creditTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-semibold">Grand Total:</span>
                  <span className="text-2xl font-bold text-primary">RS {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-6 p-4 rounded-lg">
                <h3 className="text-sm font-semibold mb-3">Payment Method</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Select the payment method(s) used for this sale
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentCash}
                      onChange={(e) => setPaymentCash(e.target.checked)}
                      disabled={cashTotal === 0}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      Cash {cashTotal > 0 && `(RS ${cashTotal.toFixed(2)})`}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentCredit}
                      onChange={(e) => setPaymentCredit(e.target.checked)}
                      disabled={creditTotal === 0}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      Credit {creditTotal > 0 && `(RS ${creditTotal.toFixed(2)})`}
                    </span>
                  </label>
                </div>
                
                {cashTotal === 0 && creditTotal === 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-3">
                    Add items with prices to see payment options
                  </p>
                )}
              </div>


              <Button onClick={handleCompleteSale} disabled={isLoading || cart.length === 0} className="w-full">
                {isLoading ? "Processing..." : "Complete Sale"}
              </Button>
            </Card>
          </div>
        </div>
        </div>
        )}

        {/* Sales List View */}
        {activeView === "list" && (
          <div className="space-y-6">
            {/* Date Filter */}
            <DateFilter key={dateFilterKey} onFilter={handleDateFilter} defaultPreset={null} />

            {/* Filters */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Filters</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setSaleTypeFilter("all")
                    setPaymentMethodFilter("all")
                    setDateFilter({ start: null, end: null })
                    setDateFilterKey(prev => prev + 1) // Force DateFilter to reset
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium mb-2">Search</label>
                  <Input
                    type="text"
                    placeholder="Search by user, item, purchaser, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Sale Type Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Sale Type</label>
                  <select
                    value={saleTypeFilter}
                    onChange={(e) => setSaleTypeFilter(e.target.value as any)}
                    className="w-full border-2 border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-2 bg-background text-foreground transition-colors outline-none"
                  >
                    <option value="all">All Types</option>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                  </select>
                </div>

                {/* Payment Method Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <select
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
                    className="w-full border-2 border-border/60 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg p-2 bg-background text-foreground transition-colors outline-none"
                  >
                    <option value="all">All Methods</option>
                    <option value="cash">Cash Only</option>
                    <option value="credit">Credit Only</option>
                    <option value="both">Both (Cash + Credit)</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Sales List */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
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
                <div className="space-y-4">
                  {filteredSales.map((sale, index) => (
                    <div key={sale.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">#{(index + 1).toString().padStart(4, '0')}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              sale.type === "wholesale" 
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            }`}>
                              {sale.type.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {sale.transactionDate?.toDate ? 
                              new Date(sale.transactionDate.toDate()).toLocaleString() :
                              new Date(sale.transactionDate).toLocaleString()
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">
                            By: {sale.userName || "Unknown"}
                          </div>
                          {sale.purchaserName && (
                            <div className="text-sm text-muted-foreground">
                              Purchaser: {sale.purchaserName}
                            </div>
                          )}
                          {sale.description && (
                            <div className="text-sm text-muted-foreground">
                              Description: {sale.description}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            RS {sale.totalAmount.toFixed(2)}
                          </div>
                          <div className="text-sm">
                            {sale.paymentMethod ? (
                              sale.paymentMethod.cash && sale.paymentMethod.credit ? (
                                <div className="space-y-1">
                                  <div className="text-green-600 dark:text-green-400">
                                    Cash: RS {(sale.paymentMethod.cashAmount || 0).toFixed(2)}
                                  </div>
                                  <div className="text-blue-600 dark:text-blue-400">
                                    Credit: RS {(sale.paymentMethod.creditAmount || 0).toFixed(2)}
                                  </div>
                                </div>
                              ) : sale.paymentMethod.cash ? (
                                <div className="text-green-600 dark:text-green-400">Cash Payment</div>
                              ) : (
                                <div className="text-blue-600 dark:text-blue-400">Credit Payment</div>
                              )
                            ) : (
                              <div className="text-muted-foreground">No payment info</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="text-sm font-medium mb-2">Items:</div>
                        <div className="space-y-1">
                          {sale.items.map((item, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground flex justify-between">
                              <span>
                                {item.itemName} × {item.quantity}
                              </span>
                              <span className="flex gap-2">
                                {item.cashPrice !== undefined && (
                                  <span className="text-green-600 dark:text-green-400">
                                    Cash: RS {item.cashPrice.toFixed(2)}
                                  </span>
                                )}
                                {item.creditPrice !== undefined && (
                                  <span className="text-blue-600 dark:text-blue-400">
                                    Credit: RS {item.creditPrice.toFixed(2)}
                                  </span>
                                )}
                                {item.cashPrice === undefined && item.creditPrice === undefined && (
                                  <span>RS {item.pricePerUnit.toFixed(2)}</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="text-sm font-medium mt-2">
                          Total Items: {sale.items.reduce((sum, item) => sum + item.quantity, 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </main>
    </>
  )
}

export default function Sales() {
  return <SalesContent />
}
