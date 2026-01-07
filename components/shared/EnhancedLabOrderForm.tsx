"use client";
import React, { useReducer, useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, TestTube, Building2 } from "lucide-react";

// Import test catalog from a separate file
import { TEST_PACKAGES, INDIVIDUAL_TESTS, LABORATORIES } from "@/lib/test-catalog";

interface EnhancedLabOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: any) => Promise<void>;
  patientId?: string;
  patientName?: string;
}

interface TestOrderForm {
  target_lab: string;
  selectedPackage: string;
  selectedTests: string[];
  clinical_indication: string;
  urgency: "routine" | "urgent" | "stat";
  requesting_provider: string;
  narrative: string;
}

const DEFAULT_FORM: TestOrderForm = {
  target_lab: "",
  selectedPackage: "",
  selectedTests: [],
  clinical_indication: "",
  urgency: "routine",
  requesting_provider: "",
  narrative: "",
};

type FormAction =
  | { type: "SET_FIELD"; field: keyof TestOrderForm; value: any }
  | { type: "TOGGLE_TEST"; testId: string }
  | { type: "SELECT_PACKAGE"; packageId: string }
  | { type: "RESET"; keepRequester?: string };

function formReducer(state: TestOrderForm, action: FormAction): TestOrderForm {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "TOGGLE_TEST":
      return {
        ...state,
        selectedTests: state.selectedTests.includes(action.testId)
          ? state.selectedTests.filter((id) => id !== action.testId)
          : [...state.selectedTests, action.testId],
      };
    case "SELECT_PACKAGE": {
      const pkg = TEST_PACKAGES[action.packageId];
      return {
        ...state,
        selectedPackage: action.packageId,
        selectedTests: pkg ? pkg.tests : [],
      };
    }
    case "RESET":
      return {
        ...DEFAULT_FORM,
        requesting_provider: action.keepRequester || "",
      };
    default:
      return state;
  }
}

export default function EnhancedLabOrderForm({
  open,
  onOpenChange,
  onSubmit,
  patientId,
  patientName,
}: EnhancedLabOrderFormProps) {
  const [formState, dispatch] = useReducer(formReducer, DEFAULT_FORM);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get lab category mapping
  const getLabCategory = (labId: string): string => {
    const labMap: Record<string, string> = {
      "hematology-lab": "Hematology",
      "biochemistry-lab": "Biochemistry",
      "microbiology-lab": "Microbiology",
      "immunology-lab": "Immunology",
      "histopathology-lab": "Histopathology",
    };
    return labMap[labId] || "";
  };

  // Filter packages by selected lab
  const availablePackages = useMemo(() => {
    if (!formState.target_lab) return [];
    const category = getLabCategory(formState.target_lab);
    return Object.values(TEST_PACKAGES).filter(
      (pkg) => pkg.category === category
    );
  }, [formState.target_lab]);

  // Get tests for selected package
  const packageTests = useMemo(() => {
    if (!formState.selectedPackage) return [];
    const pkg = TEST_PACKAGES[formState.selectedPackage];
    if (!pkg) return [];
    return pkg.tests.map((testId) => INDIVIDUAL_TESTS[testId]).filter(Boolean);
  }, [formState.selectedPackage]);

  const handleSubmit = async () => {
    if (!formState.clinical_indication) {
      alert("Please fill in clinical indication");
      return;
    }

    if (formState.selectedTests.length === 0) {
      alert("Please select at least one test");
      return;
    }

    setIsSubmitting(true);
    try {
      // Build the submission data
      const selectedPackage = TEST_PACKAGES[formState.selectedPackage];
      const submissionData = {
        clinical_indication: formState.clinical_indication,
        urgency: formState.urgency,
        requesting_provider: formState.requesting_provider,
        narrative: formState.narrative || `${selectedPackage?.name || "Laboratory tests"} ordered for ${formState.clinical_indication}`,
        service_name: selectedPackage?.name || "Laboratory Tests",
        service_type_code: selectedPackage?.snomedCode || "",
        service_type_value: selectedPackage?.name || "",
        target_lab: formState.target_lab,
        test_category: selectedPackage?.category || "",
        is_package: true,
        selected_tests: formState.selectedTests,
      };

      await onSubmit(submissionData);

      // Reset form on success
      const currentProvider = formState.requesting_provider;
      dispatch({ type: "RESET", keepRequester: currentProvider });
      setCurrentStep(1);
    } catch (error) {
      console.error("Failed to submit order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLab = formState.target_lab
    ? LABORATORIES[formState.target_lab]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Laboratory Tests</DialogTitle>
          <DialogDescription>
            Create comprehensive test orders with packages and lab selection
            {patientName && ` for ${patientName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Select Laboratory */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5" />
              <Label className="text-base font-semibold">
                Step 1: Select Laboratory
              </Label>
            </div>
            <Select
              value={formState.target_lab}
              onValueChange={(value) => {
                dispatch({ type: "SET_FIELD", field: "target_lab", value });
                dispatch({ type: "SET_FIELD", field: "selectedPackage", value: "" });
                dispatch({ type: "SET_FIELD", field: "selectedTests", value: [] });
                setCurrentStep(2);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a laboratory department" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(LABORATORIES).map((lab) => (
                  <SelectItem key={lab.id} value={lab.id}>
                    {lab.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedLab && (
              <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm">
                <p className="font-medium">{selectedLab.name}</p>
                <p className="text-gray-600">{selectedLab.address}</p>
                <p className="text-gray-600">{selectedLab.phone}</p>
                <p className="text-gray-600 mt-1">
                  <span className="font-medium">Turnaround:</span>{" "}
                  {selectedLab.turnaround}
                </p>
              </div>
            )}
          </div>

          {/* Step 2: Select Test Group */}
          {currentStep >= 2 && formState.target_lab && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-5 w-5" />
                <Label className="text-base font-semibold">
                  Step 2: Select Test Group
                </Label>
              </div>
              <Select
                value={formState.selectedPackage}
                onValueChange={(value) => {
                  dispatch({ type: "SELECT_PACKAGE", packageId: value });
                  setCurrentStep(3);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Select a test group --" />
                </SelectTrigger>
                <SelectContent>
                  {availablePackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} - {pkg.tests.length} tests
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {formState.selectedPackage && (
                <div className="mt-3 p-3 bg-blue-50 rounded-md text-sm">
                  <p className="font-medium">
                    {TEST_PACKAGES[formState.selectedPackage]?.name}
                  </p>
                  <p className="text-gray-600 mt-1">
                    {TEST_PACKAGES[formState.selectedPackage]?.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review and Customize Tests */}
          {currentStep >= 3 && packageTests.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TestTube className="h-5 w-5" />
                <Label className="text-base font-semibold">
                  Step 3: Review Tests ({formState.selectedTests.length}/
                  {packageTests.length} selected)
                </Label>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                {packageTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded"
                  >
                    <Checkbox
                      checked={formState.selectedTests.includes(test.id)}
                      onCheckedChange={() =>
                        dispatch({ type: "TOGGLE_TEST", testId: test.id })
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{test.name}</p>
                        {test.fastingRequired && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            Fasting Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Code: {test.code} | Material: {test.material}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fasting Requirements Alert */}
          {currentStep >= 3 && packageTests.some(t => t.fastingRequired && formState.selectedTests.includes(t.id)) && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <span className="text-amber-600 font-semibold text-sm">⚠️ Fasting Required</span>
              </div>
              <p className="text-sm text-amber-800 mt-1">
                Some selected tests require fasting (8-12 hours). Please instruct the patient to fast before sample collection.
              </p>
            </div>
          )}

          {/* Clinical Information */}
          {currentStep >= 3 && (
            <>
              <div>
                <Label htmlFor="clinical_indication">
                  Clinical Indication *
                </Label>
                <Textarea
                  id="clinical_indication"
                  placeholder="Reason for test (e.g., suspected infection, routine checkup)"
                  value={formState.clinical_indication}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "clinical_indication",
                      value: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="urgency">Urgency</Label>
                <Select
                  value={formState.urgency}
                  onValueChange={(value: any) =>
                    dispatch({ type: "SET_FIELD", field: "urgency", value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="narrative">Additional Notes (Optional)</Label>
                <Textarea
                  id="narrative"
                  placeholder="Any additional clinical notes or special instructions"
                  value={formState.narrative}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "narrative",
                      value: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              dispatch({ type: "RESET" });
              setCurrentStep(1);
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          {currentStep >= 3 && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !formState.clinical_indication ||
                formState.selectedTests.length === 0
              }
            >
              {isSubmitting ? "Submitting..." : "Order Tests"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
