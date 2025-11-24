/**
 * Notifications List Client Component
 * - Shows overview of patients with chronic diseases
 * - Patients who haven't visited in a long time
 * - Acute patient results
 * - Patient notes, lab comments, pharmacy comments
 * - Doctor comments
 */
"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  FileText,
  Pill,
  Stethoscope,
  User,
} from "lucide-react";
import Link from "next/link";

type Patient = {
  patientid: string;
  firstname: string;
  lastname: string;
  nationalid?: string | null;
  phone?: string | null;
  lastvisit?: string | null;
  chronicconditions?: string[];
};

type LabResult = {
  labresultid: string;
  patientid: string;
  testname: string;
  result: string;
  status: string;
  createdat: string;
  patient?: Patient;
};

type Props = {
  workspaceid: string;
  userid: string;
};

export default function NotificationsList({ workspaceid, userid }: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [chronicPatients, setChronicPatients] = useState<Patient[]>([]);
  const [overduePatients, setOverduePatients] = useState<Patient[]>([]);
  const [acuteResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch patients data
      const patientsRes = await fetch(`/api/d/${workspaceid}/patients`);
      if (patientsRes.ok) {
        const data = await patientsRes.json();
        const allPatients = data.patients || [];
        setPatients(allPatients);

        // Filter chronic patients (this is a placeholder - you'd need actual chronic disease data)
        const chronic = allPatients.filter(
          (p: Patient) => p.chronicconditions && p.chronicconditions.length > 0
        );
        setChronicPatients(chronic);

        // Filter patients who haven't visited in 90+ days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const overdue = allPatients.filter((p: Patient) => {
          if (!p.lastvisit) return true; // Never visited
          const lastVisit = new Date(p.lastvisit);
          return lastVisit < ninetyDaysAgo;
        });
        setOverduePatients(overdue);
      }

      // TODO: Fetch acute lab results, notes, comments when APIs are available
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [workspaceid]);

  useEffect(() => {
    loadNotifications();
  }, [workspaceid, userid, loadNotifications]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getDaysSinceVisit = (lastvisit: string | null) => {
    if (!lastvisit) return "Never visited";
    const lastVisitDate = new Date(lastvisit);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastVisitDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days ago`;
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 mr-4 ml-4">
      {/* Header */}
      <Link href={`/d/${workspaceid}/doctor`}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Overview of patient alerts and important updates
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#618FF5]">
          <CardContent className="pt-6 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-white text-muted-foreground">
                  Chronic Patients
                </p>
                <p className="text-2xl font-bold">{chronicPatients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#618FF5]">
          <CardContent className="pt-6 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-white text-muted-foreground">
                  Overdue Visits
                </p>
                <p className="text-2xl font-bold">{overduePatients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#618FF5]">
          <CardContent className="pt-6 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-white text-muted-foreground">
                  Acute Results
                </p>
                <p className="text-2xl font-bold">{acuteResults.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#618FF5]">
          <CardContent className="pt-6 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-white text-muted-foreground">
                  Total Patients
                </p>
                <p className="text-2xl font-bold">{patients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="chronic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger
            value="chronic"
            className="data-[state=active]:bg-orange-400 data-[state=active]:text-white bg-[#618FF5] text-white"
          >
            Chronic Diseases
          </TabsTrigger>

          <TabsTrigger
            value="overdue"
            className="data-[state=active]:bg-orange-400 data-[state=active]:text-white bg-[#618FF5] text-white"
          >
            Overdue Visits
          </TabsTrigger>

          <TabsTrigger
            value="acute"
            className="data-[state=active]:bg-orange-400 data-[state=active]:text-white bg-[#618FF5] text-white"
          >
            Acute Results
          </TabsTrigger>

          <TabsTrigger
            value="lab"
            className="data-[state=active]:bg-orange-400 data-[state=active]:text-white bg-[#618FF5] text-white"
          >
            Lab Comments
          </TabsTrigger>

          <TabsTrigger
            value="pharmacy"
            className="data-[state=active]:bg-orange-400 data-[state=active]:text-white bg-[#618FF5] text-white"
          >
            Pharmacy Notes
          </TabsTrigger>
        </TabsList>

        {/* Chronic Diseases Tab */}
        <TabsContent value="chronic">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Patients with Chronic Diseases
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : chronicPatients.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No patients with chronic diseases recorded.
                </p>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium">Patient Name</th>
                        <th className="text-left py-3 px-4 font-medium">Patient ID</th>
                        <th className="text-left py-3 px-4 font-medium">Chronic Conditions</th>
                        <th className="text-left py-3 px-4 font-medium">Phone</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chronicPatients.map((patient) => (
                        <tr key={patient.patientid} className="border-t hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">
                            {patient.firstname} {patient.lastname}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {patient.nationalid || patient.patientid}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1 flex-wrap">
                              {patient.chronicconditions?.map((condition, idx) => (
                                <Badge key={idx} variant="destructive">
                                  {condition}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {patient.phone || "-"}
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/d/${workspaceid}/patients/${patient.patientid}`}>
                              <Button size="sm" variant="outline">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overdue Visits Tab */}
        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Patients with Overdue Visits (90+ days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : overduePatients.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All patients have recent visits.
                </p>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium">Patient Name</th>
                        <th className="text-left py-3 px-4 font-medium">Patient ID</th>
                        <th className="text-left py-3 px-4 font-medium">Last Visit</th>
                        <th className="text-left py-3 px-4 font-medium">Days Since Visit</th>
                        <th className="text-left py-3 px-4 font-medium">Phone</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overduePatients.map((patient) => (
                        <tr key={patient.patientid} className="border-t hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">
                            {patient.firstname} {patient.lastname}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {patient.nationalid || patient.patientid}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {formatDate(patient.lastvisit || null)}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {getDaysSinceVisit(patient.lastvisit || null)}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {patient.phone || "-"}
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/d/${workspaceid}/patients/${patient.patientid}`}>
                              <Button size="sm" variant="outline">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Acute Results Tab */}
        <TabsContent value="acute">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Acute Patient Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No acute results at this time. This section will display urgent
                lab results and test outcomes requiring immediate attention.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lab Comments Tab */}
        <TabsContent value="lab">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-purple-600" />
                Lab Comments & Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No lab comments available. This section will display comments
                from laboratory staff regarding test results.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pharmacy Notes Tab */}
        <TabsContent value="pharmacy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-green-600" />
                Pharmacy Comments & Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No pharmacy comments available. This section will display notes
                from pharmacy staff regarding prescriptions and medications.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
