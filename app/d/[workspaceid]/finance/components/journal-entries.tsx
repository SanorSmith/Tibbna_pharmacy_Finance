"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Eye, AlertTriangle } from "lucide-react";

interface JournalEntry {
  journalid: string;
  journalnumber: string;
  entrydate: string;
  description: string;
  sourcetype: string;
  status: string;
  totaldebit: string;
  totalcredit: string;
  createdat: string;
}

interface JournalLine {
  lineid: string;
  accountcode?: string;
  accountname?: string;
  memo: string | null;
  debit: string;
  credit: string;
}

interface JournalDetail extends JournalEntry {
  lines: JournalLine[];
}

interface Props {
  workspaceid: string;
}

export default function JournalEntries({ workspaceid }: Props) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedJournal, setSelectedJournal] = useState<JournalDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, [workspaceid, statusFilter]);

  async function fetchEntries() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(
        `/api/d/${workspaceid}/finance/journal-entries?${params}`
      );
      if (!res.ok) throw new Error("Failed to load journal entries");
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function viewDetail(journalid: string) {
    try {
      setDetailLoading(true);
      setDetailOpen(true);
      const res = await fetch(
        `/api/d/${workspaceid}/finance/journal-entries/${journalid}`
      );
      if (!res.ok) throw new Error("Failed to load journal detail");
      const data = await res.json();
      setSelectedJournal(data.entry);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    DRAFT: "bg-yellow-100 text-yellow-800",
    POSTED: "bg-green-100 text-green-800",
    REVERSED: "bg-red-100 text-red-800",
    VOID: "bg-gray-100 text-gray-800",
  };

  const fmt = (n: string | number) =>
    parseFloat(String(n)).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  if (loading && entries.length === 0) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error && entries.length === 0) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchEntries} className="ml-auto">
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Journal Entries
            <Badge variant="secondary" className="ml-2">{entries.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
                <SelectItem value="REVERSED">Reversed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchEntries}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">Journal #</TableHead>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[120px]">Source</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[110px] text-right">Debit</TableHead>
                  <TableHead className="w-[110px] text-right">Credit</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.journalid}>
                    <TableCell className="font-mono text-sm">
                      {entry.journalnumber}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(entry.entrydate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[250px]">
                      {entry.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {entry.sourcetype}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${statusColors[entry.status] || ""}`}
                      >
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmt(entry.totaldebit)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmt(entry.totalcredit)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewDetail(entry.journalid)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No journal entries found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Journal Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Journal Entry: {selectedJournal?.journalnumber}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : selectedJournal ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Date:</span>{" "}
                  {new Date(selectedJournal.entrydate).toLocaleDateString()}
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>{" "}
                  <Badge
                    variant="secondary"
                    className={statusColors[selectedJournal.status] || ""}
                  >
                    {selectedJournal.status}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Description:</span>{" "}
                  {selectedJournal.description}
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Memo</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedJournal.lines?.map((line) => (
                      <TableRow key={line.lineid}>
                        <TableCell className="text-sm">
                          <span className="font-mono">
                            {line.accountcode}
                          </span>{" "}
                          {line.accountname}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {line.memo}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {parseFloat(line.debit) > 0 ? fmt(line.debit) : ""}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {parseFloat(line.credit) > 0 ? fmt(line.credit) : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-4 text-sm font-medium border-t pt-2">
                <span>
                  Total Debit: {fmt(selectedJournal.totaldebit)}
                </span>
                <span>
                  Total Credit: {fmt(selectedJournal.totalcredit)}
                </span>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
