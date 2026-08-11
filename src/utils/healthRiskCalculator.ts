import { EnhancedAnalysisResult, Demographics } from '@/types/medicalAnalysis';
import { ClinicalContext } from './parseClinicalContext';

export interface RiskScore {
  score: number; // 0-100
  level: 'low' | 'moderate' | 'high' | 'very-high';
  description: string;
  contributingFactors: string[];
}

export interface MetabolicSyndromeAssessment {
  hasSyndrome: boolean;
  criteriaCount: number; // 0-5 (need 3+ for diagnosis)
  criteria: {
    name: string;
    met: boolean;
    value?: string;
    threshold?: string;
  }[];
  description: string;
}

export interface HealthRiskCalculation {
  cardiovascularRisk: RiskScore;
  diabetesRisk: RiskScore;
  metabolicSyndrome: MetabolicSyndromeAssessment;
  overallRiskLevel: 'low' | 'moderate' | 'high' | 'very-high';
}

// Helper to extract lab value
// Normalize common non-US units (mmol/L, µmol/L) to the units the risk thresholds assume.
function normalizeUnit(analyte: string | undefined, value: number, unit?: string): number {
  if (!analyte) return value;
  const u = (unit || '').toLowerCase().replace(/\s+/g, '');
  switch (analyte) {
    case 'glucose':       return u.includes('mmol') ? value * 18.0182 : value;
    case 'cholesterol':   return u.includes('mmol') ? value * 38.67 : value;
    case 'triglycerides': return u.includes('mmol') ? value * 88.57 : value;
    case 'creatinine':    return u.includes('mol') ? value / 88.42 : value;
    default: return value;
  }
}

function getLabValue(analysisData: EnhancedAnalysisResult, labNames: string[], analyte?: string): number | null {
  if (!analysisData.medicalPanels) return null;
  
  for (const panel of analysisData.medicalPanels) {
    for (const lab of panel.abnormalLabs) {
      const labNameLower = lab.name.toLowerCase();
      if (labNames.some(name => {
        const n = name.toLowerCase();
        if (!labNameLower.includes(n)) return false;
        if (n === 'ldl' && labNameLower.includes('vldl')) return false;      // LDL !== VLDL
        if ((n === 'hemoglobin' || n === 'hb') && /(a1c|glyc)/i.test(labNameLower)) return false; // Hb !== HbA1c
        return true;
      })) {
        const numValue = parseFloat(lab.value);
        if (!isNaN(numValue)) return normalizeUnit(analyte, numValue, lab.unit);
      }
    }
  }
  return null;
}

// Calculate Cardiovascular Risk Score
function calculateCardiovascularRisk(
  analysisData: EnhancedAnalysisResult,
  demographics?: Demographics,
  clinicalContext?: ClinicalContext
): RiskScore {
  const factors: string[] = [];
  let riskPoints = 0;
  
  // Age factor
  if (demographics?.age) {
    if (demographics.age > 65) {
      riskPoints += 25;
      factors.push('Age >65 years (major risk factor)');
    } else if (demographics.age > 55) {
      riskPoints += 15;
      factors.push('Age >55 years (elevated risk)');
    } else if (demographics.age > 45) {
      riskPoints += 5;
      factors.push('Age >45 years (moderate risk)');
    }
  }
  
  // Lipid profile
  const totalChol = getLabValue(analysisData, ['total cholesterol', 'cholesterol'], 'cholesterol');
  const ldl = getLabValue(analysisData, ['ldl', 'ldl cholesterol'], 'cholesterol');
  const hdl = getLabValue(analysisData, ['hdl', 'hdl cholesterol'], 'cholesterol');
  const triglycerides = getLabValue(analysisData, ['triglyceride'], 'triglycerides');
  
  if (totalChol !== null) {
    if (totalChol >= 240) {
      riskPoints += 20;
      factors.push(`Very high total cholesterol (${totalChol} mg/dL)`);
    } else if (totalChol >= 200) {
      riskPoints += 10;
      factors.push(`High total cholesterol (${totalChol} mg/dL)`);
    }
  }
  
  if (ldl !== null) {
    if (ldl >= 190) {
      riskPoints += 25;
      factors.push(`Very high LDL cholesterol (${ldl} mg/dL)`);
    } else if (ldl >= 160) {
      riskPoints += 15;
      factors.push(`High LDL cholesterol (${ldl} mg/dL)`);
    } else if (ldl >= 130) {
      riskPoints += 8;
      factors.push(`Borderline high LDL (${ldl} mg/dL)`);
    }
  }
  
  if (hdl !== null) {
    const isLowHDL = (demographics?.gender === 'male' && hdl < 40) || 
                     (demographics?.gender === 'female' && hdl < 50);
    if (isLowHDL) {
      riskPoints += 15;
      factors.push(`Low HDL cholesterol (${hdl} mg/dL)`);
    }
  }
  
  if (triglycerides !== null) {
    if (triglycerides >= 500) {
      riskPoints += 20;
      factors.push(`Very high triglycerides (${triglycerides} mg/dL)`);
    } else if (triglycerides >= 200) {
      riskPoints += 12;
      factors.push(`High triglycerides (${triglycerides} mg/dL)`);
    }
  }
  
  // Blood sugar / Diabetes
  const hba1c = getLabValue(analysisData, ['hba1c', 'hemoglobin a1c']);
  const glucose = getLabValue(analysisData, ['glucose', 'fasting glucose'], 'glucose');
  
  if (hba1c !== null) {
    if (hba1c >= 7.0) {
      riskPoints += 20;
      factors.push(`Diabetes (HbA1c ${hba1c}%)`);
    } else if (hba1c >= 6.5) {
      riskPoints += 15;
      factors.push(`Diabetes (HbA1c ${hba1c}%)`);
    } else if (hba1c >= 5.7) {
      riskPoints += 8;
      factors.push(`Pre-diabetes (HbA1c ${hba1c}%)`);
    }
  }
  
  if (glucose !== null && hba1c === null) {
    if (glucose >= 126) {
      riskPoints += 15;
      factors.push(`High fasting glucose (${glucose} mg/dL)`);
    } else if (glucose >= 100) {
      riskPoints += 7;
      factors.push(`Elevated fasting glucose (${glucose} mg/dL)`);
    }
  }
  
  // Kidney function
  const creatinine = getLabValue(analysisData, ['creatinine'], 'creatinine');
  if (creatinine !== null && creatinine > 1.5) {
    riskPoints += 12;
    factors.push(`Impaired kidney function (Creatinine ${creatinine} mg/dL)`);
  }
  
  // Inflammation markers
  const alt = getLabValue(analysisData, ['alt', 'sgpt']);
  const ast = getLabValue(analysisData, ['ast', 'sgot']);
  if ((alt !== null && alt > 40) || (ast !== null && ast > 40)) {
    riskPoints += 5;
    factors.push('Elevated liver enzymes (may indicate inflammation)');
  }
  
  // Clinical context factors
  if (clinicalContext) {
    // Family history
    if (clinicalContext.familyHistory && clinicalContext.familyHistory.length > 0) {
      const hasCardiacHistory = clinicalContext.familyHistory.some(h => 
        h.toLowerCase().includes('heart') || h.toLowerCase().includes('cardiac') || h.toLowerCase().includes('stroke')
      );
      if (hasCardiacHistory) {
        riskPoints += 15;
        factors.push('Family history of heart disease reported');
      }
    }
    
    // Smoking
    if (clinicalContext.lifestyle?.smoking) {
      riskPoints += 20;
      factors.push('Current smoker (major modifiable risk factor)');
    }
    
    // Sedentary lifestyle
    if (clinicalContext.lifestyle?.exercise === 'sedentary' || clinicalContext.lifestyle?.exercise === 'minimal') {
      riskPoints += 10;
      factors.push('Sedentary lifestyle reported');
    }
    
    // Alcohol consumption
    if (clinicalContext.lifestyle?.alcohol === 'heavy' || clinicalContext.lifestyle?.alcohol === 'excessive') {
      riskPoints += 8;
      factors.push('Heavy alcohol consumption');
    }
  }
  
  // Determine risk level
  let level: 'low' | 'moderate' | 'high' | 'very-high';
  let description: string;
  
  if (riskPoints >= 60) {
    level = 'very-high';
    description = 'Very high risk of cardiovascular disease within 10 years. Immediate medical intervention recommended.';
  } else if (riskPoints >= 40) {
    level = 'high';
    description = 'High risk of cardiovascular disease. Aggressive lifestyle changes and medication likely needed.';
  } else if (riskPoints >= 20) {
    level = 'moderate';
    description = 'Moderate risk of cardiovascular disease. Lifestyle modifications and monitoring recommended.';
  } else {
    level = 'low';
    description = 'Low risk of cardiovascular disease. Maintain healthy lifestyle habits.';
  }
  
  return {
    score: Math.min(riskPoints, 100),
    level,
    description,
    contributingFactors: factors.length > 0 ? factors : ['No major cardiovascular risk factors identified']
  };
}

// Calculate Diabetes Risk Score
function calculateDiabetesRisk(
  analysisData: EnhancedAnalysisResult,
  demographics?: Demographics,
  clinicalContext?: ClinicalContext
): RiskScore {
  const factors: string[] = [];
  let riskPoints = 0;
  
  // HbA1c - primary indicator
  const hba1c = getLabValue(analysisData, ['hba1c', 'hemoglobin a1c']);
  if (hba1c !== null) {
    if (hba1c >= 6.5) {
      riskPoints += 50; // Already diabetic
      factors.push(`Diabetes diagnosis (HbA1c ${hba1c}%)`);
    } else if (hba1c >= 6.0) {
      riskPoints += 35;
      factors.push(`High risk - HbA1c ${hba1c}% (near diabetes threshold)`);
    } else if (hba1c >= 5.7) {
      riskPoints += 20;
      factors.push(`Pre-diabetes (HbA1c ${hba1c}%)`);
    }
  }
  
  // Fasting glucose
  const glucose = getLabValue(analysisData, ['glucose', 'fasting glucose'], 'glucose');
  if (glucose !== null) {
    if (glucose >= 126) {
      riskPoints += 40;
      factors.push(`Diabetic range glucose (${glucose} mg/dL)`);
    } else if (glucose >= 110) {
      riskPoints += 25;
      factors.push(`Impaired fasting glucose (${glucose} mg/dL)`);
    } else if (glucose >= 100) {
      riskPoints += 15;
      factors.push(`Elevated fasting glucose (${glucose} mg/dL)`);
    }
  }
  
  // Age factor
  if (demographics?.age && demographics.age >= 45) {
    riskPoints += 8;
    factors.push(`Age ${demographics.age} years (increased risk)`);
  }
  
  // Lipid abnormalities (insulin resistance markers)
  const triglycerides = getLabValue(analysisData, ['triglyceride'], 'triglycerides');
  const hdl = getLabValue(analysisData, ['hdl', 'hdl cholesterol'], 'cholesterol');
  
  if (triglycerides !== null && triglycerides >= 150) {
    riskPoints += 10;
    factors.push(`High triglycerides (${triglycerides} mg/dL) - insulin resistance marker`);
  }
  
  if (hdl !== null) {
    const isLowHDL = (demographics?.gender === 'male' && hdl < 40) || 
                     (demographics?.gender === 'female' && hdl < 50);
    if (isLowHDL) {
      riskPoints += 10;
      factors.push(`Low HDL (${hdl} mg/dL) - insulin resistance marker`);
    }
  }
  
  // Liver enzymes (NAFLD - associated with diabetes)
  const alt = getLabValue(analysisData, ['alt', 'sgpt']);
  if (alt !== null && alt > 40) {
    riskPoints += 8;
    factors.push(`Elevated liver enzymes (potential fatty liver)`);
  }
  
  // Clinical context factors
  if (clinicalContext) {
    // Family history of diabetes
    if (clinicalContext.familyHistory && clinicalContext.familyHistory.length > 0) {
      const hasDiabetesHistory = clinicalContext.familyHistory.some(h => 
        h.toLowerCase().includes('diabetes') || h.toLowerCase().includes('sugar')
      );
      if (hasDiabetesHistory) {
        riskPoints += 15;
        factors.push('Family history of diabetes reported');
      }
    }
    
    // Lifestyle factors
    if (clinicalContext.lifestyle?.exercise === 'sedentary' || clinicalContext.lifestyle?.exercise === 'minimal') {
      riskPoints += 10;
      factors.push('Sedentary lifestyle (major diabetes risk factor)');
    }
    
    // Check for PCOS or hormonal conditions
    if (clinicalContext.conditions && clinicalContext.conditions.length > 0) {
      const hasHormonalIssue = clinicalContext.conditions.some(c => 
        c.name.toLowerCase().includes('pcos') || c.name.toLowerCase().includes('hormonal')
      );
      if (hasHormonalIssue) {
        riskPoints += 10;
        factors.push('Hormonal condition increasing insulin resistance');
      }
    }
  }
  
  // Determine risk level
  let level: 'low' | 'moderate' | 'high' | 'very-high';
  let description: string;
  
  if (riskPoints >= 60) {
    level = 'very-high';
    description = 'Very high risk or confirmed diabetes. Immediate endocrinology consultation and treatment required.';
  } else if (riskPoints >= 40) {
    level = 'high';
    description = 'High risk of developing Type 2 diabetes. Aggressive lifestyle intervention recommended.';
  } else if (riskPoints >= 20) {
    level = 'moderate';
    description = 'Moderate risk of diabetes. Lifestyle modifications and regular monitoring recommended.';
  } else {
    level = 'low';
    description = 'Low risk of diabetes. Maintain healthy diet and exercise habits.';
  }
  
  return {
    score: Math.min(riskPoints, 100),
    level,
    description,
    contributingFactors: factors.length > 0 ? factors : ['No significant diabetes risk factors identified']
  };
}

// Assess Metabolic Syndrome
function assessMetabolicSyndrome(
  analysisData: EnhancedAnalysisResult,
  demographics?: Demographics
): MetabolicSyndromeAssessment {
  const criteria: MetabolicSyndromeAssessment['criteria'] = [];
  let metCount = 0;
  
  // 1. Elevated waist circumference (cannot be determined from labs alone)
  // We skip this as it requires physical measurement
  
  // 2. Elevated triglycerides (≥150 mg/dL)
  const triglycerides = getLabValue(analysisData, ['triglyceride'], 'triglycerides');
  const triglyceridesMet = triglycerides !== null && triglycerides >= 150;
  if (triglyceridesMet) metCount++;
  criteria.push({
    name: 'Elevated Triglycerides',
    met: triglyceridesMet,
    value: triglycerides ? `${triglycerides} mg/dL` : 'Not measured',
    threshold: '≥150 mg/dL'
  });
  
  // 3. Reduced HDL cholesterol
  const hdl = getLabValue(analysisData, ['hdl', 'hdl cholesterol'], 'cholesterol');
  const hdlMet = hdl !== null && (
    (demographics?.gender === 'male' && hdl < 40) ||
    (demographics?.gender === 'female' && hdl < 50) ||
    (!demographics?.gender && hdl < 45) // Use average if gender unknown
  );
  if (hdlMet) metCount++;
  criteria.push({
    name: 'Low HDL Cholesterol',
    met: hdlMet,
    value: hdl ? `${hdl} mg/dL` : 'Not measured',
    threshold: demographics?.gender === 'male' ? '<40 mg/dL' : '<50 mg/dL'
  });
  
  // 4. Elevated blood pressure (cannot be determined from labs alone, but kidney function suggests it)
  // We use creatinine as a proxy
  const creatinine = getLabValue(analysisData, ['creatinine'], 'creatinine');
  const bpSuspected = creatinine !== null && creatinine > 1.2;
  // Don't count this definitively without actual BP measurement
  criteria.push({
    name: 'Elevated Blood Pressure',
    met: false, // Cannot confirm from labs alone
    value: 'Requires clinical measurement',
    threshold: '≥130/85 mmHg'
  });
  
  // 5. Elevated fasting glucose (≥100 mg/dL) or HbA1c
  const glucose = getLabValue(analysisData, ['glucose', 'fasting glucose'], 'glucose');
  const hba1c = getLabValue(analysisData, ['hba1c', 'hemoglobin a1c']);
  const glucoseMet = (glucose !== null && glucose >= 100) || (hba1c !== null && hba1c >= 5.7);
  if (glucoseMet) metCount++;
  criteria.push({
    name: 'Elevated Blood Glucose',
    met: glucoseMet,
    value: hba1c ? `HbA1c ${hba1c}%` : glucose ? `${glucose} mg/dL` : 'Not measured',
    threshold: '≥100 mg/dL or HbA1c ≥5.7%'
  });
  
  // Note: We can only assess 3 of the 5 criteria from lab values alone
  const assessableCount = 3; // triglycerides, HDL, glucose
  const hasSyndrome = metCount >= 3;
  
  let description: string;
  if (hasSyndrome) {
    description = `Metabolic Syndrome LIKELY present (${metCount}/${assessableCount} lab criteria met). Clinical exam needed to confirm with waist circumference and blood pressure. Significantly increases cardiovascular disease and diabetes risk.`;
  } else if (metCount === 2) {
    description = `${metCount}/${assessableCount} lab criteria met. At risk for metabolic syndrome. Lifestyle modifications recommended. Clinical exam needed for complete assessment.`;
  } else if (metCount === 1) {
    description = `${metCount}/${assessableCount} lab criteria met. Monitor closely and maintain healthy lifestyle. Clinical exam recommended.`;
  } else {
    description = 'No lab criteria for metabolic syndrome met. Good metabolic health based on available lab values. Continue healthy habits.';
  }
  
  return {
    hasSyndrome,
    criteriaCount: metCount,
    criteria,
    description
  };
}

// Main calculation function
export function calculateHealthRisks(
  analysisData: EnhancedAnalysisResult,
  demographics?: Demographics,
  clinicalContext?: ClinicalContext
): HealthRiskCalculation {
  const cardiovascularRisk = calculateCardiovascularRisk(analysisData, demographics, clinicalContext);
  const diabetesRisk = calculateDiabetesRisk(analysisData, demographics, clinicalContext);
  const metabolicSyndrome = assessMetabolicSyndrome(analysisData, demographics);
  
  // Determine overall risk level (take the highest)
  const riskLevels = ['low', 'moderate', 'high', 'very-high'] as const;
  const cvIndex = riskLevels.indexOf(cardiovascularRisk.level);
  const diabetesIndex = riskLevels.indexOf(diabetesRisk.level);
  const maxIndex = Math.max(cvIndex, diabetesIndex);
  
  return {
    cardiovascularRisk,
    diabetesRisk,
    metabolicSyndrome,
    overallRiskLevel: riskLevels[maxIndex]
  };
}
