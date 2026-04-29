"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart as CartIcon,
  Trash2,
  Plus,
  Minus,
  X,
  AlertCircle,
} from "lucide-react";
import type { CartItem } from "../pos-page";

type Props = {
  items: CartItem[];
  onUpdateQuantity: (cartItemId: number, quantity: number) => void;
  onRemove: (cartItemId: number) => void;
  onClear: () => void;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  onCheckout: () => void;
  hasShift: boolean;
};

export function ShoppingCart({
  items,
  onUpdateQuantity,
  onRemove,
  onClear,
  subtotal,
  taxAmount,
  discountAmount,
  total,
  onCheckout,
  hasShift,
}: Props) {
  return (
    <Card className="shadow-sm h-full flex flex-col">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between flex-shrink-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CartIcon className="h-4 w-4" />
          Cart
          {items.length > 0 && (
            <Badge
              className="bg-[#618FF5] text-white text-xs ml-1"
            >
              {items.length}
            </Badge>
          )}
        </CardTitle>
        {items.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="h-7 text-xs text-destructive hover:text-destructive gap-1"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-4 flex-1 flex flex-col min-h-0">
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-8">
            <CartIcon className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Cart is empty</p>
            <p className="text-xs mt-1">Search for items or load a prescription</p>
          </div>
        ) : (
          <>
            {/* Items list */}
            <div className="flex-1 overflow-auto space-y-2 mb-3">
              {items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="border rounded-md p-2.5 space-y-1"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.drugName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.form} {item.strength}
                        {item.lotNumber && ` | ${item.lotNumber}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemove(item.cartItemId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    {/* Quantity controls */}
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0"
                        onClick={() =>
                          onUpdateQuantity(item.cartItemId, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={item.prescribedQuantity ? (item.prescribedQuantity - (item.quantitydispensed || 0)) : undefined}
                        value={item.quantity}
                        onChange={(e) => {
                          const newQuantity = parseInt(e.target.value) || 1;
                          const maxQuantity = item.prescribedQuantity ? (item.prescribedQuantity - (item.quantitydispensed || 0)) : Infinity;
                          const validQuantity = Math.min(newQuantity, maxQuantity);
                          onUpdateQuantity(item.cartItemId, validQuantity);
                        }}
                        className="h-6 w-12 text-center text-sm p-0"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0"
                        onClick={() =>
                          onUpdateQuantity(item.cartItemId, item.quantity + 1)
                        }
                        disabled={!!(item.prescribedQuantity && item.quantity >= (item.prescribedQuantity - (item.quantitydispensed || 0)))}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    {/* Price */}
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {(item.quantity * item.unitPrice).toLocaleString()} IQD
                      </p>
                      {item.unitPrice > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          {item.unitPrice.toLocaleString()} each
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="flex-shrink-0 space-y-2">
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{subtotal.toLocaleString()} IQD</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{discountAmount.toLocaleString()} IQD</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{taxAmount.toLocaleString()} IQD</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{total.toLocaleString()} IQD</span>
                </div>
              </div>

              {/* Checkout button */}
              {!hasShift && (
                <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/20 rounded px-2 py-1.5">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  Open a shift before checkout
                </div>
              )}
              <Button
                className="w-full gap-2 bg-[#618FF5] text-white hover:bg-[#4a7ae0] font-semibold"
                size="lg"
                onClick={onCheckout}
                disabled={items.length === 0 || !hasShift}
              >
                <CartIcon className="h-5 w-5" />
                Checkout ({total.toFixed(2)})
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
