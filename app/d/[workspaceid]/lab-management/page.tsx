/**
 * Lab Management Page
 * 
 * Provides comprehensive laboratory inventory management interface
 * Integrates equipment, materials, and suppliers management components
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Beaker, Wrench, Building, ShoppingCart, Home, FlaskConical } from "lucide-react";
import Link from "next/link";
import EquipmentManagement from "@/components/admin/EquipmentManagement";
import MaterialsManagement from "@/components/admin/MaterialsManagement";
import SuppliersManagement from "@/components/admin/SuppliersManagement";
import LaboratoryTypeManagement from "@/components/admin/LaboratoryTypeManagement";
import ShopListManagement from "@/components/admin/ShopListManagement";
import TestReferenceManager from "./components/TestReferenceManager";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function LabManagementPage({ params }: PageProps) {
  const { workspaceid } = await params;

  return (
    <div className="container mx-auto px-4 pt-2 pb-2 space-y-1">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href={`/d/${workspaceid}`}>
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to Dashboard"
            className="h-7 w-7 bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
          >
            <Home className="h-3 w-3" />
          </Button>
        </Link>
        <h1 className="text-base font-bold">Laboratory Management</h1>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="test-references" className="space-y-1">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="test-references" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Test References
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Equipment
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="laboratory-types" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Lab Types
          </TabsTrigger>
          <TabsTrigger value="shop-list" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Shop List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test-references" className="space-y-4">
          <TestReferenceManager workspaceid={workspaceid} />
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <EquipmentManagement workspaceid={workspaceid} />
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <MaterialsManagement workspaceid={workspaceid} />
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <SuppliersManagement workspaceid={workspaceid} />
        </TabsContent>

        <TabsContent value="laboratory-types" className="space-y-4">
          <LaboratoryTypeManagement workspaceid={workspaceid} />
        </TabsContent>

        <TabsContent value="shop-list" className="space-y-4">
          <ShopListManagement workspaceid={workspaceid} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
