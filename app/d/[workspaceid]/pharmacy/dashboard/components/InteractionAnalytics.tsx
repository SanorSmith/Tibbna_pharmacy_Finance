/**
 * Interaction Analytics Dashboard
 * Displays statistics and metrics for drug interaction checking
 */

"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, AlertTriangle, CheckCircle, XCircle, BarChart3, Users } from "lucide-react";

interface AnalyticsData {
  summary: {
    totalChecks: number;
    checksWithInteractions: number;
    noInteractions: number;
    proceeded: number;
    cancelled: number;
    interventionRate: string;
    proceedRate: string;
    cancelRate: string;
  };
  severity: {
    critical: number;
    major: number;
    moderate: number;
    minor: number;
  };
  topPharmacists: Array<{
    pharmacistId: string;
    name: string;
    checks: number;
    proceeded: number;
    cancelled: number;
  }>;
  topCombinations: Array<{
    drugs: string;
    count: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    count: number;
  }>;
}

export default function InteractionAnalytics({ workspaceid }: { workspaceid: string }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30"); // days

  useEffect(() => {
    fetchAnalytics();
  }, [workspaceid, dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString();
      const response = await fetch(
        `/api/pharmacy/interaction-analytics?workspaceid=${workspaceid}&startDate=${startDate}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Interaction Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">
            Performance metrics and insights
          </p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Checks</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {analytics.summary.totalChecks}
                </p>
              </div>
              <BarChart3 className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Interactions Found</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {analytics.summary.checksWithInteractions}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.summary.interventionRate} of checks
                </p>
              </div>
              <AlertTriangle className="h-10 w-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Proceeded</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {analytics.summary.proceeded}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.summary.proceedRate} with justification
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {analytics.summary.cancelled}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.summary.cancelRate} prevented
                </p>
              </div>
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Severity Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Severity Breakdown</CardTitle>
          <CardDescription>Distribution of interaction severity levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Critical</Badge>
                <span className="text-sm text-gray-600">Life-threatening interactions</span>
              </div>
              <span className="text-lg font-bold text-red-600">{analytics.severity.critical}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-500">Major</Badge>
                <span className="text-sm text-gray-600">Significant clinical impact</span>
              </div>
              <span className="text-lg font-bold text-orange-600">{analytics.severity.major}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-500">Moderate</Badge>
                <span className="text-sm text-gray-600">Requires monitoring</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">{analytics.severity.moderate}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500">Minor</Badge>
                <span className="text-sm text-gray-600">Low clinical significance</span>
              </div>
              <span className="text-lg font-bold text-blue-600">{analytics.severity.minor}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pharmacists */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Pharmacists
            </CardTitle>
            <CardDescription>Most active in interaction checking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topPharmacists.slice(0, 5).map((pharmacist, index) => (
                <div key={pharmacist.pharmacistId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{pharmacist.name}</p>
                      <p className="text-xs text-gray-500">
                        {pharmacist.checks} checks • {pharmacist.proceeded} proceeded • {pharmacist.cancelled} cancelled
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Most Common Combinations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Most Common Drug Combinations
            </CardTitle>
            <CardDescription>Frequently checked together</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topCombinations.slice(0, 5).map((combo, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{combo.drugs}</p>
                  </div>
                  <Badge variant="secondary">{combo.count}x</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart (Simple visualization) */}
      <Card>
        <CardHeader>
          <CardTitle>Checks Over Time</CardTitle>
          <CardDescription>Daily interaction checks trend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-1">
            {analytics.timeSeriesData.slice(-30).map((data, index) => {
              const maxCount = Math.max(...analytics.timeSeriesData.map(d => d.count));
              const height = (data.count / maxCount) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative group"
                  style={{ height: `${height}%`, minHeight: data.count > 0 ? "4px" : "0" }}
                  title={`${data.date}: ${data.count} checks`}
                >
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {new Date(data.date).toLocaleDateString()}: {data.count}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center text-xs text-gray-500">
            Last {Math.min(30, analytics.timeSeriesData.length)} days
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
