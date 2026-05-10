/**
 * Lab Management Tab Component
 * 
 * Provides comprehensive laboratory inventory management interface
 * Integrates equipment, materials, and suppliers management components
 */
"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Beaker, Wrench, Building } from "lucide-react";
import EquipmentManagement from "@/components/admin/EquipmentManagement";
import MaterialsManagement from "@/components/admin/MaterialsManagement";
import SuppliersManagement from "@/components/admin/SuppliersManagement";
import LaboratoryTypeManagement from "@/components/admin/LaboratoryTypeManagement";

export default function LabManagementTab({ workspaceid }: { workspaceid: string }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lab Inventory Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage laboratory equipment, materials, suppliers, and types
          </p>
        </div>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="equipment" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
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
        </TabsList>

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
      </Tabs>
    </div>
  );
}
