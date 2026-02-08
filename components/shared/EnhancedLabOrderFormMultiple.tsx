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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Package, TestTube, Building2, X, ChevronsUpDown, Loader2 } from "lucide-react";

// Import test catalog from a separate file (fallback)
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
  workspaceid?: string;
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
  | { type: "TOGGLE_PACKAGE"; packageId: string; packageTests?: string[] }
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
      const pkgTests = action.packageTests || [];
      const currentPackages = state.selectedPackages || [];
      const currentTests = state.selectedTests || [];
      const isCurrentlySelected = currentPackages.includes(action.packageId);
      
      if (isCurrentlySelected) {
        return {
          ...state,
          selectedPackages: currentPackages.filter(id => id !== action.packageId),
          selectedTests: currentTests.filter(testId => !pkgTests.includes(testId)),
        };
      } else {
        return {
          ...state,
          selectedPackages: [...currentPackages, action.packageId],
          selectedTests: [...new Set([...currentTests, ...pkgTests])],
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
  workspaceid,
}: EnhancedLabOrderFormProps) {
  const [formState, dispatch] = useReducer(
    formReducer,
    editMode && initialData ? { ...DEFAULT_FORM, ...initialData } : DEFAULT_FORM
  );
  const [currentStep, setCurrentStep] = useState(() => {
    if (editMode && initialData) {
      if (initialData.target_lab && (initialData.selectedPackages?.length > 0 || initialData.selectedTests?.length > 0)) return 3;
      if (initialData.target_lab) return 2;
    }
    return 1;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [packageSearchTerm, setPackageSearchTerm] = useState("");
  const [testCatalog, setTestCatalog] = useState<{
    testPackages: Record<string, any>;
    individualTests: Record<string, any>;
    laboratories: Record<string, any>;
  }>({ testPackages: TEST_PACKAGES, individualTests: INDIVIDUAL_TESTS, laboratories: LABORATORIES });

  // Fetch dynamic test catalog from DB when dialog opens (skip in edit mode - reverse-matched IDs use static catalog)
  useEffect(() => {
    if (open && workspaceid && !editMode) {
      setIsLoadingCatalog(true);
      fetch(`/api/test-catalog?workspaceid=${workspaceid}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.totalTests > 0) {
            setTestCatalog({
              testPackages: data.testPackages,
              individualTests: data.individualTests,
              laboratories: data.laboratories,
            });
          }
        })
        .catch(err => console.error("Failed to fetch test catalog, using fallback:", err))
        .finally(() => setIsLoadingCatalog(false));
    }
  }, [open, workspaceid, editMode]);

  // Load initial data in edit mode (only if reducer wasn't initialized with it)
  useEffect(() => {
    if (editMode && initialData && open) {
      dispatch({ type: "LOAD_DATA", data: initialData });
    }
  }, [editMode, initialData, open]);

  // Fetch current user and populate requesting provider (skip in edit mode - already set from initial data)
  useEffect(() => {
    if (open && !editMode && !formState.requesting_provider) {
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
  }, [open, editMode, formState.requesting_provider]);

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

  // Auto-progress to step 3 when packages or individual tests are selected
  useEffect(() => {
    const hasSelections = (formState.selectedPackages || []).length > 0 || (formState.selectedTests || []).length > 0;
    if (hasSelections && currentStep < 3) {
      setCurrentStep(3);
    }
  }, [formState.selectedPackages, formState.selectedTests, currentStep]);

  // Clear search term when form is reset
  useEffect(() => {
    if (!open) {
      setPackageSearchTerm("");
    }
  }, [open]);

  // Get lab category mapping
  const getLabCategory = (labId: string): string => {
    const lab = testCatalog.laboratories[labId];
    if (lab) return lab.name;
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
    return Object.values(testCatalog.testPackages).filter(
      (pkg: any) => pkg.category === category
    );
  }, [formState.target_lab, testCatalog.testPackages, testCatalog.laboratories]);

  // Filter packages by search term
  const filteredPackages = useMemo(() => {
    if (!packageSearchTerm) return availablePackages;
    const searchTerm = packageSearchTerm.toLowerCase();
    
    // Filter packages
    const matchingPackages = availablePackages.filter((pkg: any) => 
      pkg.name.toLowerCase().includes(searchTerm) ||
      pkg.description.toLowerCase().includes(searchTerm) ||
      pkg.category.toLowerCase().includes(searchTerm)
    );
    
    // Also find individual tests that match and show them as virtual packages
    const labCategory = formState.target_lab ? getLabCategory(formState.target_lab) : "";
    const matchingTests = Object.values(testCatalog.individualTests).filter((test: any) => 
      test.category === labCategory && (
        test.name.toLowerCase().includes(searchTerm) ||
        test.code.toLowerCase().includes(searchTerm)
      )
    );
    
    // Convert matching tests to virtual package format
    const testPackages = matchingTests.map((test: any) => ({
      id: `test-${test.id}`,
      name: test.name,
      description: `Individual test: ${test.name}`,
      category: test.category,
      tests: [test.id],
      isVirtualTest: true,
      originalTest: test
    }));
    
    return [...matchingPackages, ...testPackages];
  }, [availablePackages, packageSearchTerm, formState.target_lab, testCatalog.individualTests, getLabCategory]);

  // Get all tests from selected packages plus individually selected tests
  const allSelectedTests = useMemo(() => {
    const testIds = new Set<string>();
    
    // Add tests from selected packages
    if (formState.selectedPackages && formState.selectedPackages.length > 0) {
      formState.selectedPackages.forEach(pkgId => {
        const pkg = testCatalog.testPackages[pkgId];
        if (pkg) {
          pkg.tests.forEach((testId: string) => testIds.add(testId));
        }
      });
    }
    
    // Add individually selected tests
    if (formState.selectedTests && formState.selectedTests.length > 0) {
      formState.selectedTests.forEach((testId: string) => testIds.add(testId));
    }
    
    return Array.from(testIds).map(id => testCatalog.individualTests[id]).filter(Boolean);
  }, [formState.selectedPackages, formState.selectedTests, testCatalog.testPackages, testCatalog.individualTests]);

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
        .map(pkgId => testCatalog.testPackages[pkgId])
        .filter(Boolean);
      
      const packageNames = selectedPackageObjects
        .map(pkg => pkg.name)
        .join(", ");
      
      // Get the category from the first selected package (all should be same category)
      const testCategory = selectedPackageObjects.length > 0 
        ? selectedPackageObjects[0].category 
        : "";
      
      const labCategory = getLabCategory(formState.target_lab);
      const selectedLab = testCatalog.laboratories[formState.target_lab];
      
      // Build detailed description with test information
      const selectedTestDetails = (formState.selectedTests || [])
        .map(testId => testCatalog.individualTests[testId])
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
    ? testCatalog.laboratories[formState.target_lab]
    : null;

  // Helper to dispatch TOGGLE_PACKAGE with package tests
  const togglePackage = (packageId: string) => {
    // Check if it's a virtual test package (individual test)
    if (packageId.startsWith("test-")) {
      const testId = packageId.replace("test-", "");
      // Toggle individual test directly
      dispatch({ type: "TOGGLE_TEST", testId });
    } else {
      // Regular package
      const pkg = testCatalog.testPackages[packageId];
      dispatch({ type: "TOGGLE_PACKAGE", packageId, packageTests: pkg?.tests || [] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[80vw] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => { if (editMode) e.preventDefault(); }}
        onPointerDownOutside={(e) => { if (editMode) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>{editMode ? "Edit Laboratory Test Order" : "Order Laboratory Tests"}</DialogTitle>
          <DialogDescription>
            {editMode ? "Modify your test order" : "Select multiple test groups from the same laboratory type"}
            {patientName && ` for ${patientName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-4 py-4">
          {/* Step 1: Select Laboratory */}
          <div className="border-r pr-3 col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5" />
              <Label className="text-base font-semibold">
                Step 1: Laboratory
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
                {isLoadingCatalog ? (
                  <SelectItem value="_loading" disabled>
                    <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading...</span>
                  </SelectItem>
                ) : Object.values(testCatalog.laboratories).map((lab: any) => (
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
          <div className="border-r pr-3 col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5" />
              <Label className="text-base font-semibold">
                Step 2: Test Groups
              </Label>
            </div>
            
            {!formState.target_lab ? (
              <p className="text-sm text-muted-foreground">Select a laboratory first</p>
            ) : (
              <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-auto min-h-[40px]"
                  >
                    <div className="flex flex-wrap gap-1 flex-1">
                      {(formState.selectedPackages || []).length === 0 ? (
                        <span className="text-muted-foreground">Select test groups...</span>
                      ) : (
                        (formState.selectedPackages || []).map((packageId) => {
                          const pkg = testCatalog.testPackages[packageId];
                          return pkg ? (
                            <Badge
                              key={packageId}
                              variant="secondary"
                              className="mr-1"
                            >
                              {pkg.name}
                              <span
                                role="button"
                                tabIndex={0}
                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    togglePackage(packageId);
                                  }
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  togglePackage(packageId);
                                }}
                                aria-label={`Remove ${pkg.name}`}
                                title={`Remove ${pkg.name}`}
                              >
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                              </span>
                            </Badge>
                          ) : null;
                        })
                      )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <div className="p-3 border-b">
                    <input
                      type="text"
                      placeholder="Search test groups or individual tests..."
                      value={packageSearchTerm}
                      onChange={(e) => setPackageSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1">
                    {filteredPackages.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {packageSearchTerm ? "No test groups or tests found" : "No test groups available"}
                      </div>
                    ) : (
                      filteredPackages.map((pkg) => {
                        const isVirtualTest = pkg.isVirtualTest;
                        const isSelected = isVirtualTest 
                          ? formState.selectedTests.includes(pkg.tests[0])
                          : (formState.selectedPackages || []).includes(pkg.id);
                        
                        return (
                          <div
                            key={pkg.id}
                            className={`flex items-start gap-2 p-2 cursor-pointer hover:bg-accent rounded-sm ${
                              isSelected ? 'bg-accent' : ''
                            }`}
                            onClick={() => togglePackage(pkg.id)}
                          >
                            <div className="flex h-5 items-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => togglePackage(pkg.id)}
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium leading-none">
                                {pkg.name}
                                {isVirtualTest && (
                                  <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                                    Individual Test
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {pkg.description}
                              </p>
                              <p className="text-xs text-blue-600">
                                {pkg.category} • {isVirtualTest ? "1 test" : `${pkg.tests.length} tests`}
                                {isVirtualTest && pkg.originalTest?.code && (
                                  <span className="ml-1 font-mono">({pkg.originalTest.code})</span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {(formState.selectedPackages || []).length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-md text-sm">
                  <p className="font-medium text-blue-800">
                    {(formState.selectedPackages || []).length} test group{(formState.selectedPackages || []).length > 1 ? 's' : ''} selected • {formState.selectedTests.length} total tests
                  </p>
                </div>
              )}
              </>
            )}
          </div>

          {/* Step 3: Review and Customize Tests */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                <Label className="text-base font-semibold">
                  Step 3: Review Tests
                </Label>
              </div>
              {allSelectedTests.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const allTestIds = allSelectedTests.map(t => t.id);
                      dispatch({ type: "SET_FIELD", field: "selectedTests", value: allTestIds });
                    }}
                    className="text-xs h-7 px-2"
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      dispatch({ type: "SET_FIELD", field: "selectedTests", value: [] });
                    }}
                    className="text-xs h-7 px-2"
                  >
                    Deselect All
                  </Button>
                </div>
              )}
            </div>
            
            {allSelectedTests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Select test groups first</p>
            ) : (
              <>
              <div className="mb-3">
                <p className="text-sm text-muted-foreground">
                  {formState.selectedTests.length} of {allSelectedTests.length} tests selected
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto border rounded-md p-3">
                {allSelectedTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded border"
                  >
                    <Checkbox
                      checked={formState.selectedTests.includes(test.id)}
                      onCheckedChange={() =>
                        dispatch({ type: "TOGGLE_TEST", testId: test.id })
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs" title={test.name}>{test.name}</p>
                      {test.fastingRequired && (
                        <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 mt-1">
                          Fasting
                        </span>
                      )}
                      <p className="text-[10px] text-gray-500 mt-1" title={`Code: ${test.code}`}>
                        {test.code}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
        </div>

        {/* Full-width sections below the 3-column layout */}
        <div className="space-y-4 mt-6">
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
              <div className="space-y-2">
                <Label htmlFor="clinical_indication" className="text-sm">
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
                  className="min-h-[60px] text-sm"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="urgency" className="text-sm">Urgency</Label>
                  <Select
                    value={formState.urgency}
                    onValueChange={(value: any) =>
                      dispatch({ type: "SET_FIELD", field: "urgency", value })
                    }
                  >
                    <SelectTrigger className="mt-1 h-9">
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
                  <Label htmlFor="narrative" className="text-sm">Additional Notes</Label>
                  <Textarea
                    id="narrative"
                    placeholder="Optional notes"
                    value={formState.narrative}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_FIELD",
                        field: "narrative",
                        value: e.target.value,
                      })
                    }
                    className="mt-1 min-h-[36px] text-sm"
                    rows={1}
                  />
                </div>
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
                !formState.selectedTests?.length
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? "Submitting..." : editMode ? "Update Order" : "Order Tests"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
