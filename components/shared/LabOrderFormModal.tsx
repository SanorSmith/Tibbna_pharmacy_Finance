"use client";
import React, { useCallback, useReducer, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

// Test Types
const TEST_TYPES: Record<string, { code: string; value: string; name: string }> = {
  "104177005": { code: "104177005", value: "Complete blood count (procedure)", name: "Complete Blood Count (CBC)" },
  "257051000": { code: "257051000", value: "Comprehensive metabolic panel", name: "Comprehensive Metabolic Panel" },
  "116276005": { code: "116276005", value: "Blood glucose measurement", name: "Blood Glucose Test" },
  "271749007": { code: "271749007", value: "Serum cholesterol measurement", name: "Serum Cholesterol Test" },
  "271658002": { code: "271658002", value: "Serum triglyceride measurement", name: "Serum Triglycerides Test" },
  "309902002": { code: "309902002", value: "Urinalysis", name: "Urinalysis" },
  "245670007": { code: "245670007", value: "Radiographic imaging", name: "X-Ray" },
  "169093000": { code: "169093000", value: "Magnetic resonance imaging", name: "MRI" },
};

const DEFAULT_FORM = {
  service_name: "",
  service_type_code: "104177005",
  service_type_value: TEST_TYPES["104177005"].value,
  clinical_indication: "",
  urgency: "routine" as "routine" | "urgent" | "stat" | "asap",
  requesting_provider: "",
  receiving_provider: "Clinical Laboratory",
  narrative: "",
};

type TestOrderForm = typeof DEFAULT_FORM;

type Action =
  | { type: "SET_FIELD"; field: keyof TestOrderForm; value: string }
  | { type: "SET_TEST_TYPE"; code: string }
  | { type: "RESET"; keepRequester?: string };

function formReducer(state: TestOrderForm, action: Action): TestOrderForm {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_TEST_TYPE": {
      const t = TEST_TYPES[action.code];
      if (!t) return state;
      return {
        ...state,
        service_name: t.name,
        service_type_code: t.code,
        service_type_value: t.value,
      };
    }
    case "RESET":
      return {
        ...DEFAULT_FORM,
        requesting_provider: action.keepRequester ?? "",
      };
    default:
      return state;
  }
}

interface LabOrderFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: TestOrderForm) => Promise<void>;
  isSubmitting?: boolean;
  showPatientId?: boolean;
  patientId?: string;
}

export default function LabOrderFormModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  showPatientId = false,
  patientId,
}: LabOrderFormModalProps) {
  const [formState, dispatch] = useReducer(formReducer, DEFAULT_FORM);
  const [currentStep, setCurrentStep] = React.useState(1);
  const [selectedTests, setSelectedTests] = React.useState<string[]>([]);
  const testTypesOptions = useMemo(() => Object.entries(TEST_TYPES), []);

  // Load current user and populate requesting provider
  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) return;
        const data = await res.json();
        const currentUser = data.user;
        const provider = currentUser?.name || currentUser?.email || "Unknown Provider";
        if (mounted) {
          dispatch({ type: "SET_FIELD", field: "requesting_provider", value: provider });
        }
      } catch (err) {
        console.error("Failed to load user info", err);
      }
    };
    loadUser();
    return () => { mounted = false; };
  }, []);

  // Reset step when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setSelectedTests([]);
    }
  }, [open]);

  const onFieldChange = useCallback((field: keyof TestOrderForm, value: string) => {
    dispatch({ type: "SET_FIELD", field, value });
  }, []);

  const onTestTypeChange = useCallback((code: string) => {
    dispatch({ type: "SET_TEST_TYPE", code });
  }, []);

  const handleNext = () => {
    if (currentStep === 1 && !formState.receiving_provider) {
      alert("Please select a laboratory");
      return;
    }
    if (currentStep === 2 && selectedTests.length === 0) {
      alert("Please select at least one test");
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const toggleTest = (code: string) => {
    setSelectedTests(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async () => {
    if (!formState.clinical_indication) {
      alert("Please fill in clinical indication");
      return;
    }

    try {
      // Set the first selected test as the main test type BEFORE submitting
      let finalFormState = formState;
      if (selectedTests.length > 0) {
        const testType = TEST_TYPES[selectedTests[0]];
        if (testType) {
          finalFormState = {
            ...formState,
            service_name: testType.name,
            service_type_code: testType.code,
            service_type_value: testType.value,
          };
        }
      }
      
      await onSubmit(finalFormState);
      
      // Reset form on success
      const currentProvider = formState.requesting_provider;
      dispatch({ type: "RESET", keepRequester: currentProvider });
      setCurrentStep(1);
      setSelectedTests([]);
    } catch (err) {
      console.error("Failed to submit order:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Laboratory Tests</DialogTitle>
          <DialogDescription>
            Create comprehensive test orders with packages and lab selection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Step 1: Select Laboratory */}
          {currentStep === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-gray-900 text-white rounded px-2 py-0.5 text-xs font-medium">📋</div>
                <Label className="text-sm font-semibold">Step 1: Select Laboratory</Label>
              </div>
              <Select value={formState.receiving_provider} onValueChange={(value) => onFieldChange("receiving_provider", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="-- Select a laboratory --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clinical Laboratory">Clinical Laboratory</SelectItem>
                  <SelectItem value="Hematology">Hematology</SelectItem>
                  <SelectItem value="Biochemistry">Biochemistry</SelectItem>
                  <SelectItem value="Microbiology">Microbiology</SelectItem>
                  <SelectItem value="Pathology">Pathology</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 2: Select Tests */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-gray-900 text-white rounded px-2 py-0.5 text-xs font-medium">🧪</div>
                <Label className="text-sm font-semibold">Step 2: Select Tests</Label>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {testTypesOptions.map(([code, meta]) => (
                  <div
                    key={code}
                    onClick={() => toggleTest(code)}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      selectedTests.includes(code) ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedTests.includes(code) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                        {selectedTests.includes(code) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{meta.name}</div>
                        <div className="text-xs text-gray-500">Code: {code}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-gray-600">
                {selectedTests.length} test{selectedTests.length !== 1 ? 's' : ''} selected
              </div>
            </div>
          )}

          {/* Step 3: Order Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-gray-900 text-white rounded px-2 py-0.5 text-xs font-medium">📝</div>
                <Label className="text-sm font-semibold">Step 3: Order Details</Label>
              </div>

              {/* Clinical Indication */}
              <div>
                <Label htmlFor="clinical_indication" className="text-sm font-medium">Clinical Indication *</Label>
                <Textarea
                  id="clinical_indication"
                  className="w-full mt-2"
                  rows={3}
                  placeholder="e.g., Patient presents with fatigue and fever; rule out infection or anemia."
                  value={formState.clinical_indication}
                  onChange={(e) => onFieldChange("clinical_indication", e.target.value)}
                />
              </div>

              {/* Urgency */}
              <div>
                <Label htmlFor="urgency" className="text-sm font-medium">Urgency</Label>
                <Select value={formState.urgency} onValueChange={(value: any) => onFieldChange("urgency", value)}>
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                    <SelectItem value="asap">ASAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Narrative */}
              <div>
                <Label htmlFor="narrative" className="text-sm font-medium">Narrative Summary</Label>
                <Textarea
                  id="narrative"
                  className="w-full mt-2"
                  rows={2}
                  placeholder="Brief summary of the test order"
                  value={formState.narrative}
                  onChange={(e) => onFieldChange("narrative", e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-6 gap-2">
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
          )}
          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
            >
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Order Tests"
              )}
            </Button>
          )}
          {currentStep === 1 && (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
