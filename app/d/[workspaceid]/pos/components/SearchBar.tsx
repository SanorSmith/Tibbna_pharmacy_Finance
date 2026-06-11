"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  User,
  Pill,
  FileText,
  ScanBarcode,
} from "lucide-react";
import type { CartItem } from "../pos-page";

type Props = {
  onPatientSelect: (patientId: string) => void;
  onOrderSelect: (orderId: string) => void;
  onDrugAdd: (item: Omit<CartItem, "cartItemId">) => void;
};

type SearchResults = {
  patients: any[];
  dispensedOrders: any[];
  drugs: any[];
};

type PatientWithOrders = {
  patient: any;
  orders: any[];
};

export function SearchBar({ onPatientSelect, onOrderSelect, onDrugAdd }: Props) {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search that triggers as user types
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query && query.length >= 2) {
        performSearch();
      } else {
        setResults(null);
        setShowResults(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, searchType]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const performSearch = async () => {
    if (!query || query.length < 2) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/pos/search?q=${encodeURIComponent(query)}&type=${searchType}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.results);
      setShowResults(true);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    await performSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performSearch();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    // Show results immediately if we have previous results and user is typing more
    if (value.length >= 2 && results) {
      setShowResults(true);
    }
  };

  const selectPatient = (p: any) => {
    setShowResults(false);
    setQuery(p.firstname + " " + p.lastname);
    onPatientSelect(p.patientid);
  };

  const selectOrder = (o: any) => {
    setShowResults(false);
    setQuery(o.orderid);
    onOrderSelect(o.orderid);
  };

  const selectDrug = (d: any) => {
    const price = d.sellingprice ? parseFloat(d.sellingprice) : 0;
    onDrugAdd({
      drugId: d.drugid,
      drugName: d.name,
      genericName: d.genericname,
      form: d.form,
      strength: d.strength,
      batchId: d.batchid || null,
      quantity: 1,
      unitPrice: price,
      discountPercent: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: price,
    });
  };

  // Group orders by patient for display
  const groupOrdersByPatient = (): PatientWithOrders[] => {
    if (!results) return [];
    
    const patientsWithOrders: PatientWithOrders[] = [];
    
    // Group orders by patient
    const ordersByPatient = new Map<string, any[]>();
    
    results.dispensedOrders?.forEach(order => {
      if (!ordersByPatient.has(order.patientid)) {
        ordersByPatient.set(order.patientid, []);
      }
      ordersByPatient.get(order.patientid)?.push(order);
    });
    
    // Create patient with orders structure
    results.patients?.forEach(patient => {
      const patientOrders = ordersByPatient.get(patient.patientid) || [];
      patientsWithOrders.push({
        patient,
        orders: patientOrders
      });
    });
    
    return patientsWithOrders;
  };

  const patientsWithOrders = groupOrdersByPatient();

  const totalResults =
    (results?.patients?.length || 0) +
    (results?.dispensedOrders?.length || 0) +
    (results?.drugs?.length || 0);

  return (
    <Card className="shadow-sm" ref={containerRef}>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Search className="h-4 w-4" />
          Patient / Order / Drug Search
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search patient name, NID, barcode, or order ID"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => query.length >= 2 && results && setShowResults(true)}
              className="pl-10"
            />
          </div>
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={loading || query.length < 2}
            className="gap-1 bg-[#618FF5] text-white hover:bg-[#4a7ae0]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search Results Dropdown */}
        {showResults && results && (
          <div className="border rounded-md bg-background shadow-lg max-h-[360px] overflow-auto divide-y">
            {/* Patients with their Orders */}
            {patientsWithOrders.length > 0 && (
              <div>
                <div className="px-3 py-1.5 bg-muted/50 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Patients ({patientsWithOrders.length})
                </div>
                {patientsWithOrders.map(({ patient, orders }: PatientWithOrders) => (
                  <div key={patient.patientid} className="border-b last:border-0">
                    {/* Patient Header */}
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex justify-between items-center"
                      onClick={() => selectPatient(patient)}
                    >
                      <span className="font-medium">
                        {patient.firstname} {patient.lastname}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {patient.nationalid || patient.phone || ""}
                      </span>
                    </button>
                    
                    {/* Patient Orders */}
                    {orders.length > 0 && (
                      <div className="bg-muted/20 px-3 pb-2">
                        <div className="text-xs text-muted-foreground mb-1 pt-1">
                          Orders ({orders.length})
                        </div>
                        {orders.map((order: any) => (
                          <button
                            key={order.orderid}
                            className="w-full text-left px-2 py-1.5 hover:bg-muted/30 text-xs flex justify-between items-center rounded"
                            onClick={() => selectOrder(order)}
                          >
                            <span className="font-medium">
                              {new Date(order.createdat).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </span>
                            <Badge 
                              variant={order.status === "PENDING" ? "secondary" : "outline"} 
                              className="text-xs"
                            >
                              {order.status}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Standalone Orders (when searching specifically for orders) */}
            {searchType === "order" && results.dispensedOrders?.length > 0 && (
              <div>
                <div className="px-3 py-1.5 bg-muted/50 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Orders ({results.dispensedOrders.length})
                </div>
                {results.dispensedOrders.map((o: any) => (
                  <button
                    key={o.orderid}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex justify-between items-center"
                    onClick={() => selectOrder(o)}
                  >
                    <span className="font-medium">
                        {new Date(o.createdat).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                    <Badge 
                      variant={o.status === "PENDING" ? "secondary" : "outline"} 
                      className="text-xs"
                    >
                      {o.status}
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            {/* Drugs */}
            {results.drugs?.length > 0 && (
              <div>
                <div className="px-3 py-1.5 bg-muted/50 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Pill className="h-3 w-3" /> Drugs ({results.drugs.length})
                </div>
                {results.drugs.map((d: any) => (
                  <button
                    key={d.drugid}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex justify-between items-center"
                    onClick={() => selectDrug(d)}
                    disabled={!d.sellingprice || Number(d.availablestock) <= 0}
                  >
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.genericname} {d.form} {d.strength}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      {d.sellingprice ? (
                        <span className="text-xs font-semibold text-green-700">
                          {parseFloat(d.sellingprice).toLocaleString()} IQD
                        </span>
                      ) : (
                        <span className="text-xs text-red-500">No price</span>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        Stock: {d.availablestock ?? 0}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {totalResults === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No results found
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
