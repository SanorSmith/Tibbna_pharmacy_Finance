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
import { useState, useEffect } from "react";

// Direct price fetching using database connection: drugs.name → items.name → item_batches.selling_price
const fetchItemPrice = async (drugName: string): Promise<number> => {
  try {
    const response = await fetch('/api/d/[workspaceid]/pos/item-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drugName })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.price || 0;
    }
  } catch (error) {
    console.error('Failed to fetch item price:', error);
  }
  return 0;
};

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
  status: string;
  batchid?: string | null;
  lotnumber?: string | null;
  expirydate?: string | null;
  // New fields from unified inventory system
  inventoryItemId?: string;
  bestBatchId?: string;
  sellingprice?: string;
  unitcost?: string;
  availableStock?: number;
};

type Props = {
  order: any;
  onAddToCart: (item: Omit<CartItem, "cartItemId">) => void;
  cartItems: CartItem[];
  workspaceid: string;
  autoLoadItem?: any;
};

export function PrescriptionItems({ order, onAddToCart, cartItems, workspaceid, autoLoadItem }: Props) {
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});

  // Fetch prices for items when component mounts or order changes
  useEffect(() => {
    const fetchPrices = async () => {
      if (!order?.items) return;
      
      const prices: Record<string, number> = {};
      
      for (const item of order.items) {
        if (item.drugname.includes('ILoprost')) {
          console.log(`[Direct Price Fetch] Fetching price for ${item.drugname} using database connection...`);
          const directPrice = await fetchItemPrice(item.drugname);
          if (directPrice > 0) {
            prices[item.itemid] = directPrice;
            console.log(`[Direct Price Fetch] Found price: ${directPrice} for ${item.drugname}`);
          }
        }
      }
      
      setItemPrices(prices);
    };
    
    fetchPrices();
  }, [order]);

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
          {autoLoadItem ? (
            // Display auto-loaded inventory item from Begin Dispensing
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 text-xs">Drug</TableHead>
                  <TableHead className="bg-muted/50 text-xs text-center">Qty</TableHead>
                  <TableHead className="bg-muted/50 text-xs text-right">Price</TableHead>
                  <TableHead className="bg-muted/50 text-xs text-right w-[60px]">Add</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="text-sm font-medium">{autoLoadItem.drugname}</div>
                    <div className="text-xs text-muted-foreground">
                      {autoLoadItem.form} | Lot: {autoLoadItem.batchNumber} | Exp: {autoLoadItem.expiryDate ? new Date(autoLoadItem.expiryDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm">{autoLoadItem.quantity}</TableCell>
                  <TableCell className="text-right text-sm font-medium text-green-700">
                    {autoLoadItem.sellingPrice ? parseFloat(autoLoadItem.sellingPrice).toLocaleString() : 'N/A'} IQD
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        onAddToCart({
                          drugId: autoLoadItem.itemid,
                          drugName: autoLoadItem.drugname,
                          genericName: autoLoadItem.genericname,
                          form: autoLoadItem.form,
                          strength: autoLoadItem.strength,
                          batchId: autoLoadItem.batchid,
                          lotNumber: autoLoadItem.batchNumber,
                          expiryDate: autoLoadItem.expiryDate,
                          quantity: autoLoadItem.quantity,
                          unitPrice: autoLoadItem.sellingPrice ? parseFloat(autoLoadItem.sellingPrice) : 0,
                          discountPercent: 0,
                          discountAmount: 0,
                          taxAmount: 0,
                          totalAmount: autoLoadItem.sellingPrice ? parseFloat(autoLoadItem.sellingPrice) * autoLoadItem.quantity : 0,
                          availableStock: autoLoadItem.availableStock,
                        });
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6">
              <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No prescription loaded</p>
              <p className="text-xs text-muted-foreground mt-1">
                Search for a patient to see their dispensed orders
              </p>
            </div>
          )}
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
    // Debug: Log all available price fields
    console.log(`[PrescriptionItems Price Debug] ${item.drugname}:`, {
      unitprice: item.unitprice,
      sellingprice: item.sellingprice,
      unitcost: item.unitcost,
      directFetchedPrice: itemPrices[item.itemid]
    });

    // Prioritize direct fetched price for ILoprost (database connection)
    if (item.drugname.includes('ILoprost') && itemPrices[item.itemid]) {
      console.log(`[Direct Price] Using fetched price: ${itemPrices[item.itemid]} for ${item.drugname}`);
      return itemPrices[item.itemid];
    }

    // Prioritize pharmacy order unitprice
    if (item.unitprice && parseFloat(item.unitprice) > 0) return parseFloat(item.unitprice);
    
    // Then try selling price from unified inventory system (item_batches)
    if (item.sellingprice && parseFloat(item.sellingprice) > 0) return parseFloat(item.sellingprice);
    
    // Fallback: unit cost from item_batches
    if (item.unitcost && parseFloat(item.unitcost) > 0) return parseFloat(item.unitcost);

    // Only use hardcoded fallback as last resort
    const form = item.form?.toLowerCase() || '';
    if (form.includes('injection')) return 15000; // 15,000 IQD for injections
    if (form.includes('tablet') || form.includes('capsule')) return 8500; // 8,500 IQD for tablets/capsules  
    if (form.includes('syrup') || form.includes('suspension')) return 5000; // 5,000 IQD for liquids
    return 10000; // 10,000 IQD default for other forms
  };

  const addItem = async (item: OrderItem) => {
    const price = resolvePrice(item);

    // Fetch available stock from unified inventory
    let availableStock: number | undefined = undefined;
    try {
      // Try to resolve unified inventory item ID and fetch stock
      const stockResponse = await fetch(`/api/pos/checkout/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            drugId: item.drugid,
            drugName: item.drugname,
            batchId: item.batchid,
            quantity: (item.quantity || 0) - (item.quantitydispensed || 0),
            unitPrice: price,
          }],
          saleType: 'DISPENSED_ORDER',
          pharmacyOrderId: order?.order?.orderid,
          workspaceid: workspaceid,
        }),
      });
      if (stockResponse.ok) {
        const data = await stockResponse.json();
        console.log('Stock check response:', data);
        if (data.stockWarnings && data.stockWarnings.length > 0) {
          // Extract available quantity from warning message
          const warning = data.stockWarnings[0];
          console.log('Stock warning:', warning);
          const match = warning.match(/only (\d+) available/);
          if (match) {
            availableStock = parseInt(match[1]);
          } else if (warning.includes('no stock record found') || warning.includes('no stock')) {
            availableStock = 0;
          }
        }
        // If no warnings but we have the item, assume stock is available
        if (!data.stockWarnings && data.itemCount > 0) {
          availableStock = undefined; // Don't set to 0 if no warning
        }
      } else {
        console.error('Stock check failed:', stockResponse.status);
      }
    } catch (error) {
      console.error('Failed to fetch stock:', error);
    }

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
      availableStock,
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
