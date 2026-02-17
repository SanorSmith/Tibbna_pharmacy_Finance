"use client";
import React, { useReducer, useMemo, useState, useEffect, useRef, useCallback } from "react";
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

import { Badge } from "@/components/ui/badge";
import { Package, TestTube, Building2, X, ChevronsUpDown, Loader2, Plus, ClipboardList, Trash2 } from "lucide-react";

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
  edit_notes: string;
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
  edit_notes: "",
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
          selectedTests: currentTests,
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
  const [addedTests, setAddedTests] = useState<string[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [packageSearchTerm, setPackageSearchTerm] = useState("");
  const [packageDropdownOpen, setPackageDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [testCatalog, setTestCatalog] = useState<{
    testPackages: Record<string, any>;
    individualTests: Record<string, any>;
    laboratories: Record<string, any>;
  }>({ testPackages: TEST_PACKAGES, individualTests: INDIVIDUAL_TESTS, laboratories: LABORATORIES });

  // Fetch dynamic test catalog from DB when dialog opens
  // In edit mode, merge with static catalog so reverse-matched IDs still resolve
  useEffect(() => {
    if (open && workspaceid) {
      setIsLoadingCatalog(true);
      fetch(`/api/test-catalog?workspaceid=${workspaceid}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.totalTests > 0) {
            if (editMode) {
              // Merge: static catalog first, then dynamic on top — static IDs preserved
              setTestCatalog({
                testPackages: { ...TEST_PACKAGES, ...data.testPackages },
                individualTests: { ...INDIVIDUAL_TESTS, ...data.individualTests },
                laboratories: { ...LABORATORIES, ...data.laboratories },
              });
            } else {
              setTestCatalog({
                testPackages: data.testPackages,
                individualTests: data.individualTests,
                laboratories: data.laboratories,
              });
            }
          }
        })
        .catch(err => console.error("Failed to fetch test catalog, using fallback:", err))
        .finally(() => {
          setIsLoadingCatalog(false);
          setCatalogLoaded(true);
        });
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

  // Helper: resolve a test ID from dynamic catalog first, then static catalog as fallback
  const resolveTest = useCallback((id: string) => {
    return testCatalog.individualTests[id] || INDIVIDUAL_TESTS[id] || null;
  }, [testCatalog.individualTests]);

  // Helper: resolve a package ID from dynamic catalog first, then static catalog as fallback
  const resolvePackage = useCallback((id: string) => {
    return testCatalog.testPackages[id] || TEST_PACKAGES[id] || null;
  }, [testCatalog.testPackages]);

  // In edit mode: resolve packages and tests using dynamic catalog
  // The edit API returns static catalog IDs which may not exist in individualTests,
  // so we find the matching dynamic package by name and use its test IDs instead.
  const editTestsInitialized = useRef(false);
  useEffect(() => {
    if (!editMode || !open) {
      editTestsInitialized.current = false;
      return;
    }
    if (editTestsInitialized.current) return;
    // Wait for dynamic catalog to actually finish loading
    if (!catalogLoaded) return;
    if (!formState.selectedPackages || formState.selectedPackages.length === 0) return;

    const resolvedPackageIds: string[] = [];
    const allTestIds: string[] = [];

    formState.selectedPackages.forEach(pkgId => {
      // Try direct lookup in dynamic catalog first
      let pkg = testCatalog.testPackages[pkgId];
      let resolvedPkgId = pkgId;

      if (!pkg) {
        // Fallback: find by name from static catalog, then match to dynamic catalog
        const staticPkg = TEST_PACKAGES[pkgId];
        if (staticPkg) {
          const dynamicEntry = Object.entries(testCatalog.testPackages).find(
            ([, dp]) => dp.name === staticPkg.name && dp.category === staticPkg.category
          );
          if (dynamicEntry) {
            [resolvedPkgId, pkg] = dynamicEntry;
          }
        }
      }

      if (pkg && pkg.tests) {
        resolvedPackageIds.push(resolvedPkgId);
        pkg.tests.forEach((testId: string) => {
          if (!allTestIds.includes(testId)) allTestIds.push(testId);
        });
      }
    });

    // Filter to only IDs that exist in the catalog
    const validTestIds = allTestIds.filter(id => testCatalog.individualTests[id]);

    if (validTestIds.length > 0 || resolvedPackageIds.length > 0) {
      editTestsInitialized.current = true;
      // Batch all state updates together
      if (resolvedPackageIds.length > 0) {
        dispatch({ type: "SET_FIELD", field: "selectedPackages", value: resolvedPackageIds });
      }
      dispatch({ type: "SET_FIELD", field: "selectedTests", value: validTestIds });
      setAddedTests(validTestIds);
    }
  }, [editMode, open, catalogLoaded, formState.selectedPackages, testCatalog.testPackages, testCatalog.individualTests]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setPackageDropdownOpen(false);
      }
    };

    if (packageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [packageDropdownOpen]);

  // Clear search term and added tests when form is reset
  useEffect(() => {
    if (!open) {
      setPackageSearchTerm("");
      setAddedTests([]);
    }
  }, [open]);

  // Get lab category mapping
  const getLabCategory = (labId: string): string => {
    const lab = testCatalog.laboratories[labId];
    if (lab) return lab.name;
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
        const pkg = resolvePackage(pkgId);
        if (pkg) {
          pkg.tests.forEach((testId: string) => testIds.add(testId));
        }
      });
    }
    
    // Add individually selected tests
    if (formState.selectedTests && formState.selectedTests.length > 0) {
      formState.selectedTests.forEach((testId: string) => testIds.add(testId));
    }
    
    return Array.from(testIds).map(id => resolveTest(id)).filter(Boolean);
  }, [formState.selectedPackages, formState.selectedTests, resolvePackage, resolveTest]);

  // Handle adding selected tests to the added list
  const handleAddTests = () => {
    const newTests = formState.selectedTests.filter(id => !addedTests.includes(id));
    if (newTests.length === 0) return;
    setAddedTests(prev => [...prev, ...newTests]);
    // Clear selections after adding
    dispatch({ type: "SET_FIELD", field: "selectedTests", value: [] });
  };

  // Remove a test from the added list
  const handleRemoveAddedTest = (testId: string) => {
    setAddedTests(prev => prev.filter(id => id !== testId));
  };

  // Get added test objects
  const addedTestObjects = useMemo(() => {
    return addedTests.map(id => resolveTest(id)).filter(Boolean);
  }, [addedTests, resolveTest]);

  const handleSubmit = async () => {
    if (!formState.clinical_indication) {
      alert("Please fill in clinical indication");
      return;
    }

    if (editMode && !formState.edit_notes) {
      alert("Please provide a reason for editing this order");
      return;
    }

    if (addedTests.length === 0) {
      alert("Please add at least one test");
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
      
      // Get all unique categories from selected packages
      const allCategories = [...new Set(selectedPackageObjects.map(pkg => pkg.category).filter(Boolean))];
      const testCategory = allCategories.join(", ") || "";
      
      const labCategory = getLabCategory(formState.target_lab);
      const selectedLab = testCatalog.laboratories[formState.target_lab];
      
      // Build detailed description with test information
      const selectedTestDetails = addedTests
        .map(testId => testCatalog.individualTests[testId])
        .filter(Boolean);
      
      const testNames = selectedTestDetails.map(test => test.name).join(", ");
      
      // Build per-group test mapping using ALL catalog packages (not just selected ones)
      const groupTestMap: Record<string, string[]> = {};
      const assignedTestIds = new Set<string>();
      
      // Check every package in the catalog to find which group each added test belongs to
      // Also collect specimen info (sampleType + containerType) per group from individual tests
      const groupSpecimenMap: Record<string, string> = {};
      Object.values(testCatalog.testPackages).forEach((pkg: any) => {
        const groupName = pkg.name;
        const groupTests = (pkg.tests || [])
          .filter((tid: string) => addedTests.includes(tid))
          .map((tid: string) => {
            assignedTestIds.add(tid);
            return testCatalog.individualTests[tid]?.name;
          })
          .filter(Boolean);
        if (groupTests.length > 0) {
          groupTestMap[groupName] = groupTests;
          // Collect unique specimen info for this group
          const specimens = new Set<string>();
          (pkg.tests || [])
            .filter((tid: string) => addedTests.includes(tid))
            .forEach((tid: string) => {
              const t = testCatalog.individualTests[tid];
              if (t) {
                const parts: string[] = [];
                if (t.sampleType) parts.push(t.sampleType);
                if (t.containerType) parts.push(t.containerType);
                if (parts.length > 0) specimens.add(parts.join(" / "));
              }
            });
          if (specimens.size > 0) {
            groupSpecimenMap[groupName] = [...specimens].join(", ");
          }
        }
      });
      // Add tests not found in any package as "Individual Tests"
      const individualOnly = addedTests.filter(tid => !assignedTestIds.has(tid));
      if (individualOnly.length > 0) {
        const indivNames = individualOnly.map(tid => testCatalog.individualTests[tid]?.name).filter(Boolean);
        if (indivNames.length > 0) {
          groupTestMap["Individual Tests"] = indivNames;
          // Collect specimen info for individual tests
          const specimens = new Set<string>();
          individualOnly.forEach((tid: string) => {
            const t = testCatalog.individualTests[tid];
            if (t) {
              const parts: string[] = [];
              if (t.sampleType) parts.push(t.sampleType);
              if (t.containerType) parts.push(t.containerType);
              if (parts.length > 0) specimens.add(parts.join(" / "));
            }
          });
          if (specimens.size > 0) {
            groupSpecimenMap["Individual Tests"] = [...specimens].join(", ");
          }
        }
      }
      const groupedTestsStr = Object.entries(groupTestMap)
        .map(([group, tests]) => `${group}[${tests.join(", ")}]`)
        .join("; ");
      // Encode per-group specimen info
      const groupSpecimensStr = Object.entries(groupSpecimenMap)
        .map(([group, spec]) => `${group}{${spec}}`)
        .join("; ");
      
      // Use all group names from groupTestMap (excluding "Individual Tests") for package names
      const allGroupNames = Object.keys(groupTestMap).filter(g => g !== "Individual Tests");
      const allPackageNames = allGroupNames.length > 0 ? allGroupNames.join(", ") : packageNames;
      
      // Build specimen info string
      const specimenParts: string[] = [];
      if (formState.sampleType) specimenParts.push(formState.sampleType);
      if (formState.containerType) specimenParts.push(formState.containerType);
      if (formState.volume) specimenParts.push(`${formState.volume}${formState.volumeUnit ? ' ' + formState.volumeUnit : ''}`);
      const specimenInfo = specimenParts.length > 0 ? specimenParts.join(" / ") : "";
      
      const description = `Test Group${allGroupNames.length > 1 ? 's' : ''}: ${allPackageNames} | Category: ${testCategory} | Laboratory: ${selectedLab?.name || labCategory} | Selected Tests (${selectedTestDetails.length}): ${testNames} | Grouped Tests: ${groupedTestsStr} | Group Specimens: ${groupSpecimensStr} | Specimen: ${specimenInfo} | Urgency: ${formState.urgency}`;
      
      const submissionData = {
        clinical_indication: formState.clinical_indication,
        urgency: formState.urgency,
        requesting_provider: formState.requesting_provider,
        receiving_provider: selectedLab?.name || labCategory,
        narrative: formState.narrative || `${allPackageNames || "Laboratory tests"} ordered for ${formState.clinical_indication}`,
        service_name: allPackageNames || "Laboratory Tests",
        service_type_code: selectedPackageObjects.map(pkg => pkg.snomedCode).filter(Boolean).join(","),
        service_type_value: "Test Group",
        description: description,
        target_lab: selectedLab?.name || labCategory,
        test_category: testCategory,
        is_package: true,
        selected_packages: formState.selectedPackages || [],
        selected_tests: addedTests,
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
      setAddedTests([]);
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
        className={`max-w-[80vw] h-[85vh] ${packageDropdownOpen ? 'overflow-hidden' : 'overflow-y-auto'}`}
        onInteractOutside={(e) => { if (editMode) e.preventDefault(); }}
        onPointerDownOutside={(e) => { if (editMode) e.preventDefault(); }}
      >
        <DialogHeader className="pb-2">
          {formState.target_lab && testCatalog.laboratories[formState.target_lab] ? (
            <div>
              <DialogTitle className="text-xl">{testCatalog.laboratories[formState.target_lab].name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{testCatalog.laboratories[formState.target_lab].address}</p>
              {patientName && (
                <p className="text-sm text-muted-foreground">for {patientName}</p>
              )}
            </div>
          ) : (
            <DialogTitle>{editMode ? "Edit Laboratory Test Order" : "Order Laboratory Tests"}</DialogTitle>
          )}
        </DialogHeader>

        <div className="grid gap-4 py-2" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
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
              onValueChange={(value: string) => {
                dispatch({ type: "SET_FIELD", field: "target_lab", value });
                dispatch({ type: "SET_FIELD", field: "selectedPackages", value: [] });
                dispatch({ type: "SET_FIELD", field: "selectedTests", value: [] });
                setAddedTests([]);
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
          </div>

          {/* Step 2: Select Test Groups (Multiple Selection) */}
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
              <div className="relative" ref={dropdownRef}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between h-auto min-h-[40px]"
                  onClick={() => setPackageDropdownOpen(!packageDropdownOpen)}
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

                {packageDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
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
                    <div className="max-h-[400px] overflow-y-auto p-1">
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
                              className={`flex items-start gap-2 p-2 rounded-sm cursor-pointer hover:bg-accent ${
                                isSelected ? 'bg-accent' : ''
                              }`}
                              onClick={() => togglePackage(pkg.id)}
                            >
                              <div className="flex h-5 items-center">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => togglePackage(pkg.id)}
                                  className="cursor-pointer"
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
                  </div>
                )}
              </div>

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
          </div>

          {/* Column 2: Step 3 */}
          <div>
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
              <div className="grid grid-cols-2 gap-2 max-h-68 overflow-y-auto border rounded-md p-3">
                {allSelectedTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded border"
                  >
                    <div className="flex h-5 items-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={formState.selectedTests.includes(test.id)}
                        onCheckedChange={() =>
                          dispatch({ type: "TOGGLE_TEST", testId: test.id })
                        }
                        className="cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => dispatch({ type: "TOGGLE_TEST", testId: test.id })}>
                      <p className="font-medium text-[11px] leading-tight break-words" title={test.name}>{test.name}</p>
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

              {/* ADD Button */}
              <Button
                type="button"
                onClick={handleAddTests}
                disabled={formState.selectedTests.length === 0}
                className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add {formState.selectedTests.length} Test{formState.selectedTests.length !== 1 ? 's' : ''}
              </Button>
              </>
            )}
          </div>

          {/* Column 3: Added Tests */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                <Label className="text-base font-semibold">
                  Order Summary
                </Label>
              </div>
              {addedTests.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddedTests([])}
                  className="text-xs h-7 px-2 text-red-600 hover:text-red-700"
                >
                  Clear All
                </Button>
              )}
            </div>

            {addedTests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Select tests in Step 3 and click Add</p>
            ) : (
              <>
              <div className="mb-3">
                <p className="text-sm font-medium text-green-700">
                  {addedTests.length} test{addedTests.length !== 1 ? 's' : ''} added to order
                </p>
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto border rounded-md p-3">
                {addedTestObjects.map((test, index) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs" title={test.name}>{index + 1}. {test.name}</p>
                      <p className="text-[10px] text-gray-500" title={`Code: ${test.code}`}>
                        {test.code}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAddedTest(test.id)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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
          {addedTests.length > 0 && addedTestObjects.some(t => t.fastingRequired) && (
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
          {addedTests.length > 0 && (
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

              {editMode && (
                <div className="space-y-2">
                  <Label htmlFor="edit_notes" className="text-sm">
                    Edit Notes {editMode && <span className="text-red-500">*</span>}
                  </Label>
                  <Textarea
                    id="edit_notes"
                    placeholder="Reason for editing this order (required)"
                    value={formState.edit_notes}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_FIELD",
                        field: "edit_notes",
                        value: e.target.value,
                      })
                    }
                    className="min-h-[60px] text-sm"
                    rows={2}
                  />
                </div>
              )}
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
          {addedTests.length > 0 && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !formState.clinical_indication ||
                addedTests.length === 0
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
