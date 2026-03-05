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
import { Input } from "@/components/ui/input";
import { Package, TestTube, Building2, Check, ChevronsUpDown, X, Search, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

// Import test catalog from a separate file (fallback)
import { TEST_PACKAGES, INDIVIDUAL_TESTS, LABORATORIES } from "@/lib/test-catalog";
import { getSampleRecommendations, getContainerOptions, getVolumeUnits } from "@/lib/lims/test-recommendations";

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
  selectedPackages: string[]; // Add support for multiple packages
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
  selectedPackage: "",
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
  | { type: "SELECT_PACKAGE"; packageId: string }
  | { type: "TOGGLE_PACKAGE"; packageId: string }
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
      const pkg = (state as any)._testPackages?.[action.packageId] || TEST_PACKAGES[action.packageId];
      return {
        ...state,
        selectedPackage: action.packageId,
        selectedTests: pkg ? pkg.tests : [],
      };
    }
    case "TOGGLE_PACKAGE": {
      const pkg = (state as any)._testPackages?.[action.packageId] || TEST_PACKAGES[action.packageId];
      const isPackageSelected = state.selectedPackages.includes(action.packageId);
      
      let newSelectedPackages: string[];
      let newSelectedTests: string[];
      
      if (isPackageSelected) {
        // Remove package and its tests
        newSelectedPackages = state.selectedPackages.filter(id => id !== action.packageId);
        const packageTests = pkg?.tests || [];
        newSelectedTests = state.selectedTests.filter(testId => !packageTests.includes(testId));
      } else {
        // Add package but don't auto-select tests
        newSelectedPackages = [...state.selectedPackages, action.packageId];
        newSelectedTests = [...state.selectedTests];
      }
      
      return {
        ...state,
        selectedPackages: newSelectedPackages,
        selectedTests: newSelectedTests,
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
  const params = useParams();
  const workspaceid = params?.workspaceid as string;
  
  const [formState, dispatch] = useReducer(formReducer, DEFAULT_FORM);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testSearchTerm, setTestSearchTerm] = useState("");
  
  // State for dynamic test catalog
  const [testCatalog, setTestCatalog] = useState<{
    testPackages: Record<string, any>;
    individualTests: Record<string, any>;
    laboratories: Record<string, any>;
    testsByLabType: Record<string, any[]>;
  }>({ testPackages: TEST_PACKAGES, individualTests: INDIVIDUAL_TESTS, laboratories: LABORATORIES, testsByLabType: {} });
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  
  // Fetch real test data from database
  useEffect(() => {
    if (open && workspaceid) {
      fetchTestCatalog();
    }
  }, [open, workspaceid]);
  
  const fetchTestCatalog = async () => {
    setIsLoadingTests(true);
    try {
      const response = await fetch(`/api/test-catalog?workspaceid=${workspaceid}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Test catalog API response:', {
          success: data.success,
          totalTests: data.totalTests,
          packagesCount: Object.keys(data.testPackages || {}).length,
          laboratoriesCount: Object.keys(data.laboratories || {}).length,
          laboratories: Object.keys(data.laboratories || {}),
          samplePackages: Object.keys(data.testPackages || {}).slice(0, 5),
        });
        
        if (data.success) {
          setTestCatalog({
            testPackages: data.testPackages,
            individualTests: data.individualTests,
            laboratories: data.laboratories,
            testsByLabType: data.testsByLabType,
          });
        }
      } else {
        console.error('Failed to fetch test catalog:', response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching test catalog:", error);
      // Keep using fallback data
    } finally {
      setIsLoadingTests(false);
    }
  };

  // Calculate sample recommendations based on selected tests
  const sampleRecommendations = useMemo(() => {
    const allTestCodes = [
      ...formState.selectedTests,
      // Get tests from selected packages
      ...formState.selectedPackages.flatMap(packageId => 
        testCatalog.testPackages[packageId]?.tests || []
      )
    ];
    return getSampleRecommendations(allTestCodes);
  }, [formState.selectedTests, formState.selectedPackages, testCatalog.testPackages]);

  // Check if multiple test packages from same laboratory category are selected
  const shouldExpandModal = useMemo(() => {
    if (formState.selectedPackages.length === 0) return false;
    
    // Group selected packages by category
    const packagesByCategory = formState.selectedPackages.reduce((acc: Record<string, any[]>, packageId) => {
      const pkg = testCatalog.testPackages[packageId];
      if (pkg) {
        const category = pkg.category;
        if (!acc[category]) acc[category] = [];
        acc[category].push(pkg);
      }
      return acc;
    }, {});
    
    // Check if any category has more than one package
    return Object.values(packagesByCategory).some((packages) => packages.length > 1);
  }, [formState.selectedPackages, testCatalog.testPackages]);

  // Auto-update sample recommendations when tests change
  useEffect(() => {
    if (sampleRecommendations.primarySampleType && !formState.sampleType) {
      dispatch({ type: "SET_FIELD", field: "sampleType", value: sampleRecommendations.primarySampleType });
      dispatch({ type: "SET_FIELD", field: "containerType", value: sampleRecommendations.primaryContainer });
      dispatch({ type: "SET_FIELD", field: "volume", value: sampleRecommendations.totalVolume.toString() });
      dispatch({ type: "SET_FIELD", field: "volumeUnit", value: sampleRecommendations.volumeUnit });
    }
  }, [sampleRecommendations, formState.sampleType]);

  // Auto-progress to step 3 when packages are selected
  useEffect(() => {
    if (formState.selectedPackages.length > 0 && currentStep < 3) {
      setCurrentStep(3);
    }
  }, [formState.selectedPackages, currentStep]);

  // Get lab category mapping
  const getLabCategory = (labId: string): string => {
    // First check if the lab exists in dynamic catalog
    const lab = testCatalog.laboratories[labId];
    if (lab) {
      return lab.name;
    }
    
    // Fallback to hardcoded mapping
    const labMap: Record<string, string> = {
      "biochemistry": "Biochemistry",
      "microbiology": "Microbiology",
      "histopathology": "Histopathology",
    };
    return labMap[labId] || "";
  };

  // Filter packages by selected lab
  const availablePackages = useMemo(() => {
    if (!formState.target_lab) return [];
    const category = getLabCategory(formState.target_lab);
    
    const packages = Object.values(testCatalog.testPackages).filter(
      (pkg) => pkg.category === category
    );
    
    console.log('Available packages:', {
      selectedLab: formState.target_lab,
      category,
      totalPackages: Object.keys(testCatalog.testPackages).length,
      filteredPackages: packages.length,
      packages: packages.map(p => ({ id: p.id, name: p.name, category: p.category }))
    });
    
    return packages;
  }, [formState.target_lab, testCatalog.testPackages, testCatalog.laboratories]);

  // Get tests for selected packages
  const packageTests = useMemo(() => {
    if (formState.selectedPackages.length === 0) return [];
    
    const allTests: string[] = [];
    formState.selectedPackages.forEach(packageId => {
      const pkg = testCatalog.testPackages[packageId];
      if (pkg) {
        allTests.push(...pkg.tests);
      }
    });
    
    // Remove duplicates and get test details
    const uniqueTestIds = [...new Set(allTests)];
    return uniqueTestIds.map((testId) => testCatalog.individualTests[testId]).filter(Boolean);
  }, [formState.selectedPackages, testCatalog.testPackages, testCatalog.individualTests]);

  // Get tests to display (from selected packages)
  const allAvailableTests = useMemo(() => {
    return packageTests;
  }, [packageTests]);

  // Filter tests based on search term
  const filteredPackageTests = useMemo(() => {
    if (!testSearchTerm.trim()) return allAvailableTests;
    
    return allAvailableTests.filter((test) => 
      test.name?.toLowerCase().includes(testSearchTerm.toLowerCase()) ||
      test.code?.toLowerCase().includes(testSearchTerm.toLowerCase()) ||
      test.category?.toLowerCase().includes(testSearchTerm.toLowerCase())
    );
  }, [allAvailableTests, testSearchTerm]);

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
      const selectedPackages = formState.selectedPackages.map(id => testCatalog.testPackages[id]).filter(Boolean);
      const primaryPackage = selectedPackages[0];
      
      // Get all unique categories from selected packages
      const categories = [...new Set(selectedPackages.map(pkg => pkg.category))];
      
      // Convert slugified test IDs to actual test codes for LIMS validation
      const actualTestCodes = formState.selectedTests
        .map(testId => {
          const test = testCatalog.individualTests[testId];
          return test ? test.code : testId; // Use actual code or fallback to ID
        })
        .filter(Boolean);
      
      console.log('Submitting order with test codes:', {
        selectedTestIds: formState.selectedTests,
        actualTestCodes,
        testCatalogSample: Object.keys(testCatalog.individualTests).slice(0, 5)
      });
      
      const submissionData = {
        clinical_indication: formState.clinical_indication,
        urgency: formState.urgency,
        requesting_provider: formState.requesting_provider,
        narrative: formState.narrative || `${selectedPackages.map(p => p.name).join(', ')} ordered for ${formState.clinical_indication}`,
        service_name: selectedPackages.map(p => p.name).join(', ') || "Laboratory Tests",
        service_type_code: primaryPackage?.snomedCode || "",
        service_type_value: selectedPackages.map(p => p.name).join(', ') || "",
        target_lab: formState.target_lab,
        test_category: categories.join(', ') || "",
        is_package: selectedPackages.length > 0,
        selected_packages: formState.selectedPackages,
        selected_tests: actualTestCodes, // Use actual test codes instead of slugified IDs
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Laboratory Tests</DialogTitle>
          <DialogDescription>
            Create comprehensive test orders with packages and lab selection
            {patientName && ` for ${patientName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Column 1: Step 1 + Step 2 */}
          <div className="border-r pr-4 space-y-6">
          {/* Step 1: Select Laboratory */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5" />
              <Label className="text-base font-semibold">
                Step 1: Laboratory
              </Label>
            </div>
            <Select
              value={formState.target_lab}
              onValueChange={(value) => {
                dispatch({ type: "SET_FIELD", field: "target_lab", value });
                dispatch({ type: "SET_FIELD", field: "selectedPackage", value: "" });
                dispatch({ type: "SET_FIELD", field: "selectedPackages", value: [] });
                dispatch({ type: "SET_FIELD", field: "selectedTests", value: [] });
                setCurrentStep(2);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a laboratory department" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTests ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Loading laboratories...</span>
                  </div>
                ) : (
                  Object.values(testCatalog.laboratories).map((lab) => (
                    <SelectItem key={lab.id} value={lab.id}>
                      {lab.name}
                    </SelectItem>
                  ))
                )}
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
          <div>
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
                      {formState.selectedPackages.length === 0 ? (
                        <span className="text-muted-foreground">Select test groups...</span>
                      ) : (
                        formState.selectedPackages.map((packageId) => {
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
                                    dispatch({ type: "TOGGLE_PACKAGE", packageId });
                                  }
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  dispatch({ type: "TOGGLE_PACKAGE", packageId });
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
                <PopoverContent className="w-[400px] p-0" align="start">
                  <div className="max-h-96 overflow-y-auto p-1">
                    {isLoadingTests ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm">Loading test packages...</span>
                      </div>
                    ) : availablePackages.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No test groups available for this laboratory.
                      </div>
                    ) : (
                      availablePackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`flex items-start gap-2 p-2 cursor-pointer hover:bg-accent rounded-sm ${
                          formState.selectedPackages.includes(pkg.id) ? 'bg-accent' : ''
                        }`}
                        onClick={() => dispatch({ type: "TOGGLE_PACKAGE", packageId: pkg.id })}
                      >
                        <div className="flex h-5 items-center">
                          <Checkbox
                            checked={formState.selectedPackages.includes(pkg.id)}
                            onCheckedChange={() => dispatch({ type: "TOGGLE_PACKAGE", packageId: pkg.id })}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium leading-none">
                            {pkg.name} <span className="text-xs text-muted-foreground font-normal">• {pkg.tests.length} test{pkg.tests.length > 1 ? 's' : ''}</span>
                          </p>
                        </div>
                      </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {formState.selectedPackages.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-md text-sm">
                  <p className="font-medium text-blue-800">
                    {formState.selectedPackages.length} test group{formState.selectedPackages.length > 1 ? 's' : ''} selected
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    ℹ️ All tests in selected packages are included. Go to Step 3 to deselect single tests.
                  </p>
                  {shouldExpandModal && (
                    <p className="text-xs text-blue-600 mt-1 italic">
                      💡 Modal expanded for better multi-group selection view
                    </p>
                  )}
                </div>
              )}
              </>
            )}
          </div>
          </div>

          {/* Column 2: Step 3 - Review and Customize Tests */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TestTube className="h-5 w-5" />
              <Label className="text-base font-semibold">
                Step 3: Select Single Tests
              </Label>
            </div>
            
            {allAvailableTests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Select test groups first</p>
            ) : (
              <>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  {formState.selectedTests.length} of {allAvailableTests.length} tests selected
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      // Select all tests
                      const allTestIds = allAvailableTests.map(t => t.id);
                      dispatch({ type: "SET_FIELD", field: "selectedTests", value: allTestIds });
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      dispatch({ type: "SET_FIELD", field: "selectedTests", value: [] });
                    }}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              
              {/* Search Bar for Tests */}
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    className="w-full pl-10"
                    placeholder="Search tests by name, code, or category..."
                    value={testSearchTerm}
                    onChange={(e) => setTestSearchTerm(e.target.value)}
                  />
                </div>
                {testSearchTerm && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Showing {filteredPackageTests.length} of {packageTests.length} tests
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto border rounded-md p-3">
                {filteredPackageTests.length === 0 ? (
                  <div className="col-span-3 text-center py-4 text-sm text-muted-foreground">
                    No tests found matching "{testSearchTerm}"
                  </div>
                ) : (
                  filteredPackageTests.map((test, index) => (
                  <div
                    key={`${test.id}-${index}`}
                    className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded border"
                  >
                    <Checkbox
                      checked={formState.selectedTests.includes(test.id)}
                      onCheckedChange={() =>
                        dispatch({ type: "TOGGLE_TEST", testId: test.id })
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate" title={test.name}>{test.name}</p>
                      {test.fastingRequired && (
                        <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 mt-1">
                          Fasting
                        </span>
                      )}
                      <p className="text-[10px] text-gray-500 mt-1 truncate" title={`Code: ${test.code}`}>
                        {test.code}
                      </p>
                    </div>
                  </div>
                  ))
                )}
              </div>
              </>
            )}
          </div>
        </div>

        {/* Full-width sections below the 3-column layout */}
        <div className="space-y-4 mt-6">
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
                formState.selectedTests.length === 0
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? "Submitting..." : "Order Tests"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
