"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface VitalSignsFormProps {
  patientId: string;
  workspaceId: string;
  ehrId?: string;
  onSuccess?: () => void;
}

interface VitalSignsData {
  // Body Temperature
  bodyTemperature?: {
    temperature?: number;
    temperatureUnit?: "°C" | "°F";
    comment?: string;
  };
  // Blood Pressure
  bloodPressure?: {
    systolic?: number;
    diastolic?: number;
    meanArterialPressure?: number;
    pulsePressure?: number;
    unit?: "mm[Hg]";
    clinicalInterpretation?: string;
    comment?: string;
  };
  // Pulse/Heart Rate
  pulseHeartRate?: {
    presence?: "Present" | "Absent";
    rate?: number;
    rateUnit?: "/min";
    regularity?: "Regular" | "Irregular";
    irregularType?: string;
    character?: string;
    clinicalDescription?: string;
    comment?: string;
  };
  // Respiration
  respiration?: {
    presence?: "Present" | "Absent";
    rate?: number;
    rateUnit?: "/min";
    regularity?: "Regular" | "Irregular";
    depth?: "Normal" | "Shallow" | "Deep";
    clinicalDescription?: string;
    clinicalInterpretation?: string;
    comment?: string;
  };
  // Oximetry
  oximetry?: {
    spO2?: number;
    spOC?: number;
    spCO?: number;
    spMet?: number;
    waveform?: string;
    multiMediaImage?: string;
    interpretation?: string;
    comment?: string;
  };
}

export default function VitalSignsForm({
  patientId,
  workspaceId,
  ehrId,
  onSuccess,
}: VitalSignsFormProps) {
  const [loading, setLoading] = useState(false);
  const [vitalSigns, setVitalSigns] = useState<VitalSignsData>({
    bodyTemperature: {
      temperatureUnit: "°C",
    },
    bloodPressure: {
      unit: "mm[Hg]",
    },
    pulseHeartRate: {
      rateUnit: "/min",
      presence: "Present",
      regularity: "Regular",
    },
    respiration: {
      rateUnit: "/min",
      presence: "Present",
      regularity: "Regular",
      depth: "Normal",
    },
    oximetry: {},
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        `/api/d/${workspaceId}/patients/${patientId}/vital-signs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ehrId,
            vitalSigns,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save vital signs");
      }

      alert("Vital signs recorded successfully");

      // Reset form
      setVitalSigns({
        bodyTemperature: { temperatureUnit: "°C" },
        bloodPressure: { unit: "mm[Hg]" },
        pulseHeartRate: {
          rateUnit: "/min",
          presence: "Present",
          regularity: "Regular",
        },
        respiration: {
          rateUnit: "/min",
          presence: "Present",
          regularity: "Regular",
          depth: "Normal",
        },
        oximetry: {},
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error saving vital signs:", error);
      alert(error instanceof Error ? error.message : "Failed to save vital signs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Body Temperature */}
      <Card className="vital-box">
        <CardHeader>
          <CardTitle>Body Temperature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                placeholder="36.5"
                value={vitalSigns.bodyTemperature?.temperature || ""}
                onChange={(e) =>
                  setVitalSigns({
                    ...vitalSigns,
                    bodyTemperature: {
                      ...vitalSigns.bodyTemperature,
                      temperature: parseFloat(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempUnit">Unit</Label>
              <Select
                value={vitalSigns.bodyTemperature?.temperatureUnit}
                onValueChange={(value: "°C" | "°F") =>
                  setVitalSigns({
                    ...vitalSigns,
                    bodyTemperature: {
                      ...vitalSigns.bodyTemperature,
                      temperatureUnit: value,
                    },
                  })
                }
              >
                <SelectTrigger id="tempUnit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="°C">°C</SelectItem>
                  <SelectItem value="°F">°F</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tempComment">Comment</Label>
            <Textarea
              id="tempComment"
              placeholder="Additional notes..."
              value={vitalSigns.bodyTemperature?.comment || ""}
              onChange={(e) =>
                setVitalSigns({
                  ...vitalSigns,
                  bodyTemperature: {
                    ...vitalSigns.bodyTemperature,
                    comment: e.target.value,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Blood Pressure */}
      <Card className="vital-box">
        <CardHeader>
          <CardTitle>Blood Pressure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="systolic">Systolic (mm[Hg])</Label>
              <Input
                id="systolic"
                type="number"
                placeholder="120"
                value={vitalSigns.bloodPressure?.systolic || ""}
                onChange={(e) =>
                  setVitalSigns({
                    ...vitalSigns,
                    bloodPressure: {
                      ...vitalSigns.bloodPressure,
                      systolic: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diastolic">Diastolic (mm[Hg])</Label>
              <Input
                id="diastolic"
                type="number"
                placeholder="80"
                value={vitalSigns.bloodPressure?.diastolic || ""}
                onChange={(e) =>
                  setVitalSigns({
                    ...vitalSigns,
                    bloodPressure: {
                      ...vitalSigns.bloodPressure,
                      diastolic: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meanArterial">Mean Arterial Pressure</Label>
              <Input
                id="meanArterial"
                type="number"
                placeholder="93"
                value={vitalSigns.bloodPressure?.meanArterialPressure || ""}
                onChange={(e) =>
                  setVitalSigns({
                    ...vitalSigns,
                    bloodPressure: {
                      ...vitalSigns.bloodPressure,
                      meanArterialPressure: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pulsePressure">Pulse Pressure</Label>
              <Input
                id="pulsePressure"
                type="number"
                placeholder="40"
                value={vitalSigns.bloodPressure?.pulsePressure || ""}
                onChange={(e) =>
                  setVitalSigns({
                    ...vitalSigns,
                    bloodPressure: {
                      ...vitalSigns.bloodPressure,
                      pulsePressure: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bpInterpretation">Clinical Interpretation</Label>
            <Input
              id="bpInterpretation"
              placeholder="Normal, Elevated, etc."
              value={vitalSigns.bloodPressure?.clinicalInterpretation || ""}
              onChange={(e) =>
                setVitalSigns({
                  ...vitalSigns,
                  bloodPressure: {
                    ...vitalSigns.bloodPressure,
                    clinicalInterpretation: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bpComment">Comment</Label>
            <Textarea
              id="bpComment"
              placeholder="Additional notes..."
              value={vitalSigns.bloodPressure?.comment || ""}
              onChange={(e) =>
                setVitalSigns({
                  ...vitalSigns,
                  bloodPressure: {
                    ...vitalSigns.bloodPressure,
                    comment: e.target.value,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Pulse/Heart Rate */}
      <Card className="vital-box">
        <CardHeader>
          <CardTitle>Pulse/Heart Rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pulsePresence">Presence</Label>
              <Select
                value={vitalSigns.pulseHeartRate?.presence}
                onValueChange={(value: "Present" | "Absent") =>
                  setVitalSigns({
                    ...vitalSigns,
                    pulseHeartRate: {
                      ...vitalSigns.pulseHeartRate,
                      presence: value,
                    },
                  })
                }
              >
                <SelectTrigger id="pulsePresence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="heartRate">Rate (/min)</Label>
              <Input
                id="heartRate"
                type="number"
                placeholder="72"
                value={vitalSigns.pulseHeartRate?.rate || ""}
                onChange={(e) =>
                  setVitalSigns({
                    ...vitalSigns,
                    pulseHeartRate: {
                      ...vitalSigns.pulseHeartRate,
                      rate: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pulseRegularity">Regularity</Label>
              <Select
                value={vitalSigns.pulseHeartRate?.regularity}
                onValueChange={(value: "Regular" | "Irregular") =>
                  setVitalSigns({
                    ...vitalSigns,
                    pulseHeartRate: {
                      ...vitalSigns.pulseHeartRate,
                      regularity: value,
                    },
                  })
                }
              >
                <SelectTrigger id="pulseRegularity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Irregular">Irregular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="irregularType">Irregular Type</Label>
              <Input
                id="irregularType"
                placeholder="If irregular..."
                value={vitalSigns.pulseHeartRate?.irregularType || ""}
                onChange={(e) =>
                  setVitalSigns({
                    ...vitalSigns,
                    pulseHeartRate: {
                      ...vitalSigns.pulseHeartRate,
                      irregularType: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pulseCharacter">Character</Label>
            <Input
              id="pulseCharacter"
              placeholder="Strong, weak, bounding..."
              value={vitalSigns.pulseHeartRate?.character || ""}
              onChange={(e) =>
                setVitalSigns({
                  ...vitalSigns,
                  pulseHeartRate: {
                    ...vitalSigns.pulseHeartRate,
                    character: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pulseClinical">Clinical Description</Label>
            <Textarea
              id="pulseClinical"
              placeholder="Clinical description..."
              value={vitalSigns.pulseHeartRate?.clinicalDescription || ""}
              onChange={(e) =>
                setVitalSigns({
                  ...vitalSigns,
                  pulseHeartRate: {
                    ...vitalSigns.pulseHeartRate,
                    clinicalDescription: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pulseComment">Comment</Label>
            <Textarea
              id="pulseComment"
              placeholder="Additional notes..."
              value={vitalSigns.pulseHeartRate?.comment || ""}
              onChange={(e) =>
                setVitalSigns({
                  ...vitalSigns,
                  pulseHeartRate: {
                    ...vitalSigns.pulseHeartRate,
                    comment: e.target.value,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Respiration */}
      <Card className="vital-box">
        <CardHeader>
          <CardTitle>Respiration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="respPresence">Presence</Label>
              <Select
                value={vitalSigns.respiration?.presence}
                onValueChange={(value: "Present" | "Absent") =>
                  setVitalSigns({
                    ...vitalSigns,
                    respiration: {
                      ...vitalSigns.respiration,
                      presence: value,
                    },
                  })
                }
              >
                <SelectTrigger id="respPresence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="respRate">Rate (/min)</Label>
              <Input
                id="respRate"
                type="number"
                placeholder="16"
                value={vitalSigns.respiration?.rate || ""}
                onChange={(e) =>
                  setVitalSigns({
                    ...vitalSigns,
                    respiration: {
                      ...vitalSigns.respiration,
                      rate: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="respRegularity">Regularity</Label>
              <Select
                value={vitalSigns.respiration?.regularity}
                onValueChange={(value: "Regular" | "Irregular") =>
                  setVitalSigns({
                    ...vitalSigns,
                    respiration: {
                      ...vitalSigns.respiration,
                      regularity: value,
                    },
                  })
                }
              >
                <SelectTrigger id="respRegularity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Irregular">Irregular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="respDepth">Depth</Label>
              <Select
                value={vitalSigns.respiration?.depth}
                onValueChange={(value: "Normal" | "Shallow" | "Deep") =>
                  setVitalSigns({
                    ...vitalSigns,
                    respiration: {
                      ...vitalSigns.respiration,
                      depth: value,
                    },
                  })
                }
              >
                <SelectTrigger id="respDepth">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Shallow">Shallow</SelectItem>
                  <SelectItem value="Deep">Deep</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="respClinical">Clinical Description</Label>
            <Textarea
              id="respClinical"
              placeholder="Clinical description..."
              value={vitalSigns.respiration?.clinicalDescription || ""}
              onChange={(e) =>
                setVitalSigns({
                  ...vitalSigns,
                  respiration: {
                    ...vitalSigns.respiration,
                    clinicalDescription: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="respInterpretation">Clinical Interpretation</Label>
            <Input
              id="respInterpretation"
              placeholder="Normal, Tachypnea, etc."
              value={vitalSigns.respiration?.clinicalInterpretation || ""}
              onChange={(e) =>
                setVitalSigns({
                  ...vitalSigns,
                  respiration: {
                    ...vitalSigns.respiration,
                    clinicalInterpretation: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="respComment">Comment</Label>
            <Textarea
              id="respComment"
              placeholder="Additional notes..."
              value={vitalSigns.respiration?.comment || ""}
              onChange={(e) =>
                setVitalSigns({
                  ...vitalSigns,
                  respiration: {
                    ...vitalSigns.respiration,
                    comment: e.target.value,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Oximetry */}
      <Card className="vital-box">
        <CardHeader>
          <CardTitle>Oximetry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="spO2">SpO2 (%)</Label>
              <Input
                id="spO2"
                type="number"
                step="0.1"
                placeholder="98"
                value={vitalSigns.oximetry?.spO2 || ""}
                onChange={(e) =>
                  setVitalSigns({
                    ...vitalSigns,
                    oximetry: {
                      ...vitalSigns.oximetry,
                      spO2: parseFloat(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spOC">SpOC (%)</Label>
              <Input
                id="spOC"
                type="number"
                step="0.1"
                placeholder="Optional"
                value={vitalSigns.oximetry?.spOC || ""}
                onChange={(e) =>
                  setVitalSigns({
                    ...vitalSigns,
                    oximetry: {
                      ...vitalSigns.oximetry,
                      spOC: parseFloat(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="spCO">SpCO (%)</Label>
              <Input
                id="spCO"
                type="number"
                step="0.1"
                placeholder="Optional"
                value={vitalSigns.oximetry?.spCO || ""}
                onChange={(e) =>
                  setVitalSigns({
                    ...vitalSigns,
                    oximetry: {
                      ...vitalSigns.oximetry,
                      spCO: parseFloat(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spMet">SpMet (%)</Label>
              <Input
                id="spMet"
                type="number"
                step="0.1"
                placeholder="Optional"
                value={vitalSigns.oximetry?.spMet || ""}
                onChange={(e) =>
                  setVitalSigns({
                    ...vitalSigns,
                    oximetry: {
                      ...vitalSigns.oximetry,
                      spMet: parseFloat(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="oxInterpretation">Interpretation</Label>
            <Textarea
              id="oxInterpretation"
              placeholder="Clinical interpretation..."
              value={vitalSigns.oximetry?.interpretation || ""}
              onChange={(e) =>
                setVitalSigns({
                  ...vitalSigns,
                  oximetry: {
                    ...vitalSigns.oximetry,
                    interpretation: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oxComment">Comment</Label>
            <Textarea
              id="oxComment"
              placeholder="Additional notes..."
              value={vitalSigns.oximetry?.comment || ""}
              onChange={(e) =>
                setVitalSigns({
                  ...vitalSigns,
                  oximetry: {
                    ...vitalSigns.oximetry,
                    comment: e.target.value,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Vital Signs"}
        </Button>
      </div>
    </form>
  );
}
