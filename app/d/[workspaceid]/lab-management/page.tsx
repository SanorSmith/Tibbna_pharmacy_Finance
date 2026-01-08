/**
 * Lab Management Page
 * - Laboratory inventory management
 * - Manage lab equipment, supplies, reagents, and consumables
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Beaker, Wrench, Plus, Home } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function LabManagementPage({ params }: PageProps) {
  const { workspaceid } = await params;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/d/${workspaceid}/doctor`}>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Back to Doctor Dashboard"
                  className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
                >
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
          <div>
            <h1 className="text-2xl font-bold">Lab Inventory Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage laboratory equipment, supplies, reagents, and consumables
            </p>
          </div>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Inventory Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-600" />
              Equipment
            </CardTitle>
            <CardDescription>Lab equipment and instruments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Items in inventory</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Beaker className="h-5 w-5 text-green-600" />
              Reagents
            </CardTitle>
            <CardDescription>Chemical reagents and solutions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Items in stock</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" />
              Consumables
            </CardTitle>
            <CardDescription>Tubes, tips, gloves, and supplies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Items available</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            View and manage all laboratory inventory items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No inventory items yet</p>
            <p className="text-sm mt-2">Click &quot;Add Item&quot; to start managing your lab inventory</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
