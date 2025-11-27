"use client"

import { useEffect, useState } from "react"
import { db, auth } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSale, type SaleItem } from "@/lib/sales"
import type { Item } from "@/lib/items"

function SalesContent() {
  const [items, setItems] = useState<Item[]>([])
  const [saleType, setSaleType] = useState<"wholesale" | "retail">("retail")
  const [cart, setCart] = useState<SaleItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const snapshot = await getDocs(collection(db, "items"))
      const itemsList = snapshot.docs
        .map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as Item,
        )
        .filter((item) => item.quantity > 0)
      setItems(itemsList)
    } catch (error) {
      console.error("Error fetching items:", error)
    }
  }

  const handleAddToCart = () => {
    setError("")
    if (!selectedItemId || quantity <= 0) {
      setError("Please select an item and enter a valid quantity")
      return
    }

    const item = items.find((i) => i.id === selectedItemId)
    if (!item) {
      setError("Item not found")
      return
    }

    if (quantity > item.quantity) {
      setError("Not enough stock available")
      return
    }

    const existingItem = cart.find((c) => c.itemId === selectedItemId)
    if (existingItem) {
      if (existingItem.quantity + quantity > item.quantity) {
        setError("Not enough stock available")
        return
      }
      setCart(
        cart.map((c) =>
          c.itemId === selectedItemId
            ? {
              ...c,
              quantity: c.quantity + quantity,
              totalPrice: (c.quantity + quantity) * c.pricePerUnit,
            }
            : c,
        ),
      )
    } else {
      setCart([
        ...cart,
        {
          itemId: selectedItemId,
          itemName: item.name,
          quantity,
          pricePerUnit: item.price,
          totalPrice: quantity * item.price,
        },
      ])
    }

    setSelectedItemId("")
    setQuantity(1)
  }

  const handleRemoveFromCart = (itemId: string) => {
    setCart(cart.filter((c) => c.itemId !== itemId))
  }

  const handleCompleteSale = async () => {
    setError("")
    setSuccess("")

    if (cart.length === 0) {
      setError("Cart is empty")
      return
    }

    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0)
    if (saleType === "wholesale" && totalQuantity < 12) {
      setError("Wholesale sales require minimum 12 items")
      return
    }
    if (saleType === "retail" && totalQuantity > 11) {
      setError("Retail sales cannot exceed 11 items")
      return
    }

    setIsLoading(true)

    try {
      const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0)
      const saleId = await createSale(
        {
          type: saleType,
          items: cart,
          totalAmount,
          userId: "",
          userName: "",
        },
        auth.currentUser?.uid || "system",
        auth.currentUser?.displayName || "System",
      )

      if (saleId) {
        setSuccess(`Sale completed successfully! Transaction ID: ${saleId}`)
        setCart([])
        setSelectedItemId("")
        setQuantity(1)
        fetchItems()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0)

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Record Sale</h1>
          <p className="text-muted-foreground mt-2">Create a new sale transaction</p>
        </div>

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
              <span>Retail (1-11 items)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="wholesale"
                checked={saleType === "wholesale"}
                onChange={(e) => setSaleType(e.target.value as "retail" | "wholesale")}
              />
              <span>Wholesale (12+ items)</span>
            </label>
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
                    className="w-full border border-input rounded-lg p-2 bg-background text-foreground"
                  >
                    <option value="">Choose an item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - ${item.price} ({item.quantity} available)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                  />
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
                    <div key={item.itemId} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × ${item.pricePerUnit.toFixed(2)} = ${item.totalPrice.toFixed(2)}
                        </p>
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
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-primary">${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-xs text-muted-foreground">
                {saleType === "wholesale" && totalQuantity < 12 && (
                  <p className="text-yellow-600 dark:text-yellow-400">
                    Need {12 - totalQuantity} more items for wholesale
                  </p>
                )}
                {saleType === "retail" && totalQuantity > 11 && (
                  <p className="text-red-600 dark:text-red-400">Too many items for retail ({totalQuantity})</p>
                )}
              </div>

              <Button onClick={handleCompleteSale} disabled={isLoading || cart.length === 0} className="w-full">
                {isLoading ? "Processing..." : "Complete Sale"}
              </Button>
            </Card>
          </div>
        </div>
      </main>
    </>
  )
}

export default function Sales() {
  return <SalesContent />
}
