/**
 * Notifications List Client Component
 * - Shows overview of patients with chronic diseases
 * - Patients who haven't visited in a long time
 * - Acute patient results
 * - Patient notes, lab comments, pharmacy comments
 * - Doctor comments
 */
"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Clock,
  FileText,
  Home,
  Users,
} from "lucide-react";
import Link from "next/link";

// Helper function to format tab counts
const formatTabCount = (count: number) => {
  if (count === 0) return "";
  if (count > 99) return "99+";
  return count.toString();
};

type Patient = {
  patientid: string;
  firstname: string;
  lastname: string;
  nationalid?: string | null;
  phone?: string | null;
  lastvisit?: string | null;
  chronicconditions?: string[];
};

type ReferralRecord = {
  composition_uid: string;
  recorded_time: string;
  physician_department: string;
  receiving_physician?: string;
  clinical_indication: string;
  urgency: string;
  comment?: string;
  referred_by: string;
  status: string;
};

type EnhancedReferralRecord = ReferralRecord & {
  patientid: string;
  patientName: string;
  patientNationalId: string;
};

type Notification = {
  workspaceid: string;
};

export default function NotificationsList({ workspaceid }: Notification) {
  const { data: allPatients = [], isLoading: loading } = useQuery({
    queryKey: ["patients", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/patients`);
      if (res.ok) {
        const data = await res.json();
        return (data.patients as Patient[]) || [];
      }
      return [];
    },
  });

  // Fetch incoming and outgoing referrals for the doctor
  const { data: doctorReferrals, isLoading: loadingReferrals } = useQuery({
    queryKey: ["doctor-referrals", workspaceid],
    queryFn: async (): Promise<{
      incomingReferrals: EnhancedReferralRecord[];
      outgoingReferrals: EnhancedReferralRecord[];
    }> => {
      try {
        const res = await fetch(`/api/d/${workspaceid}/doctor/referrals`);
        if (res.ok) {
          const data = await res.json();
          return {
            incomingReferrals: (data.incomingReferrals as EnhancedReferralRecord[]) || [],
            outgoingReferrals: (data.outgoingReferrals as EnhancedReferralRecord[]) || [],
          };
        }
        return { incomingReferrals: [], outgoingReferrals: [] };
      } catch (error) {
        console.error("Error fetching doctor referrals:", error);
        return { incomingReferrals: [], outgoingReferrals: [] };
      }
    },
  });

  const incomingReferrals = doctorReferrals?.incomingReferrals || [];
  const outgoingReferrals = doctorReferrals?.outgoingReferrals || [];
  const totalReferrals = incomingReferrals.length + outgoingReferrals.length;

  // Filter chronic patients
  const chronicPatients = allPatients.filter(
    (p) => p.chronicconditions && p.chronicconditions.length > 0
  );

  // Filter patients who haven't visited in 90+ days
  const overduePatients = allPatients.filter((p) => {
    if (!p.lastvisit) return true; // Never visited
    const lastVisit = new Date(p.lastvisit);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return lastVisit < ninetyDaysAgo;
  });

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
   <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 ">
        <Link href={`/d/${workspaceid}/doctor`}>
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to Doctor Dashboard"
             className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
          >
            <Home className="h-4 w-4" />
          </Button>
        </Link>

        <h1 className="text-xl font-semibold">Notifications</h1>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Overview of patient alerts and important updates
          </p>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="chronic" className="w-full">
        <TabsList className="grid w-full gap-1 grid-cols-4">
          <TabsTrigger
            value="chronic"
            className="data-[state=active]:bg-orange-400 data-[state=active]:text-white bg-[#618FF5] text-white"
          >
            Chronic Diseases
            {formatTabCount(chronicPatients.length) && (
              <span className="ml-2 bg-white text-blue-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                {formatTabCount(chronicPatients.length)}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="overdue"
            className="data-[state=active]:bg-orange-400 data-[state=active]:text-white bg-[#618FF5] text-white"
          >
            Overdue Visits
            {formatTabCount(overduePatients.length) && (
              <span className="ml-2 bg-white text-blue-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                {formatTabCount(overduePatients.length)}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="results"
            className="data-[state=active]:bg-orange-400 data-[state=active]:text-white bg-[#618FF5] text-white"
          >
            Results & Labs
          </TabsTrigger>

          <TabsTrigger
            value="referrals"
            className="data-[state=active]:bg-orange-400 data-[state=active]:text-white bg-[#618FF5] text-white"
          >
            Referrals
            {formatTabCount(totalReferrals) && (
              <span className="ml-2 bg-white text-blue-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                {formatTabCount(totalReferrals)}
              </span>
            )}
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
                        <th className="text-left py-3 px-4 font-medium">
                          Patient Name
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Patient ID
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Chronic Conditions
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Phone
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {chronicPatients.map((patient) => (
                        <tr
                          key={patient.patientid}
                          className="border-t hover:bg-muted/50"
                        >
                          <td className="py-3 px-4 font-medium">
                            {patient.firstname} {patient.lastname}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {patient.nationalid || patient.patientid}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1 flex-wrap">
                              {patient.chronicconditions?.map(
                                (condition, idx) => (
                                  <Badge key={idx} variant="destructive">
                                    {condition}
                                  </Badge>
                                )
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {patient.phone || "-"}
                          </td>
                          <td className="py-3 px-4">
                            <Link
                              href={`/d/${workspaceid}/patients/${patient.patientid}`}
                            >
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
                        <th className="text-left py-3 px-4 font-medium">
                          Patient Name
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Patient ID
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Last Visit
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Days Since Visit
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Phone
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {overduePatients.map((patient) => (
                        <tr
                          key={patient.patientid}
                          className="border-t hover:bg-muted/50"
                        >
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
                            <Link
                              href={`/d/${workspaceid}/patients/${patient.patientid}`}
                            >
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

        {/* Results & Labs Tab (Combined Acute Results and Lab Comments) */}
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Results & Laboratory Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This section combines acute results and laboratory comments. 
                No urgent results or lab updates at this time.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals">
          <div className="space-y-4">
            {/* Incoming Referrals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Incoming Referrals
                  <Badge variant="secondary" className="ml-2">
                    {incomingReferrals.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingReferrals ? (
                  <p className="text-sm text-muted-foreground">Loading referrals...</p>
                ) : incomingReferrals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No incoming referrals. Patients referred to you will appear here.
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium">
                            Patient Name
                          </th>
                          <th className="text-left py-3 px-4 font-medium">
                            Patient ID
                          </th>
                          <th className="text-left py-3 px-4 font-medium">
                            Referred By
                          </th>
                          <th className="text-left py-3 px-4 font-medium">
                            Clinical Indication
                          </th>
                          <th className="text-left py-3 px-4 font-medium">
                            Urgency
                          </th>
                          <th className="text-left py-3 px-4 font-medium">
                            Date
                          </th>
                          <th className="text-left py-3 px-4 font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {incomingReferrals.map((referral) => (
                          <tr
                            key={referral.composition_uid}
                            className="border-t hover:bg-muted/50"
                          >
                            <td className="py-3 px-4 font-medium">
                              {referral.patientName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {referral.patientNationalId}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{referral.referred_by}</span>
                                {referral.physician_department && (
                                  <span className="text-xs text-muted-foreground">
                                    {referral.physician_department}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <div className="max-w-xs">
                                <p className="truncate" title={referral.clinical_indication}>
                                  {referral.clinical_indication}
                                </p>
                                {referral.comment && (
                                  <p className="text-xs text-muted-foreground truncate" title={referral.comment}>
                                    {referral.comment}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 text-xs rounded-full capitalize ${
                                  referral.urgency === "urgent"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {referral.urgency || "routine"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {new Date(referral.recorded_time).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <Link
                                href={`/d/${workspaceid}/patients/${referral.patientid}`}
                              >
                                <Button size="sm" variant="outline">
                                  View Patient
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

            {/* Outgoing Referrals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Outgoing Referrals
                  <Badge variant="secondary" className="ml-2">
                    {outgoingReferrals.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingReferrals ? (
                  <p className="text-sm text-muted-foreground">Loading referrals...</p>
                ) : outgoingReferrals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No outgoing referrals. Patients you refer to other doctors will appear here.
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium">
                            Patient Name
                          </th>
                          <th className="text-left py-3 px-4 font-medium">
                            Patient ID
                          </th>
                          <th className="text-left py-3 px-4 font-medium">
                            Referred To
                          </th>
                          <th className="text-left py-3 px-4 font-medium">
                            Clinical Indication
                          </th>
                          <th className="text-left py-3 px-4 font-medium">
                            Urgency
                          </th>
                          <th className="text-left py-3 px-4 font-medium">
                            Date
                          </th>
                          <th className="text-left py-3 px-4 font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {outgoingReferrals.map((referral) => (
                          <tr
                            key={referral.composition_uid}
                            className="border-t hover:bg-muted/50"
                          >
                            <td className="py-3 px-4 font-medium">
                              {referral.patientName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {referral.patientNationalId}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{referral.receiving_physician}</span>
                                {referral.physician_department && (
                                  <span className="text-xs text-muted-foreground">
                                    {referral.physician_department}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <div className="max-w-xs">
                                <p className="truncate" title={referral.clinical_indication}>
                                  {referral.clinical_indication}
                                </p>
                                {referral.comment && (
                                  <p className="text-xs text-muted-foreground truncate" title={referral.comment}>
                                    {referral.comment}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 text-xs rounded-full capitalize ${
                                  referral.urgency === "urgent"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {referral.urgency || "routine"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {new Date(referral.recorded_time).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <Link
                                href={`/d/${workspaceid}/patients/${referral.patientid}`}
                              >
                                <Button size="sm" variant="outline">
                                  View Patient
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
