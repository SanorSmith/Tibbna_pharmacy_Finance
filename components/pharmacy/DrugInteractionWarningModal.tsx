/**
 * Drug Interaction Warning Modal
 * Phase 2: Automatic interaction checking during dispensing
 * Shows warning when interactions are detected
 */

"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, XCircle, AlertCircle, Info, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Interaction {
  severity: "critical" | "major" | "moderate" | "minor";
  description: string;
  drugs: string[];
  source: string;
}

interface DrugInteractionWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interactions: Interaction[];
  drugs: string[];
  onProceed: (justification?: string) => void;
  onCancel: () => void;
}

export default function DrugInteractionWarningModal({
  open,
  onOpenChange,
  interactions,
  drugs,
  onProceed,
  onCancel,
}: DrugInteractionWarningModalProps) {
  const [justification, setJustification] = useState("");
  const [acknowledgeRisk, setAcknowledgeRisk] = useState(false);

  // Check if there are any critical interactions
  const hasCritical = interactions.some((i) => i.severity === "critical");
  const hasMajor = interactions.some((i) => i.severity === "major");

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "major":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "moderate":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "minor":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "major":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case "moderate":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "minor":
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleProceed = () => {
    if (hasCritical) {
      // Critical interactions cannot be overridden
      return;
    }

    if ((hasMajor || interactions.length > 0) && !justification.trim()) {
      alert("Please provide a justification for proceeding with this interaction.");
      return;
    }

    onProceed(justification);
    setJustification("");
    setAcknowledgeRisk(false);
  };

  const handleCancel = () => {
    onCancel();
    setJustification("");
    setAcknowledgeRisk(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            Drug Interaction Warning
          </DialogTitle>
          <DialogDescription>
            {interactions.length} potential interaction{interactions.length !== 1 ? "s" : ""}{" "}
            detected between the selected medications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drugs Being Dispensed */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Medications:</Label>
            <div className="flex flex-wrap gap-2">
              {drugs.map((drug, index) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  {drug}
                </Badge>
              ))}
            </div>
          </div>

          {/* Critical Warning Banner */}
          {hasCritical && (
            <Alert variant="destructive" className="border-2">
              <XCircle className="h-5 w-5" />
              <AlertDescription className="font-semibold">
                <strong>CRITICAL INTERACTION DETECTED</strong>
                <br />
                This combination is contraindicated and cannot be dispensed. Please consult with
                the prescribing physician immediately.
              </AlertDescription>
            </Alert>
          )}

          {/* Interactions List */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Detected Interactions:</Label>
            {interactions.map((interaction, index) => {
              const isAllergy = (interaction as any).type === "allergy";
              return (
                <div
                  key={index}
                  className={`border-2 rounded-lg p-4 ${
                    isAllergy ? "bg-red-50 border-red-400" : getSeverityColor(interaction.severity)
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isAllergy ? (
                      <XCircle className="h-6 w-6 text-red-700 animate-pulse" />
                    ) : (
                      getSeverityIcon(interaction.severity)
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {isAllergy && (
                          <Badge variant="destructive" className="uppercase text-xs font-bold">
                            ⚠️ ALLERGY
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`uppercase text-xs font-bold ${
                            isAllergy ? "border-red-400 text-red-700" : "border-current"
                          }`}
                        >
                          {interaction.severity}
                        </Badge>
                        <span className="text-xs font-medium">
                          {interaction.drugs.join(" + ")}
                        </span>
                      </div>
                      <p
                        className={`text-sm leading-relaxed mb-2 ${
                          isAllergy ? "font-semibold text-red-900" : ""
                        }`}
                      >
                        {interaction.description}
                      </p>
                      <p className="text-xs opacity-75">Source: {interaction.source}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Justification (required for major/moderate interactions) */}
          {!hasCritical && (hasMajor || interactions.length > 0) && (
            <div className="space-y-2">
              <Label htmlFor="justification" className="text-sm font-semibold">
                Clinical Justification <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="justification"
                placeholder="Provide clinical justification for proceeding despite the interaction warning..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-600">
                Required: Document why it is clinically appropriate to proceed with this
                combination.
              </p>
            </div>
          )}

          {/* Acknowledgment Checkbox */}
          {!hasCritical && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border">
              <input
                type="checkbox"
                id="acknowledge"
                checked={acknowledgeRisk}
                onChange={(e) => setAcknowledgeRisk(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="acknowledge" className="text-sm cursor-pointer">
                <strong>I acknowledge</strong> that I have reviewed the interaction warnings and
                take professional responsibility for proceeding with this dispensing decision.
              </label>
            </div>
          )}

          {/* Info Box */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">
              This interaction check uses FDA OpenFDA data and clinical databases. Always use
              professional judgment and consult additional references when needed.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel Dispensing
          </Button>
          {!hasCritical && (
            <Button
              onClick={handleProceed}
              disabled={
                !acknowledgeRisk || ((hasMajor || interactions.length > 0) && !justification.trim())
              }
              className="bg-orange-600 hover:bg-orange-700"
            >
              Proceed with Justification
            </Button>
          )}
          {hasCritical && (
            <Button disabled className="bg-red-600">
              Cannot Proceed - Critical Interaction
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
