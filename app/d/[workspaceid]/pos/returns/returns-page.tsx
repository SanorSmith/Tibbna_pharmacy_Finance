"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  workspaceid: string;
  userName: string;
  userId: string;
}

export default function ReturnsClientPage({
  workspaceid,
  userName,
  userId,
}: Props) {
  const router = useRouter();
  const [searchType, setSearchType] = useState<"saleNumber" | "phone">(
    "saleNumber"
  );
  const [searchValue, setSearchValue] = useState("");
  const [sales, setSales] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("lookup");

  const searchSale = async () => {
    if (!searchValue.trim()) {
      setError("Please enter a search value");
      return;
    }

    setLoading(true);
    setError("");
    setSales([]);

    try {
      const params = new URLSearchParams({
        workspaceId: workspaceid,
        [searchType]: searchValue,
      });

      const response = await fetch(`/api/pos/returns/lookup?${params}`);
      const data = await response.json();

      if (response.ok) {
        if (data.sales.length === 0) {
          setError("No sales found matching your search");
        } else {
          setSales(data.sales);
        }
      } else {
        setError(data.error || "Failed to search for sale");
      }
    } catch (err) {
      setError("An error occurred while searching");
    } finally {
      setLoading(false);
    }
  };

  const fetchReturns = async (status?: string) => {
    try {
      const params = new URLSearchParams({ workspaceId: workspaceid });
      if (status) params.set("status", status);

      const response = await fetch(`/api/pos/returns?${params}`);
      const data = await response.json();
      if (response.ok) {
        setReturns(data.returns || []);
      }
    } catch (err) {
      console.error("Failed to fetch returns:", err);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "history") {
      fetchReturns();
    } else if (tab === "pending") {
      fetchReturns("PENDING");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="h-3 w-3 mr-1" />
            Pending Approval
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <RotateCcw className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Returns & Refunds</h1>
            <p className="text-sm text-muted-foreground">
              Process customer returns and issue refunds
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/d/${workspaceid}/pos`)}
        >
          Back to POS
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="lookup" className="flex-1">
            New Return
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">
            Pending Approval
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            History
          </TabsTrigger>
        </TabsList>

        {/* Tab: New Return Lookup */}
        <TabsContent value="lookup" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Find Original Sale</CardTitle>
              <CardDescription>
                Search by sale/receipt number or customer phone to start a return
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button
                  size="sm"
                  variant={searchType === "saleNumber" ? "default" : "outline"}
                  onClick={() => setSearchType("saleNumber")}
                >
                  By Receipt #
                </Button>
                <Button
                  size="sm"
                  variant={searchType === "phone" ? "default" : "outline"}
                  onClick={() => setSearchType("phone")}
                >
                  By Phone
                </Button>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder={
                      searchType === "saleNumber"
                        ? "Enter receipt or sale number..."
                        : "Enter customer phone number..."
                    }
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchSale()}
                  />
                </div>
                <Button
                  onClick={searchSale}
                  disabled={loading}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  {loading ? "Searching..." : "Search"}
                </Button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Results */}
          {sales.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Search Results ({sales.length})
              </h3>
              {sales.map((sale) => (
                <Card
                  key={sale.saleid}
                  className={`transition-colors ${
                    sale.canReturn
                      ? "hover:bg-muted/50 cursor-pointer"
                      : "opacity-60"
                  }`}
                  onClick={() => {
                    if (sale.canReturn) {
                      router.push(
                        `/d/${workspaceid}/pos/returns/process?saleId=${sale.saleid}`
                      );
                    }
                  }}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{sale.salenumber}</p>
                          {sale.hasReturns && (
                            <Badge variant="outline" className="text-xs">
                              Partial Return
                            </Badge>
                          )}
                          {!sale.canReturn && (
                            <Badge variant="destructive" className="text-xs">
                              Fully Returned
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>
                            {new Date(sale.saledate).toLocaleDateString()} at{" "}
                            {new Date(sale.saledate).toLocaleTimeString()}
                          </span>
                          <span>
                            {sale.customername || "Walk-in Customer"}
                          </span>
                          <span>{sale.items.length} items</span>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="font-bold text-lg">
                            {parseFloat(sale.totalamount).toLocaleString()} IQD
                          </p>
                          {sale.totalReturned > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Returned: {sale.totalReturned.toLocaleString()} IQD
                            </p>
                          )}
                        </div>
                        {sale.canReturn && (
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Sale items preview */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex flex-wrap gap-2">
                        {sale.items.slice(0, 4).map((item: any) => (
                          <Badge
                            key={item.itemid}
                            variant="secondary"
                            className="text-xs"
                          >
                            <Package className="h-3 w-3 mr-1" />
                            {item.drugname} x{item.quantity}
                          </Badge>
                        ))}
                        {sale.items.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{sale.items.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Pending Approval */}
        <TabsContent value="pending" className="space-y-4 mt-4">
          {returns.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No pending returns</p>
              </CardContent>
            </Card>
          ) : (
            returns.map((r: any) => (
              <Card key={r.return.returnid}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">
                        {r.return.returnnumber}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Original: {r.return.originalsalenumber} •{" "}
                        {r.return.customername || "Walk-in"} •{" "}
                        {new Date(r.return.returndate).toLocaleDateString()}
                      </p>
                      {r.reason && (
                        <p className="text-xs mt-1">
                          Reason: {r.reason.reasonname}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {parseFloat(r.return.refundamount).toLocaleString()} IQD
                      </p>
                      {getStatusBadge(r.return.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab: History */}
        <TabsContent value="history" className="space-y-4 mt-4">
          {returns.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <RotateCcw className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No return history</p>
              </CardContent>
            </Card>
          ) : (
            returns.map((r: any) => (
              <Card key={r.return.returnid}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {r.return.returnnumber}
                        </p>
                        {getStatusBadge(r.return.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Original: {r.return.originalsalenumber} •{" "}
                        {r.return.customername || "Walk-in"} •{" "}
                        {new Date(r.return.returndate).toLocaleDateString()}
                      </p>
                      {r.reason && (
                        <p className="text-xs mt-1">
                          Reason: {r.reason.reasonname}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {parseFloat(r.return.refundamount).toLocaleString()} IQD
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.return.refundmethod}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
