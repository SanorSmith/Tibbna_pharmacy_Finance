/**
 * Shop List Management Component
 * 
 * Provides shop list interface for ordering laboratory materials and equipment
 * Features item management, order creation, and order history
 */

"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingCart, Plus, Trash2, History, Send, Save, Edit, FileText, AlertCircle } from "lucide-react";

interface ShopOrderItem {
  itemid?: string;
  itemname: string;
  itemcode: string;
  uom: string;
  quantity: number;
  priority: "normal" | "urgent";
  deliverytime: string;
  notes?: string;
}

interface ShopOrder {
  orderid?: string;
  ordernumber?: string;
  deliveryaddress: string;
  deliverytime: string;
  clientname: string;
  status?: string;
  items: ShopOrderItem[];
  createdby?: string;
  createdat?: string;
}

interface ShopListManagementProps {
  workspaceid: string;
}

export default function ShopListManagement({ workspaceid }: ShopListManagementProps) {
  const [items, setItems] = useState<ShopOrderItem[]>([
    { itemname: "", itemcode: "", uom: "", quantity: 1, priority: "normal", deliverytime: "" },
  ]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [clientName, setClientName] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [orderHistory, setOrderHistory] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("create");

  // Fetch user info and auto-populate creator name
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            const fullName = `${data.user.firstname || ""} ${data.user.lastname || ""}`.trim();
            setCreatorName(fullName || data.user.email || "Unknown");
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Fetch order history
  const fetchOrderHistory = async () => {
    try {
      const response = await fetch(`/api/d/${workspaceid}/shop-orders`);
      if (response.ok) {
        const data = await response.json();
        setOrderHistory(data.orders || []);
      }
    } catch (error) {
      console.error("Error fetching order history:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchOrderHistory();
    }
  }, [activeTab, workspaceid]);

  // Add new row
  const handleAddRow = () => {
    setItems([...items, { itemname: "", itemcode: "", uom: "", quantity: 1, priority: "normal", deliverytime: "" }]);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.length > 0 ? newItems : [{ itemname: "", itemcode: "", uom: "", quantity: 1, priority: "normal", deliverytime: "" }]);
  };

  // Update item field
  const handleItemChange = (index: number, field: keyof ShopOrderItem, value: string | number | "normal" | "urgent") => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Save as draft
  const handleSave = async () => {
    try {
      setLoading(true);
      const orderData = {
        deliveryaddress: deliveryAddress,
        clientname: clientName,
        status: "draft",
        items: items.filter(item => item.itemname.trim() !== ""),
      };

      const response = await fetch(`/api/d/${workspaceid}/shop-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentOrderId(data.order.orderid);
        alert("Order saved as draft successfully!");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save order");
      }
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Error saving order");
    } finally {
      setLoading(false);
    }
  };

  // Send order
  const handleSend = async () => {
    try {
      setLoading(true);
      const orderData = {
        deliveryaddress: deliveryAddress,
        clientname: clientName,
        status: "submitted",
        orderdate: new Date().toISOString(),
        items: items.filter(item => item.itemname.trim() !== ""),
      };

      if (!orderData.items.length) {
        alert("Please add at least one item to the order");
        return;
      }

      const response = await fetch(`/api/d/${workspaceid}/shop-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        alert("Order sent successfully!");
        // Reset form
        setItems([{ itemname: "", itemcode: "", uom: "", quantity: 1, priority: "normal", deliverytime: "" }]);
        setDeliveryAddress("");
        setClientName("");
        setCurrentOrderId(null);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to send order");
      }
    } catch (error) {
      console.error("Error sending order:", error);
      alert("Error sending order");
    } finally {
      setLoading(false);
    }
  };

  // Edit existing order
  const handleEdit = () => {
    // Allow editing of current order
    alert("Edit mode enabled");
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "ordered":
        return <Badge className="bg-purple-100 text-purple-800">Ordered</Badge>;
      case "delivered":
        return <Badge className="bg-teal-100 text-teal-800">Delivered</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Shop List Management</h3>
        <p className="text-sm text-muted-foreground">
          Create and manage laboratory material orders
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">
            <FileText className="h-4 w-4 mr-2" />
            Create Shop List
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Order History
          </TabsTrigger>
        </TabsList>

        {/* Create Shop List Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shop list:
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Information */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label>Delivery Address</Label>
              <Input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter delivery address"
              />
            </div>
            <div>
              <Label>Client Name</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
              />
            </div>
            <div>
              <Label>Created By</Label>
              <Input
                value={creatorName}
                disabled
                className="bg-gray-100"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-blue-100">
                <TableRow>
                  <TableHead className="font-semibold text-black">Item Name</TableHead>
                  <TableHead className="font-semibold text-black">Code</TableHead>
                  <TableHead className="font-semibold text-black">UOM</TableHead>
                  <TableHead className="font-semibold text-black">Quantity</TableHead>
                  <TableHead className="font-semibold text-black">Status</TableHead>
                  <TableHead className="font-semibold text-black">Delivery Time</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={item.itemname}
                        onChange={(e) => handleItemChange(index, "itemname", e.target.value)}
                        placeholder="Item name"
                        className="min-w-[180px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.itemcode}
                        onChange={(e) => handleItemChange(index, "itemcode", e.target.value)}
                        placeholder="Code"
                        className="min-w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.uom}
                        onChange={(e) => handleItemChange(index, "uom", e.target.value)}
                        placeholder="UOM"
                        className="w-[100px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-[90px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.priority}
                        onValueChange={(value) => handleItemChange(index, "priority", value as "normal" | "urgent")}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal Order</SelectItem>
                          <SelectItem value="urgent">
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 text-red-500" />
                              Urgent
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="datetime-local"
                        value={item.deliverytime}
                        onChange={(e) => handleItemChange(index, "deliverytime", e.target.value)}
                        className="min-w-[180px]"
                      />
                    </TableCell>
                    <TableCell>
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRow(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Add Row Button */}
          <Button
            variant="outline"
            onClick={handleAddRow}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-400 hover:bg-blue-500 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button
              onClick={handleSend}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Order History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Order History
              </CardTitle>
              <CardDescription>
                View all previous orders and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orderHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No orders yet</p>
                  <p className="text-sm">Create your first shop list to get started</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Delivery Address</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderHistory.map((order) => (
                        <TableRow key={order.orderid}>
                          <TableCell className="font-medium">{order.ordernumber}</TableCell>
                          <TableCell>{order.clientname || "-"}</TableCell>
                          <TableCell>{order.items?.length || 0} items</TableCell>
                          <TableCell>{order.deliveryaddress || "-"}</TableCell>
                          <TableCell>{getStatusBadge(order.status || "draft")}</TableCell>
                          <TableCell>{order.createdby || "-"}</TableCell>
                          <TableCell>
                            {order.createdat 
                              ? new Date(order.createdat).toLocaleDateString()
                              : "-"
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
