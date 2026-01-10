/**
 * Test Analysis Tab Component
 * - Test analysis and results entry
 */
"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { FlaskConical } from "lucide-react";

interface TestResult {
  resultid: string;
  sampleid: string;
  testcode: string;
  testname: string;
  resultvalue: string;
  resultnumeric?: string;
  unit?: string;
  referencemin?: string;
  referencemax?: string;
  flag?: string;
  isabormal?: boolean;
  iscritical?: boolean;
  interpretation?: string;
  status: string;
  entereddate?: string;
}

export default function TestAnalysisTab({ workspaceid }: { workspaceid: string }) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [workspaceid]);

  const fetchResults = async () => {
    try {
      console.log("Fetching test results for workspace:", workspaceid);
      const response = await fetch(`/api/d/${workspaceid}/test-results`);
      console.log("Test results response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Test results data received:", data);
        console.log("Number of results:", data.results?.length || 0);
        setResults(data.results || []);
      } else {
        console.error("Failed to fetch test results, status:", response.status);
      }
    } catch (error) {
      console.error("Error fetching test results:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (flag?: string, iscritical?: boolean) => {
    if (iscritical) {
      return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
    }
    if (flag === "H" || flag === "HH") {
      return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
    }
    if (flag === "L" || flag === "LL") {
      return <Badge className="bg-yellow-100 text-yellow-800">Low</Badge>;
    }
    if (flag === "normal") {
      return <Badge className="bg-green-100 text-green-800">Normal</Badge>;
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50 animate-pulse" />
            <p>Loading test results...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>View all test results entered in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No test results found</p>
            <p className="text-sm mt-2">Results will appear here after they are entered</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Results ({results.length})</CardTitle>
        <CardDescription>All test results entered in the system</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test Name</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Reference Range</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Interpretation</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.resultid}>
                <TableCell className="font-medium">{result.testname}</TableCell>
                <TableCell>{result.resultvalue}</TableCell>
                <TableCell>{result.unit || "-"}</TableCell>
                <TableCell>
                  {result.referencemin && result.referencemax
                    ? `${result.referencemin} - ${result.referencemax}`
                    : "-"}
                </TableCell>
                <TableCell>{getStatusBadge(result.flag, result.iscritical)}</TableCell>
                <TableCell>{result.interpretation || "-"}</TableCell>
                <TableCell>
                  {result.entereddate
                    ? new Date(result.entereddate).toLocaleDateString()
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
