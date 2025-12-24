"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [selectedNote, setSelectedNote] = useState<ClinicalNote | null>(null);
  const [showNoteDetails, setShowNoteDetails] = useState(false);

  // Use React Query for caching
  const { data: notes = [], isLoading: loadingNotes, refetch: loadClinicalNotes } = useQuery({
    queryKey: ["notes", workspaceid, patientid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/notes`);
      if (!res.ok) {
        throw new Error("Failed to load notes");
      }
      const data = await res.json();
      return (data.notes || []) as ClinicalNote[];
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-medium">Clinical Notes</CardTitle>
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
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No clinical notes recorded. Click &quot;+ New Note&quot; to
              create one.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Note Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Synopsis</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notes.map((note) => (
                    <TableRow key={note.composition_uid}>
                      <TableCell className="font-medium">
                        {note.note_title || "-"}
                      </TableCell>
                      <TableCell>
                        {note.note_type
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {note.synopsis}
                      </TableCell>
                      <TableCell>
                        {new Date(note.recorded_time).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </TableCell>
                      <TableCell>{note.author}</TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedNote(note);
                            setShowNoteDetails(true);
                          }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <div className="text-sm font-medium mb-3">
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
              <div className="text-sm font-medium mb-3">
                Additional Details
              </div>

              <div className="mb-3">
                <label className="text-sm font-medium">Status *</label>
                <select
                  className="w-full mt-1.5 px-3 py-2 border rounded-md"
                  id="noteStatus"
                  defaultValue="final"
                  aria-label="Note status"
                  title="Select the status of this clinical note"
                >
                  <option value="draft">Draft</option>
                  <option value="final">Final</option>
                  <option value="amended">Amended</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Draft: Work in progress | Final: Completed and signed | Amended: Modified after finalization
                </p>
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
                            status: (
                              document.getElementById(
                                "noteStatus"
                              ) as HTMLSelectElement
                            )?.value || "final",
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

      {/* Clinical Note Details Dialog */}
      <Dialog open={showNoteDetails} onOpenChange={setShowNoteDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Clinical Note Details</DialogTitle>
            <DialogDescription>
              Complete clinical note with SOAP format
            </DialogDescription>
          </DialogHeader>
          {selectedNote && (
            <div className="space-y-6">
              {/* Note Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Note Title
                  </label>
                  <div className="mt-1 text-md font-medium">
                    {selectedNote.note_title || "Untitled Note"}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Note Type
                  </label>
                  <div className="mt-1 text-md font-medium">
                    {selectedNote.note_type
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Date & Time
                  </label>
                  <div className="mt-1 text-md font-medium">
                    {new Date(selectedNote.recorded_time).toLocaleString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Author
                  </label>
                  <div className="mt-1 text-md font-medium">
                    {selectedNote.author} ({selectedNote.author_role})
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Status
                  </label>
                  <div className="mt-1">
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        selectedNote.status === "final"
                          ? "bg-green-100 text-green-800"
                          : selectedNote.status === "draft"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {selectedNote.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Synopsis */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-md text-blue-900 mb-2">
                  Synopsis
                </h4>
                <div className="text-blue-900 whitespace-pre-line">
                  {selectedNote.synopsis}
                </div>
              </div>

              {/* SOAP Format */}
              <div className="space-y-4">
                <h4 className="font-medium text-md">SOAP Documentation</h4>

                {selectedNote.subjective && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-700 mb-2">
                      Subjective
                    </h5>
                    <div className="text-gray-700 whitespace-pre-line">
                      {selectedNote.subjective}
                    </div>
                  </div>
                )}

                {selectedNote.objective && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-700 mb-2">
                      Objective
                    </h5>
                    <div className="text-gray-700 whitespace-pre-line">
                      {selectedNote.objective}
                    </div>
                  </div>
                )}

                {selectedNote.assessment && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-700 mb-2">
                      Assessment
                    </h5>
                    <div className="text-gray-700 whitespace-pre-line">
                      {selectedNote.assessment}
                    </div>
                  </div>
                )}

                {selectedNote.plan && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-700 mb-2">Plan</h5>
                    <div className="text-gray-700 whitespace-pre-line">
                      {selectedNote.plan}
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Information */}
              {(selectedNote.clinical_context || selectedNote.comment) && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium text-md">
                    Additional Information
                  </h4>

                  {selectedNote.clinical_context && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Clinical Context
                      </label>
                      <div className="mt-1 text-gray-700">
                        {selectedNote.clinical_context}
                      </div>
                    </div>
                  )}

                  {selectedNote.comment && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Comments
                      </label>
                      <div className="mt-1 text-gray-700">
                        {selectedNote.comment}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowNoteDetails(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
