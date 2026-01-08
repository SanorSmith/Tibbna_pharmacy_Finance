/**
 * Sample Management Tab Component
 * - Sample storage and tracking
 * - Display all samples with IN_STORAGE status
 */
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Loader2, Package, Thermometer, Archive, Plus, Edit, Trash2, MapPin } from "lucide-react";

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

interface StorageLocation {
  locationid: string;
  name: string;
  code: string;
  description: string | null;
  type: string;
  category: string;
  building: string | null;
  room: string | null;
  equipment: string | null;
  section: string | null;
  position: string | null;
  capacity: number | null;
  currentcount: number | null;
  availableslots: number | null;
  temperaturemin: number | null;
  temperaturemax: number | null;
  humiditymin: number | null;
  humiditymax: number | null;
  restrictedaccess: boolean;
  accessrequirements: string | null;
  status: string;
  isavailable: boolean;
  sortorder: number;
  parentlocationid: string | null;
  createdby: string;
  createdat: string;
  updatedby: string | null;
  updatedat: string | null;
  workspaceid: string;
}

export default function SampleManagementTab({ workspaceid }: { workspaceid: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [isAddLocationDialogOpen, setIsAddLocationDialogOpen] = useState(false);
  const [isEditLocationDialogOpen, setIsEditLocationDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | null>(null);
  const queryClient = useQueryClient();

  // Form state for new/edit location
  const [locationForm, setLocationForm] = useState({
    name: '',
    code: '',
    description: '',
    type: 'refrigerator',
    category: 'storage',
    building: '',
    room: '',
    equipment: '',
    section: '',
    position: '',
    capacity: '',
    temperaturemin: '',
    temperaturemax: '',
    humiditymin: '',
    humiditymax: '',
    restrictedaccess: false,
    accessrequirements: '',
    status: 'active',
    isavailable: true,
  });

  // Fetch storage locations
  const { data: storageLocations, isLoading: locationsLoading } = useQuery<StorageLocation[]>({
    queryKey: ["storage-locations", workspaceid],
    queryFn: async () => {
      const response = await fetch(`/api/lims/storage-locations?workspaceid=${workspaceid}`);
      if (!response.ok) throw new Error("Failed to fetch storage locations");
      const data = await response.json();
      return data.locations;
    },
  });

  // Create storage location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (locationData: typeof locationForm) => {
      const response = await fetch('/api/lims/storage-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...locationData, workspaceid }),
      });
      if (!response.ok) throw new Error('Failed to create storage location');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storage-locations", workspaceid] });
      setIsAddLocationDialogOpen(false);
      resetLocationForm();
    },
  });

  // Update storage location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ locationid, ...data }: typeof locationForm & { locationid: string }) => {
      const response = await fetch(`/api/lims/storage-locations/${locationid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update storage location');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storage-locations", workspaceid] });
      setIsEditLocationDialogOpen(false);
      setSelectedLocation(null);
      resetLocationForm();
    },
  });

  // Delete storage location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (locationid: string) => {
      const response = await fetch(`/api/lims/storage-locations/${locationid}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete storage location');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storage-locations", workspaceid] });
    },
  });

  const resetLocationForm = () => {
    setLocationForm({
      name: '',
      code: '',
      description: '',
      type: 'refrigerator',
      category: 'storage',
      building: '',
      room: '',
      equipment: '',
      section: '',
      position: '',
      capacity: '',
      temperaturemin: '',
      temperaturemax: '',
      humiditymin: '',
      humiditymax: '',
      restrictedaccess: false,
      accessrequirements: '',
      status: 'active',
      isavailable: true,
    });
  };

  const handleAddLocation = () => {
    createLocationMutation.mutate(locationForm);
  };

  const handleEditLocation = () => {
    if (selectedLocation) {
      updateLocationMutation.mutate({ ...locationForm, locationid: selectedLocation.locationid });
    }
  };

  const handleDeleteLocation = (location: StorageLocation) => {
    if (confirm(`Are you sure you want to delete "${location.name}"?`)) {
      deleteLocationMutation.mutate(location.locationid);
    }
  };

  const openEditDialog = (location: StorageLocation) => {
    setSelectedLocation(location);
    setLocationForm({
      name: location.name,
      code: location.code,
      description: location.description || '',
      type: location.type,
      category: location.category,
      building: location.building || '',
      room: location.room || '',
      equipment: location.equipment || '',
      section: location.section || '',
      position: location.position || '',
      capacity: location.capacity?.toString() || '',
      temperaturemin: location.temperaturemin?.toString() || '',
      temperaturemax: location.temperaturemax?.toString() || '',
      humiditymin: location.humiditymin?.toString() || '',
      humiditymax: location.humiditymax?.toString() || '',
      restrictedaccess: location.restrictedaccess,
      accessrequirements: location.accessrequirements || '',
      status: location.status,
      isavailable: location.isavailable,
    });
    setIsEditLocationDialogOpen(true);
  };

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

      {/* Storage Locations Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Storage Locations
              </CardTitle>
              <CardDescription>Manage laboratory storage locations and capacity</CardDescription>
            </div>
            <Dialog open={isAddLocationDialogOpen} onOpenChange={setIsAddLocationDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Storage Location</DialogTitle>
                  <DialogDescription>
                    Create a new storage location for sample management
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Location Name *</Label>
                    <Input
                      id="name"
                      value={locationForm.name}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Main Lab Freezer -80°C"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Location Code *</Label>
                    <Input
                      id="code"
                      value={locationForm.code}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g., FREEZER_MAIN_80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Storage Type *</Label>
                    <Select value={locationForm.type} onValueChange={(value) => setLocationForm(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="refrigerator">Refrigerator (2-8°C)</SelectItem>
                        <SelectItem value="freezer_minus_80">Ultra-Low Freezer (-80°C)</SelectItem>
                        <SelectItem value="freezer_minus_20">Standard Freezer (-20°C)</SelectItem>
                        <SelectItem value="room_temp">Room Temperature</SelectItem>
                        <SelectItem value="incubator">Incubator</SelectItem>
                        <SelectItem value="rack">Storage Rack</SelectItem>
                        <SelectItem value="shelf">Storage Shelf</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={locationForm.category} onValueChange={(value) => setLocationForm(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="storage">Storage</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="quarantine">Quarantine</SelectItem>
                        <SelectItem value="disposal">Disposal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="building">Building</Label>
                    <Input
                      id="building"
                      value={locationForm.building}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, building: e.target.value }))}
                      placeholder="e.g., Main Building"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room">Room</Label>
                    <Input
                      id="room"
                      value={locationForm.room}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, room: e.target.value }))}
                      placeholder="e.g., Lab 101"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="equipment">Equipment</Label>
                    <Input
                      id="equipment"
                      value={locationForm.equipment}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, equipment: e.target.value }))}
                      placeholder="e.g., Freezer Model X-2000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={locationForm.capacity}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, capacity: e.target.value }))}
                      placeholder="Maximum sample capacity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tempMin">Min Temperature (°C)</Label>
                    <Input
                      id="tempMin"
                      type="number"
                      step="0.1"
                      value={locationForm.temperaturemin}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, temperaturemin: e.target.value }))}
                      placeholder="e.g., -86"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tempMax">Max Temperature (°C)</Label>
                    <Input
                      id="tempMax"
                      type="number"
                      step="0.1"
                      value={locationForm.temperaturemax}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, temperaturemax: e.target.value }))}
                      placeholder="e.g., -74"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={locationForm.description}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description of the storage location"
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddLocationDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddLocation} 
                    disabled={createLocationMutation.isPending || !locationForm.name || !locationForm.code}
                  >
                    {createLocationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Add Location
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {locationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : storageLocations && storageLocations.length > 0 ? (
            <div className="space-y-4">
              {storageLocations.map((location) => (
                <div key={location.locationid} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{location.name}</h3>
                        <Badge variant="outline">{location.code}</Badge>
                        <Badge className={location.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                          {location.status}
                        </Badge>
                        {location.restrictedaccess && (
                          <Badge variant="destructive">Restricted Access</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Type:</span> {location.type.replace('_', ' ')}
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {location.building} {location.room}
                        </div>
                        <div>
                          <span className="font-medium">Equipment:</span> {location.equipment || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Capacity:</span> {location.capacity || 'Unlimited'} slots
                        </div>
                        {location.temperaturemin && location.temperaturemax && (
                          <div>
                            <span className="font-medium">Temperature:</span> {location.temperaturemin}°C to {location.temperaturemax}°C
                          </div>
                        )}
                        <div className="col-span-3">
                          <span className="font-medium">Current Usage:</span> 0 samples stored
                        </div>
                      </div>
                      {location.description && (
                        <p className="text-sm text-gray-600 mt-2">{location.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(location)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLocation(location)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No storage locations configured</p>
              <p className="text-sm">Add storage locations to organize your sample management</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Location Dialog */}
      <Dialog open={isEditLocationDialogOpen} onOpenChange={setIsEditLocationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Storage Location</DialogTitle>
            <DialogDescription>
              Update storage location details
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Location Name *</Label>
              <Input
                id="edit-name"
                value={locationForm.name}
                onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Main Lab Freezer -80°C"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Location Code *</Label>
              <Input
                id="edit-code"
                value={locationForm.code}
                onChange={(e) => setLocationForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="e.g., FREEZER_MAIN_80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Storage Type *</Label>
              <Select value={locationForm.type} onValueChange={(value) => setLocationForm(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refrigerator">Refrigerator (2-8°C)</SelectItem>
                  <SelectItem value="freezer_minus_80">Ultra-Low Freezer (-80°C)</SelectItem>
                  <SelectItem value="freezer_minus_20">Standard Freezer (-20°C)</SelectItem>
                  <SelectItem value="room_temp">Room Temperature</SelectItem>
                  <SelectItem value="incubator">Incubator</SelectItem>
                  <SelectItem value="rack">Storage Rack</SelectItem>
                  <SelectItem value="shelf">Storage Shelf</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={locationForm.status} onValueChange={(value) => setLocationForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="decommissioned">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={locationForm.description}
                onChange={(e) => setLocationForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description of the storage location"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditLocationDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditLocation} 
              disabled={updateLocationMutation.isPending || !locationForm.name || !locationForm.code}
            >
              {updateLocationMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Update Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
