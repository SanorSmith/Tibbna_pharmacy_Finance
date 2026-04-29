"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Pill, Loader2, Plus } from "lucide-react";
import type { CartItem } from "../pos-page";

type Drug = {
  drugid: string;
  name: string;
  genericname: string;
  form: string;
  strength: string;
  barcode: string | null;
  manufacturer: string | null;
  batchid: string | null;
  sellingprice: string | null;
  availablestock: number;
};

type Props = {
  onAddToCart: (item: Omit<CartItem, "cartItemId">) => void;
};

export function DrugSearch({ onAddToCart }: Props) {
  const [query, setQuery] = useState("");
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query || query.length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `/api/pos/search?q=${encodeURIComponent(query)}&type=drug`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDrugs(data.results.drugs || []);
    } catch {
      setDrugs([]);
    } finally {
      setLoading(false);
    }
  };

  const addDrug = (d: Drug) => {
    const price = d.sellingprice ? parseFloat(d.sellingprice) : 0;
    onAddToCart({
      drugId: d.drugid,
      drugName: d.name,
      genericName: d.genericname,
      form: d.form,
      strength: d.strength,
      batchId: d.batchid,
      quantity: 1,
      unitPrice: price,
      discountPercent: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: price,
    });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Pill className="h-4 w-4" />
          OTC / Drug Catalog
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drugs by name, generic, barcode..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSearch}
            disabled={loading || query.length < 2}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {/* Results grid */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Searching...</span>
          </div>
        ) : drugs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-auto">
            {drugs.map((d) => (
              <div
                key={d.drugid}
                className="border rounded-md p-3 hover:border-[#618FF5] transition-colors group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.genericname}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {d.form && (
                        <Badge variant="outline" className="text-[10px] px-1 h-4">
                          {d.form}
                        </Badge>
                      )}
                      {d.strength && (
                        <Badge variant="outline" className="text-[10px] px-1 h-4">
                          {d.strength}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-sm font-semibold text-green-700">
                        {d.sellingprice
                          ? `${parseFloat(d.sellingprice).toLocaleString()} IQD`
                          : "No price"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Stock: {d.availablestock ?? 0}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => addDrug(d)}
                    disabled={!d.sellingprice || (d.availablestock ?? 0) <= 0}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : searched ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No drugs found
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
