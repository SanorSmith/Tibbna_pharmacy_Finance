/**
 * Drug Interactions Checker Component
 * Phase 1: Manual drug interaction checker using FDA OpenFDA API
 * Allows pharmacists to select multiple drugs and check for interactions
 */

"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Search, X, Loader2, AlertTriangle, Info, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SelectedDrug {
  id: string;
  name: string;
  genericName?: string;
  brandName?: string;
}

interface Interaction {
  severity: "critical" | "major" | "moderate" | "minor";
  description: string;
  drugs: string[];
  source: string;
}

export default function DrugInteractions({ workspaceid }: { workspaceid: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedDrugs, setSelectedDrugs] = useState<SelectedDrug[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [searching, setSearching] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Interaction history
  const [showHistory, setShowHistory] = useState(false);
  const [interactionLogs, setInteractionLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Auto-search when user types (with debounce)
  useEffect(() => {
    if (searchQuery.trim().length >= 3) {
      const timer = setTimeout(() => {
        searchDrugs();
      }, 300); // 300ms debounce
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Search for drugs in global database
  const searchDrugs = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) return;
    
    setSearching(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/pharmacy/items?search=${encodeURIComponent(searchQuery)}&workspaceId=${workspaceid}&source=global`
      );
      
      if (!response.ok) throw new Error("Failed to search drugs");
      
      const data = await response.json();
      setSearchResults(data.items || []);
    } catch (err) {
      setError("Failed to search drugs. Please try again.");
      console.error("Drug search error:", err);
    } finally {
      setSearching(false);
    }
  };

  // Add drug to selected list
  const addDrug = (drug: any) => {
    if (selectedDrugs.find(d => d.id === drug.id)) {
      return; // Already added
    }
    
    setSelectedDrugs([
      ...selectedDrugs,
      {
        id: drug.id,
        name: drug.name,
        genericName: drug.genericname,
        brandName: drug.brandname,
      },
    ]);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Remove drug from selected list
  const removeDrug = (drugId: string) => {
    setSelectedDrugs(selectedDrugs.filter(d => d.id !== drugId));
    setInteractions([]);
  };

  // Check for drug interactions using FDA API
  const checkInteractions = async () => {
    if (selectedDrugs.length < 2) {
      setError("Please select at least 2 drugs to check interactions");
      return;
    }

    setChecking(true);
    setError(null);
    setInteractions([]);

    try {
      const response = await fetch("/api/pharmacy/drug-interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drugs: selectedDrugs.map(d => ({
            name: d.name,
            genericName: d.genericName,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to check interactions");

      const data = await response.json();
      setInteractions(data.interactions || []);
    } catch (err) {
      setError("Failed to check interactions. Please try again.");
      console.error("Interaction check error:", err);
    } finally {
      setChecking(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "major":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "moderate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "minor":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "major":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case "moderate":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "minor":
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  // Fetch interaction history
  const fetchInteractionHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(
        `/api/pharmacy/interaction-logs?workspaceid=${workspaceid}&limit=20`
      );
      if (response.ok) {
        const data = await response.json();
        setInteractionLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Drug-Drug Interaction Checker</h2>
          <p className="text-sm text-gray-600 mt-1">
            Check for potential interactions between multiple medications
          </p>
        </div>
        <Button
          className="bg-[#618FF5] hover:bg-[#4a6fd4] text-white"
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory && interactionLogs.length === 0) {
              fetchInteractionHistory();
            }
          }}
        >
          {showHistory ? "Hide History" : "View History"}
        </Button>
      </div>

      {/* Drug Search and Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Select Drugs
          </CardTitle>
          <CardDescription>
            Search and add drugs to check for interactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <div className="relative">
              <Input
                placeholder="Type at least 3 characters to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
              {searching && (
                <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              )}
            </div>
            <p className="text-xs text-gray-500">
              {searchQuery.length > 0 && searchQuery.length < 3 
                ? `Type ${3 - searchQuery.length} more character${3 - searchQuery.length > 1 ? 's' : ''} to search`
                : searchQuery.length >= 3 
                ? "Searching global medications database..."
                : "Start typing to search for drugs"}
            </p>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
              {searchResults.map((drug) => (
                <div
                  key={drug.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                  onClick={() => addDrug(drug)}
                >
                  <div>
                    <p className="font-medium text-sm">{drug.name}</p>
                    {drug.genericname && (
                      <p className="text-xs text-gray-500">Generic: {drug.genericname}</p>
                    )}
                  </div>
                  <Button size="sm" className="bg-[#618FF5] hover:bg-[#4a6fd4] text-white">
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Selected Drugs */}
          {selectedDrugs.length > 0 && (
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                Selected Drugs ({selectedDrugs.length})
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedDrugs.map((drug) => (
                  <Badge
                    key={drug.id}
                    variant="secondary"
                    className="px-3 py-1.5 flex items-center gap-2"
                  >
                    <span>{drug.name}</span>
                    <button
                      onClick={() => removeDrug(drug.id)}
                      className="hover:text-blue-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Check Button */}
          <Button
            onClick={checkInteractions}
            disabled={selectedDrugs.length < 2 || checking}
            className="w-full bg-[#618FF5] hover:bg-[#4a6fd4] text-white"
            size="lg"
          >
            {checking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking Interactions...
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Check for Interactions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Interaction Results */}
      {interactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Interaction Results
            </CardTitle>
            <CardDescription>
              {interactions.length} potential interaction{interactions.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {interactions.map((interaction, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getSeverityColor(interaction.severity)}`}
              >
                <div className="flex items-start gap-3">
                  {getSeverityIcon(interaction.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="uppercase text-xs font-bold">
                        {interaction.severity}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        {interaction.drugs.join(" + ")}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{interaction.description}</p>
                    <p className="text-xs text-gray-500 mt-2">Source: {interaction.source}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Interactions Found */}
      {!checking && selectedDrugs.length >= 2 && interactions.length === 0 && error === null && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No Interactions Found</h3>
                <p className="text-sm text-gray-600 mt-1">
                  No known interactions detected between the selected drugs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interaction History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Interaction Check History</CardTitle>
            <CardDescription>
              Recent interaction checks performed in this workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                <p className="text-sm text-gray-600 mt-2">Loading history...</p>
              </div>
            ) : interactionLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No interaction checks recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {interactionLogs.map((log: any) => (
                  <div
                    key={log.logid}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            log.decision === "proceeded"
                              ? "default"
                              : log.decision === "cancelled"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {log.decision}
                        </Badge>
                        {log.highestSeverity && (
                          <Badge
                            variant="outline"
                            className={`uppercase text-xs ${
                              log.highestSeverity === "critical"
                                ? "border-red-300 text-red-700"
                                : log.highestSeverity === "major"
                                ? "border-orange-300 text-orange-700"
                                : "border-yellow-300 text-yellow-700"
                            }`}
                          >
                            {log.highestSeverity}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.checkedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">
                        Drugs: {log.drugs.map((d: any) => d.name).join(", ")}
                      </p>
                      <p className="text-gray-600 text-xs mt-1">
                        Pharmacist: {log.pharmacistName} • {log.interactionCount} interaction(s)
                      </p>
                      {log.justification && (
                        <p className="text-xs text-gray-700 mt-2 italic bg-gray-50 p-2 rounded">
                          Justification: {log.justification}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> This tool uses FDA OpenFDA API data. Always consult clinical
          references and use professional judgment when evaluating drug interactions.
        </AlertDescription>
      </Alert>
    </div>
  );
}
