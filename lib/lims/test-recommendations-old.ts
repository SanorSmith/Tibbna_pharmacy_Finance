/**
 * Test Sample Recommendations
 * 
 * Provides intelligent recommendations for sample types, containers, volumes, and units
 * based on the specific tests being ordered
 */

export interface TestRecommendation {
  testCode: string;
  testName: string;
  sampleType: string;
  containerType: string;
  volume: number;
  volumeUnit: string;
  fastingRequired: boolean;
  specialInstructions?: string;
}

export interface OrderRecommendations {
  primarySampleType: string;
  primaryContainer: string;
  totalVolume: number;
  volumeUnit: string;
  fastingRequired: boolean;
  recommendations: TestRecommendation[];
  specialInstructions: string[];
}

/**
 * Test-specific sample requirements database
 * This would typically come from a database or configuration
 */
const TEST_REQUIREMENTS: Record<string, TestRecommendation> = {
  // HEMATOLOGY TESTS - CBC Components
  'RBC': {
    testCode: 'RBC',
    testName: 'Red Blood Cells',
    sampleType: 'blood',
    containerType: 'EDTA Tube',
    volume: 2,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Gently invert 8-10 times'
  },
  'WBC': {
    testCode: 'WBC',
    testName: 'White Blood Cells',
    sampleType: 'blood',
    containerType: 'EDTA Tube',
    volume: 2,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Gently invert 8-10 times'
  },
  'HGB': {
    testCode: 'HGB',
    testName: 'Hemoglobin',
    sampleType: 'blood',
    containerType: 'EDTA Tube',
    volume: 2,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'HCT': {
    testCode: 'HCT',
    testName: 'Hematocrit',
    sampleType: 'blood',
    containerType: 'EDTA Tube',
    volume: 2,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'PLT': {
    testCode: 'PLT',
    testName: 'Platelets',
    sampleType: 'blood',
    containerType: 'EDTA Tube',
    volume: 2,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'ESR': {
    testCode: 'ESR',
    testName: 'Erythrocyte Sedimentation Rate',
    sampleType: 'blood',
    containerType: 'ESR Tube',
    volume: 2,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'PT-APTT': {
    testCode: 'PT-APTT',
    testName: 'PT/aPTT',
    sampleType: 'blood',
    containerType: 'Sodium Citrate Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Fill tube completely, invert gently 3-4 times'
  },
  'RETIC': {
    testCode: 'RETIC',
    testName: 'Reticulocyte Count',
    sampleType: 'blood',
    containerType: 'EDTA Tube',
    volume: 2,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'CBC': {
    testCode: 'CBC',
    testName: 'Complete Blood Count',
    sampleType: 'blood',
    containerType: 'EDTA Tube',
    volume: 2,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Gently invert 8-10 times'
  },
  'DIFF': {
    testCode: 'DIFF',
    testName: 'Differential Count',
    sampleType: 'blood',
    containerType: 'EDTA Tube',
    volume: 2,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Same tube as CBC'
  },

  // Biochemistry Tests
  'GLU': {
    testCode: 'GLU',
    testName: 'Glucose',
    sampleType: 'blood',
    containerType: 'Fluoride Oxalate Tube',
    volume: 2,
    volumeUnit: 'mL',
    fastingRequired: true,
    specialInstructions: '8-12 hour fast required'
  },
  'BUN': {
    testCode: 'BUN',
    testName: 'Blood Urea Nitrogen',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'CREAT': {
    testCode: 'CREAT',
    testName: 'Creatinine',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'UACR': {
    testCode: 'UACR',
    testName: 'Urine Albumin/Creatinine Ratio',
    sampleType: 'urine',
    containerType: 'Sterile Container',
    volume: 30,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'First morning urine preferred'
  },
  'U-PROT': {
    testCode: 'U-PROT',
    testName: 'Urine Protein',
    sampleType: 'urine',
    containerType: 'Sterile Container',
    volume: 10,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'U-GLU': {
    testCode: 'U-GLU',
    testName: 'Urine Glucose',
    sampleType: 'urine',
    containerType: 'Sterile Container',
    volume: 10,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'U-BLOOD': {
    testCode: 'U-BLOOD',
    testName: 'Urine Blood',
    sampleType: 'urine',
    containerType: 'Sterile Container',
    volume: 10,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'U-BILI': {
    testCode: 'U-BILI',
    testName: 'Urine Bilirubin',
    sampleType: 'urine',
    containerType: 'Sterile Container',
    volume: 10,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'U-NIT-LE': {
    testCode: 'U-NIT-LE',
    testName: 'Urine Nitrite/Leukocyte Esterase',
    sampleType: 'urine',
    containerType: 'Sterile Container',
    volume: 10,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'U-KET': {
    testCode: 'U-KET',
    testName: 'Urine Ketones',
    sampleType: 'urine',
    containerType: 'Sterile Container',
    volume: 10,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'ELECTROLYTES': {
    testCode: 'ELECTROLYTES',
    testName: 'Electrolyte Panel',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'LFT': {
    testCode: 'LFT',
    testName: 'Liver Function Tests',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 5,
    volumeUnit: 'mL',
    fastingRequired: true,
    specialInstructions: '10-12 hour fast recommended'
  },
  'LIPID': {
    testCode: 'LIPID',
    testName: 'Lipid Panel',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 5,
    volumeUnit: 'mL',
    fastingRequired: true,
    specialInstructions: '12-14 hour fast required'
  },
  'HBA1C': {
    testCode: 'HBA1C',
    testName: 'Hemoglobin A1c',
    sampleType: 'blood',
    containerType: 'EDTA Tube',
    volume: 2,
    volumeUnit: 'mL',
    fastingRequired: false
  },

  // Hormone Tests
  'TSH': {
    testCode: 'TSH',
    testName: 'Thyroid Stimulating Hormone',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Morning sample preferred'
  },
  'T3': {
    testCode: 'T3',
    testName: 'Triiodothyronine',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'T4': {
    testCode: 'T4',
    testName: 'Thyroxine',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false
  },

  // Cardiac Markers
  'TROPONIN': {
    testCode: 'TROPONIN',
    testName: 'Troponin',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'STAT - process immediately'
  },
  'CKMB': {
    testCode: 'CKMB',
    testName: 'CK-MB',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false
  },

  // Infectious Disease
  'CRP': {
    testCode: 'CRP',
    testName: 'C-Reactive Protein',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'PROCAL': {
    testCode: 'PROCAL',
    testName: 'Procalcitonin',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false
  },

  // Coagulation
  'PT': {
    testCode: 'PT',
    testName: 'Prothrombin Time',
    sampleType: 'blood',
    containerType: 'Citrate Tube',
    volume: 2.7,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: '3.2% Sodium Citrate, fill to exact mark'
  },
  'APTT': {
    testCode: 'APTT',
    testName: 'Activated Partial Thromboplastin Time',
    sampleType: 'blood',
    containerType: 'Citrate Tube',
    volume: 2.7,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: '3.2% Sodium Citrate, fill to exact mark'
  },
  'INR': {
    testCode: 'INR',
    testName: 'International Normalized Ratio',
    sampleType: 'blood',
    containerType: 'Citrate Tube',
    volume: 2.7,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Same tube as PT/APTT'
  },

  // Urine Tests
  'URINALYSIS': {
    testCode: 'URINALYSIS',
    testName: 'Urinalysis',
    sampleType: 'urine',
    containerType: 'Sterile Container',
    volume: 30,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Clean-catch midstream sample'
  },
  'URINE_CULTURE': {
    testCode: 'URINE_CULTURE',
    testName: 'Urine Culture',
    sampleType: 'urine',
    containerType: 'Sterile Container',
    volume: 30,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Clean-catch midstream, first morning preferred'
  },

  // Microbiology
  'BLOOD_CULTURE': {
    testCode: 'BLOOD_CULTURE',
    testName: 'Blood Culture',
    sampleType: 'blood',
    containerType: 'Blood Culture Bottle',
    volume: 10,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Aseptic technique, 2 sets recommended'
  },

  // Serology
  'HIV': {
    testCode: 'HIV',
    testName: 'HIV Antibody Test',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 5,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'HBSAG': {
    testCode: 'HBSAG',
    testName: 'Hepatitis B Surface Antigen',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 5,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'ANTI_HCV': {
    testCode: 'ANTI_HCV',
    testName: 'Hepatitis C Antibody',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 5,
    volumeUnit: 'mL',
    fastingRequired: false
  },

  // Molecular Pathology
  'PCR': {
    testCode: 'PCR',
    testName: 'PCR Testing',
    sampleType: 'tissue',
    containerType: 'Formalin Container',
    volume: 5,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Fresh tissue sample preferred, keep refrigerated'
  },
  'FISH': {
    testCode: 'FISH',
    testName: 'Fluorescence In Situ Hybridization',
    sampleType: 'tissue',
    containerType: 'Formalin Container',
    volume: 5,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Fixed tissue sample required'
  },
  'SEQ': {
    testCode: 'SEQ',
    testName: 'Genetic Sequencing',
    sampleType: 'tissue',
    containerType: 'Formalin Container',
    volume: 10,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'High-quality DNA required, avoid necrotic tissue'
  },
  'URINE-CYTO': {
    testCode: 'URINE-CYTO',
    testName: 'Urine Cytology',
    sampleType: 'urine',
    containerType: 'Sterile Container with Fixative',
    volume: 50,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'First morning void preferred, minimum 50mL required'
  },
  'SPUTUM-CYTO': {
    testCode: 'SPUTUM-CYTO',
    testName: 'Sputum Cytology',
    sampleType: 'sputum',
    containerType: 'Sterile Sputum Container',
    volume: 5,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Deep cough specimen, early morning collection preferred'
  },

  // Therapeutic Drug Monitoring
  'DIGOXIN': {
    testCode: 'DIGOXIN',
    testName: 'Digoxin Level',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Trough level, 6-8 hours post-dose'
  },
  'VANCOMYCIN': {
    testCode: 'VANCOMYCIN',
    testName: 'Vancomycin Level',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false,
    specialInstructions: 'Trough level 30 min before next dose'
  },

  // Vitamin Tests
  'VIT_D': {
    testCode: 'VIT_D',
    testName: 'Vitamin D (25-OH)',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false
  },
  'VIT_B12': {
    testCode: 'VIT_B12',
    testName: 'Vitamin B12',
    sampleType: 'blood',
    containerType: 'Serum Separator Tube',
    volume: 3,
    volumeUnit: 'mL',
    fastingRequired: false
  }
};

/**
 * Get sample recommendations for a list of test codes
 */
export function getSampleRecommendations(testCodes: string[]): OrderRecommendations {
  const recommendations: TestRecommendation[] = [];
  const specialInstructions: Set<string> = new Set();
  let fastingRequired = false;

  // Get recommendations for each test
  testCodes.forEach(testCode => {
    const requirement = TEST_REQUIREMENTS[testCode.toUpperCase()];
    if (requirement) {
      recommendations.push(requirement);
      if (requirement.fastingRequired) {
        fastingRequired = true;
      }
      if (requirement.specialInstructions) {
        specialInstructions.add(requirement.specialInstructions);
      }
    }
  });

  // Group by sample type and container to optimize collection
  const sampleGroups = recommendations.reduce((groups, rec) => {
    const key = `${rec.sampleType}-${rec.containerType}`;
    if (!groups[key]) {
      groups[key] = {
        sampleType: rec.sampleType,
        containerType: rec.containerType,
        totalVolume: 0,
        volumeUnit: rec.volumeUnit,
        tests: []
      };
    }
    groups[key].totalVolume += rec.volume;
    groups[key].tests.push(rec.testName);
    return groups;
  }, {} as Record<string, any>);

  // Determine primary sample (most common or highest volume)
  const groupValues = Object.values(sampleGroups);
  
  // Handle case where no recommendations are found
  if (groupValues.length === 0) {
    return {
      primarySampleType: '',
      primaryContainer: '',
      totalVolume: 0,
      volumeUnit: 'mL',
      fastingRequired,
      recommendations,
      specialInstructions: Array.from(specialInstructions)
    };
  }

  const primaryGroup = groupValues.reduce((prev: any, current: any) => 
    (current.totalVolume > prev.totalVolume) ? current : prev
  );

  return {
    primarySampleType: primaryGroup.sampleType,
    primaryContainer: primaryGroup.containerType,
    totalVolume: Math.ceil(primaryGroup.totalVolume * 1.2), // Add 20% buffer
    volumeUnit: primaryGroup.volumeUnit,
    fastingRequired,
    recommendations,
    specialInstructions: Array.from(specialInstructions)
  };
}

/**
 * Get container options for a sample type
 */
export function getContainerOptions(sampleType: string): string[] {
  const containers: Record<string, string[]> = {
    'blood': [
      'Serum Separator Tube',
      'EDTA Tube',
      'Citrate Tube',
      'Heparin Tube',
      'Fluoride Oxalate Tube',
      'Blood Culture Bottle'
    ],
    'urine': [
      'Sterile Container',
      'Urine Collection Bag',
      'Catheter Bag'
    ],
    'serum': [
      'Serum Separator Tube',
      'Plain Red Top Tube'
    ],
    'plasma': [
      'EDTA Tube',
      'Heparin Tube',
      'Citrate Tube'
    ],
    'csf': [
      'Sterile Tube',
      'CSF Collection Tube'
    ],
    'tissue': [
      'Formalin Container',
      'Sterile Container',
      'Transport Medium'
    ],
    'swab': [
      'Transport Medium',
      'Sterile Swab Container'
    ]
  };

  return containers[sampleType.toLowerCase()] || [];
}

/**
 * Get volume unit options
 */
export function getVolumeUnits(): string[] {
  return ['mL', 'μL', 'L', 'g', 'mg'];
}

/**
 * Validate sample collection requirements
 */
export function validateSampleRequirements(
  sampleType: string,
  containerType: string,
  volume: number,
  testCodes: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const recommendations = getSampleRecommendations(testCodes);

  // Check if sample type is compatible with tests
  const incompatibleTests = recommendations.recommendations
    .filter(rec => rec.sampleType !== sampleType)
    .map(rec => rec.testName);

  if (incompatibleTests.length > 0) {
    errors.push(`Sample type '${sampleType}' not suitable for: ${incompatibleTests.join(', ')}`);
  }

  // Check if container is appropriate for sample type
  const validContainers = getContainerOptions(sampleType);
  if (!validContainers.includes(containerType)) {
    errors.push(`Container '${containerType}' not recommended for ${sampleType}`);
  }

  // Check if volume is sufficient
  const recommendedVolume = recommendations.totalVolume;
  if (volume < recommendedVolume) {
    errors.push(`Volume ${volume} ${recommendations.volumeUnit} is insufficient. Recommended: ${recommendedVolume} ${recommendations.volumeUnit}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
