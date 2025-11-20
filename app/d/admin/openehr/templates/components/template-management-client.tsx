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
import { Search, RefreshCw } from "lucide-react";
import { OpenEHRTemplateResponse } from "@/lib/openehr/openehr";

export function TemplateManagementClient() {
  const [templates, setTemplates] = useState<OpenEHRTemplateResponse[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<
    OpenEHRTemplateResponse[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ehrbase/template");
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      const data = await response.json();
      setTemplates(data);
      setFilteredTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredTemplates(templates);
      return;
    }

    const filtered = templates.filter(
      (template) =>
        template.template_id
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        template.concept?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.archetype_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredTemplates(filtered);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="flex-1 flex items-center space-x-2">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={loadTemplates} variant="outline" disabled={isLoading}>
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
              <TableHead>Template ID</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Concept</TableHead>
              <TableHead>Archetype ID</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading templates...
                </TableCell>
              </TableRow>
            ) : filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No templates found
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((template) => (
                <TableRow key={template.template_id}>
                  <TableCell className="font-medium">
                    {template.template_id}
                  </TableCell>
                  <TableCell>{template.version}</TableCell>
                  <TableCell>{template.concept}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {template.archetype_id}
                  </TableCell>
                  <TableCell>
                    {new Date(template.created_timestamp).toLocaleDateString()}
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
