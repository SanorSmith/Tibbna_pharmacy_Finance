/**
 * Validation Tab Component - Worklist Selection View
 * 
 * Features:
 * - Search by patient ID, sample ID, or worklist ID
 * - List of available worklists
 * - Click worklist to open validation modal
 */
"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";
import WorklistValidationModal from "./WorklistValidationModal";

interface Worklist {
  worklistid: string;
  worklistname: string;
  worklisttype: string;
  department: string | null;
  analyzer: string | null;
  priority: string;
  status: string;
  description: string | null;
  createdat: string;
  createdby: string | null;
  createdbyname: string | null;
  assignedto: string | null;
  assignedtoname: string | null;
  completedat: string | null;
  samplecount: number;
}

export default function ValidationTab({ workspaceid }: { workspaceid: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorklistId, setSelectedWorklistId] = useState<string | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);

  // Fetch worklists
  const { data: worklists, isLoading } = useQuery<Worklist[]>({
    queryKey: ["worklists", workspaceid],
    queryFn: async () => {
      const response = await fetch(`/api/lims/worklist?workspaceid=${workspaceid}&mode=list`);
      if (!response.ok) throw new Error("Failed to fetch worklists");
      const data = await response.json();
      return data.worklists || [];
    },
  });

  // Search for individual samples (uses same search term as worklists)
  const { data: sampleSearchResults, isLoading: isSearching } = useQuery({
    queryKey: ["sample-search", workspaceid, searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 3) return null;
      const response = await fetch(`/api/lims/samples/search?workspaceid=${workspaceid}&query=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error("Failed to search samples");
      return response.json();
    },
    enabled: searchTerm.length >= 3,
  });

  // Filter worklists by search term
  const filteredWorklists = worklists?.filter(worklist => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      worklist.worklistid.toLowerCase().includes(search) ||
      worklist.worklistname.toLowerCase().includes(search) ||
      worklist.createdbyname?.toLowerCase().includes(search) ||
      worklist.description?.toLowerCase().includes(search) ||
      worklist.department?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Unified Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Search</CardTitle>
          <CardDescription>
            Search for samples by Sample ID or Patient ID, or search worklists by ID or name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search samples (Sample ID, Patient ID) or worklists (ID, name)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sample Search Results - Show when searching */}
      {searchTerm.length >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Individual Samples</CardTitle>
          </CardHeader>
          <CardContent>
            {isSearching ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : sampleSearchResults && sampleSearchResults.samples && sampleSearchResults.samples.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-bold">Sample ID</TableHead>
                      <TableHead className="font-bold">Patient Name</TableHead>
                      <TableHead className="font-bold">Sample Type</TableHead>
                      <TableHead className="font-bold">Collection Date</TableHead>
                      <TableHead className="font-bold">Tests</TableHead>
                      <TableHead className="font-bold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sampleSearchResults.samples.map((sample: any) => (
                      <TableRow key={sample.sampleid}>
                        <TableCell className="font-mono font-medium">
                          {sample.sample.samplenumber}
                        </TableCell>
                        <TableCell>
                          {sample.patient 
                            ? `${sample.patient.firstname} ${sample.patient.lastname}`
                            : '-'}
                        </TableCell>
                        <TableCell>{sample.sample.sampletype}</TableCell>
                        <TableCell>
                          {new Date(sample.sample.collectiondate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{sample.results.length} tests</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSample(sample);
                              setShowValidationModal(true);
                            }}
                          >
                            Enter Results
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No individual samples found
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Worklists Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Validation Worklists</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredWorklists && filteredWorklists.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold">Work-lists ID</TableHead>
                  <TableHead className="font-bold">created date</TableHead>
                  <TableHead className="font-bold">created by</TableHead>
                  <TableHead className="font-bold">comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorklists.map((worklist) => (
                  <TableRow
                    key={worklist.worklistid}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      setSelectedWorklistId(worklist.worklistid);
                      setShowValidationModal(true);
                    }}
                  >
                    <TableCell className="font-medium">
                      {worklist.worklistid.substring(0, 8)}
                      {worklist.worklistname && (
                        <span className="text-gray-600 font-normal"> ({worklist.worklistname})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(worklist.createdat).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {worklist.createdbyname || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {worklist.description || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No worklists found</p>
              <p className="text-sm mt-2">Worklists will appear here when created</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Modal */}
      <WorklistValidationModal
        workspaceid={workspaceid}
        worklistid={selectedWorklistId}
        selectedSample={selectedSample}
        open={showValidationModal}
        onOpenChange={(open) => {
          setShowValidationModal(open);
          if (!open) {
            setSelectedSample(null);
            setSelectedWorklistId(null);
          }
        }}
      />
    </div>
  );
}
