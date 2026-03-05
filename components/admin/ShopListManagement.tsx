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
import { ShoppingCart, Plus, Trash2, History, Send, Save, Edit } from "lucide-react";

interface ShopOrderItem {
  itemid?: string;
  itemname: string;
  size: string;
  number: number;
  itemtype?: string;
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
    { itemname: "", size: "", number: 1 },
  ]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [orderedBy, setOrderedBy] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [orderHistory, setOrderHistory] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

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
    if (isHistoryOpen) {
      fetchOrderHistory();
    }
  }, [isHistoryOpen, workspaceid]);

  // Add new row
  const handleAddRow = () => {
    setItems([...items, { itemname: "", size: "", number: 1 }]);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.length > 0 ? newItems : [{ itemname: "", size: "", number: 1 }]);
  };

  // Update item field
  const handleItemChange = (index: number, field: keyof ShopOrderItem, value: string | number) => {
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
        deliverytime: deliveryTime || undefined,
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
        deliverytime: deliveryTime || undefined,
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
        setItems([{ itemname: "", size: "", number: 1 }]);
        setDeliveryAddress("");
        setDeliveryTime("");
        setClientName("");
        setOrderedBy("");
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Shop List</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage laboratory material orders
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsHistoryOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <History className="h-4 w-4 mr-2" />
          Order History
        </Button>
      </div>

      {/* Shop List Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shop list:
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-blue-100">
                <TableRow>
                  <TableHead className="font-semibold text-black">Item</TableHead>
                  <TableHead className="font-semibold text-black">Size</TableHead>
                  <TableHead className="font-semibold text-black">Number</TableHead>
                  <TableHead className="font-semibold text-black">Delivery address</TableHead>
                  <TableHead className="font-semibold text-black">Delivery time</TableHead>
                  <TableHead className="font-semibold text-black">Client name</TableHead>
                  <TableHead className="font-semibold text-black">By</TableHead>
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
                        className="min-w-[150px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.size}
                        onChange={(e) => handleItemChange(index, "size", e.target.value)}
                        placeholder="Size"
                        className="min-w-[100px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.number}
                        onChange={(e) => handleItemChange(index, "number", parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-[80px]"
                      />
                    </TableCell>
                    <TableCell>
                      {index === 0 ? (
                        <Input
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Delivery address"
                          className="min-w-[150px]"
                        />
                      ) : (
                        <div className="min-w-[150px]"></div>
                      )}
                    </TableCell>
                    <TableCell>
                      {index === 0 ? (
                        <Input
                          type="datetime-local"
                          value={deliveryTime}
                          onChange={(e) => setDeliveryTime(e.target.value)}
                          className="min-w-[180px]"
                        />
                      ) : (
                        <div className="min-w-[180px]"></div>
                      )}
                    </TableCell>
                    <TableCell>
                      {index === 0 ? (
                        <Input
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Client name"
                          className="min-w-[150px]"
                        />
                      ) : (
                        <div className="min-w-[150px]"></div>
                      )}
                    </TableCell>
                    <TableCell>
                      {index === 0 ? (
                        <Input
                          value={orderedBy}
                          onChange={(e) => setOrderedBy(e.target.value)}
                          placeholder="Ordered by"
                          className="min-w-[120px]"
                        />
                      ) : (
                        <div className="min-w-[120px]"></div>
                      )}
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
              className="bg-blue-400 hover:bg-blue-500 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
            <Button
              onClick={handleEdit}
              disabled={loading}
              className="bg-blue-400 hover:bg-blue-500 text-white"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Order History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order History</DialogTitle>
            <DialogDescription>
              View all previous orders and their status
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {orderHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No orders yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Delivery Address</TableHead>
                    <TableHead>Status</TableHead>
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
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
