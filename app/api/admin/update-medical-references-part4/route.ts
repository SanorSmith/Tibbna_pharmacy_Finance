import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f";

interface MedicalReferenceData {
  testcode: string;
  bodysite: string;
  referencemin?: string;
  referencemax?: string;
  referencetext?: string;
  paniclow?: string;
  panichigh?: string;
  panictext?: string;
  clinicalindication: string;
  agegroup?: string;
  sex?: string;
}

// Part 4: MICROBIOLOGY, MOLECULAR BIOLOGY, HISTOPATHOLOGY
const medicalData: MedicalReferenceData[] = [
  // ==================== MICROBIOLOGY (82 tests) ====================
  
  // Abscess (6 tests)
  { testcode: "Abscess C/S manual", bodysite: "Abscess fluid", referencetext: "No growth or normal flora", clinicalindication: "Abscess infection; bacterial identification; antibiotic sensitivity; wound infection; soft tissue infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Abscess C/S automated", bodysite: "Abscess fluid", referencetext: "No growth or normal flora", clinicalindication: "Automated abscess culture; rapid bacterial identification; antimicrobial susceptibility", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Gram stain Abscess", bodysite: "Abscess fluid", referencetext: "No organisms seen", clinicalindication: "Rapid bacterial detection; abscess evaluation; empiric therapy guidance", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AFB stain Abscess", bodysite: "Abscess fluid", referencetext: "No AFB seen", clinicalindication: "Mycobacterial infection; tuberculosis abscess; atypical mycobacteria", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Total cells Abscess", bodysite: "Abscess fluid", referencetext: "Variable", clinicalindication: "Inflammatory response; infection severity; abscess cellularity", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Diff WBC Abscess", bodysite: "Abscess fluid", referencetext: "Predominantly neutrophils", clinicalindication: "Bacterial vs other infection; inflammatory pattern; infection type", agegroup: "ADULT", sex: "ANY" },
  
  // Urine Culture (4 tests)
  { testcode: "Urine C/S manual", bodysite: "Midstream urine", referencetext: "< 10,000 CFU/mL", clinicalindication: "Urinary tract infection; UTI; cystitis; pyelonephritis; dysuria; frequency", agegroup: "ADULT", sex: "ANY" },
  { testcode: "GUE", bodysite: "Midstream urine", referencetext: "Normal urinalysis", clinicalindication: "Urinalysis; UTI screening; hematuria; proteinuria; pyuria; kidney disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Gram stain Urine", bodysite: "Urine", referencetext: "No organisms", clinicalindication: "Rapid UTI detection; bacterial identification; pyuria evaluation", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AFB stain Urine TB", bodysite: "Urine", referencetext: "No AFB seen", clinicalindication: "Genitourinary tuberculosis; renal TB; mycobacterial infection", agegroup: "ADULT", sex: "ANY" },
  
  // Stool Culture (6 tests)
  { testcode: "Stool C/S manual", bodysite: "Stool", referencetext: "Normal flora", clinicalindication: "Bacterial gastroenteritis; diarrhea; food poisoning; dysentery; colitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Stool C/S automated", bodysite: "Stool", referencetext: "Normal flora", clinicalindication: "Automated stool culture; enteric pathogens; diarrheal disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "GSE", bodysite: "Stool", referencetext: "No parasites or ova", clinicalindication: "Parasitic infection; ova and parasites; giardiasis; amebiasis; helminth infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "FOB", bodysite: "Stool", referencetext: "Negative", clinicalindication: "GI bleeding; colorectal cancer screening; occult blood; anemia; melena", agegroup: "ADULT", sex: "ANY" },
  { testcode: "SS agar Salmonella Shigella", bodysite: "Stool", referencetext: "No Salmonella/Shigella", clinicalindication: "Salmonellosis; shigellosis; bacterial dysentery; enteric fever", agegroup: "ADULT", sex: "ANY" },
  { testcode: "TCBS agar Vibrio", bodysite: "Stool", referencetext: "No Vibrio", clinicalindication: "Cholera; vibrio infection; seafood-related diarrhea; epidemic diarrhea", agegroup: "ADULT", sex: "ANY" },
  
  // Blood Culture (2 tests)
  { testcode: "Blood C/S manual", bodysite: "Venous blood", referencetext: "No growth", clinicalindication: "Sepsis; bacteremia; endocarditis; fever of unknown origin; bloodstream infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Blood C/S automated", bodysite: "Venous blood", referencetext: "No growth", clinicalindication: "Automated blood culture; sepsis diagnosis; rapid pathogen detection; ICU monitoring", agegroup: "ADULT", sex: "ANY" },
  
  // Sputum Culture (5 tests)
  { testcode: "Sputum C/S manual", bodysite: "Sputum", referencetext: "Normal flora", clinicalindication: "Pneumonia; respiratory infection; tuberculosis; chronic bronchitis; lung abscess", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Sputum C/S automated", bodysite: "Sputum", referencetext: "Normal flora", clinicalindication: "Automated sputum culture; pneumonia diagnosis; respiratory pathogens", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Gram stain Sputum", bodysite: "Sputum", referencetext: "Normal flora", clinicalindication: "Rapid pneumonia diagnosis; bacterial identification; sputum quality assessment", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AFB stain Sputum TB", bodysite: "Sputum", referencetext: "No AFB seen", clinicalindication: "Pulmonary tuberculosis; TB diagnosis; mycobacterial infection; chronic cough", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Fungal ID Sputum", bodysite: "Sputum", referencetext: "No fungal elements", clinicalindication: "Fungal pneumonia; aspergillosis; candidiasis; immunocompromised infection", agegroup: "ADULT", sex: "ANY" },
  
  // Wound & Swab Cultures (10 tests)
  { testcode: "Wound Swab manual", bodysite: "Wound", referencetext: "No growth or normal skin flora", clinicalindication: "Wound infection; surgical site infection; cellulitis; diabetic foot ulcer; burn infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Wound Swab automated", bodysite: "Wound", referencetext: "No growth or normal flora", clinicalindication: "Automated wound culture; infection control; antibiotic selection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Fungal ID Ear", bodysite: "Ear", referencetext: "No fungal growth", clinicalindication: "Otomycosis; fungal otitis externa; chronic ear infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Eye Swab Gram", bodysite: "Eye", referencetext: "No organisms", clinicalindication: "Bacterial conjunctivitis; keratitis; endophthalmitis; eye infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Nasal Swab", bodysite: "Nasal", referencetext: "Normal nasal flora", clinicalindication: "MRSA screening; nasal colonization; sinusitis; rhinitis; infection control", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Throat Swab", bodysite: "Throat", referencetext: "Normal throat flora", clinicalindication: "Streptococcal pharyngitis; tonsillitis; diphtheria; throat infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Gram stain Throat", bodysite: "Throat", referencetext: "Normal flora", clinicalindication: "Rapid strep detection; pharyngitis evaluation; bacterial identification", agegroup: "ADULT", sex: "ANY" },
  { testcode: "HVS direct Gram", bodysite: "High vaginal swab", referencetext: "Normal vaginal flora", clinicalindication: "Vaginitis; bacterial vaginosis; candidiasis; STD screening; pelvic inflammatory disease", agegroup: "ADULT", sex: "F" },
  { testcode: "Wet prep Trichomonas", bodysite: "High vaginal swab", referencetext: "No Trichomonas seen", clinicalindication: "Trichomoniasis; vaginal discharge; STD; vaginitis", agegroup: "ADULT", sex: "F" },
  { testcode: "Gram stain HVS", bodysite: "High vaginal swab", referencetext: "Normal flora", clinicalindication: "Bacterial vaginosis; vaginal infection; Nugent score; candidiasis", agegroup: "ADULT", sex: "F" },
  { testcode: "Fungal ID HVS", bodysite: "High vaginal swab", referencetext: "No yeast", clinicalindication: "Vaginal candidiasis; yeast infection; recurrent thrush", agegroup: "ADULT", sex: "F" },
  { testcode: "Urethral direct Gram", bodysite: "Urethral swab", referencetext: "No organisms", clinicalindication: "Urethritis; gonorrhea; non-gonococcal urethritis; STD; dysuria", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Urethral Gonococcal", bodysite: "Urethral swab", referencetext: "No gonococci", clinicalindication: "Gonorrhea; GC infection; urethral discharge; STD screening", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Skin lesions Swab", bodysite: "Skin lesion", referencetext: "No pathogenic organisms", clinicalindication: "Skin infection; impetigo; cellulitis; abscess; dermatitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Cervical Swab", bodysite: "Cervical swab", referencetext: "Normal cervical flora", clinicalindication: "Cervicitis; PID; STD screening; gonorrhea; chlamydia", agegroup: "ADULT", sex: "F" },
  { testcode: "Oral swab", bodysite: "Oral cavity", referencetext: "Normal oral flora", clinicalindication: "Oral infection; thrush; stomatitis; dental infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Burns Swab", bodysite: "Burn wound", referencetext: "No pathogenic organisms", clinicalindication: "Burn infection; Pseudomonas; MRSA; burn sepsis; wound colonization", agegroup: "ADULT", sex: "ANY" },
  
  // Body Fluid Cultures (32 tests)
  // Pleural Fluid (8 tests)
  { testcode: "Pleural C/S manual", bodysite: "Pleural fluid", referencetext: "No growth", clinicalindication: "Empyema; pleural infection; parapneumonic effusion; tuberculosis pleuritis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Pleural C/S automated", bodysite: "Pleural fluid", referencetext: "No growth", clinicalindication: "Automated pleural culture; effusion analysis; infection detection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Pleural Sugar", bodysite: "Pleural fluid", referencemin: "60", referencemax: "100", clinicalindication: "Pleural effusion classification; empyema; parapneumonic effusion; TB pleuritis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Pleural Protein", bodysite: "Pleural fluid", referencetext: "< 3.0 g/dL (transudate)", clinicalindication: "Exudate vs transudate; pleural effusion; heart failure; malignancy; infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Gram stain Pleural", bodysite: "Pleural fluid", referencetext: "No organisms", clinicalindication: "Rapid empyema diagnosis; bacterial identification; pleural infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AFB stain Pleural", bodysite: "Pleural fluid", referencetext: "No AFB", clinicalindication: "Tuberculous pleuritis; TB effusion; mycobacterial infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Total cells Pleural", bodysite: "Pleural fluid", referencetext: "< 1000 cells/µL", clinicalindication: "Pleural inflammation; infection; malignancy; effusion cellularity", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Diff WBC Pleural", bodysite: "Pleural fluid", referencetext: "Lymphocyte or neutrophil predominance", clinicalindication: "Effusion classification; TB vs bacterial; malignancy; inflammation type", agegroup: "ADULT", sex: "ANY" },
  
  // Ascitic Fluid (6 tests)
  { testcode: "Ascitic C/S manual", bodysite: "Ascitic fluid", referencetext: "No growth", clinicalindication: "Spontaneous bacterial peritonitis; SBP; ascites infection; cirrhosis complication", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Ascitic C/S automated", bodysite: "Ascitic fluid", referencetext: "No growth", clinicalindication: "Automated ascites culture; rapid SBP detection; peritoneal infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Gram stain Ascitic", bodysite: "Ascitic fluid", referencetext: "No organisms", clinicalindication: "Rapid SBP diagnosis; bacterial peritonitis; ascites infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AFB stain Ascitic", bodysite: "Ascitic fluid", referencetext: "No AFB", clinicalindication: "Tuberculous peritonitis; TB ascites; peritoneal TB", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Total cells Ascitic", bodysite: "Ascitic fluid", referencetext: "< 500 cells/µL", panictext: "> 250 PMN suggests SBP", clinicalindication: "SBP diagnosis; ascites cellularity; peritoneal inflammation", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Diff WBC Ascitic", bodysite: "Ascitic fluid", referencetext: "< 250 PMN/µL", panictext: "> 250 PMN", clinicalindication: "SBP diagnosis; neutrophil count; bacterial peritonitis; cirrhosis", agegroup: "ADULT", sex: "ANY" },
  
  // Synovial Fluid (8 tests)
  { testcode: "Synovial C/S manual", bodysite: "Synovial fluid", referencetext: "No growth", clinicalindication: "Septic arthritis; joint infection; prosthetic joint infection; crystal arthropathy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Synovial C/S automated", bodysite: "Synovial fluid", referencetext: "No growth", clinicalindication: "Automated synovial culture; rapid arthritis diagnosis; joint infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Synovial Sugar", bodysite: "Synovial fluid", referencetext: "> 50 mg/dL", clinicalindication: "Septic arthritis; joint infection; inflammatory arthritis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Synovial Protein", bodysite: "Synovial fluid", referencetext: "< 3.0 g/dL", clinicalindication: "Joint inflammation; arthritis classification; synovial analysis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Gram stain Synovial", bodysite: "Synovial fluid", referencetext: "No organisms", clinicalindication: "Rapid septic arthritis diagnosis; bacterial identification; joint infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AFB stain Synovial", bodysite: "Synovial fluid", referencetext: "No AFB", clinicalindication: "Tuberculous arthritis; TB joint infection; chronic monoarthritis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Total cells Synovial", bodysite: "Synovial fluid", referencetext: "< 200 cells/µL (normal)", panictext: "> 50,000 suggests septic arthritis", clinicalindication: "Septic arthritis; inflammatory arthritis; crystal arthropathy; joint cellularity", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Diff WBC Synovial", bodysite: "Synovial fluid", referencetext: "< 25% PMN (normal)", panictext: "> 90% PMN suggests septic arthritis", clinicalindication: "Arthritis classification; septic vs inflammatory; gout vs infection", agegroup: "ADULT", sex: "ANY" },
  
  // CSF (9 tests)
  { testcode: "CSF C/S manual", bodysite: "Cerebrospinal fluid", referencetext: "No growth", clinicalindication: "Meningitis; encephalitis; CNS infection; brain abscess; shunt infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CSF C/S automated", bodysite: "Cerebrospinal fluid", referencetext: "No growth", clinicalindication: "Automated CSF culture; rapid meningitis diagnosis; CNS infection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CSF Protein", bodysite: "Cerebrospinal fluid", referencemin: "15", referencemax: "45", paniclow: "10", panichigh: "500", clinicalindication: "Meningitis; Guillain-Barré syndrome; MS; CNS inflammation; blood-brain barrier", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CSF Sugar", bodysite: "Cerebrospinal fluid", referencemin: "50", referencemax: "80", paniclow: "20", panichigh: "100", clinicalindication: "Bacterial meningitis; TB meningitis; fungal meningitis; hypoglycorrhachia", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Gram stain CSF", bodysite: "Cerebrospinal fluid", referencetext: "No organisms", clinicalindication: "Rapid meningitis diagnosis; bacterial identification; emergency CSF analysis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AFB stain CSF", bodysite: "Cerebrospinal fluid", referencetext: "No AFB", clinicalindication: "Tuberculous meningitis; TB CNS infection; chronic meningitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Diff WBC CSF", bodysite: "Cerebrospinal fluid", referencetext: "< 5 cells/µL", panictext: "> 1000 cells suggests bacterial meningitis", clinicalindication: "Meningitis diagnosis; pleocytosis; bacterial vs viral vs TB meningitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CSF Brucellosis", bodysite: "Cerebrospinal fluid", referencetext: "Negative", clinicalindication: "Neurobrucellosis; CNS brucella infection; chronic meningitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "CSF Syphilis", bodysite: "Cerebrospinal fluid", referencetext: "Negative", clinicalindication: "Neurosyphilis; tertiary syphilis; CNS syphilis; tabes dorsalis", agegroup: "ADULT", sex: "ANY" },
  
  // Seminal & Peritoneal Fluid (11 tests)
  { testcode: "Seminal C/S", bodysite: "Seminal fluid", referencetext: "No growth", clinicalindication: "Prostatitis; seminal vesiculitis; male infertility; genital infection", agegroup: "ADULT", sex: "M" },
  { testcode: "SFA", bodysite: "Seminal fluid", referencetext: "Normal sperm analysis", clinicalindication: "Male infertility; sperm count; motility; morphology; semen analysis", agegroup: "ADULT", sex: "M" },
  { testcode: "Gram stain Seminal GC", bodysite: "Seminal fluid", referencetext: "No gonococci", clinicalindication: "Gonorrhea; GC infection; prostatitis; urethritis", agegroup: "ADULT", sex: "M" },
  { testcode: "AFB stain Seminal", bodysite: "Seminal fluid", referencetext: "No AFB", clinicalindication: "Genitourinary TB; tuberculous prostatitis; chronic infection", agegroup: "ADULT", sex: "M" },
  { testcode: "Peritoneal C/S manual", bodysite: "Peritoneal fluid", referencetext: "No growth", clinicalindication: "Peritonitis; peritoneal dialysis infection; abdominal infection; surgical peritonitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Peritoneal C/S", bodysite: "Peritoneal fluid", referencetext: "No growth", clinicalindication: "Peritoneal infection; dialysis-related peritonitis; abdominal sepsis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Direct exam Peritoneal", bodysite: "Peritoneal fluid", referencetext: "No organisms or cells", clinicalindication: "Rapid peritonitis diagnosis; peritoneal fluid analysis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Gram stain Peritoneal", bodysite: "Peritoneal fluid", referencetext: "No organisms", clinicalindication: "Bacterial peritonitis; rapid diagnosis; empiric therapy guidance", agegroup: "ADULT", sex: "ANY" },
  { testcode: "AFB stain Peritoneal", bodysite: "Peritoneal fluid", referencetext: "No AFB", clinicalindication: "Tuberculous peritonitis; peritoneal TB; chronic peritonitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Total cells Peritoneal", bodysite: "Peritoneal fluid", referencetext: "< 100 cells/µL", clinicalindication: "Peritoneal inflammation; infection; dialysis peritonitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Diff WBC Peritoneal", bodysite: "Peritoneal fluid", referencetext: "Predominantly lymphocytes", clinicalindication: "Peritonitis classification; infection type; dialysis complication", agegroup: "ADULT", sex: "ANY" },
  
  // ==================== MOLECULAR BIOLOGY (9 tests) ====================
  { testcode: "PCR HCV VL", bodysite: "Venous blood", referencetext: "Not detected", clinicalindication: "Hepatitis C viral load; HCV treatment monitoring; chronic hepatitis C; antiviral therapy response", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PCR HBV VL", bodysite: "Venous blood", referencetext: "Not detected", clinicalindication: "Hepatitis B viral load; HBV treatment monitoring; chronic hepatitis B; antiviral efficacy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PCR HIV VL", bodysite: "Venous blood", referencetext: "Not detected", clinicalindication: "HIV viral load; AIDS monitoring; antiretroviral therapy; treatment failure; drug resistance", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PCR TB", bodysite: "Blood or sputum", referencetext: "Not detected", clinicalindication: "Tuberculosis diagnosis; rapid TB detection; drug-resistant TB; extrapulmonary TB", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PCR HPV", bodysite: "Cervical swab or seminal fluid", referencetext: "Not detected", clinicalindication: "HPV infection; cervical cancer screening; genital warts; high-risk HPV; STD", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PCR HCV Genotype", bodysite: "Venous blood", referencetext: "Genotype identification", clinicalindication: "HCV genotyping; treatment selection; antiviral therapy planning; peginterferon response", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PCR HCV VL genexpert", bodysite: "Venous blood", referencetext: "Not detected", clinicalindication: "Rapid HCV viral load; point-of-care testing; treatment monitoring", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PCR HBV VL genexpert", bodysite: "Venous blood", referencetext: "Not detected", clinicalindication: "Rapid HBV viral load; point-of-care testing; antiviral monitoring", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PCR TB genexpert", bodysite: "Sputum or fluid or urine", referencetext: "MTB not detected; Rifampicin resistance not detected", clinicalindication: "Rapid TB diagnosis; rifampicin resistance; MDR-TB; GeneXpert MTB/RIF; WHO-recommended test", agegroup: "ADULT", sex: "ANY" },
  { testcode: "PCR HIV VL genexpert special", bodysite: "Venous blood", referencetext: "Not detected", clinicalindication: "Point-of-care HIV viral load; rapid testing; treatment monitoring; resource-limited settings", agegroup: "ADULT", sex: "ANY" },
  
  // ==================== HISTOPATHOLOGY (55 tests) ====================
  { testcode: "Thyroid biopsy", bodysite: "Thyroid tissue", referencetext: "Benign thyroid tissue", clinicalindication: "Thyroid nodule; thyroid cancer; papillary carcinoma; follicular neoplasm; Hashimoto's thyroiditis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Lung bronchoscopy", bodysite: "Lung tissue", referencetext: "Normal bronchial mucosa", clinicalindication: "Lung cancer; pneumonia; interstitial lung disease; sarcoidosis; bronchial biopsy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Brain biopsy", bodysite: "Brain tissue", referencetext: "Normal brain tissue", clinicalindication: "Brain tumor; glioma; meningioma; lymphoma; encephalitis; demyelinating disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Breast mass biopsy", bodysite: "Breast tissue", referencetext: "Benign breast tissue", clinicalindication: "Breast cancer; fibroadenoma; ductal carcinoma; lobular carcinoma; breast mass evaluation", agegroup: "ADULT", sex: "F" },
  { testcode: "Mastectomy", bodysite: "Breast tissue", referencetext: "Pathologic examination", clinicalindication: "Breast cancer; surgical margins; lymph node status; tumor staging; receptor status", agegroup: "ADULT", sex: "F" },
  { testcode: "Salivary gland biopsy", bodysite: "Salivary gland tissue", referencetext: "Normal salivary tissue", clinicalindication: "Salivary gland tumor; pleomorphic adenoma; Warthin tumor; Sjögren's syndrome", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Skin biopsy", bodysite: "Skin tissue", referencetext: "Normal skin", clinicalindication: "Skin cancer; melanoma; basal cell carcinoma; squamous cell carcinoma; dermatitis; rash", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Bone biopsy", bodysite: "Bone tissue", referencetext: "Normal bone", clinicalindication: "Bone tumor; osteosarcoma; metastatic disease; osteomyelitis; bone lesion", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Spleen biopsy", bodysite: "Spleen tissue", referencetext: "Normal splenic tissue", clinicalindication: "Lymphoma; splenomegaly; splenic mass; hematologic malignancy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Appendix", bodysite: "Appendix tissue", referencetext: "Acute appendicitis or normal", clinicalindication: "Appendicitis; appendiceal tumor; carcinoid; mucocele; right lower quadrant pain", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Testis biopsy", bodysite: "Testicular tissue", referencetext: "Normal testis", clinicalindication: "Testicular cancer; seminoma; non-seminoma; germ cell tumor; male infertility; cryptorchidism", agegroup: "ADULT", sex: "M" },
  { testcode: "Colon biopsy", bodysite: "Colon tissue", referencetext: "Normal colonic mucosa", clinicalindication: "Colorectal cancer; polyp; inflammatory bowel disease; Crohn's; ulcerative colitis; diarrhea", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Colonoscopy biopsy", bodysite: "Colon tissue", referencetext: "Normal mucosa", clinicalindication: "Colon cancer screening; polyp surveillance; IBD; GI bleeding; colonoscopy findings", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Lymph-node biopsy", bodysite: "Lymph node tissue", referencetext: "Reactive lymph node", clinicalindication: "Lymphoma; Hodgkin's; non-Hodgkin's; metastatic cancer; lymphadenopathy; TB lymphadenitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Discectomy-laminectomy", bodysite: "Disc/vertebral tissue", referencetext: "Degenerative disc disease", clinicalindication: "Herniated disc; spinal stenosis; back pain; radiculopathy; spinal pathology", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Duodenal biopsy", bodysite: "Duodenal tissue", referencetext: "Normal duodenal mucosa", clinicalindication: "Celiac disease; duodenal cancer; peptic ulcer; malabsorption; villous atrophy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Prostatectomy", bodysite: "Prostate tissue", referencetext: "Pathologic examination", clinicalindication: "Prostate cancer; Gleason score; surgical margins; tumor staging; BPH", agegroup: "ADULT", sex: "M" },
  { testcode: "Prostatic chips", bodysite: "Prostate tissue", referencetext: "BPH or normal", clinicalindication: "BPH; prostate cancer; TURP specimen; urinary obstruction", agegroup: "ADULT", sex: "M" },
  { testcode: "Cyst-ovary", bodysite: "Ovarian tissue", referencetext: "Benign ovarian cyst", clinicalindication: "Ovarian cyst; ovarian cancer; dermoid cyst; endometrioma; pelvic mass", agegroup: "ADULT", sex: "F" },
  { testcode: "Uterus", bodysite: "Uterine tissue", referencetext: "Normal uterus", clinicalindication: "Uterine cancer; endometrial hyperplasia; fibroids; abnormal bleeding; hysterectomy", agegroup: "ADULT", sex: "F" },
  { testcode: "Uterus with ovary", bodysite: "Uterus and ovary", referencetext: "Normal gynecologic tissue", clinicalindication: "Gynecologic cancer; endometrial cancer; ovarian cancer; hysterectomy with oophorectomy", agegroup: "ADULT", sex: "F" },
  { testcode: "Product of gestation", bodysite: "Gestational tissue", referencetext: "Products of conception", clinicalindication: "Miscarriage; incomplete abortion; molar pregnancy; gestational trophoblastic disease", agegroup: "ADULT", sex: "F" },
  { testcode: "D&C", bodysite: "Endometrial tissue", referencetext: "Normal endometrium", clinicalindication: "Abnormal uterine bleeding; endometrial cancer; endometrial hyperplasia; polyp; miscarriage", agegroup: "ADULT", sex: "F" },
  { testcode: "Polyp", bodysite: "Polyp tissue", referencetext: "Benign polyp", clinicalindication: "Endometrial polyp; colon polyp; adenomatous polyp; hyperplastic polyp; cancer screening", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Pap Smear", bodysite: "Cervical cells", referencetext: "NILM (Negative for intraepithelial lesion)", clinicalindication: "Cervical cancer screening; HPV; dysplasia; ASCUS; LSIL; HSIL; CIN", agegroup: "ADULT", sex: "F" },
  { testcode: "CSF Cytology", bodysite: "Cerebrospinal fluid", referencetext: "No malignant cells", clinicalindication: "CNS malignancy; leptomeningeal metastases; lymphoma; leukemia; brain tumor", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Kidney biopsy", bodysite: "Kidney tissue", referencetext: "Normal renal tissue", clinicalindication: "Glomerulonephritis; nephrotic syndrome; kidney disease; renal mass; transplant rejection", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Gall bladder", bodysite: "Gallbladder tissue", referencetext: "Chronic cholecystitis", clinicalindication: "Cholecystitis; gallbladder cancer; cholelithiasis; gallstones; biliary disease", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Corpectomy", bodysite: "Vertebral body", referencetext: "Pathologic examination", clinicalindication: "Spinal tumor; metastatic disease; vertebral fracture; spinal cord compression", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Soft tissue biopsy", bodysite: "Soft tissue", referencetext: "Normal soft tissue", clinicalindication: "Soft tissue sarcoma; lipoma; fibroma; mass; tumor evaluation", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Tissue Tumor marker", bodysite: "Tumor tissue", referencetext: "Marker expression analysis", clinicalindication: "Cancer classification; receptor status; targeted therapy; prognosis; HER2; ER/PR", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Muscles biopsy", bodysite: "Muscle tissue", referencetext: "Normal muscle", clinicalindication: "Myopathy; muscular dystrophy; inflammatory myositis; muscle weakness; metabolic myopathy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Sinus biopsy", bodysite: "Sinus tissue", referencetext: "Chronic sinusitis", clinicalindication: "Chronic sinusitis; nasal polyp; sinus tumor; fungal sinusitis; allergic fungal sinusitis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Core biopsy liver", bodysite: "Liver tissue", referencetext: "Normal liver", clinicalindication: "Liver cirrhosis; hepatitis; liver cancer; NASH; fatty liver; hepatic fibrosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Ovary with tube", bodysite: "Ovary and fallopian tube", referencetext: "Normal adnexa", clinicalindication: "Ovarian cancer; tubal cancer; ectopic pregnancy; salpingo-oophorectomy", agegroup: "ADULT", sex: "F" },
  { testcode: "FNAC", bodysite: "Aspirate", referencetext: "Benign cells", clinicalindication: "Fine needle aspiration; thyroid nodule; lymph node; breast mass; salivary gland; cytology", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Endoscopic biopsy", bodysite: "GI tissue", referencetext: "Normal mucosa", clinicalindication: "GI cancer; Barrett's esophagus; gastritis; H. pylori; celiac disease; IBD", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Gynecomastia", bodysite: "Breast tissue", referencetext: "Gynecomastia", clinicalindication: "Male breast enlargement; hormonal imbalance; drug-induced; liver disease", agegroup: "ADULT", sex: "M" },
  { testcode: "Slide review", bodysite: "Pathology slide", referencetext: "Second opinion", clinicalindication: "Pathology review; second opinion; diagnostic confirmation; cancer diagnosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Fibroid", bodysite: "Uterine tissue", referencetext: "Leiomyoma", clinicalindication: "Uterine fibroids; leiomyoma; abnormal bleeding; pelvic mass; myomectomy", agegroup: "ADULT", sex: "F" },
  { testcode: "Hemicolectomy", bodysite: "Colon tissue", referencetext: "Pathologic examination", clinicalindication: "Colon cancer; surgical margins; lymph node status; tumor staging; IBD", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Femur biopsy", bodysite: "Femur tissue", referencetext: "Normal bone", clinicalindication: "Bone tumor; osteosarcoma; metastatic disease; bone lesion; fracture", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Ulcerative mass", bodysite: "Ulcer tissue", referencetext: "Pathologic examination", clinicalindication: "Ulcerative lesion; malignancy; chronic ulcer; gastric ulcer; skin ulcer", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Ectopic pregnancy", bodysite: "Gestational tissue", referencetext: "Ectopic gestation", clinicalindication: "Ectopic pregnancy; tubal pregnancy; abdominal pain; pregnancy complications", agegroup: "ADULT", sex: "F" },
  { testcode: "Abortion", bodysite: "Gestational tissue", referencetext: "Products of conception", clinicalindication: "Spontaneous abortion; missed abortion; incomplete abortion; pregnancy loss", agegroup: "ADULT", sex: "F" },
  { testcode: "Urinary bladder biopsy", bodysite: "Bladder tissue", referencetext: "Normal urothelium", clinicalindication: "Bladder cancer; transitional cell carcinoma; hematuria; bladder mass; cystoscopy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Cell block", bodysite: "Cell pellet", referencetext: "Cytology examination", clinicalindication: "Malignant effusion; ascites; pleural fluid; cytology; cancer diagnosis", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Mass biopsy", bodysite: "Mass tissue", referencetext: "Pathologic examination", clinicalindication: "Tumor evaluation; cancer diagnosis; benign vs malignant; mass characterization", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Neck mass biopsy", bodysite: "Neck tissue", referencetext: "Pathologic examination", clinicalindication: "Thyroid nodule; lymphoma; metastatic cancer; salivary tumor; neck mass evaluation", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Endometriosis", bodysite: "Endometrial tissue", referencetext: "Endometriosis", clinicalindication: "Endometriosis; pelvic pain; infertility; dysmenorrhea; chocolate cyst", agegroup: "ADULT", sex: "F" },
  { testcode: "Tissue & bone", bodysite: "Tissue and bone", referencetext: "Pathologic examination", clinicalindication: "Bone and soft tissue tumor; osteosarcoma; sarcoma; combined biopsy", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Hernia", bodysite: "Hernia sac", referencetext: "Hernia sac", clinicalindication: "Inguinal hernia; umbilical hernia; incarcerated hernia; hernia repair", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Nasal papilloma", bodysite: "Nasal tissue", referencetext: "Benign papilloma", clinicalindication: "Nasal polyp; inverted papilloma; nasal obstruction; sinonasal tumor", agegroup: "ADULT", sex: "ANY" },
  { testcode: "Endometrial biopsy", bodysite: "Endometrial tissue", referencetext: "Normal endometrium", clinicalindication: "Abnormal uterine bleeding; endometrial cancer; endometrial hyperplasia; infertility", agegroup: "ADULT", sex: "F" },
  { testcode: "Special Stains", bodysite: "Tissue", referencetext: "Special staining", clinicalindication: "Histochemical staining; immunohistochemistry; organism identification; tissue characterization", agegroup: "ADULT", sex: "ANY" },
];

export async function POST() {
  try {
    let updated = 0;
    let notFound = 0;
    const errors: string[] = [];

    for (const data of medicalData) {
      try {
        const result = await db
          .update(testReferenceRanges)
          .set({
            bodysite: data.bodysite,
            referencemin: data.referencemin,
            referencemax: data.referencemax,
            referencetext: data.referencetext,
            paniclow: data.paniclow,
            panichigh: data.panichigh,
            panictext: data.panictext,
            clinicalindication: data.clinicalindication,
            agegroup: data.agegroup || "ADULT",
            sex: data.sex || "ANY",
            updatedby: USER_ID,
            updatedat: new Date(),
          })
          .where(
            and(
              eq(testReferenceRanges.workspaceid, WORKSPACE_ID),
              eq(testReferenceRanges.testcode, data.testcode),
              eq(testReferenceRanges.agegroup, data.agegroup || "ADULT"),
              eq(testReferenceRanges.sex, data.sex || "ANY")
            )
          )
          .returning();

        if (result.length > 0) {
          updated++;
          if (updated % 50 === 0) {
            console.log(`✅ Updated ${updated} test references...`);
          }
        } else {
          notFound++;
        }
      } catch (error) {
        errors.push(`${data.testcode}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} test references with medical data (Part 4: Microbiology, Molecular Biology, Histopathology)`,
      updated,
      notFound,
      total: medicalData.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Failed to update medical references", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
