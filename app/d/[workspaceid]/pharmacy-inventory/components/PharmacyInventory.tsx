"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Warehouse, 
  Package, 
  Users, 
  FileText, 
  TrendingUp,
  ArrowRight,
  Building2,
  ShoppingCart,
  ClipboardCheck
} from "lucide-react";
import Link from "next/link";

interface PharmacyInventoryProps {
  workspaceid: string;
}

export default function PharmacyInventory({ workspaceid }: PharmacyInventoryProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-muted-foreground">
            Manage warehouses, procurement, vendors, and stock levels
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/warehouses">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Warehouses
              </CardTitle>
              <Warehouse className="h-4 w-4 text-[#618FF5]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Manage warehouse locations and sections
              </p>
              <Button variant="link" className="mt-2 p-0 h-auto text-[#618FF5]">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/vendors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Vendors
              </CardTitle>
              <Users className="h-4 w-4 text-[#618FF5]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Manage vendor relationships and contracts
              </p>
              <Button variant="link" className="mt-2 p-0 h-auto text-[#618FF5]">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/procurement">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Procurement
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-[#618FF5]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Purchase requisitions, orders & receipts
              </p>
              <Button variant="link" className="mt-2 p-0 h-auto text-[#618FF5]">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#618FF5]" />
              Purchase Requisitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Approved</span>
                <span className="font-semibold">-</span>
              </div>
              <Link href="/procurement?tab=pr">
                <Button variant="outline" size="sm" className="w-full mt-2">
                  View All PRs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#618FF5]" />
              Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Draft</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sent</span>
                <span className="font-semibold">-</span>
              </div>
              <Link href="/procurement?tab=po">
                <Button variant="outline" size="sm" className="w-full mt-2">
                  View All POs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-[#618FF5]" />
              Goods Receipt Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Draft</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Posted</span>
                <span className="font-semibold">-</span>
              </div>
              <Link href="/procurement?tab=grn">
                <Button variant="outline" size="sm" className="w-full mt-2">
                  View All GRNs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common inventory management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/warehouses">
              <Button variant="outline" className="w-full justify-start">
                <Warehouse className="mr-2 h-4 w-4" />
                Add Warehouse
              </Button>
            </Link>
            <Link href="/vendors">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Add Vendor
              </Button>
            </Link>
            <Link href="/procurement?tab=pr">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                New Requisition
              </Button>
            </Link>
            <Link href="/procurement?tab=po">
              <Button variant="outline" className="w-full justify-start">
                <ShoppingCart className="mr-2 h-4 w-4" />
                New Purchase Order
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
