"use client";
import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Clinical Notes interfaces (openEHR compliant)
export interface ClinicalNote {
  composition_uid: string;
  recorded_time: string;
  note_type: string;
  note_title?: string;
  synopsis: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  clinical_context?: string;
  comment?: string;
  author: string;
  author_role: string;
  status: string;
}

interface NotesTabProps {
  workspaceid: string;
  patientid: string;
}

export function NotesTab({ workspaceid, patientid }: NotesTabProps) {
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const loadClinicalNotes = useCallback(async () => {
    try {
      setLoadingNotes(true);
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/notes`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();
        setClinicalNotes(data.notes || []);
      }
    } catch (error) {
      console.error("Error loading clinical notes:", error);
    } finally {
      setLoadingNotes(false);
    }
  }, [workspaceid, patientid]);

  // Load clinical notes when component mounts
  useEffect(() => {
    loadClinicalNotes();
  }, [loadClinicalNotes]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Clinical Notes</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={() => setShowNoteForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              + New Note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingNotes ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading clinical notes...
            </div>
          ) : clinicalNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No clinical notes recorded. Click &quot;+ New Note&quot; to
              create one.
            </div>
          ) : (
            <div className="space-y-4">
              {clinicalNotes.map((note) => (
                <div
                  key={note.composition_uid}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {/* Note Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">
                        {note.note_title ||
                          note.note_type
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {new Date(note.recorded_time).toLocaleString()} •{" "}
                        {note.author} ({note.author_role})
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        note.status === "final"
                          ? "bg-green-100 text-green-800"
                          : note.status === "draft"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {note.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Synopsis */}
                  <div className="mb-3 p-3 bg-blue-50 rounded-md">
                    <div className="text-xs font-medium text-blue-900 mb-1">
                      SYNOPSIS
                    </div>
                    <div className="text-sm text-blue-900">
                      {note.synopsis}
                    </div>
                  </div>

                  {/* SOAP Format */}
                  {(note.subjective ||
                    note.objective ||
                    note.assessment ||
                    note.plan) && (
                    <div className="space-y-3">
                      {note.subjective && (
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            SUBJECTIVE
                          </div>
                          <div className="text-sm whitespace-pre-line">
                            {note.subjective}
                          </div>
                        </div>
                      )}
                      {note.objective && (
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            OBJECTIVE
                          </div>
                          <div className="text-sm whitespace-pre-line">
                            {note.objective}
                          </div>
                        </div>
                      )}
                      {note.assessment && (
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            ASSESSMENT
                          </div>
                          <div className="text-sm whitespace-pre-line">
                            {note.assessment}
                          </div>
                        </div>
                      )}
                      {note.plan && (
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            PLAN
                          </div>
                          <div className="text-sm whitespace-pre-line">
                            {note.plan}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Additional Details */}
                  {(note.clinical_context || note.comment) && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {note.clinical_context && (
                        <div className="text-xs">
                          <span className="font-medium text-muted-foreground">
                            Context:
                          </span>
                          <span className="ml-2">
                            {note.clinical_context}
                          </span>
                        </div>
                      )}
                      {note.comment && (
                        <div className="text-xs">
                          <span className="font-medium text-muted-foreground">
                            Comment:
                          </span>
                          <span className="ml-2">{note.comment}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clinical Note Form Dialog */}
      <Dialog open={showNoteForm} onOpenChange={setShowNoteForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Clinical Note</DialogTitle>
            <DialogDescription>
              Create a new clinical note for this patient using SOAP format
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Note Type and Title */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Note Type *</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  id="noteType"
                  defaultValue="progress_note"
                  aria-label="Clinical note type"
                  title="Select the type of clinical note"
                >
                  <option value="progress_note">Progress Note</option>
                  <option value="consultation_note">Consultation Note</option>
                  <option value="discharge_summary">Discharge Summary</option>
                  <option value="clinical_synopsis">Clinical Synopsis</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Note Title</label>
                <input
                  type="text"
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  placeholder="e.g., Follow-up Visit - Hypertension"
                  id="noteTitle"
                  aria-label="Clinical note title"
                  title="Enter a title for the clinical note"
                />
              </div>
            </div>

            {/* Synopsis */}
            <div>
              <label className="text-sm font-medium">
                Synopsis (Summary) *
              </label>
              <textarea
                className="w-full mt-1.5 px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Brief summary of the clinical encounter..."
                id="noteSynopsis"
                aria-label="Clinical note synopsis"
                title="Enter a brief summary of the clinical encounter"
              />
            </div>

            {/* SOAP Format */}
            <div className="border-t pt-4">
              <div className="text-sm font-semibold mb-3">
                SOAP Format (Optional but Recommended)
              </div>

              {/* Subjective */}
              <div className="mb-3">
                <label className="text-sm font-medium">Subjective</label>
                <textarea
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Patient's symptoms, complaints, and history..."
                  id="noteSubjective"
                  aria-label="Subjective clinical findings"
                  title="Enter patient's symptoms, complaints, and history"
                />
              </div>

              {/* Objective */}
              <div className="mb-3">
                <label className="text-sm font-medium">Objective</label>
                <textarea
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Physical examination findings, vital signs, lab results..."
                  id="noteObjective"
                  aria-label="Objective clinical findings"
                  title="Enter physical examination findings, vital signs, lab results"
                />
              </div>

              {/* Assessment */}
              <div className="mb-3">
                <label className="text-sm font-medium">Assessment</label>
                <textarea
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Diagnosis, differential diagnosis, clinical impression..."
                  id="noteAssessment"
                  aria-label="Clinical assessment"
                  title="Enter diagnosis, differential diagnosis, clinical impression"
                />
              </div>

              {/* Plan */}
              <div>
                <label className="text-sm font-medium">Plan</label>
                <textarea
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Treatment plan, medications, follow-up instructions..."
                  id="notePlan"
                  aria-label="Treatment plan"
                  title="Enter treatment plan, medications, follow-up instructions"
                />
              </div>
            </div>

            {/* Additional Details */}
            <div className="border-t pt-4">
              <div className="text-sm font-semibold mb-3">
                Additional Details
              </div>

              <div className="mb-3">
                <label className="text-sm font-medium">Clinical Context</label>
                <textarea
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  rows={2}
                  placeholder="Context of the encounter (e.g., routine follow-up, acute visit)..."
                  id="noteContext"
                  aria-label="Clinical context"
                  title="Enter context of the encounter (e.g., routine follow-up, acute visit)"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Comment</label>
                <textarea
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  rows={2}
                  placeholder="Additional comments or observations..."
                  id="noteComment"
                  aria-label="Additional clinical comments"
                  title="Enter additional comments or observations"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowNoteForm(false)}>
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={async () => {
                  const synopsis = (
                    document.getElementById(
                      "noteSynopsis"
                    ) as HTMLTextAreaElement
                  )?.value;

                  if (!synopsis) {
                    alert("Please provide a synopsis");
                    return;
                  }

                  try {
                    const res = await fetch(
                      `/api/d/${workspaceid}/patients/${patientid}/notes`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          note: {
                            noteType: (
                              document.getElementById(
                                "noteType"
                              ) as HTMLSelectElement
                            )?.value,
                            noteTitle: (
                              document.getElementById(
                                "noteTitle"
                              ) as HTMLInputElement
                            )?.value,
                            synopsis,
                            subjective: (
                              document.getElementById(
                                "noteSubjective"
                              ) as HTMLTextAreaElement
                            )?.value,
                            objective: (
                              document.getElementById(
                                "noteObjective"
                              ) as HTMLTextAreaElement
                            )?.value,
                            assessment: (
                              document.getElementById(
                                "noteAssessment"
                              ) as HTMLTextAreaElement
                            )?.value,
                            plan: (
                              document.getElementById(
                                "notePlan"
                              ) as HTMLTextAreaElement
                            )?.value,
                            clinicalContext: (
                              document.getElementById(
                                "noteContext"
                              ) as HTMLTextAreaElement
                            )?.value,
                            comment: (
                              document.getElementById(
                                "noteComment"
                              ) as HTMLTextAreaElement
                            )?.value,
                            status: "final",
                          },
                        }),
                      }
                    );

                    if (res.ok) {
                      await loadClinicalNotes();
                      setShowNoteForm(false);
                      // Clear form
                      (
                        document.getElementById("noteTitle") as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById(
                          "noteSynopsis"
                        ) as HTMLTextAreaElement
                      ).value = "";
                      (
                        document.getElementById(
                          "noteSubjective"
                        ) as HTMLTextAreaElement
                      ).value = "";
                      (
                        document.getElementById(
                          "noteObjective"
                        ) as HTMLTextAreaElement
                      ).value = "";
                      (
                        document.getElementById(
                          "noteAssessment"
                        ) as HTMLTextAreaElement
                      ).value = "";
                      (
                        document.getElementById(
                          "notePlan"
                        ) as HTMLTextAreaElement
                      ).value = "";
                      (
                        document.getElementById(
                          "noteContext"
                        ) as HTMLTextAreaElement
                      ).value = "";
                      (
                        document.getElementById(
                          "noteComment"
                        ) as HTMLTextAreaElement
                      ).value = "";
                    } else {
                      const error = await res.json();
                      alert(`Failed to create note: ${error.error}`);
                    }
                  } catch (error) {
                    console.error("Error creating note:", error);
                    alert("Failed to create note");
                  }
                }}
              >
                Create Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
