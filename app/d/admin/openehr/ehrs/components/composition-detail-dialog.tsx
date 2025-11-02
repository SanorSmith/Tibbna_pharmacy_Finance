"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Eye, Code } from "lucide-react";

interface CompositionDetailDialogProps {
  ehrId: string;
  compositionId: string;
  compositionName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CompositionDetailDialog({
  ehrId,
  compositionId,
  compositionName,
  isOpen,
  onClose,
}: CompositionDetailDialogProps) {
  const [composition, setComposition] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && compositionId) {
      loadComposition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, compositionId]);

  const loadComposition = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/ehrbase/ehr/${encodeURIComponent(
          ehrId
        )}/composition/${encodeURIComponent(compositionId)}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch composition");
      }
      const data = await response.json();
      setComposition(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedView = () => {
    if (!composition) return null;

    // Check if it's an object
    if (typeof composition === "object" && composition !== null) {
      const entries = Object.entries(composition);

      return (
        <div className="border rounded-lg max-h-[70vh] sm:max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 border-b">
              <TableRow>
                <TableHead className="w-[40%]">Field</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell className="font-mono text-xs break-all align-top py-2">
                    {key}
                  </TableCell>
                  <TableCell className="break-all align-top py-2">
                    {typeof value === "object" ? (
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-sm">{String(value)}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    // If it's not an object, just display it
    return (
      <div className="p-4 bg-muted rounded-lg">
        <pre className="text-sm whitespace-pre-wrap break-all">
          {String(composition)}
        </pre>
      </div>
    );
  };

  const renderRawView = () => {
    return (
      <div className="border rounded-lg max-h-[70vh] sm:max-h-[60vh] overflow-auto bg-muted/50">
        <pre className="p-4 text-xs font-mono whitespace-pre">
          {JSON.stringify(composition, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent className="max-w-7xl w-[90vw] sm:max-w-[50vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{compositionName}</DialogTitle>
          <p className="text-sm text-muted-foreground font-mono break-all">
            {compositionId}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : composition ? (
          <Tabs defaultValue="formatted" className="space-y-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="formatted"
                className="flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>Formatted</span>
              </TabsTrigger>
              <TabsTrigger value="raw" className="flex items-center space-x-2">
                <Code className="h-4 w-4" />
                <span>Raw JSON</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="formatted" className="mt-2">
              {renderFormattedView()}
            </TabsContent>
            <TabsContent value="raw" className="mt-2">
              {renderRawView()}
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
