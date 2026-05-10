"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";

interface DrugSuggestion {
  drugid: string;
  name: string;
  genericname: string | null;
  form: string;
  strength: string;
  unit: string;
  route: string | null;
  atccode: string | null;
  category: string | null;
  interaction: string | null;
  warning: string | null;
  nationalcode: string | null;
  storageLocationId: string | null;
  storageLocationName: string | null;
  storageLocation: string | null;
  storageType: string | null;
  shelf: string | null;
}

interface DrugAutocompleteProps {
  workspaceid: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (drug: DrugSuggestion) => void;
  placeholder?: string;
  className?: string;
}

export function DrugAutocomplete({
  workspaceid,
  value,
  onChange,
  onSelect,
  placeholder = "Search for medication...",
  className = "",
}: DrugAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<DrugSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions when value changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length < 2) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/d/${workspaceid}/drugs/autocomplete?q=${encodeURIComponent(value)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.drugs || []);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error("Error fetching drug suggestions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [value, workspaceid]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelect = (drug: DrugSuggestion) => {
    onChange(drug.name);
    onSelect(drug);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setSuggestions([]);
  };

  // Extract route from description field
  const extractRoute = (description: string | null): string => {
    if (!description) return "";
    const match = description.match(/Route:\s*([^,]+)/i);
    return match ? match[1].trim() : "";
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={`w-full px-3 py-2 border rounded-md pr-10 ${className}`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-80 overflow-y-auto">
          {suggestions.map((drug, index) => (
            <div
              key={drug.drugid}
              className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                index === selectedIndex ? "bg-blue-100" : ""
              }`}
              onClick={() => handleSelect(drug)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">{drug.name}</div>
                  {drug.genericname && drug.genericname !== drug.name && (
                    <div className="text-xs text-gray-500">
                      Generic: {drug.genericname}
                    </div>
                  )}
                  <div className="text-xs text-gray-600 mt-1">
                    {drug.form} • {drug.strength}
                    {drug.category && ` • ${drug.category}`}
                  </div>
                  {drug.atccode && (
                    <div className="text-xs text-blue-600 font-mono mt-0.5">
                      ATC: {drug.atccode}
                    </div>
                  )}
                </div>
                {drug.interaction && (
                  <div className="ml-2">
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                      ⚠️ Interaction
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {showDropdown && !isLoading && value.length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg p-3">
          <p className="text-sm text-gray-500 text-center">
            No medications found for &quot;{value}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
