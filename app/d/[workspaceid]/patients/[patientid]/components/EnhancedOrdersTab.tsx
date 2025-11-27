"use client";
import React, { useCallback, useEffect, useRef, useReducer, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, History, Package, TestTube, Building2 } from "lucide-react";

// ---------- Types ----------
export interface TestOrderRecord {
  composition_uid: string;
  recorded_time: string;
  service_name: string;
  service_type_code: string;
  service_type_value: string;
  description?: string;
  clinical_indication: string;
  urgency: string;
  requested_date?: string;
  requesting_provider?: string;
  receiving_provider?: string;
  request_status?: string;
  timing?: string;
  request_id?: string;
  narrative?: string;
  test_category?: string;
  is_package?: boolean;
  target_lab?: string;
}

interface TestItem {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
  material?: string;
  snomedCode?: string;
}

interface TestPackage {
  id: string;
  name: string;
  category: string;
  description: string;
  tests: string[];
  snomedCode?: string;
  price?: number;
}

interface Laboratory {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  specialties: string[];
  turnaround: string;
}

interface TestOrderForm {
  target_lab: string;
  selectedPackage: string;
  selectedTests: string[];
  clinical_indication: string;
  urgency: "routine" | "urgent" | "stat";
  requesting_provider: string;
  narrative: string;
};

interface EnhancedOrdersTabProps {
  workspaceid: string;
  patientid: string;
}

// ---------- Comprehensive Test Catalog Based on Lab Structure ----------
const TEST_PACKAGES: Record<string, TestPackage> = {
  // HEMATOLOGY
  "cbc": {
    id: "cbc",
    name: "Complete Blood Count (CBC)",
    category: "Hematology",
    description: "Comprehensive blood analysis including red cells, white cells, platelets and related parameters",
    tests: ["rbc", "wbc", "hemoglobin", "hematocrit", "platelets", "esr", "pt-aptt", "reticulocyte"],
    snomedCode: "104177005",
  },
  "peripheral-blood-smear": {
    id: "peripheral-blood-smear",
    name: "Peripheral Blood Smear",
    category: "Hematology",
    description: "Microscopic examination of blood cells for abnormalities",
    tests: ["sickle-cells", "blasts", "parasites"],
    snomedCode: "104177006",
  },
  "anemia-workup": {
    id: "anemia-workup",
    name: "Anemia Workup",
    category: "Hematology",
    description: "Complete evaluation for anemia including iron studies",
    tests: ["ferritin", "iron", "b12", "folate", "bleeding-time", "clotting-time", "pt-inr", "aptt"],
    snomedCode: "394979004",
  },
  "hematology-specialized": {
    id: "hematology-specialized",
    name: "Specialized Hematology Tests",
    category: "Hematology",
    description: "Advanced hematology tests for specific conditions",
    tests: ["malaria-parasite", "microfilaria", "iron-studies-hb-electrophoresis", "bone-marrow-exam"],
    snomedCode: "394979005",
  },

  // BIOCHEMISTRY
  "liver-function": {
    id: "liver-function",
    name: "Liver Function Tests (LFT)",
    category: "Biochemistry",
    description: "Comprehensive liver function tests including enzymes, proteins, and bilirubin",
    tests: ["alt", "ast", "alp", "ggt", "ldh", "bilirubin", "albumin", "pt-inr-lft"],
    snomedCode: "166712004",
  },
  "kidney-function": {
    id: "kidney-function",
    name: "Kidney Function Tests (KFT)",
    category: "Biochemistry",
    description: "Complete renal function assessment",
    tests: ["creatinine", "urea", "egfr"],
    snomedCode: "166735006",
  },
  "urinalysis": {
    id: "urinalysis",
    name: "Urinalysis",
    category: "Biochemistry",
    description: "Comprehensive urine analysis including chemistry",
    tests: ["urine-protein", "urine-glucose", "urine-ketones", "urine-blood", "urine-bilirubin", "urine-nitrite-leukocyte", "urine-24h-creatinine"],
    snomedCode: "309902002",
  },
  "lipid-glucose": {
    id: "lipid-glucose",
    name: "Lipid Profile & Glucose Tests",
    category: "Biochemistry",
    description: "Complete lipid and glucose analysis",
    tests: ["hdl", "ldl", "triglycerides", "vldl", "glucose", "hba1c", "fpg", "ogtt"],
    snomedCode: "473010000",
  },
  "electrolyte-metabolic": {
    id: "electrolyte-metabolic",
    name: "Electrolyte & Metabolic Panel",
    category: "Biochemistry",
    description: "Complete electrolyte and metabolic assessment",
    tests: ["sodium", "potassium", "calcium", "chloride", "bicarbonate", "uric-acid", "protein-electrophoresis"],
    snomedCode: "271236005",
  },

  // MICROBIOLOGY
  "blood-culture": {
    id: "blood-culture",
    name: "Blood Culture",
    category: "Microbiology",
    description: "Detection of bloodstream infections",
    tests: ["bacteremia", "fungemia"],
    snomedCode: "30088009",
  },
  "urine-culture": {
    id: "urine-culture",
    name: "Urine Culture",
    category: "Microbiology",
    description: "Detection of urinary tract infections",
    tests: ["uti-diagnosis"],
    snomedCode: "275885009",
  },
  "sputum-culture": {
    id: "sputum-culture",
    name: "Sputum Culture",
    category: "Microbiology",
    description: "Detection of respiratory infections",
    tests: ["sputum-culture-test"],
    snomedCode: "269911007",
  },
  "stool-tests": {
    id: "stool-tests",
    name: "Stool Tests",
    category: "Microbiology",
    description: "Comprehensive stool analysis",
    tests: ["stool-parasites", "c-difficile", "occult-blood", "pcr-naat"],
    snomedCode: "104435004",
  },

  // IMMUNOLOGY
  "general-immunology": {
    id: "general-immunology",
    name: "General Immunology Tests",
    category: "Immunology",
    description: "Basic immunological markers",
    tests: ["ana", "rf", "anti-ccp", "crp"],
    snomedCode: "252385000",
  },
  "hepatitis-viral": {
    id: "hepatitis-viral",
    name: "Hepatitis & Viral Markers",
    category: "Immunology",
    description: "Comprehensive viral infection screening",
    tests: ["hbsag", "anti-hbs", "anti-hbc", "anti-hcv", "hiv-antibody", "covid19-antibody"],
    snomedCode: "424972004",
  },
  "torch-panel": {
    id: "torch-panel",
    name: "TORCH Panel",
    category: "Immunology",
    description: "Screening for congenital infections",
    tests: ["toxoplasmosis", "rubella", "cmv", "herpes"],
    snomedCode: "252385001",
  },
  "autoimmune-panel": {
    id: "autoimmune-panel",
    name: "Autoimmune Panel",
    category: "Immunology",
    description: "Comprehensive autoimmune disease screening",
    tests: ["vdrl", "tpha", "ana-autoimmune", "anti-dsdna", "anti-smith", "anti-rnp", "anti-ssa-ssb", "anca", "ama", "anti-tpo-thyroglobulin"],
    snomedCode: "252385002",
  },
  "allergy-tests": {
    id: "allergy-tests",
    name: "Allergy Tests",
    category: "Immunology",
    description: "Allergy screening and specific allergen testing",
    tests: ["total-ige", "allergen-specific-ige", "skin-prick-tests"],
    snomedCode: "252385003",
  },
  "quantitative-immunoglobulins": {
    id: "quantitative-immunoglobulins",
    name: "Quantitative Immunoglobulins",
    category: "Immunology",
    description: "Measurement of immunoglobulin levels",
    tests: ["igg", "iga", "igm", "ige"],
    snomedCode: "252385004",
  },
  "complement-levels": {
    id: "complement-levels",
    name: "Complement Levels",
    category: "Immunology",
    description: "Complement system assessment",
    tests: ["c3", "c4", "ch50"],
    snomedCode: "252385005",
  },
  "flow-cytometry": {
    id: "flow-cytometry",
    name: "Flow Cytometry",
    category: "Immunology",
    description: "Lymphocyte subset analysis",
    tests: ["cd4", "cd3"],
    snomedCode: "252385006",
  },
  "tumor-markers": {
    id: "tumor-markers",
    name: "Tumor Markers",
    category: "Immunology",
    description: "Cancer screening markers",
    tests: ["cea", "ca125", "ca199", "beta2-glycoprotein-anticardiolipin"],
    snomedCode: "399370006",
  },

  // HISTOPATHOLOGY
  "routine-histopathology": {
    id: "routine-histopathology",
    name: "Routine Histopathology",
    category: "Histopathology",
    description: "Standard tissue and cell examination",
    tests: ["biopsy-exam", "cervical-cancer-screening", "fnac"],
    snomedCode: "252385007",
  },
  "special-stains": {
    id: "special-stains",
    name: "Special Stains",
    category: "Histopathology",
    description: "Advanced staining techniques for diagnosis",
    tests: ["pas", "ziehl-neelsen", "silver-stain", "ihc"],
    snomedCode: "252385008",
  },
  "molecular-pathology": {
    id: "molecular-pathology",
    name: "Molecular Pathology",
    category: "Histopathology",
    description: "Molecular and genetic testing",
    tests: ["pcr-molecular", "fish", "genetic-sequencing", "urine-cytology", "sputum-cytology"],
    snomedCode: "252385009",
  },
  "body-fluid-cytology": {
    id: "body-fluid-cytology",
    name: "Body Fluid Cytology",
    category: "Histopathology",
    description: "Cytological examination of body fluids",
    tests: ["pleural-fluid", "peritoneal-fluid"],
    snomedCode: "252385010",
  },
};

const INDIVIDUAL_TESTS: Record<string, TestItem> = {
  // HEMATOLOGY - Complete Blood Count (CBC)
  "rbc": { id: "rbc", name: "RBCs", code: "RBC", category: "Hematology", material: "Blood", snomedCode: "165716006" },
  "wbc": { id: "wbc", name: "WBCs", code: "WBC", category: "Hematology", material: "Blood", snomedCode: "165717003" },
  "hemoglobin": { id: "hemoglobin", name: "Hemoglobin", code: "HGB", category: "Hematology", material: "Blood", snomedCode: "165718008" },
  "hematocrit": { id: "hematocrit", name: "Hematocrit", code: "HCT", category: "Hematology", material: "Blood", snomedCode: "165719001" },
  "platelets": { id: "platelets", name: "Platelets", code: "PLT", category: "Hematology", material: "Blood", snomedCode: "165720006" },
  "esr": { id: "esr", name: "ESR", code: "ESR", category: "Hematology", material: "Blood", snomedCode: "165725002" },
  "pt-aptt": { id: "pt-aptt", name: "PT/aPTT", code: "PT-APTT", category: "Hematology", material: "Blood", snomedCode: "165726001" },
  "reticulocyte": { id: "reticulocyte", name: "Reticulocyte Count", code: "RETIC", category: "Hematology", material: "Blood", snomedCode: "165731004" },

  // HEMATOLOGY - Peripheral Blood Smear
  "sickle-cells": { id: "sickle-cells", name: "Sickle Cells", code: "SICKLE", category: "Hematology", material: "Blood", snomedCode: "165732001" },
  "blasts": { id: "blasts", name: "Blasts", code: "BLAST", category: "Hematology", material: "Blood", snomedCode: "165733002" },
  "parasites": { id: "parasites", name: "Parasites", code: "PARA", category: "Hematology", material: "Blood", snomedCode: "165734003" },

  // HEMATOLOGY - Anemia Workup
  "ferritin": { id: "ferritin", name: "Ferritin", code: "FERR", category: "Hematology", material: "Blood", snomedCode: "165776002" },
  "iron": { id: "iron", name: "Iron", code: "IRON", category: "Hematology", material: "Blood", snomedCode: "165777001" },
  "b12": { id: "b12", name: "Vitamin B12", code: "B12", category: "Hematology", material: "Blood", snomedCode: "165778006" },
  "folate": { id: "folate", name: "Folate", code: "FOLATE", category: "Hematology", material: "Blood", snomedCode: "165779000" },
  "bleeding-time": { id: "bleeding-time", name: "Bleeding Time (BT)", code: "BT", category: "Hematology", material: "Blood", snomedCode: "165729008" },
  "clotting-time": { id: "clotting-time", name: "Clotting Time (CT)", code: "CT", category: "Hematology", material: "Blood", snomedCode: "165730003" },
  "pt-inr": { id: "pt-inr", name: "Prothrombin Time (PT & INR)", code: "PT-INR", category: "Hematology", material: "Blood", snomedCode: "165726001" },
  "aptt": { id: "aptt", name: "APTT", code: "APTT", category: "Hematology", material: "Blood", snomedCode: "165727005" },

  // HEMATOLOGY - Specialized Tests
  "malaria-parasite": { id: "malaria-parasite", name: "Malaria Parasite Detection", code: "MALARIA", category: "Hematology", material: "Blood", snomedCode: "165735001" },
  "microfilaria": { id: "microfilaria", name: "Microfilaria Test", code: "MICROF", category: "Hematology", material: "Blood", snomedCode: "165736002" },
  "iron-studies-hb-electrophoresis": { id: "iron-studies-hb-electrophoresis", name: "Iron Studies & Hemoglobin Electrophoresis", code: "IRON-HB", category: "Hematology", material: "Blood", snomedCode: "165737003" },
  "bone-marrow-exam": { id: "bone-marrow-exam", name: "Bone Marrow Examination", code: "BM-EXAM", category: "Hematology", material: "Bone Marrow", snomedCode: "165738004" },

  // Biochemistry - Liver Function
  "alt": { id: "alt", name: "Alanine Aminotransferase (ALT)", code: "ALT", category: "Biochemistry", material: "Blood", snomedCode: "165732008" },
  "ast": { id: "ast", name: "Aspartate Aminotransferase (AST)", code: "AST", category: "Biochemistry", material: "Blood", snomedCode: "165733007" },
  "alp": { id: "alp", name: "Alkaline Phosphatase (ALP)", code: "ALP", category: "Biochemistry", material: "Blood", snomedCode: "165734001" },
  "ggt": { id: "ggt", name: "Gamma-Glutamyl Transferase (GGT)", code: "GGT", category: "Biochemistry", material: "Blood", snomedCode: "165735000" },
  "bilirubin-total": { id: "bilirubin-total", name: "Total Bilirubin", code: "TBIL", category: "Biochemistry", material: "Blood", snomedCode: "165736009" },
  "bilirubin-direct": { id: "bilirubin-direct", name: "Direct Bilirubin", code: "DBIL", category: "Biochemistry", material: "Blood", snomedCode: "165737000" },
  "albumin": { id: "albumin", name: "Albumin", code: "ALB", category: "Biochemistry", material: "Blood", snomedCode: "165738005" },
  "total-protein": { id: "total-protein", name: "Total Protein", code: "TP", category: "Biochemistry", material: "Blood", snomedCode: "165739002" },
  "ldh": { id: "ldh", name: "Lactate Dehydrogenase (LDH)", code: "LDH", category: "Biochemistry", material: "Blood", snomedCode: "165740001" },

  // Biochemistry - Kidney Function
  "creatinine": { id: "creatinine", name: "Creatinine", code: "CRE", category: "Biochemistry", material: "Blood", snomedCode: "165741006" },
  "urea": { id: "urea", name: "Urea", code: "UREA", category: "Biochemistry", material: "Blood", snomedCode: "165742004" },
  "egfr": { id: "egf", name: "Estimated Glomerular Filtration Rate (eGFR)", code: "eGFR", category: "Biochemistry", material: "Blood", snomedCode: "165743009" },
  "sodium": { id: "sodium", name: "Sodium", code: "NA", category: "Biochemistry", material: "Blood", snomedCode: "165744003" },
  "potassium": { id: "potassium", name: "Potassium", code: "K", category: "Biochemistry", material: "Blood", snomedCode: "165745002" },
  "chloride": { id: "chloride", name: "Chloride", code: "CL", category: "Biochemistry", material: "Blood", snomedCode: "165746001" },
  "bicarbonate": { id: "bicarbonate", name: "Bicarbonate", code: "HCO3", category: "Biochemistry", material: "Blood", snomedCode: "165747000" },
  "uric-acid": { id: "uric-acid", name: "Uric Acid", code: "UA", category: "Biochemistry", material: "Blood", snomedCode: "165748005" },

  // Biochemistry - Lipid Profile
  "total-cholesterol": { id: "total-cholesterol", name: "Total Cholesterol", code: "TC", category: "Biochemistry", material: "Blood", snomedCode: "165749004" },
  "hdl": { id: "hdl", name: "High-Density Lipoprotein (HDL)", code: "HDL", category: "Biochemistry", material: "Blood", snomedCode: "165750006" },
  "ldl": { id: "ldl", name: "Low-Density Lipoprotein (LDL)", code: "LDL", category: "Biochemistry", material: "Blood", snomedCode: "165751007" },
  "triglycerides": { id: "triglycerides", name: "Triglycerides (TG)", code: "TG", category: "Biochemistry", material: "Blood", snomedCode: "165752000" },
  "vldl": { id: "vldl", name: "Very Low-Density Lipoprotein (VLDL)", code: "VLDL", category: "Biochemistry", material: "Blood", snomedCode: "165753005" },

  // Biochemistry - Glucose
  "fasting-glucose": { id: "fasting-glucose", name: "Fasting Plasma Glucose (FPG)", code: "FPG", category: "Biochemistry", material: "Blood", snomedCode: "165754004" },
  "hba1c": { id: "hba1c", name: "Glycated Hemoglobin (HbA1c)", code: "HBA1C", category: "Biochemistry", material: "Blood", snomedCode: "165755003" },
  "ogtt": { id: "ogtt", name: "Oral Glucose Tolerance Test (OGTT)", code: "OGTT", category: "Biochemistry", material: "Blood", snomedCode: "165756002" },

  // Biochemistry - Urinalysis
  "urine-protein": { id: "urine-protein", name: "Urine Protein", code: "UP", category: "Biochemistry", material: "Urine", snomedCode: "165757001" },
  "urine-glucose": { id: "urine-glucose", name: "Urine Glucose", code: "UG", category: "Biochemistry", material: "Urine", snomedCode: "165758006" },
  "urine-ketones": { id: "urine-ketones", name: "Urine Ketones", code: "UK", category: "Biochemistry", material: "Urine", snomedCode: "165759000" },
  "urine-blood": { id: "urine-blood", name: "Urine Blood", code: "UB", category: "Biochemistry", material: "Urine", snomedCode: "165760005" },
  "urine-bilirubin": { id: "urine-bilirubin", name: "Urine Bilirubin", code: "UBIL", category: "Biochemistry", material: "Urine", snomedCode: "165761004" },
  "urine-nitrite": { id: "urine-nitrite", name: "Urine Nitrite", code: "UNI", category: "Biochemistry", material: "Urine", snomedCode: "165762008" },
  "urine-leukocyte": { id: "urine-leukocyte", name: "Urine Leukocyte Esterase", code: "ULE", category: "Biochemistry", material: "Urine", snomedCode: "165763003" },
  "urine-ph": { id: "urine-ph", name: "Urine pH", code: "UPH", category: "Biochemistry", material: "Urine", snomedCode: "165764007" },
  "urine-specific-gravity": { id: "urine-specific-gravity", name: "Urine Specific Gravity", code: "USG", category: "Biochemistry", material: "Urine", snomedCode: "165765001" },
  "urine-microscopy": { id: "urine-microscopy", name: "Urine Microscopy", code: "UMIC", category: "Biochemistry", material: "Urine", snomedCode: "165766000" },

  // BIOCHEMISTRY - Additional tests
  "bilirubin": { id: "bilirubin", name: "Bilirubin", code: "BIL", category: "Biochemistry", material: "Blood", snomedCode: "165736009" },
  "pt-inr-lft": { id: "pt-inr-lft", name: "PT/INR", code: "PT-INR", category: "Biochemistry", material: "Blood", snomedCode: "165726001" },
  "urine-nitrite-leukocyte": { id: "urine-nitrite-leukocyte", name: "Nitrites & Leukocyte Esterase", code: "NIT-LE", category: "Biochemistry", material: "Urine", snomedCode: "165762008" },
  "urine-24h-creatinine": { id: "urine-24h-creatinine", name: "24-hours Urine Creatinine Clearance", code: "24H-CRE", category: "Biochemistry", material: "Urine", snomedCode: "165780001" },
  "glucose": { id: "glucose", name: "Glucose", code: "GLU", category: "Biochemistry", material: "Blood", snomedCode: "165754004" },
  "fpg": { id: "fpg", name: "Fasting Plasma Glucose (FPG)", code: "FPG", category: "Biochemistry", material: "Blood", snomedCode: "165754005" },
  "calcium": { id: "calcium", name: "Calcium (Ca)", code: "CA", category: "Biochemistry", material: "Blood", snomedCode: "165781001" },
  "protein-electrophoresis": { id: "protein-electrophoresis", name: "Protein Electrophoresis", code: "PROT-ELEC", category: "Biochemistry", material: "Blood", snomedCode: "165782001" },

  // MICROBIOLOGY
  "bacteremia": { id: "bacteremia", name: "Bacteremia", code: "BACT", category: "Microbiology", material: "Blood", snomedCode: "165783001" },
  "fungemia": { id: "fungemia", name: "Fungemia", code: "FUNG", category: "Microbiology", material: "Blood", snomedCode: "165784001" },
  "uti-diagnosis": { id: "uti-diagnosis", name: "UTI Diagnosis", code: "UTI", category: "Microbiology", material: "Urine", snomedCode: "165785001" },
  "sputum-culture-test": { id: "sputum-culture-test", name: "Sputum Culture", code: "SPUT", category: "Microbiology", material: "Sputum", snomedCode: "165786001" },
  "stool-parasites": { id: "stool-parasites", name: "Parasites", code: "PARA-ST", category: "Microbiology", material: "Stool", snomedCode: "165787001" },
  "c-difficile": { id: "c-difficile", name: "C. difficile", code: "C-DIFF", category: "Microbiology", material: "Stool", snomedCode: "165788001" },
  "occult-blood": { id: "occult-blood", name: "Occult Blood", code: "OB", category: "Microbiology", material: "Stool", snomedCode: "165789001" },
  "pcr-naat": { id: "pcr-naat", name: "PCR/NAAT", code: "PCR", category: "Microbiology", material: "Various", snomedCode: "165790001" },

  // IMMUNOLOGY - General
  "ana": { id: "ana", name: "ANA", code: "ANA", category: "Immunology", material: "Blood", snomedCode: "165791001" },
  "rf": { id: "rf", name: "RF", code: "RF", category: "Immunology", material: "Blood", snomedCode: "165792001" },
  "anti-ccp": { id: "anti-ccp", name: "Anti-CCP", code: "ANTI-CCP", category: "Immunology", material: "Blood", snomedCode: "165793001" },
  "crp": { id: "crp", name: "CRP", code: "CRP", category: "Immunology", material: "Blood", snomedCode: "165794001" },

  // IMMUNOLOGY - Hepatitis & Viral
  "hbsag": { id: "hbsag", name: "HBsAg", code: "HBsAg", category: "Immunology", material: "Blood", snomedCode: "165767009" },
  "anti-hbs": { id: "anti-hbs", name: "Anti-HBs", code: "Anti-HBs", category: "Immunology", material: "Blood", snomedCode: "165768004" },
  "anti-hbc": { id: "anti-hbc", name: "Anti-HBc", code: "Anti-HBc", category: "Immunology", material: "Blood", snomedCode: "165769007" },
  "anti-hcv": { id: "anti-hcv", name: "Anti-HCV", code: "Anti-HCV", category: "Immunology", material: "Blood", snomedCode: "165770001" },
  "hiv-antibody": { id: "hiv-antibody", name: "HIV Antibody", code: "HIV-AB", category: "Immunology", material: "Blood", snomedCode: "165795001" },
  "covid19-antibody": { id: "covid19-antibody", name: "COVID-19 Antibody", code: "COVID-AB", category: "Immunology", material: "Blood", snomedCode: "165796001" },

  // IMMUNOLOGY - TORCH Panel
  "toxoplasmosis": { id: "toxoplasmosis", name: "Toxoplasmosis", code: "TOXO", category: "Immunology", material: "Blood", snomedCode: "165797001" },
  "rubella": { id: "rubella", name: "Rubella", code: "RUB", category: "Immunology", material: "Blood", snomedCode: "165798001" },
  "cmv": { id: "cmv", name: "CMV", code: "CMV", category: "Immunology", material: "Blood", snomedCode: "165799001" },
  "herpes": { id: "herpes", name: "Herpes", code: "HSV", category: "Immunology", material: "Blood", snomedCode: "165800001" },

  // IMMUNOLOGY - Autoimmune Panel
  "vdrl": { id: "vdrl", name: "VDRL", code: "VDRL", category: "Immunology", material: "Blood", snomedCode: "165801001" },
  "tpha": { id: "tpha", name: "TPHA", code: "TPHA", category: "Immunology", material: "Blood", snomedCode: "165802001" },
  "ana-autoimmune": { id: "ana-autoimmune", name: "ANA", code: "ANA", category: "Immunology", material: "Blood", snomedCode: "165791001" },
  "anti-dsdna": { id: "anti-dsdna", name: "Anti-dsDNA", code: "ANTI-DSDNA", category: "Immunology", material: "Blood", snomedCode: "165803001" },
  "anti-smith": { id: "anti-smith", name: "Anti-Smith", code: "ANTI-SM", category: "Immunology", material: "Blood", snomedCode: "165804001" },
  "anti-rnp": { id: "anti-rnp", name: "Anti-RNP", code: "ANTI-RNP", category: "Immunology", material: "Blood", snomedCode: "165805001" },
  "anti-ssa-ssb": { id: "anti-ssa-ssb", name: "Anti-SSA / Anti-SSB", code: "ANTI-SSA-SSB", category: "Immunology", material: "Blood", snomedCode: "165806001" },
  "anca": { id: "anca", name: "ANCA", code: "ANCA", category: "Immunology", material: "Blood", snomedCode: "165807001" },
  "ama": { id: "ama", name: "AMA", code: "AMA", category: "Immunology", material: "Blood", snomedCode: "165808001" },
  "anti-tpo-thyroglobulin": { id: "anti-tpo-thyroglobulin", name: "Anti-TPO & Anti-Thyroglobulin", code: "ANTI-TPO-TG", category: "Immunology", material: "Blood", snomedCode: "165809001" },

  // IMMUNOLOGY - Allergy Tests
  "total-ige": { id: "total-ige", name: "Total IgE", code: "TOTAL-IGE", category: "Immunology", material: "Blood", snomedCode: "165810001" },
  "allergen-specific-ige": { id: "allergen-specific-ige", name: "Allergen-specific IgE", code: "SPEC-IGE", category: "Immunology", material: "Blood", snomedCode: "165811001" },
  "skin-prick-tests": { id: "skin-prick-tests", name: "Skin Prick Tests", code: "SPT", category: "Immunology", material: "Skin", snomedCode: "165812001" },

  // IMMUNOLOGY - Quantitative Immunoglobulins
  "igg": { id: "igg", name: "IgG", code: "IGG", category: "Immunology", material: "Blood", snomedCode: "165813001" },
  "iga": { id: "iga", name: "IgA", code: "IGA", category: "Immunology", material: "Blood", snomedCode: "165814001" },
  "igm": { id: "igm", name: "IgM", code: "IGM", category: "Immunology", material: "Blood", snomedCode: "165815001" },
  "ige": { id: "ige", name: "IgE", code: "IGE", category: "Immunology", material: "Blood", snomedCode: "165816001" },

  // IMMUNOLOGY - Complement Levels
  "c3": { id: "c3", name: "C3", code: "C3", category: "Immunology", material: "Blood", snomedCode: "165817001" },
  "c4": { id: "c4", name: "C4", code: "C4", category: "Immunology", material: "Blood", snomedCode: "165818001" },
  "ch50": { id: "ch50", name: "CH50", code: "CH50", category: "Immunology", material: "Blood", snomedCode: "165819001" },

  // IMMUNOLOGY - Flow Cytometry
  "cd4": { id: "cd4", name: "CD4", code: "CD4", category: "Immunology", material: "Blood", snomedCode: "165820001" },
  "cd3": { id: "cd3", name: "CD3 Counts", code: "CD3", category: "Immunology", material: "Blood", snomedCode: "165821001" },

  // IMMUNOLOGY - Tumor Markers
  "cea": { id: "cea", name: "CEA", code: "CEA", category: "Immunology", material: "Blood", snomedCode: "165771005" },
  "ca125": { id: "ca125", name: "CA-125", code: "CA125", category: "Immunology", material: "Blood", snomedCode: "165772000" },
  "ca199": { id: "ca199", name: "CA-19-9", code: "CA199", category: "Immunology", material: "Blood", snomedCode: "165773009" },
  "beta2-glycoprotein-anticardiolipin": { id: "beta2-glycoprotein-anticardiolipin", name: "Beta-2 glycoprotein & Anticardiolipin antibodies", code: "BETA2-ANTI", category: "Immunology", material: "Blood", snomedCode: "165822001" },

  // HISTOPATHOLOGY - Routine
  "biopsy-exam": { id: "biopsy-exam", name: "Biopsy Examination", code: "BIOPSY", category: "Histopathology", material: "Tissue", snomedCode: "165823001" },
  "cervical-cancer-screening": { id: "cervical-cancer-screening", name: "Cervical Cancer Screening", code: "PAP", category: "Histopathology", material: "Cervical Cells", snomedCode: "165824001" },
  "fnac": { id: "fnac", name: "FNAC", code: "FNAC", category: "Histopathology", material: "Aspirate", snomedCode: "165825001" },

  // HISTOPATHOLOGY - Special Stains
  "pas": { id: "pas", name: "PAS", code: "PAS", category: "Histopathology", material: "Tissue", snomedCode: "165826001" },
  "ziehl-neelsen": { id: "ziehl-neelsen", name: "Ziehl-Neelsen", code: "ZN", category: "Histopathology", material: "Tissue", snomedCode: "165827001" },
  "silver-stain": { id: "silver-stain", name: "Silver stain", code: "SILVER", category: "Histopathology", material: "Tissue", snomedCode: "165828001" },
  "ihc": { id: "ihc", name: "Immunohistochemistry (IHC)", code: "IHC", category: "Histopathology", material: "Tissue", snomedCode: "165829001" },

  // HISTOPATHOLOGY - Molecular Pathology
  "pcr-molecular": { id: "pcr-molecular", name: "PCR", code: "PCR", category: "Histopathology", material: "Tissue/Blood", snomedCode: "165830001" },
  "fish": { id: "fish", name: "FISH", code: "FISH", category: "Histopathology", material: "Tissue", snomedCode: "165831001" },
  "genetic-sequencing": { id: "genetic-sequencing", name: "Genetic Sequencing", code: "SEQ", category: "Histopathology", material: "Tissue/Blood", snomedCode: "165832001" },
  "urine-cytology": { id: "urine-cytology", name: "Urine Cytology", code: "URINE-CYTO", category: "Histopathology", material: "Urine", snomedCode: "165833001" },
  "sputum-cytology": { id: "sputum-cytology", name: "Sputum Cytology", code: "SPUTUM-CYTO", category: "Histopathology", material: "Sputum", snomedCode: "165834001" },

  // HISTOPATHOLOGY - Body Fluid Cytology
  "pleural-fluid": { id: "pleural-fluid", name: "Pleural Fluid", code: "PLEURAL", category: "Histopathology", material: "Pleural Fluid", snomedCode: "165835001" },
  "peritoneal-fluid": { id: "peritoneal-fluid", name: "Peritoneal Fluid", code: "PERITONEAL", category: "Histopathology", material: "Peritoneal Fluid", snomedCode: "165836001" },
};

const LABORATORIES: Record<string, Laboratory> = {
  "hematology-lab": {
    id: "hematology-lab",
    name: "Hematology",
    address: "Laboratory Department, Building A",
    phone: "(555) 123-4567",
    email: "hematology@hospital.com",
    specialties: ["Complete Blood Count", "Coagulation Studies", "Blood Smears", "Bone Marrow Analysis", "Anemia Workup"],
    turnaround: "Routine: 24 hours, STAT: 2-4 hours",
  },
  "biochemistry-lab": {
    id: "biochemistry-lab",
    name: "Biochemistry",
    address: "Laboratory Department, Building A",
    phone: "(555) 123-4568",
    email: "biochemistry@hospital.com",
    specialties: ["Liver Function Tests", "Kidney Function Tests", "Lipid Profile", "Glucose Studies", "Electrolytes", "Urinalysis"],
    turnaround: "Routine: 24-48 hours, STAT: 4-6 hours",
  },
  "microbiology-lab": {
    id: "microbiology-lab",
    name: "Microbiology & Infection Diseases",
    address: "Laboratory Department, Building B",
    phone: "(555) 123-4569",
    email: "microbiology@hospital.com",
    specialties: ["Blood Culture", "Urine Culture", "Sputum Culture", "Stool Tests", "PCR/NAAT", "Antimicrobial Susceptibility"],
    turnaround: "Routine: 48-72 hours, STAT: 24 hours (preliminary)",
  },
  "immunology-lab": {
    id: "immunology-lab",
    name: "Immunology & Serology",
    address: "Laboratory Department, Building B",
    phone: "(555) 123-4570",
    email: "immunology@hospital.com",
    specialties: ["Hepatitis Markers", "HIV Testing", "Tumor Markers", "Autoimmune Tests", "Allergy Testing", "TORCH Panel"],
    turnaround: "Routine: 3-5 days, STAT: 24-48 hours",
  },
  "histopathology-lab": {
    id: "histopathology-lab",
    name: "Histopathology & Cytology",
    address: "Laboratory Department, Building C",
    phone: "(555) 123-4571",
    email: "histopathology@hospital.com",
    specialties: ["Biopsy Examination", "FNAC", "Cervical Cancer Screening", "Special Stains", "Immunohistochemistry", "Cytology"],
    turnaround: "Routine: 5-7 days, STAT: 48-72 hours (frozen section: 30 min)",
  },
};

const DEFAULT_FORM: TestOrderForm = {
  target_lab: "",
  selectedPackage: "",
  selectedTests: [],
  clinical_indication: "",
  urgency: "routine",
  requesting_provider: "",
  narrative: "",
};

// ---------- Reducer ----------
type Action =
  | { type: "SET_FIELD"; field: keyof TestOrderForm; value: string | string[] | undefined }
  | { type: "SET_LAB"; labId: string }
  | { type: "SET_PACKAGE"; packageId: string }
  | { type: "TOGGLE_TEST"; testId: string }
  | { type: "SELECT_ALL_TESTS" }
  | { type: "CLEAR_ALL_TESTS" }
  | { type: "RESET"; keepRequester?: string };

function formReducer(state: TestOrderForm, action: Action): TestOrderForm {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_LAB":
      // When lab changes, reset package and tests
      return {
        ...state,
        target_lab: action.labId,
        selectedPackage: "",
        selectedTests: [],
      };
    case "SET_PACKAGE":
      const pkg = TEST_PACKAGES[action.packageId];
      return {
        ...state,
        selectedPackage: action.packageId,
        selectedTests: pkg ? pkg.tests : [],
      };
    case "TOGGLE_TEST":
      const isSelected = state.selectedTests.includes(action.testId);
      return {
        ...state,
        selectedTests: isSelected
          ? state.selectedTests.filter(id => id !== action.testId)
          : [...state.selectedTests, action.testId],
      };
    case "SELECT_ALL_TESTS":
      if (state.selectedPackage) {
        const pkg = TEST_PACKAGES[state.selectedPackage];
        return { ...state, selectedTests: pkg ? pkg.tests : [] };
      }
      return state;
    case "CLEAR_ALL_TESTS":
      return { ...state, selectedTests: [] };
    case "RESET":
      return {
        ...DEFAULT_FORM,
        requesting_provider: action.keepRequester ?? "",
      };
    default:
      return state;
  }
}

// ---------- Component ----------
export default function EnhancedOrdersTab({ workspaceid, patientid }: EnhancedOrdersTabProps) {
  const [showTestOrderForm, setShowTestOrderForm] = useState(false);
  const [testOrderRecords, setTestOrderRecords] = useState<TestOrderRecord[]>([]);
  const [loadingTestOrders, setLoadingTestOrders] = useState(false);
  const [loadingMoreTestOrders, setLoadingMoreTestOrders] = useState(false);
  const [testOrdersHasMore, setTestOrdersHasMore] = useState(false);
  const [selectedTestOrder, setSelectedTestOrder] = useState<TestOrderRecord | null>(null);
  const [showTestOrderDetails, setShowTestOrderDetails] = useState(false);
  const [savingTestOrder, setSavingTestOrder] = useState(false);

  const testOrdersOffsetRef = useRef(0);
  const hasLoadedTestOrders = useRef(false);
  const CACHE_KEY = `test_orders_enhanced_${patientid}`;

  // form reducer
  const [formState, dispatch] = useReducer(formReducer, DEFAULT_FORM);

  // memoized options
  const laboratoriesOptions = useMemo(() => Object.values(LABORATORIES), []);
  
  // Get lab category mapping
  const getLabCategory = (labId: string): string => {
    const labMap: Record<string, string> = {
      "hematology-lab": "Hematology",
      "biochemistry-lab": "Biochemistry",
      "microbiology-lab": "Microbiology",
      "immunology-lab": "Immunology",
      "histopathology-lab": "Histopathology",
    };
    return labMap[labId] || "";
  };

  // Filter packages by selected lab
  const availablePackages = useMemo(() => {
    if (!formState.target_lab) return [];
    const category = getLabCategory(formState.target_lab);
    return Object.values(TEST_PACKAGES).filter(pkg => pkg.category === category);
  }, [formState.target_lab]);

  // Load current user and populate requesting provider
  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) return;
        const data = await res.json();
        const currentUser = data.user;
        const provider = currentUser?.name || currentUser?.email || "Unknown Provider";
        if (mounted) {
          dispatch({ type: "SET_FIELD", field: "requesting_provider", value: provider });
        }
      } catch (err) {
        console.error("Failed to load user info", err);
      }
    };
    loadUser();
    return () => { mounted = false; };
  }, []);

  // Load test orders (using existing API for now)
  const loadTestOrders = useCallback(async (reset = true) => {
    try {
      if (reset) {
        setLoadingTestOrders(true);
        setTestOrderRecords([]);
        testOrdersOffsetRef.current = 0;
      } else {
        setLoadingMoreTestOrders(true);
      }

      const offset = testOrdersOffsetRef.current;
      const limit = reset ? 2 : 3;
      const res = await fetch(
        `/api/d/${workspaceid}/patients/${patientid}/test-orders?limit=${limit}&offset=${offset}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        console.error("Failed to load test orders", res.status);
        return;
      }
      const data = await res.json();

      if (reset) {
        setTestOrderRecords(data.testOrders || []);
        testOrdersOffsetRef.current = (data.testOrders || []).length;
        hasLoadedTestOrders.current = true;
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ testOrders: data.testOrders || [], hasMore: data.hasMore || false, offset: testOrdersOffsetRef.current }));
      } else {
        setTestOrderRecords(prev => {
          const newRecords = [...prev, ...(data.testOrders || [])];
          testOrdersOffsetRef.current = newRecords.length;
          return newRecords;
        });
      }
      setTestOrdersHasMore(data.hasMore || false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTestOrders(false);
      setLoadingMoreTestOrders(false);
    }
  }, [workspaceid, patientid, CACHE_KEY]);

  useEffect(() => {
    // Check if data is already cached in sessionStorage
    const cachedData = sessionStorage.getItem(CACHE_KEY);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.testOrders && parsed.testOrders.length > 0) {
          setTestOrderRecords(parsed.testOrders);
          testOrdersOffsetRef.current = parsed.offset || parsed.testOrders.length;
          setTestOrdersHasMore(parsed.hasMore || false);
          hasLoadedTestOrders.current = true;
          return; // Don't fetch if we have cached data
        }
      } catch (error) {
        console.error("Failed to parse cached test orders:", error);
      }
    }
    
    // Only load if not already loaded
    if (!hasLoadedTestOrders.current) {
      loadTestOrders(true);
    }
  }, []); // Empty dependency array - only run once on mount

  // Save order
  const saveTestOrder = useCallback(async () => {
    if (!formState.target_lab || !formState.selectedPackage || formState.selectedTests.length === 0 || !formState.clinical_indication) {
      alert("Please select laboratory, test group, tests, and fill in clinical indication");
      return;
    }

    setSavingTestOrder(true);
    
    try {
      // Get current user info
      const userResponse = await fetch("/api/auth/session");
      const userData = await userResponse.json();
      const currentUser = userData.user;
      const requesting = currentUser?.name || currentUser?.email || "Unknown Provider";

      // Prepare order data
      const pkg = TEST_PACKAGES[formState.selectedPackage];
      const selectedTestDetails = formState.selectedTests.map(id => INDIVIDUAL_TESTS[id]).filter(Boolean);
      const targetLab = LABORATORIES[formState.target_lab];
      
      const service_name = pkg.name;
      const service_type_value = "Test Group";
      const service_type_code = pkg.snomedCode || "";
      const test_category = pkg.category;
      
      // Include detailed test list in description with urgency
      const testNames = selectedTestDetails.map(test => test.name).join(", ");
      const description = `Test Group: ${pkg.name} | Category: ${pkg.category} | Laboratory: ${targetLab.name} | Selected Tests (${selectedTestDetails.length}/${pkg.tests.length}): ${testNames} | Urgency: ${formState.urgency}`;

      const orderData = {
        service_name,
        service_type_code,
        service_type_value,
        description,
        clinical_indication: formState.clinical_indication,
        urgency: formState.urgency,
        requesting_provider: requesting,
        receiving_provider: targetLab.name,
        narrative: formState.narrative || `${service_name} ordered due to ${formState.clinical_indication}`,
        test_category: test_category,
        is_package: true,
        target_lab: targetLab.name,
      };

      console.log("Creating test order - this may take up to 30 seconds...");
      
      const response = await fetch(`/api/d/${workspaceid}/patients/${patientid}/test-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testOrder: orderData }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save test order");
      }

      const result = await response.json();
      console.log("Saved test order", result);

      setShowTestOrderForm(false);
      dispatch({ type: "RESET", keepRequester: requesting });

      // reload list
      hasLoadedTestOrders.current = false;
      sessionStorage.removeItem(CACHE_KEY);
      setTimeout(() => loadTestOrders(true), 500);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save test order";
      
      // Provide more specific error messages
      if (errorMessage.includes("taking too long")) {
        alert("The EHR system is responding slowly. Please try again in a moment.");
      } else {
        alert(errorMessage);
      }
    } finally {
      setSavingTestOrder(false);
    }
  }, [formState, workspaceid, patientid, CACHE_KEY, loadTestOrders]);

  // Handlers
  const onFieldChange = useCallback((field: keyof TestOrderForm, value: string | string[] | undefined) => {
    dispatch({ type: "SET_FIELD", field, value });
  }, []);

  const getSelectedTestsDetails = useCallback(() => {
    return formState.selectedTests.map(id => INDIVIDUAL_TESTS[id]).filter(Boolean);
  }, [formState.selectedTests]);

  const getSelectedTestsByCategory = useCallback(() => {
    const tests = getSelectedTestsDetails();
    const grouped: Record<string, TestItem[]> = {};
    tests.forEach(test => {
      if (!grouped[test.category]) grouped[test.category] = [];
      grouped[test.category].push(test);
    });
    return grouped;
  }, [getSelectedTestsDetails]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xl font-semibold">Enhanced Laboratory Test Orders</CardTitle>
            <div className="flex items-center gap-2">
              <Button className="bg-blue-500 hover:bg-blue-700 text-white flex items-center gap-1" size="sm" onClick={() => setShowTestOrderForm(true)}>
                <Plus className="h-4 w-4" />
                New Test Order
              </Button>

              {testOrdersHasMore && (
                <Button onClick={() => loadTestOrders(false)} disabled={loadingMoreTestOrders} variant="outline" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-none flex items-center gap-2">
                  {loadingMoreTestOrders ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <History className="h-4 w-4" />
                      History
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loadingTestOrders ? (
            <div className="text-center py-8 text-muted-foreground">Loading test orders...</div>
          ) : testOrderRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">No test orders have been recorded yet</div>
              <Button size="sm" onClick={() => setShowTestOrderForm(true)}>Add First Test Order</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Test Name</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">Target Lab</th>
                    <th className="text-left p-3 font-medium">Urgency</th>
                    <th className="text-left p-3 font-medium">Date Ordered</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {testOrderRecords.map((order, index) => (
                    <tr key={order.composition_uid} className={`border-b ${index % 2 === 0 ? 'bg-background' : 'bg-muted/25'} hover:bg-muted/50 transition-colors`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {order.is_package ? <Package className="h-4 w-4 text-blue-500" /> : <TestTube className="h-4 w-4 text-green-500" />}
                          <div>
                            <div className="font-medium">{order.service_name}</div>
                            {order.description && <div className="text-xs text-muted-foreground line-clamp-1">{order.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {order.test_category && (
                          <Badge variant="outline" className="text-xs">
                            {order.test_category}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-sm">{order.target_lab || '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                          order.urgency === 'urgent' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>{order.urgency || 'routine'}</span>
                      </td>
                      <td className="p-3 text-sm">{new Date(order.recorded_time).toLocaleDateString()}</td>
                      <td className="p-3">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedTestOrder(order); setShowTestOrderDetails(true); }}>Details</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Form Dialog */}
      <Dialog open={showTestOrderForm} onOpenChange={setShowTestOrderForm}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Laboratory Tests</DialogTitle>
            <DialogDescription>Create comprehensive test orders with packages and lab selection</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step 1: Laboratory Selection */}
            <div>
              <label htmlFor="lab-select" className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Step 1: Select Laboratory
              </label>
              <select
                id="lab-select"
                className="w-full px-3 py-2 border rounded-md"
                value={formState.target_lab}
                onChange={(e) => dispatch({ type: "SET_LAB", labId: e.target.value })}
              >
                <option value="">-- Select a laboratory --</option>
                {laboratoriesOptions.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name}
                  </option>
                ))}
              </select>
              
              {/* Show lab details when selected */}
              {formState.target_lab && LABORATORIES[formState.target_lab] && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm">
                  <div className="font-medium">{LABORATORIES[formState.target_lab].name}</div>
                  <div className="text-gray-600 mt-1">{LABORATORIES[formState.target_lab].address}</div>
                  <div className="text-gray-600">{LABORATORIES[formState.target_lab].phone}</div>
                  <div className="text-gray-600 mt-2">
                    <span className="font-medium">Turnaround: </span>
                    {LABORATORIES[formState.target_lab].turnaround}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Test Group Selection (only shown after lab is selected) */}
            {formState.target_lab && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="package-select" className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Step 2: Select Test Group
                  </label>
                  <select
                    id="package-select"
                    className="w-full px-3 py-2 border rounded-md"
                    value={formState.selectedPackage}
                    onChange={(e) => dispatch({ type: "SET_PACKAGE", packageId: e.target.value })}
                  >
                    <option value="">-- Select a test group --</option>
                    {availablePackages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} - {pkg.tests.length} tests
                      </option>
                    ))}
                  </select>
                  {availablePackages.length > 0 && (
                    <p className="text-sm text-blue-600 mt-2">
                      {availablePackages.length} test group{availablePackages.length !== 1 ? 's' : ''} available for {LABORATORIES[formState.target_lab]?.name}
                    </p>
                  )}
                  {availablePackages.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">No test groups available for this laboratory</p>
                  )}
                </div>

                {/* Show package details and tests when selected */}
                {formState.selectedPackage && TEST_PACKAGES[formState.selectedPackage] && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <div>
                      <h4 className="font-medium text-blue-900">{TEST_PACKAGES[formState.selectedPackage].name}</h4>
                      <p className="text-sm text-blue-700 mt-1">{TEST_PACKAGES[formState.selectedPackage].description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{TEST_PACKAGES[formState.selectedPackage].category}</Badge>
                        <span className="text-xs text-blue-600">{TEST_PACKAGES[formState.selectedPackage].tests.length} tests included</span>
                      </div>
                    </div>

                    <div className="border-t border-blue-200 pt-3">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-blue-900 flex items-center gap-2">
                          <TestTube className="h-4 w-4" />
                          Step 3: Select Individual Tests
                        </label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => dispatch({ type: "SELECT_ALL_TESTS" })}
                            className="text-xs"
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => dispatch({ type: "CLEAR_ALL_TESTS" })}
                            className="text-xs"
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto bg-white p-3 rounded border border-blue-200">
                        {TEST_PACKAGES[formState.selectedPackage].tests.map((testId) => {
                          const test = INDIVIDUAL_TESTS[testId];
                          if (!test) return null;
                          return (
                            <label key={testId} className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded cursor-pointer">
                              <Checkbox
                                checked={formState.selectedTests.includes(testId)}
                                onCheckedChange={() => dispatch({ type: "TOGGLE_TEST", testId })}
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium">{test.name}</div>
                                <div className="text-xs text-muted-foreground">{test.code} • {test.material}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <div className="mt-2 text-sm text-blue-700">
                        <strong>{formState.selectedTests.length}</strong> of <strong>{TEST_PACKAGES[formState.selectedPackage].tests.length}</strong> tests selected
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Selected Tests Summary */}
            {formState.selectedTests.length > 0 && (
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Selected Tests Summary</h4>
                <div className="space-y-2">
                  {Object.entries(getSelectedTestsByCategory()).map(([category, tests]) => (
                    <div key={category}>
                      <div className="text-sm font-medium text-blue-600">{category} ({tests.length})</div>
                      <div className="text-xs text-muted-foreground ml-4">
                        {tests.map(test => test.name).join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clinical Indication */}
            <div>
              <label htmlFor="clinical_indication" className="text-sm font-medium">Clinical Indication *</label>
              <textarea 
                id="clinical_indication" 
                className="w-full mt-1 px-3 py-2 border rounded-md" 
                rows={3} 
                placeholder="e.g., Patient presents with fatigue and fever; rule out infection or anemia." 
                value={formState.clinical_indication} 
                onChange={(e) => onFieldChange("clinical_indication", e.target.value)} 
              />
            </div>

            {/* Urgency */}
            <div>
              <label htmlFor="urgency" className="text-sm font-medium">Urgency</label>
              <select 
                id="urgency" 
                className="w-full mt-1 px-3 py-2 border rounded-md" 
                value={formState.urgency} 
                onChange={(e) => onFieldChange("urgency", e.target.value)}
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Narrative */}
            <div>
              <label htmlFor="narrative" className="text-sm font-medium">Narrative Summary</label>
              <textarea 
                id="narrative" 
                className="w-full mt-1 px-3 py-2 border rounded-md" 
                rows={2} 
                placeholder="Brief summary of the test order" 
                value={formState.narrative} 
                onChange={(e) => onFieldChange("narrative", e.target.value)} 
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowTestOrderForm(false)} disabled={savingTestOrder}>Cancel</Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white" 
                onClick={saveTestOrder}
                disabled={savingTestOrder}
              >
                {savingTestOrder ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Order... (up to 30s)
                  </>
                ) : (
                  "Order Tests"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Details Dialog */}
      <Dialog open={showTestOrderDetails} onOpenChange={setShowTestOrderDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Order Details</DialogTitle>
            <DialogDescription>Complete information about this laboratory test order</DialogDescription>
          </DialogHeader>

          {selectedTestOrder && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Test Information</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-sm text-gray-500">Test Name:</span>
                    <p className="font-medium">{selectedTestOrder.service_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Category:</span>
                    <p className="font-medium">
                      {selectedTestOrder.test_category ? (
                        <Badge variant="outline">{selectedTestOrder.test_category}</Badge>
                      ) : (
                        'Not specified'
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Target Lab:</span>
                    <p className="font-medium">{selectedTestOrder.target_lab || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Urgency:</span>
                    <p className="font-medium capitalize">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedTestOrder.urgency === 'urgent' ? 'bg-red-100 text-red-800' :
                        'bg-green-100 text-green-800'
                      }`}>{selectedTestOrder.urgency || 'routine'}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Date Ordered:</span>
                    <p className="text-sm">{new Date(selectedTestOrder.recorded_time).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {selectedTestOrder.description && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Test Details</h4>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{selectedTestOrder.description}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium">Clinical Information</h4>
                <div className="mt-2">
                  <span className="text-sm text-gray-500">Clinical Indication:</span>
                  <p className="text-sm mt-1">{selectedTestOrder.clinical_indication || 'Not specified'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium">Provider Information</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-sm text-gray-500">Requesting Provider:</span>
                    <p className="font-medium">{selectedTestOrder.requesting_provider || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Receiving Laboratory:</span>
                    <p className="font-medium">{selectedTestOrder.receiving_provider || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {selectedTestOrder.narrative && (
                <div>
                  <h4 className="font-medium">Narrative</h4>
                  <p className="text-sm mt-1">{selectedTestOrder.narrative}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium">Timestamps</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-sm text-gray-500">Date Ordered:</span>
                    <p className="text-sm">{new Date(selectedTestOrder.recorded_time).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Request ID:</span>
                    <p className="text-sm">{selectedTestOrder.request_id || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestOrderDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
