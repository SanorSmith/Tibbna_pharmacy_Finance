"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { Loader2 } from "lucide-react";
import { ClinicalEncounterComposition } from "@/lib/openehr/encounter";

interface AddEncounterDialogProps {
  ehrId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddEncounterDialog({
  ehrId,
  isOpen,
  onClose,
  onSuccess,
}: AddEncounterDialogProps) {
  const { ttt } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    composerName: "",
    facilityName: "",
    startTime: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
    diagnosisName: "",
    diagnosisDescription: "",
    systolicBP: "",
    diastolicBP: "",
    heartRate: "",
    bodyTemperature: "",
    respiratoryRate: "",
    spO2: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Build the composition in FLAT format
      const composition: ClinicalEncounterComposition = {
        "template_clinical_encounter_v2/category|terminology": "openehr",
        "template_clinical_encounter_v2/category|code": "433",
        "template_clinical_encounter_v2/category|value": "event",
        "template_clinical_encounter_v2/context/start_time":
          formData.startTime + ":00",
        "template_clinical_encounter_v2/context/setting|value": "home",
        "template_clinical_encounter_v2/context/setting|code": "225",
        "template_clinical_encounter_v2/context/setting|terminology": "openehr",
        "template_clinical_encounter_v2/context/_end_time":
          formData.startTime + ":00",
        "template_clinical_encounter_v2/context/_health_care_facility|name":
          formData.facilityName || "Default Facility",
        "template_clinical_encounter_v2/language|code": "en",
        "template_clinical_encounter_v2/language|terminology": "ISO_639-1",
        "template_clinical_encounter_v2/territory|terminology": "ISO_3166-1",
        "template_clinical_encounter_v2/territory|code": "SE",
        "template_clinical_encounter_v2/composer|name":
          formData.composerName || "Unknown",
      };

      // Add diagnosis if provided
      if (formData.diagnosisName) {
        Object.assign(composition, {
          "template_clinical_encounter_v2/problem_diagnosis/problem_diagnosis_name":
            formData.diagnosisName,
          "template_clinical_encounter_v2/problem_diagnosis/clinical_description":
            formData.diagnosisDescription,
          "template_clinical_encounter_v2/problem_diagnosis/severity|value":
            "Mild",
          "template_clinical_encounter_v2/problem_diagnosis/severity|terminology":
            "local",
          "template_clinical_encounter_v2/problem_diagnosis/severity|code":
            "at0047",
          "template_clinical_encounter_v2/problem_diagnosis/language|code":
            "en",
          "template_clinical_encounter_v2/problem_diagnosis/language|terminology":
            "ISO_639-1",
          "template_clinical_encounter_v2/problem_diagnosis/encoding|code":
            "UTF-8",
          "template_clinical_encounter_v2/problem_diagnosis/encoding|terminology":
            "IANA_character-sets",
        });
      }

      // Add vital signs if provided
      if (
        formData.systolicBP ||
        formData.diastolicBP ||
        formData.heartRate ||
        formData.bodyTemperature ||
        formData.respiratoryRate ||
        formData.spO2
      ) {
        const vitalSigns: Partial<ClinicalEncounterComposition> = {
          "template_clinical_encounter_v2/vital_signs/any_event:0/time":
            formData.startTime + ":00",
          "template_clinical_encounter_v2/vital_signs/language|terminology":
            "ISO_639-1",
          "template_clinical_encounter_v2/vital_signs/language|code": "en",
          "template_clinical_encounter_v2/vital_signs/encoding|code": "UTF-8",
          "template_clinical_encounter_v2/vital_signs/encoding|terminology":
            "IANA_character-sets",
        };

        if (formData.systolicBP) {
          vitalSigns[
            "template_clinical_encounter_v2/vital_signs/any_event:0/systolic_blood_pressure|magnitude"
          ] = parseFloat(formData.systolicBP);
          vitalSigns[
            "template_clinical_encounter_v2/vital_signs/any_event:0/systolic_blood_pressure|unit"
          ] = "mm[Hg]";
        }

        if (formData.diastolicBP) {
          vitalSigns[
            "template_clinical_encounter_v2/vital_signs/any_event:0/diastolic_blood_pressure|magnitude"
          ] = parseFloat(formData.diastolicBP);
          vitalSigns[
            "template_clinical_encounter_v2/vital_signs/any_event:0/diastolic_blood_pressure|unit"
          ] = "mm[Hg]";
        }

        if (formData.heartRate) {
          vitalSigns[
            "template_clinical_encounter_v2/vital_signs/any_event:0/heart_rate|magnitude"
          ] = parseFloat(formData.heartRate);
          vitalSigns[
            "template_clinical_encounter_v2/vital_signs/any_event:0/heart_rate|unit"
          ] = "/min";
        }

        if (formData.bodyTemperature) {
          vitalSigns[
            "template_clinical_encounter_v2/vital_signs/any_event:0/body_temperature|magnitude"
          ] = parseFloat(formData.bodyTemperature);
          vitalSigns[
            "template_clinical_encounter_v2/vital_signs/any_event:0/body_temperature|unit"
          ] = "°C";
        }
        if (formData.respiratoryRate) {
          vitalSigns[
            "template_clinical_encounter_v2/vital_signs/any_event:0/respiratory_rate|magnitude"
          ] = parseFloat(formData.respiratoryRate);
          vitalSigns[
            "template_clinical_encounter_v2/vital_signs/any_event:0/respiratory_rate|unit"
          ] = "/min";
        }
        if (formData.spO2) {
          vitalSigns[
            "template_clinical_encounter_v2/vital_signs/any_event:0/oxygen_saturation_spo2|magnitude"
          ] = parseFloat(formData.spO2);
          vitalSigns[
            "template_clinical_encounter_v2/vital_signs/any_event:0/oxygen_saturation_spo2|unit"
          ] = "%";
        }
        Object.assign(composition, vitalSigns);
      }

      const response = await fetch("/api/ehrbase/encounters/encounter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ehrId,
          composition,
        }),
      });

      if (!response.ok) {
        throw new Error(ttt("Failed to create encounter"));
      }

      // Success - reset form and close
      setFormData({
        composerName: "",
        facilityName: "",
        startTime: new Date().toISOString().slice(0, 16),
        diagnosisName: "",
        diagnosisDescription: "",
        systolicBP: "",
        diastolicBP: "",
        heartRate: "",
        bodyTemperature: "",
        respiratoryRate: "",
        spO2: "",
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : ttt("Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ttt("Add Encounter")}</DialogTitle>
          <DialogDescription>
            {ttt("Create a new clinical encounter for this EHR")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">{ttt("Basic Information")}</h3>

            <div className="space-y-2">
              <Label htmlFor="composerName">{ttt("Composer Name")} *</Label>
              <Input
                id="composerName"
                required
                value={formData.composerName}
                onChange={(e) =>
                  setFormData({ ...formData, composerName: e.target.value })
                }
                placeholder={ttt("Enter composer name")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facilityName">{ttt("Facility Name")}</Label>
              <Input
                id="facilityName"
                value={formData.facilityName}
                onChange={(e) =>
                  setFormData({ ...formData, facilityName: e.target.value })
                }
                placeholder={ttt("Enter facility name")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">{ttt("Start Time")} *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                required
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
              />
            </div>
          </div>

          {/* Diagnosis */}
          <div className="space-y-4">
            <h3 className="font-semibold">{ttt("Diagnosis")}</h3>

            <div className="space-y-2">
              <Label htmlFor="diagnosisName">{ttt("Diagnosis Name")}</Label>
              <Input
                id="diagnosisName"
                value={formData.diagnosisName}
                onChange={(e) =>
                  setFormData({ ...formData, diagnosisName: e.target.value })
                }
                placeholder={ttt("Enter diagnosis name")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosisDescription">
                {ttt("Clinical Description")}
              </Label>
              <Textarea
                id="diagnosisDescription"
                value={formData.diagnosisDescription}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    diagnosisDescription: e.target.value,
                  })
                }
                placeholder={ttt("Enter clinical description")}
                rows={3}
              />
            </div>
          </div>

          {/* Vital Signs */}
          <div className="space-y-4">
            <h3 className="font-semibold">{ttt("Vital Signs")}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="systolicBP">
                  {ttt("Systolic BP")} (mm[Hg])
                </Label>
                <Input
                  id="systolicBP"
                  type="number"
                  step="0.1"
                  value={formData.systolicBP}
                  onChange={(e) =>
                    setFormData({ ...formData, systolicBP: e.target.value })
                  }
                  placeholder="120"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diastolicBP">
                  {ttt("Diastolic BP")} (mm[Hg])
                </Label>
                <Input
                  id="diastolicBP"
                  type="number"
                  step="0.1"
                  value={formData.diastolicBP}
                  onChange={(e) =>
                    setFormData({ ...formData, diastolicBP: e.target.value })
                  }
                  placeholder="80"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="heartRate">{ttt("Heart Rate")} (/min)</Label>
                <Input
                  id="heartRate"
                  type="number"
                  step="0.1"
                  value={formData.heartRate}
                  onChange={(e) =>
                    setFormData({ ...formData, heartRate: e.target.value })
                  }
                  placeholder="72"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bodyTemperature">
                  {ttt("Body Temperature")} (°C)
                </Label>
                <Input
                  id="bodyTemperature"
                  type="number"
                  step="0.1"
                  value={formData.bodyTemperature}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bodyTemperature: e.target.value,
                    })
                  }
                  placeholder="37.0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="respiratoryRate">
                  {ttt("Respiratory Rate")} (/min)
                </Label>
                <Input
                  id="respiratoryRate"
                  type="number"
                  step="0.1"
                  value={formData.respiratoryRate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      respiratoryRate: e.target.value,
                    })
                  }
                  placeholder="16"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="spO2">{ttt("SpO2")} (%)</Label>
                <Input
                  id="spO2"
                  type="number"
                  step="0.1"
                  value={formData.spO2}
                  onChange={(e) =>
                    setFormData({ ...formData, spO2: e.target.value })
                  }
                  placeholder="98"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {ttt("Cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {ttt("Create Encounter")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
