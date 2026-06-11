"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import SaleReceiptTemplate from "./SaleReceiptTemplate";
import ReturnReceiptTemplate from "./ReturnReceiptTemplate";
import ShiftReceiptTemplate from "./ShiftReceiptTemplate";

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceid: string;
}

export default function ReprintReceiptDialog({ open, onClose, workspaceid }: Props) {
  const [searchType, setSearchType] = useState<"receiptNumber" | "phone" | "name" | "dateRange">("receiptNumber");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [receiptType, setReceiptType] = useState<"SALE" | "RETURN" | "SHIFT" | "ALL">("ALL");
  
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [searchResults, setSearchResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [isReprint, setIsReprint] = useState(false);
  const [printFormat, setPrintFormat] = useState<"THERMAL" | "PDF" | "BROWSER">("THERMAL");

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params: any = { workspaceId: workspaceid, receiptType };
      if (filterDate) { params.startDate = filterDate; params.endDate = filterDate; }
      if (searchType === "receiptNumber" && receiptNumber) params.receiptNumber = receiptNumber;
      if (searchType === "phone" && phone) params.customerPhone = phone;
      if (searchType === "name" && name) params.customerName = name;
      if (searchType === "dateRange") {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const res = await fetch("/api/pos/receipts/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      setSearchResults(json);
      setSelectedReceipt(null);
      setReceiptData(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReceipt = async (receipt: any) => {
    setSelectedReceipt(receipt);
    setLoadingReceipt(true);
    setIsReprint(false);
    try {
      let url = "";
      if (receipt.type === "SALE") url = `/api/pos/receipts/${receipt.id}`;
      else if (receipt.type === "RETURN") url = `/api/pos/receipts/returns/${receipt.id}`;
      else if (receipt.type === "SHIFT") url = `/api/pos/receipts/shifts/${receipt.id}`;

      const res = await fetch(url);
      const json = await res.json();
      setReceiptData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleReprint = async () => {
    if (!selectedReceipt || !receiptData) return;

    try {
      await fetch("/api/pos/receipts/reprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspaceid,
          receiptType: selectedReceipt.type,
          saleId: selectedReceipt.type === "SALE" ? selectedReceipt.id : null,
          returnId: selectedReceipt.type === "RETURN" ? selectedReceipt.id : null,
          shiftId: selectedReceipt.type === "SHIFT" ? selectedReceipt.id : null,
          printFormat,
        }),
      });
      setIsReprint(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = () => {
    onClose();
    setSearchResults(null);
    setSelectedReceipt(null);
    setReceiptData(null);
    setIsReprint(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reprint Receipt</DialogTitle>
        </DialogHeader>

        {!selectedReceipt ? (
          <>
            {/* Search Form */}
            <div className="space-y-4 py-4">
              {/* Quick Date Filter */}
              <div className="flex items-center gap-3">
                <Label className="whitespace-nowrap text-sm">Date</Label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-44"
                />
                {filterDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setFilterDate("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Search By</Label>
                  <Select value={searchType} onValueChange={(v: any) => setSearchType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receiptNumber">Receipt Number</SelectItem>
                      <SelectItem value="phone">Customer Phone</SelectItem>
                      <SelectItem value="name">Customer Name</SelectItem>
                      <SelectItem value="dateRange">Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Receipt Type</Label>
                  <Select value={receiptType} onValueChange={(v: any) => setReceiptType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="SALE">Sales Only</SelectItem>
                      <SelectItem value="RETURN">Returns Only</SelectItem>
                      <SelectItem value="SHIFT">Shift Reports Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {searchType === "receiptNumber" && (
                <div>
                  <Label>Receipt Number</Label>
                  <Input
                    placeholder="POS-20260101-123456 or RET-..."
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                  />
                </div>
              )}

              {searchType === "phone" && (
                <div>
                  <Label>Customer Phone</Label>
                  <Input
                    placeholder="07701234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              )}

              {searchType === "name" && (
                <div>
                  <Label>Customer Name</Label>
                  <Input
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}

              {searchType === "dateRange" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <Button onClick={handleSearch} className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Search
              </Button>
            </div>

            {/* Search Results */}
            {searchResults && (
              <div className="border rounded-lg overflow-hidden">
                {searchResults.sales?.length === 0 &&
                  searchResults.returns?.length === 0 &&
                  searchResults.shifts?.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">No receipts found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer/Cashier</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.sales?.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell><Badge variant="default">SALE</Badge></TableCell>
                          <TableCell className="font-mono">{r.receiptNumber}</TableCell>
                          <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                          <TableCell>{r.customerName || r.cashier}</TableCell>
                          <TableCell className="text-right">{r.totalAmount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => handleSelectReceipt(r)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {searchResults.returns?.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell><Badge variant="destructive">RETURN</Badge></TableCell>
                          <TableCell className="font-mono">{r.receiptNumber}</TableCell>
                          <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                          <TableCell>{r.customerName}</TableCell>
                          <TableCell className="text-right">{r.totalAmount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => handleSelectReceipt(r)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {searchResults.shifts?.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell><Badge variant="secondary">SHIFT</Badge></TableCell>
                          <TableCell className="font-mono">{r.receiptNumber}</TableCell>
                          <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                          <TableCell>{r.cashier}</TableCell>
                          <TableCell className="text-right">{r.totalAmount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => handleSelectReceipt(r)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Receipt Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setSelectedReceipt(null)}>
                  ← Back to Search
                </Button>
                <div className="flex items-center gap-2">
                  <Select value={printFormat} onValueChange={(v: any) => setPrintFormat(v)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="THERMAL">Thermal</SelectItem>
                      <SelectItem value="PDF">PDF</SelectItem>
                      <SelectItem value="BROWSER">Browser</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleReprint} disabled={isReprint}>
                    {isReprint ? "Reprinted" : "Mark as Reprint"}
                  </Button>
                </div>
              </div>

              {loadingReceipt ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading receipt...
                </div>
              ) : receiptData ? (
                <>
                  {selectedReceipt.type === "SALE" && (
                    <SaleReceiptTemplate data={receiptData} isReprint={isReprint} printFormat={printFormat} />
                  )}
                  {selectedReceipt.type === "RETURN" && (
                    <ReturnReceiptTemplate data={receiptData} isReprint={isReprint} printFormat={printFormat} />
                  )}
                  {selectedReceipt.type === "SHIFT" && (
                    <ShiftReceiptTemplate data={receiptData} isReprint={isReprint} printFormat={printFormat} />
                  )}
                </>
              ) : null}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
