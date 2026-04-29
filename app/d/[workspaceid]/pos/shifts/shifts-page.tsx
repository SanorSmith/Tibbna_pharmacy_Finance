"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Clock,
  DollarSign,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { PharmacyNav } from "../components/PharmacyNav";

type Shift = {
  shiftid: string;
  shiftnumber: string;
  openingtime: string;
  closingtime: string | null;
  openingcash: string;
  expectedcash: string | null;
  actualcash: string | null;
  variance: string | null;
  totalsales: string;
  totalcashsales: string;
  totalcardsales: string;
  totalinsurancesales: string;
  totalcreditsales: string;
  transactioncount: number;
  status: string;
};

export default function ShiftsClientPage({
  workspaceid,
  userName,
}: {
  workspaceid: string;
  userName: string;
}) {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState("0");
  const [closingCash, setClosingCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closeSummary, setCloseSummary] = useState<any>(null);

  useEffect(() => {
    fetchShift();
  }, []);

  const fetchShift = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pos/shifts");
      const data = await res.json();
      setCurrentShift(data.shift || null);
    } catch {
      setCurrentShift(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch("/api/pos/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspaceid,
          openingCash: parseFloat(openingCash) || 0,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      const data = await res.json();
      setCurrentShift(data.shift);
      setOpenDialogOpen(false);
      setOpeningCash("0");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseShift = async () => {
    if (!currentShift) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/pos/shifts/${currentShift.shiftid}/close`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actualCash: parseFloat(closingCash) || 0,
            notes: closeNotes || undefined,
          }),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      const data = await res.json();
      setCloseSummary(data.summary);
      setCurrentShift(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-auto">
      <PharmacyNav workspaceid={workspaceid} activeTab="pos" />
      <div className="p-4 pt-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() =>
                  (window.location.href = `/d/${workspaceid}/pos`)
                }
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Clock className="h-6 w-6" />
                Shift Management
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-10">
              Open and close POS shifts, reconcile cash
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Loading shift...</span>
          </div>
        ) : currentShift ? (
          /* Active shift card */
          <Card className="shadow-sm border-green-200 bg-green-50/50 dark:bg-green-950/10">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Active Shift
                </span>
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  OPEN
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Shift #</p>
                  <p className="font-mono text-sm font-medium">
                    {currentShift.shiftnumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opened</p>
                  <p className="text-sm font-medium">
                    {new Date(currentShift.openingtime).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opening Cash</p>
                  <p className="text-sm font-medium">
                    {parseFloat(currentShift.openingcash).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="text-sm font-medium">
                    {currentShift.transactioncount}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="shadow-sm bg-purple-100 border-purple-200">
                  <CardContent className="py-3 px-3 text-center">
                    <p className="text-xs text-purple-700">Total Sales</p>
                    <p className="text-lg font-bold text-purple-900">
                      {parseFloat(currentShift.totalsales).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-green-100 border-green-200">
                  <CardContent className="py-3 px-3 text-center">
                    <p className="text-xs text-green-700">Cash</p>
                    <p className="text-lg font-bold text-green-900">
                      {parseFloat(currentShift.totalcashsales).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-blue-100 border-blue-200">
                  <CardContent className="py-3 px-3 text-center">
                    <p className="text-xs text-blue-700">Card</p>
                    <p className="text-lg font-bold text-blue-900">
                      {parseFloat(currentShift.totalcardsales).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm bg-yellow-100 border-yellow-200">
                  <CardContent className="py-3 px-3 text-center">
                    <p className="text-xs text-yellow-700">Insurance</p>
                    <p className="text-lg font-bold text-yellow-900">
                      {parseFloat(currentShift.totalinsurancesales).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Button
                variant="destructive"
                onClick={() => setCloseDialogOpen(true)}
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                Close Shift
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* No active shift */
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center space-y-4">
              {closeSummary ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                  <div>
                    <p className="text-lg font-bold">Shift Closed</p>
                    <p className="text-sm text-muted-foreground">
                      {closeSummary.transactionCount} transactions |{" "}
                      {closeSummary.totalSales.toFixed(2)} total sales
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                    <div>
                      <p className="text-xs text-muted-foreground">Expected</p>
                      <p className="font-medium">
                        {closeSummary.expectedCash.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Actual</p>
                      <p className="font-medium">
                        {closeSummary.actualCash.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Variance</p>
                      <p
                        className={`font-medium ${closeSummary.variance > 0 ? "text-green-600" : closeSummary.variance < 0 ? "text-red-600" : ""}`}
                      >
                        {closeSummary.variance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Separator />
                </>
              ) : (
                <>
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
                  <p className="text-muted-foreground">No active shift</p>
                </>
              )}
              <Button
                onClick={() => setOpenDialogOpen(true)}
                className="gap-2 bg-[#618FF5] text-white hover:bg-[#4a7ae0]"
              >
                <DollarSign className="h-4 w-4" />
                Open New Shift
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Open Shift Dialog */}
      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Open New Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Cashier</Label>
              <Input value={userName} disabled className="mt-1" />
            </div>
            <div>
              <Label>Opening Cash in Drawer</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
            {error && (
              <div className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleOpenShift}
              disabled={processing}
              className="gap-2 bg-[#618FF5] text-white hover:bg-[#4a7ae0]"
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Open Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Close Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Count the cash in your drawer and enter the amount below.
            </p>
            <div>
              <Label>Actual Cash in Drawer</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="mt-1"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                className="mt-1"
                placeholder="Any discrepancies..."
              />
            </div>
            {error && (
              <div className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseShift}
              disabled={processing || !closingCash}
              className="gap-2"
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Close Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
