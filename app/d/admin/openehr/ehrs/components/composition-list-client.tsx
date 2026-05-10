"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, RefreshCw, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { CompositionDetailDialog } from "./composition-detail-dialog";

interface Composition {
  composition_uid: string;
  composition_name: string;
  start_time: string;
}

interface CompositionListClientProps {
  ehrId: string;
  onRefreshReady?: (refreshFn: () => void) => void;
}

export function CompositionListClient({
  ehrId,
  onRefreshReady,
}: CompositionListClientProps) {
  const router = useRouter();
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [filteredCompositions, setFilteredCompositions] = useState<
    Composition[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedComposition, setSelectedComposition] =
    useState<Composition | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadCompositions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/ehrbase/ehr/${encodeURIComponent(ehrId)}/composition`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch compositions");
      }
      const data = await response.json();
      setCompositions(data);
      setFilteredCompositions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompositions();
    // Expose refresh function to parent
    if (onRefreshReady) {
      onRefreshReady(loadCompositions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ehrId]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredCompositions(compositions);
      return;
    }

    const filtered = compositions.filter(
      (composition) =>
        composition.composition_uid
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        composition.composition_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
    setFilteredCompositions(filtered);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/d/admin/openehr/ehrs")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to EHRs
        </Button>

        <div className="flex-1 flex items-center space-x-2">
          <Input
            placeholder="Search compositions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={loadCompositions}
          variant="outline"
          disabled={isLoading}
        >
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
              <TableHead>Composition UID</TableHead>
              <TableHead>Composition Name</TableHead>
              <TableHead>Start Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Loading compositions...
                </TableCell>
              </TableRow>
            ) : filteredCompositions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  No compositions found
                </TableCell>
              </TableRow>
            ) : (
              filteredCompositions.map((composition) => (
                <TableRow
                  key={composition.composition_uid}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedComposition(composition);
                    setIsDetailOpen(true);
                  }}
                >
                  <TableCell className="font-mono text-sm">
                    {composition.composition_uid}
                  </TableCell>
                  <TableCell className="font-medium">
                    {composition.composition_name}
                  </TableCell>
                  <TableCell>
                    {new Date(composition.start_time).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedComposition && (
        <CompositionDetailDialog
          ehrId={ehrId}
          compositionId={selectedComposition.composition_uid}
          compositionName={selectedComposition.composition_name}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedComposition(null);
          }}
        />
      )}
    </div>
  );
}
