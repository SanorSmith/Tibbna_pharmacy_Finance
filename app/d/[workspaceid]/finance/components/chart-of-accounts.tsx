"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ChevronRight,
  ChevronDown,
  Search,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface Account {
  accountid: string;
  accountcode: string;
  accountname: string;
  accounttype: string;
  accountsubtype: string | null;
  parentaccountid: string | null;
  level: number;
  isgroupaccount: boolean;
  isactive: boolean;
  normalbalance: string;
  description: string | null;
}

interface Props {
  workspaceid: string;
}

export default function ChartOfAccounts({ workspaceid }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAccounts();
  }, [workspaceid]);

  async function fetchAccounts() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/d/${workspaceid}/finance/accounts`);
      if (!res.ok) throw new Error("Failed to load accounts");
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleCollapse(accountid: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(accountid)) next.delete(accountid);
      else next.add(accountid);
      return next;
    });
  }

  function isHidden(account: Account): boolean {
    if (!account.parentaccountid) return false;
    const parent = accounts.find((a) => a.accountid === account.parentaccountid);
    if (!parent) return false;
    if (collapsed.has(parent.accountid)) return true;
    return isHidden(parent);
  }

  const filtered = accounts.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        a.accountcode.toLowerCase().includes(q) ||
        a.accountname.toLowerCase().includes(q)
      );
    }
    return !isHidden(a);
  });

  const typeColors: Record<string, string> = {
    ASSET: "bg-blue-100 text-blue-800",
    LIABILITY: "bg-orange-100 text-orange-800",
    EQUITY: "bg-purple-100 text-purple-800",
    REVENUE: "bg-green-100 text-green-800",
    EXPENSE: "bg-red-100 text-red-800",
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchAccounts} className="ml-auto">
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          Chart of Accounts
          <Badge variant="secondary" className="ml-2">
            {accounts.length}
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchAccounts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead className="w-[120px]">Type</TableHead>
                <TableHead className="w-[100px]">Balance</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((account) => {
                const hasChildren = accounts.some(
                  (a) => a.parentaccountid === account.accountid
                );
                const isCollapsed = collapsed.has(account.accountid);

                return (
                  <TableRow
                    key={account.accountid}
                    className={
                      account.isgroupaccount
                        ? "bg-gray-50 font-medium"
                        : ""
                    }
                  >
                    <TableCell className="font-mono text-sm">
                      {account.accountcode}
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-1"
                        style={{ paddingLeft: `${(account.level - 1) * 20}px` }}
                      >
                        {hasChildren && !search ? (
                          <button
                            onClick={() => toggleCollapse(account.accountid)}
                            className="p-0.5 rounded hover:bg-gray-200"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        ) : (
                          <span className="w-5" />
                        )}
                        <span>{account.accountname}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${typeColors[account.accounttype] || ""}`}
                      >
                        {account.accounttype}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {account.normalbalance}
                    </TableCell>
                    <TableCell>
                      {account.isactive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {search ? "No accounts match your search" : "No accounts found. Seed the COA first."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
