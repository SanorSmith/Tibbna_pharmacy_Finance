/**
 * Results Entry Form Component
 * 
 * Allows lab technicians to enter test results for samples
 * Features normal range checking, validation, and quality control
 */

"use client";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FlaskConical, Save, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface TestResult {
  resultid?: string;
  testcode: string;
  testname: string;
  resultvalue: string;
  resultnumeric?: number;
  unit?: string;
  referencemin?: number;
  referencemax?: number;
  referencerange?: string;
  paniclow?: number;
  panichigh?: number;
  flag?: string;
  isabormal?: boolean;
  iscritical?: boolean;
  interpretation?: string;
  comment?: string;
  techniciannotes?: string;
  status?: string;
}

interface Sample {
  sampleid: string;
  accessionnumber: string;
  sampletype: string;
  tests?: string[];
  patientid?: string;
  patientname?: string;
  patientage?: number;
  patientsex?: string;
  patientdateofbirth?: string;
}

interface ResultsEntryFormProps {
  workspaceid: string;
  worklistid?: string;
  sampleid?: string;
  onResultSaved?: () => void;
}

export default function ResultsEntryForm({ 
  workspaceid, 
  worklistid, 
  sampleid,
  onResultSaved 
}: ResultsEntryFormProps) {
  const queryClient = useQueryClient();
  const [worklists, setWorklists] = useState<Array<{ worklistid: string; worklistname: string; status: string; priority: string; laboratory: string }>>([]);
  const [selectedWorklistId, setSelectedWorklistId] = useState<string | null>(worklistid || null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [patientDemographics, setPatientDemographics] = useState<{
    age?: number;
    sex?: string;
    agegroup?: string;
  } | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");

  // Fetch worklists on mount if no worklistid or sampleid provided
  useEffect(() => {
    if (!sampleid && !worklistid) {
      fetchWorklists();
    }
  }, []);

  // Fetch samples from worklist or specific sample
  useEffect(() => {
    if (sampleid) {
      fetchSample(sampleid);
    } else if (selectedWorklistId) {
      fetchWorklistSamples(selectedWorklistId);
    }
  }, [selectedWorklistId, sampleid]);

  const fetchWorklists = async () => {
    try {
      const response = await fetch(`/api/d/${workspaceid}/worklists`);
      if (response.ok) {
        const data = await response.json();
        // Filter out completed worklists - only show pending/in-progress worklists
        const activeWorklists = (data.worklists || []).filter(
          (worklist: { worklistid: string; worklistname: string; status: string; priority: string; laboratory: string }) => worklist.status !== 'COMPLETED'
        );
        setWorklists(activeWorklists);
      }
    } catch (error) {
      console.error("Error fetching worklists:", error);
    }
  };

  const handleWorklistSelect = (worklistId: string) => {
    setSelectedWorklistId(worklistId);
    setSelectedSample(null);
    setResults([]);
  };

  const fetchSample = async (id: string) => {
    try {
      const response = await fetch(`/api/d/${workspaceid}/accession-samples/${id}`);
      if (response.ok) {
        const data = await response.json();
        const sample = data.sample;
        
        // Extract patient demographics
        let demographics = { agegroup: 'ALL', sex: 'ANY', age: undefined };
        if (sample.patientage !== undefined || sample.patientsex) {
          const age = sample.patientage;
          // Handle various gender formats: "male"/"female", "MALE"/"FEMALE", "M"/"F"
          const genderUpper = sample.patientsex?.toUpperCase() || '';
          const sex = genderUpper === 'MALE' || genderUpper === 'M' ? 'M' : 
                      genderUpper === 'FEMALE' || genderUpper === 'F' ? 'F' : 'ANY';
          const agegroup = calculateAgeGroup(age);
          
          demographics = { age, sex, agegroup };
          setPatientDemographics(demographics);
          console.log(`Patient demographics: Age ${age} (${agegroup}), Sex: ${sex}, Gender: ${sample.patientsex}`);
        } else {
          setPatientDemographics(demographics);
        }
        
        setSamples([sample]);
        setSelectedSample(sample);
        initializeResults(sample, demographics);
      }
    } catch (error) {
      console.error("Error fetching sample:", error);
    }
  };

  const fetchWorklistSamples = async (id: string) => {
    try {
      const response = await fetch(`/api/d/${workspaceid}/worklists/${id}/samples`);
      if (response.ok) {
        const data = await response.json();
        setSamples(data.samples || []);
      }
    } catch (error) {
      console.error("Error fetching worklist samples:", error);
    }
  };

  // CBC Panel Components Mapping
  const CBC_COMPONENTS = ["HGB", "RBC", "WBC", "HCT", "MCV", "MCH", "MCHC", "PLT", "RDW"];
  
  // Expand panel tests into individual components
  const expandPanelTests = (tests: string[]): string[] => {
    const expanded: string[] = [];
    
    tests.forEach(test => {
      const testUpper = test.toUpperCase();
      // Check for CBC in various formats
      if (testUpper === "CBC" || 
          testUpper === "COMPLETE BLOOD COUNT" || 
          testUpper.includes("COMPLETE BLOOD COUNT") ||
          testUpper.includes("CBC")) {
        // Expand CBC into its components
        expanded.push(...CBC_COMPONENTS);
      } else {
        expanded.push(test);
      }
    });
    
    return expanded;
  };

  const initializeResults = async (sample: Sample, demographics?: { age?: number; sex?: string; agegroup?: string }) => {
    setLoading(true);
    try {
      // Use provided demographics or fall back to state
      const demoToUse = demographics || patientDemographics || { agegroup: 'ALL', sex: 'ANY' };
      console.log("Initializing results with demographics:", demoToUse);
      
      // Parse tests if it's a JSON string
      let tests = sample.tests;
      if (typeof tests === 'string') {
        try {
          tests = JSON.parse(tests);
        } catch (e) {
          console.error("Failed to parse tests JSON:", e);
          tests = [];
        }
      }
      
      // Initialize result entries for each test
      if (tests && Array.isArray(tests) && tests.length > 0) {
        console.log("Original tests:", tests);
        
        // Expand panel tests (like CBC) into individual components
        const expandedTests = expandPanelTests(tests);
        console.log("Expanded tests:", expandedTests);
        
        // Enrich each test with reference data using the demographics
        const enrichedTests = await Promise.all(
          expandedTests.map(async (test) => {
            const baseTest = {
              testcode: test,
              testname: test,
              resultvalue: "",
              unit: "",
              referencerange: "",
              comment: "",
              techniciannotes: "",
            };
            
            // Enrich with reference data using provided demographics
            return await enrichTestWithReferenceData(baseTest, demoToUse);
          })
        );
        
        console.log("Enriched tests:", enrichedTests);
        setResults(enrichedTests);
      } else {
        // If no tests, initialize with one empty row for manual entry
        setResults([{
          testcode: "",
          testname: "",
          resultvalue: "",
          unit: "",
          referencerange: "",
          comment: "",
          techniciannotes: "",
        }]);
      }
    } catch (error) {
      console.error("Error initializing results:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate age group from age
  const calculateAgeGroup = (age?: number): string => {
    if (!age) return "ALL";
    if (age <= 0.077) return "NEO"; // 0-28 days (28/365 = 0.077 years)
    if (age < 18) return "PED";
    return "ADULT";
  };

  // Helper function to auto-flag results based on reference and panic values
  const autoFlagResult = (value: number, refData: { min: number; max: number; criticalLow?: number; criticalHigh?: number } | null) => {
    const flags: any = {
      flag: "normal",
      isabormal: false,
      iscritical: false,
      interpretation: "Normal",
    };

    if (!refData) return flags;

    const { min, max, criticalLow, criticalHigh } = refData;

    // Check panic/critical values first
    if (criticalLow !== undefined && value <= criticalLow) {
      flags.flag = "LL";
      flags.isabormal = true;
      flags.iscritical = true;
      flags.interpretation = "Critically Low";
    } else if (criticalHigh !== undefined && value >= criticalHigh) {
      flags.flag = "HH";
      flags.isabormal = true;
      flags.iscritical = true;
      flags.interpretation = "Critically High";
    } else if (min !== undefined && value < min) {
      flags.flag = "L";
      flags.isabormal = true;
      flags.interpretation = "Low";
    } else if (max !== undefined && value > max) {
      flags.flag = "H";
      flags.isabormal = true;
      flags.interpretation = "High";
    }

    return flags;
  };

  // Cache for reference data to avoid repeated API calls
  const referenceDataCache = new Map<string, any>();

  const enrichTestWithReferenceData = async (test: any, demographics?: { age?: number; sex?: string; agegroup?: string }) => {
    try {
      const testcode = test.testcode || "";
      if (!testcode) {
        console.log("No test code provided for test:", test);
        return test;
      }

      // Use provided demographics or fall back to state
      const demoToUse = demographics || patientDemographics || { agegroup: 'ALL', sex: 'ANY' };
      const agegroup = demoToUse.agegroup || "ALL";
      const sex = demoToUse.sex || "ANY";

      // Check cache first
      const cacheKey = `${testcode}-${agegroup}-${sex}`;
      if (referenceDataCache.has(cacheKey)) {
        const cachedData = referenceDataCache.get(cacheKey);
        console.log(`Using cached reference data for ${testcode}`);
        
        if (cachedData) {
          return {
            testcode: test.testcode || testcode,
            testname: test.testname || cachedData.testname || testcode,
            resultvalue: "",
            unit: cachedData.unit || "",
            referencemin: cachedData.referencemin,
            referencemax: cachedData.referencemax,
            referencerange: cachedData.referencerange || "",
            paniclow: cachedData.paniclow,
            panichigh: cachedData.panichigh,
            comment: "",
            techniciannotes: "",
          };
        }
      }

      console.log(`Fetching reference data for ${testcode} (Age: ${agegroup}, Sex: ${sex})`);
      
      // Try different combinations in order of specificity
      const attempts = [
        { agegroup, sex, label: `${agegroup}/${sex}` },
        { agegroup: "ALL", sex, label: `ALL/${sex}` },
        { agegroup, sex: "ANY", label: `${agegroup}/ANY` },
        { agegroup: "ALL", sex: "ANY", label: "ALL/ANY" },
      ];

      let refData = null;
      
      for (const attempt of attempts) {
        try {
          console.log(`Trying ${testcode} with ${attempt.label}...`);
          const response = await fetch(
            `/api/d/${workspaceid}/test-reference?testcode=${testcode}&agegroup=${attempt.agegroup}&sex=${attempt.sex}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.referenceData) {
              refData = data.referenceData;
              console.log(`✓ Reference data found for ${testcode} with ${attempt.label}:`, refData);
              // Cache the result
              referenceDataCache.set(cacheKey, refData);
              break;
            } else {
              console.log(`✗ No data for ${testcode} with ${attempt.label}`);
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch with ${attempt.label}:`, err);
        }
      }
      
      // Cache null result to avoid repeated failed lookups
      if (!refData) {
        referenceDataCache.set(cacheKey, null);
        console.warn(`No reference data found for ${testcode}`);
      }
      
      if (refData) {
        const enrichedTest = {
          testcode: test.testcode || testcode,
          testname: test.testname || refData.testname || testcode,
          resultvalue: "",
          unit: refData.unit || "",
          referencemin: refData.referencemin,
          referencemax: refData.referencemax,
          referencerange: refData.referencerange || "",
          paniclow: refData.paniclow,
          panichigh: refData.panichigh,
          comment: "",
          techniciannotes: "",
        };
        
        console.log("Enriched test:", enrichedTest);
        return enrichedTest;
      }
    } catch (error) {
      console.error("Error fetching reference data for", test.testcode, ":", error);
    }
    
    // Return test without enrichment if fetch fails
    console.log("Returning test without enrichment:", test);
    return {
      testcode: test.testcode || "",
      testname: test.testname || "",
      resultvalue: "",
      unit: "",
      referencemin: undefined,
      referencemax: undefined,
      referencerange: "",
      comment: "",
      techniciannotes: "",
    };
  };

  const handleSampleSelect = async (sample: Sample) => {
    setLoading(true);
    
    // Initialize demographics at function level so it's accessible in error handlers
    let demographics = { agegroup: 'ALL', sex: 'ANY', age: undefined };
    
    try {
      // Fetch the sample details to get the orderid and patient demographics
      const sampleResponse = await fetch(`/api/d/${workspaceid}/accession-samples/${sample.sampleid}`);
      if (sampleResponse.ok) {
        const sampleData = await sampleResponse.json();
        const sampleWithOrder = sampleData.sample;
        
        // Update selected sample with full data including patient name
        setSelectedSample(sampleWithOrder);
        
        // Extract patient demographics
        if (sampleWithOrder.patientage !== undefined || sampleWithOrder.patientsex) {
          const age = sampleWithOrder.patientage;
          // Handle various gender formats: "male"/"female", "MALE"/"FEMALE", "M"/"F"
          const genderUpper = sampleWithOrder.patientsex?.toUpperCase() || '';
          const sex = genderUpper === 'MALE' || genderUpper === 'M' ? 'M' : 
                      genderUpper === 'FEMALE' || genderUpper === 'F' ? 'F' : 'ANY';
          const agegroup = calculateAgeGroup(age);
          
          demographics = { age, sex, agegroup };
          setPatientDemographics(demographics);
          console.log(`Patient demographics: Age ${age} (${agegroup}), Sex: ${sex}, Name: ${sampleWithOrder.patientname}`);
        } else {
          setPatientDemographics(demographics);
        }
        
        // If the sample has an orderid, fetch the order to get tests
        if (sampleWithOrder.orderid) {
          const orderResponse = await fetch(`/api/d/${workspaceid}/lims-orders/${sampleWithOrder.orderid}`);
          if (orderResponse.ok) {
            const orderData = await orderResponse.json();
            const orderTests = orderData.order?.tests || [];
            
            // Initialize results with test details from the order and enrich with reference data
            if (orderTests.length > 0) {
              console.log("Order tests:", orderTests);
              
              // Extract test codes from order tests
              const testCodes = orderTests.map((test: any) => test.testcode || test);
              
              // Expand panel tests (like CBC)
              const expandedTests = expandPanelTests(testCodes);
              console.log("Expanded tests:", expandedTests);
              
              // Enrich with reference data
              const enrichedTests = await Promise.all(
                expandedTests.map(async (testCode: string) => {
                  const baseTest = {
                    testcode: testCode,
                    testname: testCode,
                    resultvalue: "",
                    unit: "",
                    referencerange: "",
                    comment: "",
                    techniciannotes: "",
                  };
                  return await enrichTestWithReferenceData(baseTest);
                })
              );
              
              console.log("Enriched tests:", enrichedTests);
              setResults(enrichedTests);
            } else {
              // No tests in order, initialize with one empty row
              initializeResults(sampleWithOrder, demographics);
            }
          } else {
            // Failed to fetch order, initialize with empty row
            initializeResults(sampleWithOrder, demographics);
          }
        } else if (sampleWithOrder.openehrrequestid || sampleWithOrder.tests) {
          // OpenEHR order or sample with tests - use sample.tests directly
          console.log("OpenEHR order or sample with tests, using sample.tests:", sampleWithOrder.tests);
          initializeResults(sampleWithOrder, demographics);
        } else {
          // No orderid or tests, initialize with empty row
          initializeResults(sampleWithOrder, demographics);
        }
      } else {
        // Failed to fetch sample, initialize with empty row
        initializeResults(sample, demographics);
      }
    } catch (error) {
      console.error("Error fetching sample tests:", error);
      // On error, initialize with empty row
      initializeResults(sample, demographics);
    } finally {
      setLoading(false);
    }
  };

  const handleResultChange = (index: number, field: keyof TestResult, value: string | number) => {
    const newResults = [...results];
    newResults[index] = { ...newResults[index], [field]: value };

    // Auto-calculate flags if numeric value and reference range provided
    if (field === "resultvalue" || field === "resultnumeric") {
      const result = newResults[index];
      const numericValue = field === "resultnumeric" ? value as number : parseFloat(value as string);
      
      if (!isNaN(numericValue) && result.referencemin !== undefined && result.referencemax !== undefined) {
        const min = result.referencemin;
        const max = result.referencemax;
        const panicLow = result.paniclow;
        const panicHigh = result.panichigh;
        
        // Check panic/critical values first
        if (panicLow !== undefined && numericValue <= panicLow) {
          newResults[index].flag = "LL";
          newResults[index].isabormal = true;
          newResults[index].iscritical = true;
          newResults[index].interpretation = "Critically Low";
        } else if (panicHigh !== undefined && numericValue >= panicHigh) {
          newResults[index].flag = "HH";
          newResults[index].isabormal = true;
          newResults[index].iscritical = true;
          newResults[index].interpretation = "Critically High";
        } else if (numericValue < min) {
          newResults[index].flag = "L";
          newResults[index].isabormal = true;
          newResults[index].iscritical = false;
          newResults[index].interpretation = "Low";
        } else if (numericValue > max) {
          newResults[index].flag = "H";
          newResults[index].isabormal = true;
          newResults[index].iscritical = false;
          newResults[index].interpretation = "High";
        } else {
          newResults[index].flag = "normal";
          newResults[index].isabormal = false;
          newResults[index].iscritical = false;
          newResults[index].interpretation = "Normal";
        }
        
        // Update resultnumeric if we're changing resultvalue
        if (field === "resultvalue") {
          newResults[index].resultnumeric = numericValue;
        }
      }
    }

    setResults(newResults);
  };

  const checkAndUpdateWorklistStatus = async () => {
    if (!worklistid) return;

    try {
      // Check if all samples in the worklist have results
      const worklistResponse = await fetch(`/api/d/${workspaceid}/worklists/${worklistid}/samples`);
      if (!worklistResponse.ok) return;

      const worklistData = await worklistResponse.json();
      const worklistSamples = worklistData.samples || [];

      // Check if all samples have results entered
      let allSamplesComplete = true;
      for (const sample of worklistSamples) {
        const resultsResponse = await fetch(`/api/d/${workspaceid}/test-results?sampleid=${sample.sampleid}`);
        if (resultsResponse.ok) {
          const resultsData = await resultsResponse.json();
          const sampleResults = resultsData.results || [];
          
          // If sample has no results, it's not complete
          if (sampleResults.length === 0) {
            allSamplesComplete = false;
            break;
          }
        } else {
          allSamplesComplete = false;
          break;
        }
      }

      // If all samples are complete, update worklist status
      if (allSamplesComplete && worklistSamples.length > 0) {
        await fetch(`/api/d/${workspaceid}/worklists/${worklistid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "completed",
          }),
        });
      }
    } catch (error) {
      console.error("Error checking worklist status:", error);
    }
  };

  const handleSaveResults = async () => {
    if (!selectedSample) {
      setAlertMessage("Please select a sample first");
      setAlertType("error");
      setShowAlert(true);
      return;
    }

    console.log("All results before validation:", results);

    // Validate that all results have values
    const emptyResults = results.filter(r => {
      const hasValue = r.resultvalue !== undefined && r.resultvalue !== null && r.resultvalue.toString().trim() !== "";
      console.log(`Test: ${r.testname}, resultvalue: "${r.resultvalue}", hasValue: ${hasValue}`);
      return !hasValue;
    });
    if (emptyResults.length > 0) {
      console.log("Empty results found:", emptyResults);
      setAlertMessage(`Please enter values for all tests. Missing values for: ${emptyResults.map(r => r.testname).join(", ")}`);
      setAlertType("error");
      setShowAlert(true);
      return;
    }

    // Validate that all results have test names
    const missingTestNames = results.filter(r => !r.testname || r.testname.trim() === "");
    if (missingTestNames.length > 0) {
      setAlertMessage("Please enter test names for all results");
      setAlertType("error");
      setShowAlert(true);
      return;
    }

    setLoading(true);
    try {
      const savePromises = results.map(async (result) => {
        const response = await fetch(`/api/d/${workspaceid}/test-results`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sampleid: selectedSample.sampleid,
            worklistid: worklistid,
            testcode: result.testcode,
            testname: result.testname,
            resultvalue: result.resultvalue,
            resultnumeric: result.resultnumeric,
            unit: result.unit,
            referencemin: result.referencemin,
            referencemax: result.referencemax,
            referencerange: result.referencerange,
            flag: result.flag,
            isabormal: result.isabormal,
            iscritical: result.iscritical,
            interpretation: result.interpretation,
            comment: result.comment,
            techniciannotes: result.techniciannotes,
            entrymethod: "manual",
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save result for ${result.testname}`);
        }
        return response.json();
      });

      await Promise.all(savePromises);
      
      // Check and update worklist status if all samples are complete
      await checkAndUpdateWorklistStatus();
      
      // Invalidate React Query caches to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['worklists', workspaceid] });
      queryClient.invalidateQueries({ queryKey: ['worklist-items'] });
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['validation-samples'] });
      
      setAlertMessage("Results saved successfully!");
      setAlertType("success");
      setShowAlert(true);
      
      // Reset form
      setResults([]);
      setSelectedSample(null);
      
      if (onResultSaved) {
        onResultSaved();
      }
    } catch (error) {
      console.error("Error saving results:", error);
      setAlertMessage("Failed to save results. Please try again.");
      setAlertType("error");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (flag?: string, iscritical?: boolean, interpretation?: string) => {
    if (!flag) return null;
    
    if (flag === "LL") {
      return (
        <Badge className="bg-red-600 text-white font-semibold flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {interpretation || "Critically Low"}
        </Badge>
      );
    }
    if (flag === "HH") {
      return (
        <Badge className="bg-red-600 text-white font-semibold flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {interpretation || "Critically High"}
        </Badge>
      );
    }
    if (flag === "L") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 font-medium">
          {interpretation || "Low"}
        </Badge>
      );
    }
    if (flag === "H") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 font-medium">
          {interpretation || "High"}
        </Badge>
      );
    }
    if (flag === "normal") {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Normal
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Results Entry
          </h3>
          <p className="text-sm text-muted-foreground">
            Enter test results for samples
          </p>
        </div>
      </div>

      {/* Worklist Selection */}
      {!sampleid && !worklistid && !selectedWorklistId && worklists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Worklist</CardTitle>
            <CardDescription>Choose a worklist to enter results for its samples</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {worklists.map((worklist) => (
                <Button
                  key={worklist.worklistid}
                  variant="outline"
                  onClick={() => handleWorklistSelect(worklist.worklistid)}
                  className="justify-start"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">{worklist.worklistname}</span>
                    <span className="text-xs text-muted-foreground">
                      {worklist.laboratory} - {worklist.status}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Worklists Message */}
      {!sampleid && !worklistid && !selectedWorklistId && worklists.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No Worklists Available</p>
              <p className="text-sm mt-2">
                Create a worklist and add samples to it first, then you can enter results here.
              </p>
              <p className="text-sm mt-1">
                Go to the <strong>Work-list</strong> tab to create and manage worklists.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Selection */}
      {!sampleid && selectedWorklistId && samples.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Sample</CardTitle>
            <CardDescription>Choose a sample to enter results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {samples.map((sample) => (
                <Button
                  key={sample.sampleid}
                  variant={selectedSample?.sampleid === sample.sampleid ? "default" : "outline"}
                  onClick={() => handleSampleSelect(sample)}
                  className="justify-start"
                >
                  {sample.accessionnumber} - {sample.sampletype}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50 animate-pulse" />
              <p className="text-lg font-medium">Loading test information...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Test Button */}
      {selectedSample && !loading && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => setResults([...results, {
              testcode: "",
              testname: "",
              resultvalue: "",
              unit: "",
              referencerange: "",
              comment: "",
              techniciannotes: "",
            }])}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            + Add Test
          </Button>
        </div>
      )}

      {/* Results Entry Form */}
      {selectedSample && !loading && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Enter Results - {selectedSample.accessionnumber}
            </CardTitle>
            <CardDescription className="flex items-center gap-4 flex-wrap">
              <span>Sample Type: {selectedSample.sampletype}</span>
              {patientDemographics && patientDemographics.age !== undefined && patientDemographics.sex !== 'ANY' ? (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="font-medium">
                    {selectedSample.patientname && <span className="text-blue-600">{selectedSample.patientname} - </span>}
                    {patientDemographics.age} yrs, {patientDemographics.sex === 'M' ? 'Male' : patientDemographics.sex === 'F' ? 'Female' : patientDemographics.sex}
                  </span>
                  <Badge variant="secondary" className="text-xs font-medium">
                    Using {patientDemographics.agegroup === 'NEO' ? 'Neonatal' : patientDemographics.agegroup === 'PED' ? 'Pediatric' : patientDemographics.agegroup === 'ADULT' ? 'Adult' : 'General'}/{patientDemographics.sex === 'M' ? 'Male' : patientDemographics.sex === 'F' ? 'Female' : 'Any'} ranges
                  </Badge>
                </>
              ) : (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-muted-foreground">
                    {selectedSample.patientname && <span className="font-medium text-blue-600">{selectedSample.patientname} - </span>}
                    Patient demographics not available
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Using general reference ranges
                  </Badge>
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Result Value</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Reference Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {result.testcode ? (
                        <div className="font-medium">{result.testname}</div>
                      ) : (
                        <Input
                          type="text"
                          value={result.testname}
                          onChange={(e) => {
                            handleResultChange(index, "testname", e.target.value);
                            handleResultChange(index, "testcode", e.target.value);
                          }}
                          placeholder="Test name"
                          className="w-40 font-medium"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {/* Check if unit indicates descriptive test */}
                      {result.unit && result.unit.toLowerCase() === 'descriptive' ? (
                        <textarea
                          value={result.resultvalue || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            const newResults = [...results];
                            newResults[index] = { 
                              ...newResults[index], 
                              resultvalue: value,
                              resultnumeric: undefined,
                              flag: 'normal',
                              isabormal: false,
                              iscritical: false,
                            };
                            setResults(newResults);
                          }}
                          placeholder="Enter description"
                          rows={2}
                          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        />
                      ) : result.unit && (
                        result.unit.toLowerCase().includes('present') || 
                        result.unit.toLowerCase().includes('absent') ||
                        result.unit.toLowerCase().includes('positive') ||
                        result.unit.toLowerCase().includes('negative') ||
                        result.unit.toLowerCase().includes('reactive') ||
                        result.unit.toLowerCase().includes('detected') ||
                        result.unit.toLowerCase().includes('growth')
                      ) ? (
                        <select
                          aria-label="Select qualitative result"
                          value={result.resultvalue || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            const newResults = [...results];
                            newResults[index] = { 
                              ...newResults[index], 
                              resultvalue: value,
                              resultnumeric: undefined,
                              flag: value.toLowerCase().includes('present') || value.toLowerCase().includes('positive') || value.toLowerCase().includes('detected') || value.toLowerCase().includes('growth') ? 'H' : 'normal',
                              isabormal: value.toLowerCase().includes('present') || value.toLowerCase().includes('positive') || value.toLowerCase().includes('detected') || value.toLowerCase().includes('growth'),
                              iscritical: false,
                              interpretation: value.toLowerCase().includes('present') || value.toLowerCase().includes('positive') || value.toLowerCase().includes('detected') || value.toLowerCase().includes('growth') ? 'Abnormal' : 'Normal'
                            };
                            setResults(newResults);
                          }}
                          className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select result</option>
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Positive">Positive</option>
                          <option value="Negative">Negative</option>
                          <option value="Reactive">Reactive</option>
                          <option value="Non-reactive">Non-reactive</option>
                          <option value="Detected">Detected</option>
                          <option value="Not detected">Not detected</option>
                          <option value="Growth">Growth</option>
                          <option value="No growth">No growth</option>
                        </select>
                      ) : (
                        <input
                          type="number"
                          step="any"
                          value={result.resultnumeric ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            console.log(`Input changed for ${result.testname}, value: "${value}"`);
                            
                            const newResults = [...results];
                            newResults[index] = { 
                              ...newResults[index], 
                              resultvalue: value 
                            };
                            
                            const numValue = parseFloat(value);
                            if (value !== "" && !isNaN(numValue)) {
                              newResults[index].resultnumeric = numValue;
                              
                              // Auto-flag using reference and panic values
                              const refData = {
                                min: parseFloat(String(newResults[index].referencemin ?? "0")),
                                max: parseFloat(String(newResults[index].referencemax ?? "999999")),
                                criticalLow: newResults[index].paniclow !== undefined && newResults[index].paniclow !== null && String(newResults[index].paniclow).trim() !== ""
                                  ? parseFloat(String(newResults[index].paniclow))
                                  : undefined,
                                criticalHigh: newResults[index].panichigh !== undefined && newResults[index].panichigh !== null && String(newResults[index].panichigh).trim() !== ""
                                  ? parseFloat(String(newResults[index].panichigh))
                                  : undefined,
                              };
                              const flags = autoFlagResult(numValue, refData);
                              newResults[index] = { ...newResults[index], ...flags };
                            } else {
                              newResults[index].resultnumeric = undefined;
                              newResults[index].flag = undefined;
                              newResults[index].isabormal = false;
                              newResults[index].iscritical = false;
                              newResults[index].interpretation = undefined;
                            }
                            
                            console.log(`Updated result for ${result.testname}:`, newResults[index]);
                            setResults(newResults);
                          }}
                          placeholder="Enter result"
                          className="flex h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {result.testcode ? (
                        <div className="text-sm font-medium bg-gray-50 px-3 py-2 rounded border">
                          {result.unit || "-"}
                        </div>
                      ) : (
                        <Input
                          type="text"
                          value={result.unit || ""}
                          onChange={(e) => handleResultChange(index, "unit", e.target.value)}
                          placeholder="Unit"
                          className="w-24"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {result.testcode ? (
                        <div className="text-sm font-medium bg-gray-50 px-3 py-2 rounded border">
                          {result.referencemin && result.referencemax
                            ? `${result.referencemin} - ${result.referencemax}`
                            : result.referencerange || "-"}
                        </div>
                      ) : (
                        <div className="flex gap-1 items-center">
                          <Input
                            type="number"
                            value={result.referencemin || ""}
                            onChange={(e) => handleResultChange(index, "referencemin", parseFloat(e.target.value))}
                            placeholder="Min"
                            className="w-20"
                          />
                          <span>-</span>
                          <Input
                            type="number"
                            value={result.referencemax || ""}
                            onChange={(e) => handleResultChange(index, "referencemax", parseFloat(e.target.value))}
                            placeholder="Max"
                            className="w-20"
                          />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(result.flag, result.iscritical, result.interpretation)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={result.comment || ""}
                        onChange={(e) => handleResultChange(index, "comment", e.target.value)}
                        placeholder="Comment"
                        className="w-40"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end gap-3">
              <Button
                onClick={handleSaveResults}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save Results"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert Dialog */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {alertType === "success" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              {alertType === "success" ? "Success" : "Error"}
            </AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
