# POS Theme Guide

Design tokens extracted from the existing pharmacy system, applied to all POS components.

---

## Colors

| Token | Value | Usage |
|-------|-------|-------|
| **Primary CTA** | `bg-[#618FF5]` / `hover:bg-[#4a7ae0]` | Action buttons (Checkout, Open Shift, Search) |
| **Primary CTA border** | `border-blue-400` / `hover:border-blue-900` | Primary button borders |
| **Primary CTA text** | `text-white` | Button labels |
| **Destructive** | Shadcn `variant="destructive"` | Clear cart, close shift |
| **Muted foreground** | `text-muted-foreground` | Secondary text, labels |
| **Background** | `bg-background` | Page background |
| **Card** | Default shadcn Card | All containers |

### Summary Card Palette (from orders-list.tsx)

| Color | Class | Usage |
|-------|-------|-------|
| **Purple** | `bg-purple-100 border-purple-200 text-purple-900` | Total counts/sales |
| **Green** | `bg-green-100 border-green-200 text-green-900` | Complete/cash |
| **Yellow** | `bg-yellow-100 border-yellow-200 text-yellow-900` | Pending/insurance |
| **Blue** | `bg-blue-100 border-blue-200 text-blue-900` | Card/dispensed orders |

### Status Colors

| State | Color |
|-------|-------|
| Success/active | `text-green-600` / `bg-green-50` |
| Warning/pending | `text-orange-600` / `bg-orange-50` |
| Error/destructive | `text-destructive` / `bg-destructive/10` |
| Info/insurance | `text-blue-500` / `bg-blue-50` |

---

## Typography

| Element | Classes |
|---------|---------|
| **Page title** | `text-2xl font-bold` |
| **Page subtitle** | `text-sm text-muted-foreground mt-1` |
| **Card title** | `text-sm font-semibold` |
| **Table header** | `bg-muted/50` + default `TableHead` |
| **Body text** | `text-sm` |
| **Small/meta** | `text-xs text-muted-foreground` |
| **Tiny labels** | `text-[10px]` |
| **Monospace IDs** | `font-mono text-xs` |
| **Bold totals** | `font-bold text-base` or `text-lg` |

---

## Spacing & Layout

| Element | Classes |
|---------|---------|
| **Page container** | `flex flex-1 flex-col h-full overflow-hidden` |
| **Header section** | `flex-shrink-0 p-4 pt-0 space-y-3` |
| **Scrollable area** | `flex-1 min-h-0 overflow-auto px-4 pb-4` |
| **Card header** | `py-3 px-4` |
| **Card content** | `px-4 pb-4` |
| **Grid (3-col)** | `grid grid-cols-1 lg:grid-cols-12 gap-4` |
| **Summary cards** | `grid grid-cols-2 md:grid-cols-4 gap-3` |
| **Vertical stack** | `space-y-4` |

---

## Components Used

All from `@/components/ui/*` (shadcn/ui):

- **Card** (`CardHeader`, `CardTitle`, `CardContent`)
- **Button** (`variant="outline"`, `variant="ghost"`, `variant="destructive"`, `size="sm"`, `size="lg"`)
- **Input** (with search icon pattern: `relative` + `absolute left-3 top-1/2 -translate-y-1/2`)
- **Badge** (`variant="outline"`, `variant="secondary"`, `variant="destructive"`)
- **Table** (`TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`)
- **Select** (`SelectTrigger`, `SelectContent`, `SelectItem`)
- **Dialog** (`DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`)
- **Tabs** (`TabsList`, `TabsTrigger`, `TabsContent`)
- **Separator**
- **Label**

---

## Icon Library

Lucide React icons. Key POS icons:

| Icon | Import | Usage |
|------|--------|-------|
| `ShoppingCart` | `lucide-react` | Cart, POS nav |
| `Search` | `lucide-react` | Search inputs |
| `ScanBarcode` | `lucide-react` | Barcode scanner |
| `User` | `lucide-react` | Patient |
| `Pill` | `lucide-react` | Drugs |
| `FileText` | `lucide-react` | Orders |
| `Clock` | `lucide-react` | Shifts |
| `BarChart3` | `lucide-react` | Reports |
| `Banknote` | `lucide-react` | Cash payment |
| `CreditCard` | `lucide-react` | Card payment |
| `Shield` | `lucide-react` | Insurance |
| `Wallet` | `lucide-react` | Credit account |
| `Plus` / `Minus` | `lucide-react` | Quantity controls |
| `Trash2` | `lucide-react` | Remove item |
| `CheckCircle2` | `lucide-react` | Success state |
| `AlertCircle` | `lucide-react` | Warning state |
| `Loader2` | `lucide-react` | Loading (with `animate-spin`) |

---

## Button Patterns

```
// Primary CTA
className="gap-2 bg-[#618FF5] text-white hover:bg-[#4a7ae0] font-semibold"

// Outline
variant="outline" size="sm" className="gap-1"

// Ghost (icon-only)
variant="ghost" className="h-7 w-7 p-0"

// Destructive
variant="destructive" className="gap-2"
```

---

## Search Input Pattern

```tsx
<div className="relative flex-1">
  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input placeholder="..." className="pl-10" />
</div>
```

---

## Table Pattern

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="bg-muted/50 text-xs">Column</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="cursor-pointer hover:bg-muted/50">
      <TableCell className="py-2 text-sm">Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## Auth Pattern (Server Pages)

```tsx
// page.tsx (server)
const { workspaceid } = await params;
const user = await getUser();
if (!user) redirect("/");
const workspaces = await getUserWorkspaces(user.userid);
const membership = workspaces.find(w => w.workspace.workspaceid === workspaceid);
if (!membership || (membership.role !== "pharmacist" && membership.role !== "administrator")) {
  redirect(`/d/${workspaceid}`);
}
return <ClientPage workspaceid={workspaceid} userName={user.name || user.email || "User"} userId={user.userid} />;
```

---

## POS File Structure

```
app/d/[workspaceid]/pos/
├── page.tsx                    # Server page (auth)
├── pos-page.tsx                # Client page (3-column layout)
├── components/
│   ├── SearchBar.tsx           # Multi-type search
│   ├── PatientInfo.tsx         # Patient + credit + insurance
│   ├── PrescriptionItems.tsx   # Dispensed order items
│   ├── DrugSearch.tsx          # OTC drug catalog
│   ├── ShoppingCart.tsx        # Cart + totals
│   └── CheckoutDialog.tsx      # Payment modal
├── shifts/
│   ├── page.tsx                # Server page
│   └── shifts-page.tsx         # Open/close shift
└── reports/
    ├── page.tsx                # Server page
    └── reports-page.tsx        # Daily sales report
```
