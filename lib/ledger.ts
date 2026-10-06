import type { Sale } from "./sales"
import type { CustomerPayment } from "./customer-payments"

export interface LedgerEntry {
  id: string
  kind: "sale" | "payment"
  date: Date
  customerId: string
  customerName: string
  reference: string // "Sale #0012" or "Payment"
  details: string
  total: number // sale total (0 for payments)
  cash: number // cash paid at time of sale
  credit: number // amount added to the customer's balance
  paymentReceived: number // amount removed from the customer's balance
  balance: number // customer's balance after this entry
}

const toDate = (value: any): Date => (value?.toDate ? value.toDate() : new Date(value))

// Build every customer's ledger in date order with a running balance per customer.
// Only sales linked to a customer are included.
export function buildLedger(sales: Sale[], payments: CustomerPayment[]): LedgerEntry[] {
  const entries: Omit<LedgerEntry, "balance">[] = []

  for (const sale of sales) {
    if (!sale.customerId) continue
    const cash = sale.paymentMethod?.cashAmount || 0
    const credit = sale.paymentMethod?.creditAmount || 0
    entries.push({
      id: `sale-${sale.id}`,
      kind: "sale",
      date: toDate(sale.transactionDate || sale.createdAt),
      customerId: sale.customerId,
      customerName: sale.purchaserName || "Unknown",
      reference: `Sale #${(sale.saleNumber || 0).toString().padStart(4, "0")}`,
      details: sale.items.map((item) => item.itemName).join(", "),
      total: sale.totalAmount || cash + credit,
      cash,
      credit,
      paymentReceived: 0,
    })
  }

  for (const payment of payments) {
    entries.push({
      id: `payment-${payment.id}`,
      kind: "payment",
      date: toDate(payment.date),
      customerId: payment.customerId,
      customerName: payment.customerName,
      reference: "Payment",
      details: payment.note || "Payment received",
      total: 0,
      cash: 0,
      credit: 0,
      paymentReceived: payment.amount,
    })
  }

  entries.sort((a, b) => a.date.getTime() - b.date.getTime())

  const running: Record<string, number> = {}
  return entries.map((entry) => {
    const balance = (running[entry.customerId] || 0) + entry.credit - entry.paymentReceived
    running[entry.customerId] = balance
    return { ...entry, balance }
  })
}

// Outstanding balance (credit given minus payments received) per customer id
export function getCustomerBalances(sales: Sale[], payments: CustomerPayment[]): Record<string, number> {
  const balances: Record<string, number> = {}
  for (const sale of sales) {
    if (!sale.customerId) continue
    balances[sale.customerId] = (balances[sale.customerId] || 0) + (sale.paymentMethod?.creditAmount || 0)
  }
  for (const payment of payments) {
    balances[payment.customerId] = (balances[payment.customerId] || 0) - payment.amount
  }
  return balances
}
