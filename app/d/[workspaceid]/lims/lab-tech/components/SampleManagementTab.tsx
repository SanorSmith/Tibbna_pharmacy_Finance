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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Loader2, Package, Plus, Edit, Trash2, MapPin, ArrowRight, Clock, AlertTriangle, History, Ban, RotateCcw } from "lucide-react";

interface FinishedSample {
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
  patientage?: number;
  patientsex?: string;
}

interface StoredSample {
  storageid: string;
  sampleid: string;
  locationid: string;
  storagedate: string;
  expirydate: string;
  retentiondays: number;
  status: string;
  storagenotes: string | null;
  samplenumber: string;
  sampletype: string;
  containertype: string;
  barcode: string;
  patientid: string | null;
  collectiondate: string;
  locationname: string;
  locationcode: string;
  locationtype: string;
  storedbyname: string;
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
  const [isMoveToStorageDialogOpen, setIsMoveToStorageDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | null>(null);
  const [selectedSample, setSelectedSample] = useState<FinishedSample | null>(null);
  const [storageLocationId, setStorageLocationId] = useState<string>('');
  const [retentionDays, setRetentionDays] = useState<number>(3);
  const [storageNotes, setStorageNotes] = useState<string>('');
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<StorageLocation | null>(null);
  const [disposeTarget, setDisposeTarget] = useState<StoredSample | null>(null);
  const [disposeMethod, setDisposeMethod] = useState('autoclave');
  const [disposeNotes, setDisposeNotes] = useState('');
  const [retrieveTarget, setRetrieveTarget] = useState<StoredSample | null>(null);
  const [retrieveReason, setRetrieveReason] = useState('');
  const [historyTarget, setHistoryTarget] = useState<StoredSample | null>(null);
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
    setDeleteLocationTarget(location);
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

  // Dispose sample mutation
  const disposeMutation = useMutation({
    mutationFn: async ({ storageid, method, notes }: { storageid: string; method: string; notes: string }) => {
      const response = await fetch('/api/lims/sample-storage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageid, action: 'dispose', disposalmethod: method, disposalnotes: notes }),
      });
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Failed to dispose'); }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stored-samples", workspaceid] });
      queryClient.invalidateQueries({ queryKey: ["finished-samples", workspaceid] });
      setDisposeTarget(null);
      setDisposeMethod('autoclave');
      setDisposeNotes('');
    },
  });

  // Retrieve sample mutation
  const retrieveMutation = useMutation({
    mutationFn: async ({ storageid, reason }: { storageid: string; reason: string }) => {
      const response = await fetch('/api/lims/sample-storage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageid, action: 'retrieve', retrievalreason: reason }),
      });
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Failed to retrieve'); }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stored-samples", workspaceid] });
      queryClient.invalidateQueries({ queryKey: ["finished-samples", workspaceid] });
      setRetrieveTarget(null);
      setRetrieveReason('');
    },
  });

  // Fetch finished samples ready for storage (VALIDATED, ANALYZED, or RELEASED)
  const { data: finishedSamples, isLoading: finishedLoading } = useQuery<FinishedSample[]>({
    queryKey: ["finished-samples", workspaceid],
    queryFn: async () => {
      const [r1, r2, r3] = await Promise.all([
        fetch(`/api/lims/accession?workspaceid=${workspaceid}&status=VALIDATED&limit=500`),
        fetch(`/api/lims/accession?workspaceid=${workspaceid}&status=ANALYZED&limit=500`),
        fetch(`/api/lims/accession?workspaceid=${workspaceid}&status=RELEASED&limit=500`),
      ]);
      const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
      const all = [...(d1.samples || []), ...(d2.samples || []), ...(d3.samples || [])];
      // Deduplicate by sampleid
      const seen = new Set<string>();
      return all.filter((s: FinishedSample) => { if (seen.has(s.sampleid)) return false; seen.add(s.sampleid); return true; });
    },
  });

  // Fetch stored samples
  const { data: storedSamples, isLoading: storedLoading } = useQuery<StoredSample[]>({
    queryKey: ["stored-samples", workspaceid, locationFilter],
    queryFn: async () => {
      const url = locationFilter === 'all'
        ? `/api/lims/sample-storage?workspaceid=${workspaceid}&status=stored&limit=500`
        : `/api/lims/sample-storage?workspaceid=${workspaceid}&status=stored&locationid=${locationFilter}&limit=500`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch stored samples");
      const data = await response.json();
      return data.samples;
    },
  });

  // Move sample to storage mutation
  const moveToStorageMutation = useMutation({
    mutationFn: async (data: { sampleid: string; locationid: string; retentiondays: number; storagenotes?: string }) => {
      const response = await fetch('/api/lims/sample-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, workspaceid }),
      });
      if (!response.ok) throw new Error('Failed to move sample to storage');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finished-samples", workspaceid] });
      queryClient.invalidateQueries({ queryKey: ["stored-samples", workspaceid] });
      setIsMoveToStorageDialogOpen(false);
      setSelectedSample(null);
      setStorageLocationId('');
      setRetentionDays(3);
      setStorageNotes('');
    },
  });

  const handleMoveToStorage = () => {
    if (selectedSample && storageLocationId) {
      moveToStorageMutation.mutate({
        sampleid: selectedSample.sampleid,
        locationid: storageLocationId,
        retentiondays: retentionDays,
        storagenotes: storageNotes || undefined,
      });
    }
  };

  const openMoveToStorageDialog = (sample: FinishedSample) => {
    setSelectedSample(sample);
    setIsMoveToStorageDialogOpen(true);
  };

  // Filter stored samples by search term
  const filteredStoredSamples = storedSamples?.filter(sample => {
    const matchesSearch = searchTerm === '' || 
      sample.samplenumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Check if sample is expiring soon (within 24 hours)
  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry > 0 && hoursUntilExpiry <= 24;
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="flex flex-col h-full gap-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold leading-tight">Sample Management</h2>
          <p className="text-xs text-muted-foreground">
            Manage and track samples in storage
          </p>
        </div>
        <Dialog open={isAddLocationDialogOpen} onOpenChange={setIsAddLocationDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[65vw] max-h-[90vh] overflow-y-auto">
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

      <div className="flex-1 min-h-0 overflow-auto space-y-4">


      {/* Storage Locations Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Storage Locations
          </CardTitle>
          <CardDescription>Manage laboratory storage locations and capacity</CardDescription>
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

      {/* Finished Samples Ready for Storage */}
      <Card>
        <CardHeader>
          <CardTitle>Finished Samples - Ready for Storage</CardTitle>
          <CardDescription>Validated samples that can be moved to storage</CardDescription>
        </CardHeader>
        <CardContent>
          {finishedLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : finishedSamples && finishedSamples.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample Number</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Sample Type</TableHead>
                    <TableHead>Container</TableHead>
                    <TableHead>Collection Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finishedSamples.map((sample) => (
                    <TableRow key={sample.sampleid} className="hover:bg-gray-50">
                      <TableCell className="font-medium font-mono">{sample.samplenumber}</TableCell>
                      <TableCell className="font-medium">{sample.patientName || sample.patientid || "-"}</TableCell>
                      <TableCell className="capitalize">{sample.sampletype}</TableCell>
                      <TableCell className="text-sm">{sample.containertype}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(sample.collectiondate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-500 text-white">{sample.currentstatus}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => openMoveToStorageDialog(sample)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Move to Storage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No finished samples ready for storage</p>
              <p className="text-sm">Validated samples will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Move to Storage Dialog */}
      <Dialog open={isMoveToStorageDialogOpen} onOpenChange={setIsMoveToStorageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Sample to Storage</DialogTitle>
            <DialogDescription>
              Select storage location and retention period for sample {selectedSample?.samplenumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="storage-location">Storage Location *</Label>
              <Select value={storageLocationId} onValueChange={setStorageLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select storage location" />
                </SelectTrigger>
                <SelectContent>
                  {storageLocations?.filter(loc => loc.status === 'active' && loc.isavailable).map((location) => (
                    <SelectItem key={location.locationid} value={location.locationid}>
                      {location.name} ({location.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="retention-days">Retention Period (days) *</Label>
              <Input
                id="retention-days"
                type="number"
                min="1"
                max="365"
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value) || 3)}
                placeholder="Default: 3 days"
              />
              <p className="text-xs text-muted-foreground">
                Sample will expire on: {new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storage-notes">Storage Notes (optional)</Label>
              <Textarea
                id="storage-notes"
                value={storageNotes}
                onChange={(e) => setStorageNotes(e.target.value)}
                placeholder="Any special notes about this storage..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveToStorageDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMoveToStorage}
              disabled={moveToStorageMutation.isPending || !storageLocationId}
            >
              {moveToStorageMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Move to Storage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stored Samples */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stored Samples</CardTitle>
              <CardDescription>Samples currently in storage with retention tracking</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by sample number..."
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
                {storageLocations?.map((location) => (
                  <SelectItem key={location.locationid} value={location.locationid}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {storedLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredStoredSamples && filteredStoredSamples.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample Number</TableHead>
                    <TableHead>Sample Type</TableHead>
                    <TableHead>Storage Location</TableHead>
                    <TableHead>Stored Date</TableHead>
                    <TableHead>Retention</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stored By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStoredSamples.map((sample) => (
                    <TableRow key={sample.storageid} className="hover:bg-gray-50">
                      <TableCell className="font-medium font-mono">{sample.samplenumber}</TableCell>
                      <TableCell className="capitalize">{sample.sampletype}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="font-medium">{sample.locationname}</div>
                            <div className="text-xs text-gray-500">{sample.locationcode}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(sample.storagedate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {sample.retentiondays} days
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isExpired(sample.expirydate) ? (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Expired
                            </Badge>
                          ) : isExpiringSoon(sample.expirydate) ? (
                            <Badge className="bg-orange-500 text-white flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expiring Soon
                            </Badge>
                          ) : (
                            <span className="text-sm">{new Date(sample.expirydate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-500 text-white capitalize">{sample.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{sample.storedbyname}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            title="Retrieve from storage"
                            onClick={() => setRetrieveTarget(sample)}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                            title="Dispose sample"
                            onClick={() => setDisposeTarget(sample)}
                          >
                            <Ban className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            title="View history"
                            onClick={() => setHistoryTarget(sample)}
                          >
                            <History className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
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

      {/* Delete Location Confirmation */}
      <AlertDialog open={!!deleteLocationTarget} onOpenChange={(open) => !open && setDeleteLocationTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Storage Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteLocationTarget?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteLocationTarget) {
                  deleteLocationMutation.mutate(deleteLocationTarget.locationid);
                  setDeleteLocationTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dispose Sample Dialog */}
      <Dialog open={!!disposeTarget} onOpenChange={(open) => { if (!open) { setDisposeTarget(null); setDisposeMethod('autoclave'); setDisposeNotes(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispose Sample</DialogTitle>
            <DialogDescription>
              Permanently dispose of sample {disposeTarget?.samplenumber}. This marks the sample as disposed and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Disposal Method *</Label>
              <Select value={disposeMethod} onValueChange={setDisposeMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="autoclave">Autoclave</SelectItem>
                  <SelectItem value="incineration">Incineration</SelectItem>
                  <SelectItem value="chemical">Chemical Disinfection</SelectItem>
                  <SelectItem value="biohazard">Biohazard Waste</SelectItem>
                  <SelectItem value="standard">Standard Waste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Disposal Notes (optional)</Label>
              <Textarea
                value={disposeNotes}
                onChange={(e) => setDisposeNotes(e.target.value)}
                placeholder="Reason for disposal, special handling notes..."
                rows={3}
              />
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              <strong>Warning:</strong> Disposing a sample will update its status to DISPOSED. This cannot be reversed.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisposeTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (disposeTarget) {
                  disposeMutation.mutate({ storageid: disposeTarget.storageid, method: disposeMethod, notes: disposeNotes });
                }
              }}
              disabled={disposeMutation.isPending}
            >
              {disposeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
              Dispose Sample
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retrieve Sample Dialog */}
      <Dialog open={!!retrieveTarget} onOpenChange={(open) => { if (!open) { setRetrieveTarget(null); setRetrieveReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retrieve Sample from Storage</DialogTitle>
            <DialogDescription>
              Retrieve sample {retrieveTarget?.samplenumber} from {retrieveTarget?.locationname}. The sample will be moved back to the laboratory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Retrieval Reason *</Label>
              <Textarea
                value={retrieveReason}
                onChange={(e) => setRetrieveReason(e.target.value)}
                placeholder="e.g., Re-testing required, additional analysis needed..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetrieveTarget(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (retrieveTarget && retrieveReason.trim()) {
                  retrieveMutation.mutate({ storageid: retrieveTarget.storageid, reason: retrieveReason });
                }
              }}
              disabled={retrieveMutation.isPending || !retrieveReason.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {retrieveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Retrieve Sample
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sample History Dialog */}
      <Dialog open={!!historyTarget} onOpenChange={(open) => !open && setHistoryTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sample Lifecycle</DialogTitle>
            <DialogDescription>
              Tracking history for sample {historyTarget?.samplenumber}
            </DialogDescription>
          </DialogHeader>
          {historyTarget && (
            <div className="space-y-3 py-2">
              <div className="relative pl-6 space-y-4">
                {/* Collection */}
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                  <div className="absolute -left-[13px] top-4 w-0.5 h-full bg-gray-200" />
                  <div className="text-sm">
                    <p className="font-medium text-green-700">Collected</p>
                    <p className="text-xs text-gray-500">{new Date(historyTarget.collectiondate).toLocaleString()}</p>
                  </div>
                </div>

                {/* Stored */}
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                  <div className="absolute -left-[13px] top-4 w-0.5 h-full bg-gray-200" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-700">Moved to Storage</p>
                    <p className="text-xs text-gray-500">{new Date(historyTarget.storagedate).toLocaleString()}</p>
                    <p className="text-xs text-gray-600">Location: {historyTarget.locationname} ({historyTarget.locationcode})</p>
                    <p className="text-xs text-gray-600">Stored by: {historyTarget.storedbyname}</p>
                    <p className="text-xs text-gray-600">Retention: {historyTarget.retentiondays} days</p>
                    {historyTarget.storagenotes && <p className="text-xs text-gray-600">Notes: {historyTarget.storagenotes}</p>}
                  </div>
                </div>

                {/* Expiry */}
                <div className="relative">
                  <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-white ${isExpired(historyTarget.expirydate) ? 'bg-red-500' : isExpiringSoon(historyTarget.expirydate) ? 'bg-orange-500' : 'bg-gray-300'}`} />
                  <div className="text-sm">
                    <p className={`font-medium ${isExpired(historyTarget.expirydate) ? 'text-red-700' : isExpiringSoon(historyTarget.expirydate) ? 'text-orange-700' : 'text-gray-500'}`}>
                      {isExpired(historyTarget.expirydate) ? 'Expired' : isExpiringSoon(historyTarget.expirydate) ? 'Expiring Soon' : 'Expires'}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(historyTarget.expirydate).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Current Status */}
              <div className="mt-4 p-3 bg-gray-50 rounded-md border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Status</span>
                  <Badge className="bg-blue-500 text-white capitalize">{historyTarget.status}</Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
