# PDF Export Feature

## Overview
Added comprehensive PDF export functionality to export Sales, Purchases, and Inventory data as professionally formatted PDF documents.

## Libraries Used
- **jsPDF**: Core PDF generation library
- **jspdf-autotable**: Automatic table generation with advanced styling options

## Installation
```bash
npm install jspdf jspdf-autotable
```

## Features Implemented

### 1. Expenses PDF Export (`app/expenses/page.tsx`)

**Location**: Expenses page → Next to category filter → Export PDF button

**Features**:
- Exports all filtered expenses based on active filters
- Includes active filters in the report:
  - Date range filter
  - Category filter (Rent, Utilities, Supplies, etc.)
  - Search term
- Shows complete expense details:
  - Date
  - Name
  - Category
  - Description
  - Amount
- Includes category breakdown summary
- Summary statistics:
  - Total number of expenses
  - Total amount
  - Amount per category

**PDF Structure**:
```
┌─────────────────────────────────────┐
│ Expenses Report                     │
│ Date Range: MM/DD/YYYY - MM/DD/YYYY │
│ Filters: Category, Search           │
├─────────────────────────────────────┤
│ Table with columns:                 │
│ - Date                              │
│ - Name                              │
│ - Category                          │
│ - Description                       │
│ - Amount                            │
├─────────────────────────────────────┤
│ Total Expenses: X                   │
│ Total Amount: RS X.XX               │
│                                     │
│ Category Breakdown:                 │
│ - Rent: RS X.XX                     │
│ - Utilities: RS X.XX                │
│ - Supplies: RS X.XX                 │
│ - etc.                              │
└─────────────────────────────────────┘
```

**File Name Format**: `expenses-report-YYYY-MM-DD.pdf`

---

### 2. Reports PDF Export (`app/reports/page.tsx`)

**Location**: Reports page → Next to Sale Type filter → Export PDF button

**Features**:
- Exports comprehensive sales analysis based on filtered data
- Respects all active filters:
  - Date range filter (from DateFilter component)
  - Manual start/end date filters
  - Sale type filter (All/Retail/Wholesale)
- Includes detailed analytics:
  - Summary statistics (revenue, transactions, averages)
  - Sales type breakdown (retail vs wholesale percentages)
  - Complete transaction details
  - Payment method information
  - Daily revenue breakdown (up to 10 days)
- Professional analysis format

**PDF Structure**:
```
┌─────────────────────────────────────┐
│ Sales Report & Analysis             │
│ Report Period: MM/DD/YY - MM/DD/YY  │
│ Sale Type: RETAIL (if filtered)     │
│ Generated: MM/DD/YYYY HH:MM:SS      │
├─────────────────────────────────────┤
│ Summary Statistics                  │
│ Total Revenue: RS X.XX              │
│ Total Transactions: X               │
│ Average Transaction: RS X.XX        │
│ Retail Sales: X (XX%)               │
│ Wholesale Sales: X (XX%)            │
├─────────────────────────────────────┤
│ Sales Transactions Table:           │
│ - Date                              │
│ - Type                              │
│ - Items                             │
│ - Payment                           │
│ - Amount                            │
├─────────────────────────────────────┤
│ Daily Revenue Breakdown             │
│ Dec 10: RS X.XX                     │
│ Dec 11: RS X.XX                     │
│ ...                                 │
└─────────────────────────────────────┘
```

**File Name Format**: `sales-report-YYYY-MM-DD.pdf`

---

### 3. Sales PDF Export (`app/sales/page.tsx`)

**Location**: Sales page → View All Sales → Export PDF button

**Features**:
- Exports all filtered sales data
- Includes active filters in the report:
  - Date range filter
  - Sale type filter (Retail/Wholesale)
  - Payment method filter (Cash/Credit/Both)
  - Search term
- Shows detailed item breakdown for each sale
- Displays payment method details (Cash/Credit/Split)
- Includes summary statistics:
  - Total number of sales
  - Grand total amount

**PDF Structure**:
```
┌─────────────────────────────────────┐
│ Sales Report                        │
│ Date Range: MM/DD/YYYY - MM/DD/YYYY │
│ Filters: Type, Payment, Search      │
├─────────────────────────────────────┤
│ Table with columns:                 │
│ - ID                                │
│ - Date                              │
│ - Type                              │
│ - Items                             │
│ - Payment                           │
│ - Total                             │
├─────────────────────────────────────┤
│ Total Sales: X                      │
│ Grand Total: RS X.XX                │
└─────────────────────────────────────┘
```

**File Name Format**: `sales-report-YYYY-MM-DD.pdf`

---

### 2. Purchase PDF Export (`app/purchase/page.tsx`)

**Location**: Purchase page → View All Purchases → Export PDF button

**Features**:
- Exports complete purchase history
- Shows supplier information
- Detailed item breakdown with SKU, quantity, and unit cost
- Includes summary statistics:
  - Total number of purchases
  - Grand total amount spent

**PDF Structure**:
```
┌─────────────────────────────────────┐
│ Purchase Report                     │
│ Generated: MM/DD/YYYY HH:MM:SS      │
├─────────────────────────────────────┤
│ Table with columns:                 │
│ - ID                                │
│ - Date                              │
│ - Supplier                          │
│ - Contact                           │
│ - Items (with SKU, qty, cost)       │
│ - Total                             │
├─────────────────────────────────────┤
│ Total Purchases: X                  │
│ Grand Total: RS X.XX                │
└─────────────────────────────────────┘
```

**File Name Format**: `purchases-report-YYYY-MM-DD.pdf`

---

### 3. Inventory/Items PDF Export (`app/items/page.tsx`)

**Location**: Items page → Next to search bar → Export PDF button

**Features**:
- Exports current inventory with all filtered items
- Includes date range filter if applied
- Shows search term if used
- Complete item details:
  - SKU (auto-generated)
  - Item name
  - Vendor information
  - Description
  - Price
  - Quantity
  - Total value (price × quantity)
- Comprehensive summary:
  - Total number of items
  - Total quantity across all items
  - Total inventory value

**PDF Structure**:
```
┌─────────────────────────────────────┐
│ Inventory Report                    │
│ Generated: MM/DD/YYYY HH:MM:SS      │
│ Date Range: MM/DD/YYYY - MM/DD/YYYY │
│ Search: "search term"               │
├─────────────────────────────────────┤
│ Table with columns:                 │
│ - SKU                               │
│ - Item Name                         │
│ - Vendor                            │
│ - Description                       │
│ - Price                             │
│ - Quantity                          │
│ - Total Value                       │
├─────────────────────────────────────┤
│ Total Items: X                      │
│ Total Quantity: X units             │
│ Total Inventory Value: RS X.XX      │
└─────────────────────────────────────┘
```

**File Name Format**: `inventory-report-YYYY-MM-DD.pdf`

---

## UI Implementation

### Button Placement
- **Expenses**: In the filters row, next to the category dropdown
- **Reports**: In the Additional Filters card, next to the Sale Type filter
- **Sales**: Top right of Sales List card, next to the sales count
- **Purchase**: Top right of Purchase History card header
- **Items**: Next to the search input field at the top

### Button States
- Enabled when there is data to export
- Disabled (`disabled={data.length === 0}`) when no data is available
- Uses `variant="outline"` for consistent styling

### Button Labels
All export buttons are labeled **"Export PDF"** for consistency

---

## Technical Details

### PDF Styling
- **Theme**: Grid layout with borders
- **Font Size**: 8pt for table content, larger for headers and summaries
- **Header Color**: Primary blue (#3B82F6)
- **Page Size**: A4 (default)
- **Orientation**: Portrait

### Table Column Widths
Optimized for readability and proper content fit:

**Expenses Table**:
- Date: 25mm
- Name: 35mm
- Category: 30mm
- Description: 60mm
- Amount: 25mm

**Reports Table**:
- Date: 25mm
- Type: 25mm
- Items: 60mm (multiline)
- Payment: 35mm (multiline)
- Amount: 25mm

**Sales Table**:
- ID: 20mm
- Date: 25mm
- Type: 20mm
- Items: 60mm (multiline)
- Payment: 30mm (multiline)
- Total: 25mm

**Purchase Table**:
- ID: 20mm
- Date: 25mm
- Supplier: 30mm
- Contact: 25mm
- Items: 55mm (multiline)
- Total: 25mm

**Inventory Table**:
- SKU: 22mm
- Item Name: 30mm
- Vendor: 25mm
- Description: 40mm
- Price: 20mm
- Quantity: 18mm
- Total Value: 25mm

### Multiline Cell Handling
The library automatically handles multiline content using `\n` separators for:
- Multiple items in sales/purchases
- Split payment details
- Long descriptions

---

## Usage Example

### For Users
1. Navigate to the desired page (Expenses, Reports, Sales, Purchase, or Items)
2. Apply any filters you want (date, search, type, etc.)
3. Click the **"Export PDF"** button
4. The PDF will automatically download to your default downloads folder

### For Developers
```typescript
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const exportToPDF = () => {
  const doc = new jsPDF()
  
  // Add title
  doc.setFontSize(18)
  doc.text("Report Title", 14, 22)
  
  // Add table
  autoTable(doc, {
    startY: 30,
    head: [["Column 1", "Column 2"]],
    body: [
      ["Data 1", "Data 2"],
      ["Data 3", "Data 4"]
    ],
    theme: "grid",
    styles: { fontSize: 8 }
  })
  
  // Save
  doc.save("report.pdf")
}
```

---

## Benefits

1. **Data Portability**: Export data for offline analysis, sharing, or archiving
2. **Professional Reporting**: Generate clean, formatted reports for stakeholders
3. **Filtered Exports**: Only export the data you need based on active filters
4. **Automatic Formatting**: No manual formatting required
5. **Date Stamped**: All exports include generation date/time
6. **Summary Statistics**: Quick overview of totals and counts
7. **User-Specific Data**: Respects user authentication and data isolation
8. **Comprehensive Analytics**: Reports page includes percentage breakdowns and trends
9. **Category Breakdown**: Expenses report shows spending by category

---

## Future Enhancements (Optional)

- **Custom Date Ranges**: Allow manual date selection for exports
- **Logo Support**: Add company logo to PDF headers
- **Custom Branding**: Allow color scheme customization
- **Export to Excel**: Add XLSX export option
- **Email Integration**: Send PDFs directly via email
- **Scheduled Reports**: Automated periodic report generation
- **Print Optimization**: Add print-specific layouts
- **Charts/Graphs**: Visual data representation in PDFs

---

## Troubleshooting

### PDF not downloading
- Check browser's download settings
- Ensure pop-ups are not blocked
- Verify sufficient disk space

### Missing data in PDF
- Confirm data is visible in the UI before exporting
- Check if filters are applied correctly
- Verify user has proper permissions

### Formatting issues
- Update jsPDF and jspdf-autotable to latest versions
- Check browser compatibility
- Verify column width calculations

---

## Browser Compatibility
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

All modern browsers support PDF generation via jsPDF.

