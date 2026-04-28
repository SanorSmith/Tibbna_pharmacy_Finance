"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart as CartIcon,
  Clock,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { SearchBar } from "./components/SearchBar";
import { PatientInfo } from "./components/PatientInfo";
import { PrescriptionItems } from "./components/PrescriptionItems";
import { DrugSearch } from "./components/DrugSearch";
import { ShoppingCart } from "./components/ShoppingCart";
import { CheckoutDialog } from "./components/CheckoutDialog";
import { PharmacyNav } from "./components/PharmacyNav";

export type CartItem = {
  cartItemId: number;
  drugId: string;
  drugName: string;
  genericName?: string;
  form?: string;
  strength?: string;
  batchId?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  pharmacyOrderItemId?: string | null;
  prescribedQuantity?: number;
  quantitydispensed?: number;
};

type ShiftData = {
  shiftid: string;
  shiftnumber: string;
  openingtime: string;
  status: string;
};

export default function POSClientPage({
  workspaceid,
  userName,
  userId,
}: {
  workspaceid: string;
  userName: string;
  userId: string;
}) {
  const searchParams = useSearchParams();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [patient, setPatient] = useState<any>(null);
  const [dispensedOrder, setDispensedOrder] = useState<any>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<ShiftData | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);

  // Load current shift on mount
  useEffect(() => {
    fetchCurrentShift();
  }, []);

  // Handle URL parameters for auto-loading order from "Begin Dispensing"
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const patientId = searchParams.get('patientId');
    
    if (orderId) {
      console.log('[POS] Auto-loading from URL params:', { orderId, patientId });
      
      if (patientId && patientId !== 'undefined') {
        // Auto-load patient first, then the order
        handlePatientSelect(patientId).then(() => {
          handleOrderSelect(orderId);
        });
      } else {
        // Load order directly (patient will be resolved from order data)
        handleOrderSelect(orderId);
      }
    }
  }, [searchParams]);

  const fetchCurrentShift = async () => {
    try {
      setShiftLoading(true);
      const res = await fetch("/api/pos/shifts");
      const data = await res.json();
      setCurrentShift(data.shift || null);
    } catch {
      setCurrentShift(null);
    } finally {
      setShiftLoading(false);
    }
  };

  // Search result handlers
  const handlePatientSelect = useCallback(async (patientId: string) => {
    try {
      console.log("[POS] Fetching patient:", patientId);
      const res = await fetch(`/api/pos/patients/${patientId}`);
      if (!res.ok) {
        console.error("[POS] Patient API error:", res.status);
        return;
      }
      const data = await res.json();
      console.log("[POS] Patient data:", data.patient?.firstname, data.patient?.lastname);
      console.log("[POS] Dispensed orders:", data.dispensedOrders?.length ?? 0);
      setPatient(data);
      // Auto-load first dispensed order
      if (data.dispensedOrders?.length > 0) {
        await handleOrderSelect(data.dispensedOrders[0].orderid);
      } else {
        setDispensedOrder(null);
      }
    } catch (err) {
      console.error("[POS] Patient lookup failed:", err);
    }
  }, []);

  const handleOrderSelect = useCallback(async (orderId: string) => {
    try {
      console.log("[POS] Fetching order:", orderId);
      const res = await fetch(`/api/pos/orders/${orderId}`);
      if (!res.ok) {
        console.error("[POS] Order API error:", res.status);
        return;
      }
      const data = await res.json();
      console.log("[POS] Order items:", data.items?.length ?? 0);
      data.items?.forEach((item: any) => {
        console.log(`[POS]   - ${item.drugname}: qty=${item.quantity}, unitprice=${item.unitprice}, sellingprice=${item.sellingprice}`);
      });
      setDispensedOrder(data);
      // Also set patient from order if we don't have one
      if (data.patient && !patient) {
        setPatient({ patient: data.patient });
      }
    } catch (err) {
      console.error("[POS] Order lookup failed:", err);
    }
  }, [patient]);

  // Cart operations
  const addToCart = useCallback((item: Omit<CartItem, "cartItemId">) => {
    setCart((prev) => {
      // Check if same drug+batch already in cart
      const existing = prev.find(
        (c) => c.drugId === item.drugId && c.batchId === item.batchId
      );
      if (existing) {
        return prev.map((c) =>
          c.cartItemId === existing.cartItemId
            ? {
                ...c,
                quantity: c.quantity + item.quantity,
                totalAmount: (c.quantity + item.quantity) * c.unitPrice,
              }
            : c
        );
      }
      return [...prev, { ...item, cartItemId: Date.now() + Math.random() }];
    });
  }, []);

  const updateCartQuantity = useCallback(
    (cartItemId: number, quantity: number) => {
      if (quantity < 1) return;
      setCart((prev) =>
        prev.map((item) => {
          if (item.cartItemId !== cartItemId) return item;
          // Cap at prescribed quantity if from a prescription
          const maxQty = item.prescribedQuantity || Infinity;
          const clampedQty = Math.min(quantity, maxQty);
          return { ...item, quantity: clampedQty, totalAmount: clampedQty * item.unitPrice };
        })
      );
    },
    []
  );

  const removeFromCart = useCallback((cartItemId: number) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  }, []);

  const clearAll = useCallback(() => {
    setCart([]);
    setPatient(null);
    setDispensedOrder(null);
  }, []);

  // Totals
  const subtotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = 0; // 0% for Iraq
  const discountAmount = cart.reduce((sum, item) => sum + item.discountAmount, 0);
  const total = subtotal + taxAmount - discountAmount;

  // Determine sale type
  const saleType = dispensedOrder
    ? "DISPENSED_ORDER"
    : cart.some((i) => i.pharmacyOrderItemId)
      ? "NEW_PRESCRIPTION"
      : "OTC_WALKIN";

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* Pharmacy Dashboard Navigation */}
      <PharmacyNav workspaceid={workspaceid} activeTab="pos" />

      {/* Header */}
      <div className="flex-shrink-0 p-4 pt-0 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CartIcon className="h-6 w-6" />
              Point of Sale
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentShift ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Shift {currentShift.shiftnumber} | Since{" "}
                  {new Date(currentShift.openingtime).toLocaleTimeString()}
                </span>
              ) : shiftLoading ? (
                "Loading shift..."
              ) : (
                <span className="flex items-center gap-1 text-orange-600">
                  <AlertCircle className="h-3 w-3" />
                  No active shift — open a shift to start selling
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {userName}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                (window.location.href = `/d/${workspaceid}/pos/shifts`)
              }
              className="gap-1"
            >
              <Clock className="h-4 w-4" />
              Shifts
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                (window.location.href = `/d/${workspaceid}/pos/reports`)
              }
              className="gap-1"
            >
              <BarChart3 className="h-4 w-4" />
              Reports
            </Button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          {/* Left Column: Search + Patient */}
          <div className="lg:col-span-3 space-y-4">
            <SearchBar
              onPatientSelect={handlePatientSelect}
              onOrderSelect={handleOrderSelect}
              onDrugAdd={addToCart}
            />
            {patient && (
              <PatientInfo
                data={patient}
                onOrderSelect={handleOrderSelect}
              />
            )}
          </div>

          {/* Middle Column: Items */}
          <div className="lg:col-span-5 space-y-4 overflow-auto">
            <PrescriptionItems
              order={dispensedOrder}
              onAddToCart={addToCart}
              cartItems={cart}
            />
            <DrugSearch onAddToCart={addToCart} />
          </div>

          {/* Right Column: Cart */}
          <div className="lg:col-span-4">
            <ShoppingCart
              items={cart}
              onUpdateQuantity={updateCartQuantity}
              onRemove={removeFromCart}
              onClear={clearAll}
              subtotal={subtotal}
              taxAmount={taxAmount}
              discountAmount={discountAmount}
              total={total}
              onCheckout={() => setCheckoutOpen(true)}
              hasShift={!!currentShift}
            />
          </div>
        </div>
      </div>

      {/* Checkout Dialog */}
      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        patient={patient}
        dispensedOrder={dispensedOrder}
        subtotal={subtotal}
        taxAmount={taxAmount}
        discountAmount={discountAmount}
        total={total}
        saleType={saleType}
        shiftId={currentShift?.shiftid || null}
        workspaceId={workspaceid}
        onSuccess={clearAll}
      />
    </div>
  );
}
