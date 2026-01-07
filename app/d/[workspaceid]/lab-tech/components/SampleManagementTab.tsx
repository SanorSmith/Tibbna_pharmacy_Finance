/**
 * Sample Management Tab Component
 * - Sample storage and tracking
 * - Display all samples with IN_STORAGE status
 */
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Package, Thermometer, Archive } from "lucide-react";

interface StoredSample {
  sampleid: string;
  samplenumber: string;
  sampletype: string;
  containertype: string;
  collectiondate: string;
  currentstatus: string;
  currentlocation: string;
  barcode: string;
  accessionedat: string;
  patientid: string | null;
  patientName: string | null;
  orderid: string;
  volume: string | null;
  volumeunit: string | null;
}

export default function SampleManagementTab({ workspaceid }: { workspaceid: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  // Fetch stored samples (IN_STORAGE status)
  const { data: samples, isLoading } = useQuery<StoredSample[]>({
    queryKey: ["stored-samples", workspaceid, locationFilter],
    queryFn: async () => {
      const url = locationFilter === 'all'
        ? `/api/lims/accession?workspaceid=${workspaceid}&status=IN_STORAGE&limit=500`
        : `/api/lims/accession?workspaceid=${workspaceid}&status=IN_STORAGE&limit=500`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch stored samples");
      const data = await response.json();
      return data.samples;
    },
  });

  // Filter samples by search term
  const filteredSamples = samples?.filter(sample => {
    const matchesSearch = searchTerm === '' || 
      sample.samplenumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.orderid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.barcode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLocation = locationFilter === 'all' || 
      sample.currentlocation?.toLowerCase().includes(locationFilter.toLowerCase());

    return matchesSearch && matchesLocation;
  });

  // Group samples by location
  const samplesByLocation = filteredSamples?.reduce((acc, sample) => {
    const location = sample.currentlocation || 'Unknown';
    if (!acc[location]) {
      acc[location] = [];
    }
    acc[location].push(sample);
    return acc;
  }, {} as Record<string, StoredSample[]>);

  const getLocationIcon = (location: string) => {
    const loc = location.toLowerCase();
    if (loc.includes('refrigerator') || loc.includes('freezer')) {
      return <Thermometer className="h-4 w-4 text-blue-500" />;
    }
    if (loc.includes('rack')) {
      return <Archive className="h-4 w-4 text-gray-500" />;
    }
    return <Package className="h-4 w-4 text-green-500" />;
  };

  const getLocationBadge = (location: string) => {
    const loc = location.toLowerCase();
    if (loc.includes('refrigerator')) {
      return <Badge className="bg-blue-500 text-white">Refrigerator</Badge>;
    }
    if (loc.includes('freezer_minus_80')) {
      return <Badge className="bg-indigo-600 text-white">-80°C Freezer</Badge>;
    }
    if (loc.includes('freezer_minus_20')) {
      return <Badge className="bg-blue-600 text-white">-20°C Freezer</Badge>;
    }
    if (loc.includes('room_temp')) {
      return <Badge className="bg-green-500 text-white">Room Temp</Badge>;
    }
    if (loc.includes('incubator')) {
      return <Badge className="bg-orange-500 text-white">Incubator</Badge>;
    }
    if (loc.includes('rack')) {
      return <Badge className="bg-gray-500 text-white">{location}</Badge>;
    }
    return <Badge className="bg-gray-400 text-white">{location}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sample Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage and track samples in storage
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stored</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{samples?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Refrigerated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {samples?.filter(s => s.currentlocation?.toLowerCase().includes('refrigerator')).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Frozen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {samples?.filter(s => s.currentlocation?.toLowerCase().includes('freezer')).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Room Temp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {samples?.filter(s => s.currentlocation?.toLowerCase().includes('room_temp')).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Stored Samples</CardTitle>
          <CardDescription>All samples currently in storage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by sample number, patient name, order ID, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="refrigerator">Refrigerator</SelectItem>
                <SelectItem value="freezer">Freezer</SelectItem>
                <SelectItem value="room_temp">Room Temperature</SelectItem>
                <SelectItem value="rack">Racks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredSamples && filteredSamples.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample Number</TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Sample Type</TableHead>
                    <TableHead>Container</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Storage Location</TableHead>
                    <TableHead>Collection Date</TableHead>
                    <TableHead>Stored Since</TableHead>
                    <TableHead>Barcode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSamples.map((sample) => (
                    <TableRow key={sample.sampleid} className="hover:bg-gray-50">
                      <TableCell className="font-medium font-mono">{sample.samplenumber}</TableCell>
                      <TableCell className="font-medium">{sample.patientName || sample.patientid || "-"}</TableCell>
                      <TableCell className="capitalize">{sample.sampletype}</TableCell>
                      <TableCell className="text-sm">{sample.containertype}</TableCell>
                      <TableCell className="text-sm">
                        {sample.volume ? `${sample.volume} ${sample.volumeunit || ''}` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getLocationIcon(sample.currentlocation)}
                          {getLocationBadge(sample.currentlocation)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(sample.collectiondate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(sample.accessionedat).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{sample.barcode}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No samples in storage</p>
              <p className="text-sm">Samples will appear here when moved to storage</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Samples by Location */}
      {samplesByLocation && Object.keys(samplesByLocation).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Storage Overview</CardTitle>
            <CardDescription>Samples grouped by storage location</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(samplesByLocation).map(([location, locationSamples]) => (
                <div key={location} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getLocationIcon(location)}
                      <h3 className="font-semibold">{location}</h3>
                    </div>
                    <Badge variant="outline">{locationSamples.length} samples</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {locationSamples.slice(0, 8).map((sample) => (
                      <div key={sample.sampleid} className="p-2 bg-gray-50 rounded border">
                        <div className="font-mono text-xs font-medium">{sample.samplenumber}</div>
                        <div className="text-xs text-gray-600 truncate">{sample.patientName || 'Unknown'}</div>
                      </div>
                    ))}
                    {locationSamples.length > 8 && (
                      <div className="p-2 bg-gray-100 rounded border flex items-center justify-center">
                        <span className="text-xs text-gray-600">+{locationSamples.length - 8} more</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
