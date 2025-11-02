"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, RefreshCw, Plus } from "lucide-react";

interface EHR {
  ehr_id: string;
  subject_id: string;
  created_time: string;
}

export function EhrManagementClient() {
  const router = useRouter();
  const [ehrs, setEhrs] = useState<EHR[]>([]);
  const [filteredEhrs, setFilteredEhrs] = useState<EHR[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const loadEhrs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ehrbase/ehr");
      if (!response.ok) {
        throw new Error("Failed to fetch EHRs");
      }
      const data = await response.json();
      setEhrs(data);
      setFilteredEhrs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEhrs();
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredEhrs(ehrs);
      return;
    }

    const filtered = ehrs.filter(
      (ehr) =>
        ehr.ehr_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ehr.subject_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredEhrs(filtered);
  };

  const handleCreateEHR = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const subjectId = formData.get("subjectId") as string;

    try {
      const response = await fetch("/api/ehrbase/ehr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subjectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create EHR");
      }

      setIsCreateOpen(false);
      await loadEhrs(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="flex-1 flex items-center space-x-2">
          <Input
            placeholder="Search EHRs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create EHR
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New EHR</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateEHR} className="space-y-4">
              <div>
                <Label htmlFor="subjectId">Subject ID</Label>
                <Input
                  id="subjectId"
                  name="subjectId"
                  placeholder="e.g., 19880515-2372"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create EHR"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Button onClick={loadEhrs} variant="outline" disabled={isLoading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>EHR ID</TableHead>
              <TableHead>Subject ID</TableHead>
              <TableHead>Created Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Loading EHRs...
                </TableCell>
              </TableRow>
            ) : filteredEhrs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  No EHRs found
                </TableCell>
              </TableRow>
            ) : (
              filteredEhrs.map((ehr) => (
                <TableRow
                  key={ehr.ehr_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    router.push(`/d/admin/openehr/ehrs/${ehr.ehr_id}`)
                  }
                >
                  <TableCell className="font-mono text-sm">
                    {ehr.ehr_id}
                  </TableCell>
                  <TableCell>{ehr.subject_id}</TableCell>
                  <TableCell>
                    {new Date(ehr.created_time).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
