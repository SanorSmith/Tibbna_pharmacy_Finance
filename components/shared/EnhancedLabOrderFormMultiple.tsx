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
import { Package, TestTube, Building2, X } from "lucide-react";

// Import test catalog from a separate file
import { TEST_PACKAGES, INDIVIDUAL_TESTS, LABORATORIES } from "@/lib/test-catalog";
import { getSampleRecommendations, getContainerOptions, getVolumeUnits } from "@/lib/lims/test-recommendations";

interface EnhancedLabOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: any) => Promise<void>;
  patientId?: string;
  patientName?: string;
  editMode?: boolean;
  initialData?: any;
}

interface TestOrderForm {
  target_lab: string;
  selectedPackages: string[];
  selectedTests: string[];
  clinical_indication: string;
  urgency: "routine" | "urgent" | "stat";
  requesting_provider: string;
  narrative: string;
  sampleType: string;
  containerType: string;
  volume: string;
  volumeUnit: string;
}

const DEFAULT_FORM: TestOrderForm = {
  target_lab: "",
  selectedPackages: [],
  selectedTests: [],
  clinical_indication: "",
  urgency: "routine",
  requesting_provider: "",
  narrative: "",
  sampleType: "",
  containerType: "",
  volume: "",
  volumeUnit: "mL",
};

type FormAction =
  | { type: "SET_FIELD"; field: keyof TestOrderForm; value: any }
  | { type: "TOGGLE_TEST"; testId: string }
  | { type: "TOGGLE_PACKAGE"; packageId: string }
  | { type: "LOAD_DATA"; data: TestOrderForm }
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
    case "TOGGLE_PACKAGE": {
      const pkg = TEST_PACKAGES[action.packageId];
      const currentPackages = state.selectedPackages || [];
      const currentTests = state.selectedTests || [];
      const isCurrentlySelected = currentPackages.includes(action.packageId);
      
      if (isCurrentlySelected) {
        // Remove package and its tests
        const testsToRemove = pkg ? pkg.tests : [];
        return {
          ...state,
          selectedPackages: currentPackages.filter(id => id !== action.packageId),
          selectedTests: currentTests.filter(testId => !testsToRemove.includes(testId)),
        };
      } else {
        // Add package and its tests
        const testsToAdd = pkg ? pkg.tests : [];
        return {
          ...state,
          selectedPackages: [...currentPackages, action.packageId],
          selectedTests: [...new Set([...currentTests, ...testsToAdd])],
        };
      }
    }
    case "LOAD_DATA":
      return { ...action.data };
    case "RESET":
      return {
        ...DEFAULT_FORM,
        requesting_provider: action.keepRequester || "",
      };
    default:
      return state;
  }
}

export default function EnhancedLabOrderFormMultiple({
  open,
  onOpenChange,
  onSubmit,
  patientId,
  patientName,
  editMode = false,
  initialData,
}: EnhancedLabOrderFormProps) {
  const [formState, dispatch] = useReducer(formReducer, DEFAULT_FORM);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load initial data in edit mode
  useEffect(() => {
    if (editMode && initialData && open) {
      dispatch({ type: "LOAD_DATA", data: initialData });
      // Start at step 1 to allow user to select laboratory and tests
      setCurrentStep(1);
    }
  }, [editMode, initialData, open]);

  // Fetch current user and populate requesting provider
  useEffect(() => {
    if (open && !formState.requesting_provider) {
      fetch("/api/auth/session")
        .then(res => res.json())
        .then(data => {
          if (data?.user) {
            const providerName = data.user.name || data.user.email || "Unknown Provider";
            dispatch({ type: "SET_FIELD", field: "requesting_provider", value: providerName });
          }
        })
        .catch(err => {
          console.error("Failed to fetch session:", err);
          dispatch({ type: "SET_FIELD", field: "requesting_provider", value: "Unknown Provider" });
        });
    }
  }, [open, formState.requesting_provider]);

  // Calculate sample recommendations based on selected tests
  const sampleRecommendations = useMemo(() => {
    return getSampleRecommendations(formState.selectedTests);
  }, [formState.selectedTests]);

  // Auto-update sample recommendations when tests change
  useEffect(() => {
    if (sampleRecommendations.primarySampleType && !formState.sampleType) {
      dispatch({ type: "SET_FIELD", field: "sampleType", value: sampleRecommendations.primarySampleType });
      dispatch({ type: "SET_FIELD", field: "containerType", value: sampleRecommendations.primaryContainer });
      dispatch({ type: "SET_FIELD", field: "volume", value: sampleRecommendations.totalVolume.toString() });
      dispatch({ type: "SET_FIELD", field: "volumeUnit", value: sampleRecommendations.volumeUnit });
    }
  }, [sampleRecommendations, formState.sampleType]);

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

  // Get all tests from selected packages
  const allSelectedTests = useMemo(() => {
    if (!formState.selectedPackages || formState.selectedPackages.length === 0) return [];
    const testIds = new Set<string>();
    formState.selectedPackages.forEach(pkgId => {
      const pkg = TEST_PACKAGES[pkgId];
      if (pkg) {
        pkg.tests.forEach(testId => testIds.add(testId));
      }
    });
    return Array.from(testIds).map(id => INDIVIDUAL_TESTS[id]).filter(Boolean);
  }, [formState.selectedPackages]);

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
      const selectedPackageObjects = (formState.selectedPackages || [])
        .map(pkgId => TEST_PACKAGES[pkgId])
        .filter(Boolean);
      
      const packageNames = selectedPackageObjects
        .map(pkg => pkg.name)
        .join(", ");
      
      // Get the category from the first selected package (all should be same category)
      const testCategory = selectedPackageObjects.length > 0 
        ? selectedPackageObjects[0].category 
        : "";
      
      const labCategory = getLabCategory(formState.target_lab);
      const selectedLab = LABORATORIES[formState.target_lab];
      
      // Build detailed description with test information
      const selectedTestDetails = (formState.selectedTests || [])
        .map(testId => INDIVIDUAL_TESTS[testId])
        .filter(Boolean);
      
      const testNames = selectedTestDetails.map(test => test.name).join(", ");
      const description = `Test Group${selectedPackageObjects.length > 1 ? 's' : ''}: ${packageNames} | Category: ${testCategory} | Laboratory: ${selectedLab?.name || labCategory} | Selected Tests (${selectedTestDetails.length}): ${testNames} | Urgency: ${formState.urgency}`;
      
      const submissionData = {
        clinical_indication: formState.clinical_indication,
        urgency: formState.urgency,
        requesting_provider: formState.requesting_provider,
        receiving_provider: selectedLab?.name || labCategory,
        narrative: formState.narrative || `${packageNames || "Laboratory tests"} ordered for ${formState.clinical_indication}`,
        service_name: packageNames || "Laboratory Tests",
        service_type_code: selectedPackageObjects.map(pkg => pkg.snomedCode).filter(Boolean).join(","),
        service_type_value: "Test Group",
        description: description,
        target_lab: selectedLab?.name || labCategory,
        test_category: testCategory,
        is_package: true,
        selected_packages: formState.selectedPackages || [],
        selected_tests: formState.selectedTests,
        // Sample collection information
        sampleType: formState.sampleType,
        containerType: formState.containerType,
        volume: formState.volume,
        volumeUnit: formState.volumeUnit,
        sampleRecommendations: sampleRecommendations,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? "Edit Laboratory Test Order" : "Order Laboratory Tests"}</DialogTitle>
          <DialogDescription>
            {editMode ? "Modify your test order" : "Select multiple test groups from the same laboratory type"}
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
              onValueChange={(value: string) => {
                dispatch({ type: "SET_FIELD", field: "target_lab", value });
                dispatch({ type: "SET_FIELD", field: "selectedPackages", value: [] });
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

          {/* Step 2: Select Test Groups (Multiple Selection) */}
          {currentStep >= 2 && formState.target_lab && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <Label className="text-base font-semibold">
                    Step 2: Select Test Groups ({(formState.selectedPackages || []).length} selected)
                  </Label>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                ✓ Select one or more test groups from the same laboratory type
              </p>
              
              {/* Selected Packages Summary */}
              {(formState.selectedPackages || []).length > 0 && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Selected Groups:</span>
                    <span className="text-xs text-blue-700">{formState.selectedTests.length} total tests</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(formState.selectedPackages || []).map(pkgId => {
                      const pkg = TEST_PACKAGES[pkgId];
                      return (
                        <div key={pkgId} className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded text-sm border">
                          <span>{pkg?.name}</span>
                          <button
                            onClick={() => dispatch({ type: "TOGGLE_PACKAGE", packageId: pkgId })}
                            className="text-gray-500 hover:text-red-600"
                            aria-label="Remove test group"
                            title="Remove this test group"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-3">
                {availablePackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                      (formState.selectedPackages || []).includes(pkg.id)
                        ? 'bg-blue-50 border-blue-300'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      dispatch({ type: "TOGGLE_PACKAGE", packageId: pkg.id });
                      if ((formState.selectedPackages || []).length === 0) {
                        setCurrentStep(3);
                      }
                    }}
                  >
                    <Checkbox
                      checked={(formState.selectedPackages || []).includes(pkg.id)}
                      onCheckedChange={() => {
                        dispatch({ type: "TOGGLE_PACKAGE", packageId: pkg.id });
                        if ((formState.selectedPackages || []).length === 0) {
                          setCurrentStep(3);
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{pkg.name}</div>
                      <div className="text-sm text-gray-600">{pkg.description}</div>
                      <div className="text-xs text-gray-500 mt-1">{pkg.tests.length} tests included</div>
                    </div>
                  </div>
                ))}
              </div>

              {(formState.selectedPackages || []).length > 0 && (
                <Button
                  type="button"
                  className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
                  onClick={(e) => {
                    e.preventDefault();
                    console.log("Advancing to step 3, selected tests:", formState.selectedTests.length);
                    setCurrentStep(3);
                  }}
                >
                  Continue to Review Tests ({(formState.selectedTests || []).length} tests)
                </Button>
              )}
            </div>
          )}

          {/* Step 3: Review and Customize Tests */}
          {currentStep >= 3 && allSelectedTests.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TestTube className="h-5 w-5" />
                <Label className="text-base font-semibold">
                  Step 3: Review Tests ({formState.selectedTests.length}/
                  {allSelectedTests.length} selected)
                </Label>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Review and customize the tests from your selected groups. You can deselect any tests you don't need.
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                {allSelectedTests.map((test) => (
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
          {currentStep >= 3 && allSelectedTests.some(t => t.fastingRequired && formState.selectedTests.includes(t.id)) && (
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

          {/* Sample Collection Recommendations */}
          {currentStep >= 3 && formState.selectedTests?.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-5 w-5" />
                <Label className="text-base font-semibold">
                  Sample Collection Requirements
                </Label>
                {sampleRecommendations.fastingRequired && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    ⚠️ Fasting Required
                  </span>
                )}
              </div>

              {/* Sample Recommendations Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <h4 className="font-medium text-sm text-blue-800 mb-2">Recommended Collection:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Sample Type:</strong> {sampleRecommendations.primarySampleType}</div>
                  <div><strong>Container:</strong> {sampleRecommendations.primaryContainer}</div>
                  <div><strong>Volume:</strong> {sampleRecommendations.totalVolume} {sampleRecommendations.volumeUnit}</div>
                  <div><strong>Tests:</strong> {formState.selectedTests.length} selected</div>
                </div>
                {sampleRecommendations.specialInstructions.length > 0 && (
                  <div className="mt-2">
                    <strong className="text-sm">Special Instructions:</strong>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      {sampleRecommendations.specialInstructions.map((instruction, index) => (
                        <li key={index}>• {instruction}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Sample Collection Form */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sampleType">Sample Type</Label>
                  <Select
                    value={formState.sampleType}
                    onValueChange={(value) =>
                      dispatch({ type: "SET_FIELD", field: "sampleType", value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select sample type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blood">Blood</SelectItem>
                      <SelectItem value="serum">Serum</SelectItem>
                      <SelectItem value="plasma">Plasma</SelectItem>
                      <SelectItem value="urine">Urine</SelectItem>
                      <SelectItem value="csf">CSF</SelectItem>
                      <SelectItem value="tissue">Tissue</SelectItem>
                      <SelectItem value="swab">Swab</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="containerType">Container Type</Label>
                  <Select
                    value={formState.containerType}
                    onValueChange={(value) =>
                      dispatch({ type: "SET_FIELD", field: "containerType", value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select container" />
                    </SelectTrigger>
                    <SelectContent>
                      {getContainerOptions(formState.sampleType).map((container) => (
                        <SelectItem key={container} value={container}>
                          {container}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="volume">Volume</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      id="volume"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter volume"
                      value={formState.volume}
                      onChange={(e) =>
                        dispatch({ type: "SET_FIELD", field: "volume", value: e.target.value })
                      }
                    />
                    <Select
                      value={formState.volumeUnit}
                      onValueChange={(value) =>
                        dispatch({ type: "SET_FIELD", field: "volumeUnit", value })
                      }
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getVolumeUnits().map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Test-specific Requirements */}
              {sampleRecommendations.recommendations.length > 1 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">Individual Test Requirements:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {sampleRecommendations.recommendations.map((rec, index) => (
                      <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                        <div className="font-medium">{rec.testName}</div>
                        <div className="text-gray-600">
                          {rec.sampleType} • {rec.containerType} • {rec.volume} {rec.volumeUnit}
                          {rec.fastingRequired && " • Fasting Required"}
                        </div>
                        {rec.specialInstructions && (
                          <div className="text-blue-600 mt-1">{rec.specialInstructions}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
                !formState.selectedTests?.length
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Submitting..." : editMode ? "Update Order" : "Order Tests"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
