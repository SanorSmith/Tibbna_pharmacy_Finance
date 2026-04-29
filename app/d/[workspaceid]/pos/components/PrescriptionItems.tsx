"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Plus, CheckCircle2 } from "lucide-react";
import type { CartItem } from "../pos-page";

type OrderItem = {
  itemid: string;
  drugid: string;
  drugname: string;
  genericname?: string;
  form?: string;
  strength?: string;
  dosage?: string;
  quantity: number;
  quantitydispensed?: number;
  unitprice?: string;
  sellingprice?: string;
  bestBatchPrice?: string;
  bestBatchPurchasePrice?: string;
  purchaseprice?: string;
  inventorySellingPrice?: string;
  inventoryUnitCost?: string;
  nameBasedPrice?: string;
  status: string;
  batchid?: string | null;
  lotnumber?: string | null;
  expirydate?: string | null;
};

type Props = {
  order: {
    order: any;
    items: OrderItem[];
    patient: any;
  } | null;
  onAddToCart: (item: Omit<CartItem, "cartItemId">) => void;
  cartItems: CartItem[];
};

export function PrescriptionItems({ order, onAddToCart, cartItems }: Props) {
  if (!order) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Prescription Items
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-center py-6">
            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No prescription loaded</p>
            <p className="text-xs text-muted-foreground mt-1">
              Search for a patient to see their dispensed orders
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only filter out fully DISPENSED items - PARTIALLY_DISPENSED items should show with remaining quantities
  const items = (order.items || []).filter(
    (item) => !["DISPENSED"].includes(item.status?.toUpperCase())
  );

  const isInCart = (itemId: string) =>
    cartItems.some((c) => c.pharmacyOrderItemId === itemId);

  const resolvePrice = (item: OrderItem): number => {
    // Priority: bestBatchPrice > sellingprice (batch) > inventorySellingPrice > unitprice > bestBatchPurchasePrice > purchaseprice > inventoryUnitCost > nameBasedPrice > default price
    if (item.bestBatchPrice && parseFloat(item.bestBatchPrice) > 0) return parseFloat(item.bestBatchPrice);
    if (item.sellingprice && parseFloat(item.sellingprice) > 0) return parseFloat(item.sellingprice);
    if (item.inventorySellingPrice && parseFloat(item.inventorySellingPrice) > 0) return parseFloat(item.inventorySellingPrice);
    if (item.unitprice && parseFloat(item.unitprice) > 0) return parseFloat(item.unitprice);
    if (item.bestBatchPurchasePrice && parseFloat(item.bestBatchPurchasePrice) > 0) return parseFloat(item.bestBatchPurchasePrice);
    if (item.purchaseprice && parseFloat(item.purchaseprice) > 0) return parseFloat(item.purchaseprice);
    if (item.inventoryUnitCost && parseFloat(item.inventoryUnitCost) > 0) return parseFloat(item.inventoryUnitCost);
    if (item.nameBasedPrice && parseFloat(item.nameBasedPrice) > 0) return parseFloat(item.nameBasedPrice);
    
    // Default price fallback when no inventory data exists
    // Use a reasonable default based on drug type/form
    const defaultPrice = getDefaultPrice(item);
    return defaultPrice;
  };

  const getDefaultPrice = (item: OrderItem): number => {
    // Simple default pricing based on drug form
    const form = item.form?.toLowerCase() || '';
    if (form.includes('injection')) return 15000; // 15,000 IQD for injections
    if (form.includes('tablet') || form.includes('capsule')) return 8500; // 8,500 IQD for tablets/capsules  
    if (form.includes('syrup') || form.includes('suspension')) return 5000; // 5,000 IQD for liquids
    return 10000; // 10,000 IQD default for other forms
  };

  const addItem = (item: OrderItem) => {
    const price = resolvePrice(item);

    onAddToCart({
      drugId: item.drugid,
      drugName: item.drugname,
      genericName: item.genericname,
      form: item.form,
      strength: item.strength,
      batchId: item.batchid,
      lotNumber: item.lotnumber,
      expiryDate: item.expirydate,
      quantity: (item.quantity || 0) - (item.quantitydispensed || 0),
      unitPrice: price,
      discountPercent: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: price * ((item.quantity || 0) - (item.quantitydispensed || 0)),
      pharmacyOrderItemId: item.itemid,
      prescribedQuantity: item.quantity,
      quantitydispensed: item.quantitydispensed,
    });
  };

  const addAll = () => {
    items.forEach((item) => {
      if (!isInCart(item.itemid)) addItem(item);
    });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Prescription Items
          <Badge variant="secondary" className="text-xs ml-1">
            {items.length}
          </Badge>
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={addAll}
          className="gap-1 text-xs h-7"
        >
          <Plus className="h-3 w-3" />
          Add All
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No items in this order
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50 text-xs">Drug</TableHead>
                <TableHead className="bg-muted/50 text-xs text-center">
                  Qty
                </TableHead>
                <TableHead className="bg-muted/50 text-xs text-right">
                  Price
                </TableHead>
                <TableHead className="bg-muted/50 text-xs text-right w-[60px]">
                  Add
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const price = resolvePrice(item);
                const inCart = isInCart(item.itemid);

                return (
                  <TableRow key={item.itemid}>
                    <TableCell className="py-2">
                      <div className="text-sm font-medium">{item.drugname}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.form} {item.strength}
                        {item.lotnumber && ` | Lot: ${item.lotnumber}`}
                        {item.expirydate &&
                          ` | Exp: ${new Date(item.expirydate).toLocaleDateString()}`}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {(item.quantity || 0) - (item.quantitydispensed || 0)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-green-700">
                      {price > 0
                        ? `${price.toLocaleString()} IQD`
                        : "Price not determined"}
                    </TableCell>
                    <TableCell className="text-right">
                      {inCart ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => addItem(item)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
