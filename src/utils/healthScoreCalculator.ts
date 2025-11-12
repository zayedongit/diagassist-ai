import { EnhancedAnalysisResult, Demographics } from "@/types/medicalAnalysis";

export interface SystemScore {
  score: number; // 0-100
  weight: number; // percentage contribution
  parametersEvaluated: string[];
  status: 'optimal' | 'good' | 'borderline' | 'abnormal' | 'critical';
  keyIssues: string[];
}

export interface ScoreModifier {
  factor: string;
  impact: number;
  description: string;
}

export interface HealthScoreBreakdown {
  overallScore: number;
  category: 'excellent' | 'good' | 'fair' | 'needs-attention' | 'critical';
  categoryLabel: string;
  categoryColor: string;
  systemScores: {
    metabolic: SystemScore;
    cardiovascular: SystemScore;
    kidney: SystemScore;
    liver: SystemScore;
    hematologic: SystemScore;
    endocrine: SystemScore;
  };
  modifiers: ScoreModifier[];
  recommendations: string[];
  comparisonToPopulation?: string;
}

// Helper function to get lab value
const getLabValue = (analysisData: EnhancedAnalysisResult, possibleNames: string[]): number | null => {
  // Check medicalPanels abnormalLabs
  for (const panel of analysisData.medicalPanels || []) {
    for (const lab of panel.abnormalLabs || []) {
      if (possibleNames.some(name => lab.name.toLowerCase().includes(name.toLowerCase()))) {
        const value = parseFloat(lab.value);
        return isNaN(value) ? null : value;
      }
    }
  }
  
  // Check legacy labs field
  if (analysisData.labs) {
    for (const lab of analysisData.labs) {
      if (possibleNames.some(name => lab.name.toLowerCase().includes(name.toLowerCase()))) {
        const value = parseFloat(lab.value);
        return isNaN(value) ? null : value;
      }
    }
  }
  
  return null;
};

// Score individual parameter based on status and severity
const scoreParameter = (status: string, value: number, referenceMin: number, referenceMax: number): number => {
  if (status === 'normal') return 100;
  
  const deviation = value < referenceMin 
    ? (referenceMin - value) / referenceMin 
    : (value - referenceMax) / referenceMax;
  
  if (deviation < 0.1) return 90; // Borderline
  if (deviation < 0.25) return 75; // Mildly abnormal
  if (deviation < 0.5) return 60; // Moderately abnormal
  if (deviation < 1.0) return 40; // Significantly abnormal
  return 20; // Critically abnormal
};

// Calculate Metabolic Health Score (25% weight)
const calculateMetabolicScore = (analysisData: EnhancedAnalysisResult): SystemScore => {
  const hba1c = getLabValue(analysisData, ['hba1c', 'glycosylated hemoglobin']);
  const glucose = getLabValue(analysisData, ['fasting glucose', 'glucose', 'blood sugar']);
  const insulin = getLabValue(analysisData, ['insulin']);
  
  const scores: number[] = [];
  const parameters: string[] = [];
  const issues: string[] = [];
  
  // HbA1c scoring (ADA Guidelines)
  if (hba1c !== null) {
    parameters.push('HbA1c');
    if (hba1c < 5.7) scores.push(100);
    else if (hba1c < 6.0) scores.push(85);
    else if (hba1c < 6.5) scores.push(65); // Prediabetes
    else if (hba1c < 7.0) scores.push(45);
    else scores.push(25); // Diabetes
    
    if (hba1c >= 6.5) issues.push('HbA1c indicates diabetes');
    else if (hba1c >= 5.7) issues.push('HbA1c in prediabetic range');
  }
  
  // Fasting Glucose scoring (ADA Guidelines)
  if (glucose !== null) {
    parameters.push('Fasting Glucose');
    if (glucose < 100) scores.push(100);
    else if (glucose < 110) scores.push(85);
    else if (glucose < 126) scores.push(65); // Prediabetes
    else if (glucose < 150) scores.push(45);
    else scores.push(25); // Diabetes
    
    if (glucose >= 126) issues.push('Fasting glucose indicates diabetes');
    else if (glucose >= 100) issues.push('Impaired fasting glucose');
  }
  
  // Insulin (if available)
  if (insulin !== null) {
    parameters.push('Insulin');
    if (insulin >= 2 && insulin <= 20) scores.push(100);
    else if (insulin > 20 && insulin <= 30) {
      scores.push(70);
      issues.push('Elevated insulin suggests insulin resistance');
    } else if (insulin > 30) {
      scores.push(40);
      issues.push('High insulin indicates significant insulin resistance');
    } else scores.push(80);
  }
  
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 85;
  
  return {
    score: Math.round(avgScore),
    weight: 25,
    parametersEvaluated: parameters,
    status: avgScore >= 85 ? 'optimal' : avgScore >= 70 ? 'good' : avgScore >= 55 ? 'borderline' : avgScore >= 40 ? 'abnormal' : 'critical',
    keyIssues: issues
  };
};

// Calculate Cardiovascular Health Score (25% weight)
const calculateCardiovascularScore = (analysisData: EnhancedAnalysisResult): SystemScore => {
  const totalChol = getLabValue(analysisData, ['total cholesterol', 'cholesterol']);
  const ldl = getLabValue(analysisData, ['ldl', 'low density lipoprotein']);
  const hdl = getLabValue(analysisData, ['hdl', 'high density lipoprotein']);
  const triglycerides = getLabValue(analysisData, ['triglycerides', 'tg']);
  const tchol_hdl_ratio = getLabValue(analysisData, ['tchol/hdl', 'cholesterol ratio']);
  
  const scores: number[] = [];
  const parameters: string[] = [];
  const issues: string[] = [];
  
  // Total Cholesterol (AHA Guidelines)
  if (totalChol !== null) {
    parameters.push('Total Cholesterol');
    if (totalChol < 200) scores.push(100);
    else if (totalChol < 240) scores.push(75); // Borderline high
    else if (totalChol < 280) scores.push(50);
    else scores.push(25); // High
    
    if (totalChol >= 240) issues.push('High total cholesterol');
    else if (totalChol >= 200) issues.push('Borderline high cholesterol');
  }
  
  // LDL Cholesterol (AHA Guidelines)
  if (ldl !== null) {
    parameters.push('LDL Cholesterol');
    if (ldl < 100) scores.push(100); // Optimal
    else if (ldl < 130) scores.push(85); // Near optimal
    else if (ldl < 160) scores.push(65); // Borderline high
    else if (ldl < 190) scores.push(40); // High
    else scores.push(20); // Very high
    
    if (ldl >= 160) issues.push('High LDL cholesterol');
    else if (ldl >= 130) issues.push('LDL above optimal');
  }
  
  // HDL Cholesterol (AHA Guidelines)
  if (hdl !== null) {
    parameters.push('HDL Cholesterol');
    if (hdl >= 60) scores.push(100); // Protective
    else if (hdl >= 50) scores.push(85);
    else if (hdl >= 40) scores.push(65);
    else scores.push(40); // Low HDL is a risk factor
    
    if (hdl < 40) issues.push('Low HDL cholesterol (risk factor)');
  }
  
  // Triglycerides (AHA Guidelines)
  if (triglycerides !== null) {
    parameters.push('Triglycerides');
    if (triglycerides < 150) scores.push(100); // Normal
    else if (triglycerides < 200) scores.push(75); // Borderline high
    else if (triglycerides < 500) scores.push(50); // High
    else scores.push(20); // Very high
    
    if (triglycerides >= 200) issues.push('High triglycerides');
    else if (triglycerides >= 150) issues.push('Borderline high triglycerides');
  }
  
  // Total Cholesterol/HDL Ratio
  if (tchol_hdl_ratio !== null) {
    parameters.push('TC/HDL Ratio');
    if (tchol_hdl_ratio < 3.5) scores.push(100);
    else if (tchol_hdl_ratio < 5.0) scores.push(75);
    else scores.push(50);
    
    if (tchol_hdl_ratio >= 5.0) issues.push('High cholesterol ratio');
  }
  
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 85;
  
  return {
    score: Math.round(avgScore),
    weight: 25,
    parametersEvaluated: parameters,
    status: avgScore >= 85 ? 'optimal' : avgScore >= 70 ? 'good' : avgScore >= 55 ? 'borderline' : avgScore >= 40 ? 'abnormal' : 'critical',
    keyIssues: issues
  };
};

// Calculate Kidney Function Score (15% weight)
const calculateKidneyScore = (analysisData: EnhancedAnalysisResult): SystemScore => {
  const creatinine = getLabValue(analysisData, ['creatinine']);
  const bun = getLabValue(analysisData, ['bun', 'blood urea nitrogen', 'urea']);
  const egfr = getLabValue(analysisData, ['egfr', 'gfr']);
  const sodium = getLabValue(analysisData, ['sodium', 'na']);
  const potassium = getLabValue(analysisData, ['potassium', 'k']);
  
  const scores: number[] = [];
  const parameters: string[] = [];
  const issues: string[] = [];
  
  // Creatinine (KDIGO Guidelines)
  if (creatinine !== null) {
    parameters.push('Creatinine');
    if (creatinine >= 0.6 && creatinine <= 1.2) scores.push(100);
    else if (creatinine <= 1.5) scores.push(80);
    else if (creatinine <= 2.0) scores.push(60);
    else if (creatinine <= 3.0) scores.push(40);
    else scores.push(20);
    
    if (creatinine > 1.5) issues.push('Elevated creatinine suggests kidney dysfunction');
  }
  
  // eGFR (KDIGO Guidelines)
  if (egfr !== null) {
    parameters.push('eGFR');
    if (egfr >= 90) scores.push(100); // Normal
    else if (egfr >= 60) scores.push(85); // Mild decrease
    else if (egfr >= 45) scores.push(65); // Mild to moderate decrease
    else if (egfr >= 30) scores.push(45); // Moderate to severe decrease
    else if (egfr >= 15) scores.push(25); // Severe decrease
    else scores.push(10); // Kidney failure
    
    if (egfr < 60) issues.push('Reduced kidney function (eGFR < 60)');
  }
  
  // BUN
  if (bun !== null) {
    parameters.push('BUN');
    if (bun >= 7 && bun <= 20) scores.push(100);
    else if (bun <= 30) scores.push(75);
    else if (bun <= 50) scores.push(50);
    else scores.push(25);
    
    if (bun > 20) issues.push('Elevated BUN');
  }
  
  // Electrolytes
  if (sodium !== null) {
    parameters.push('Sodium');
    if (sodium >= 135 && sodium <= 145) scores.push(100);
    else scores.push(70);
  }
  
  if (potassium !== null) {
    parameters.push('Potassium');
    if (potassium >= 3.5 && potassium <= 5.0) scores.push(100);
    else if (potassium >= 5.0 && potassium <= 5.5) {
      scores.push(75);
      issues.push('Borderline high potassium');
    } else if (potassium > 5.5) {
      scores.push(50);
      issues.push('Elevated potassium (hyperkalemia risk)');
    } else {
      scores.push(70);
      issues.push('Low potassium');
    }
  }
  
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 90;
  
  return {
    score: Math.round(avgScore),
    weight: 15,
    parametersEvaluated: parameters,
    status: avgScore >= 85 ? 'optimal' : avgScore >= 70 ? 'good' : avgScore >= 55 ? 'borderline' : avgScore >= 40 ? 'abnormal' : 'critical',
    keyIssues: issues
  };
};

// Calculate Liver Function Score (15% weight)
const calculateLiverScore = (analysisData: EnhancedAnalysisResult): SystemScore => {
  const alt = getLabValue(analysisData, ['alt', 'sgpt']);
  const ast = getLabValue(analysisData, ['ast', 'sgot']);
  const bilirubin = getLabValue(analysisData, ['bilirubin', 'total bilirubin']);
  const albumin = getLabValue(analysisData, ['albumin']);
  const alp = getLabValue(analysisData, ['alp', 'alkaline phosphatase']);
  
  const scores: number[] = [];
  const parameters: string[] = [];
  const issues: string[] = [];
  
  // ALT (normal: 7-56 U/L)
  if (alt !== null) {
    parameters.push('ALT');
    if (alt <= 56) scores.push(100);
    else if (alt <= 80) scores.push(75);
    else if (alt <= 120) scores.push(55);
    else scores.push(30);
    
    if (alt > 80) issues.push('Elevated ALT suggests liver inflammation');
  }
  
  // AST (normal: 10-40 U/L)
  if (ast !== null) {
    parameters.push('AST');
    if (ast <= 40) scores.push(100);
    else if (ast <= 60) scores.push(75);
    else if (ast <= 100) scores.push(55);
    else scores.push(30);
    
    if (ast > 60) issues.push('Elevated AST');
  }
  
  // AST/ALT Ratio
  if (ast !== null && alt !== null) {
    const ratio = ast / alt;
    if (ratio > 2) {
      issues.push('AST/ALT ratio suggests possible alcohol-related liver damage');
    }
  }
  
  // Bilirubin (normal: 0.1-1.2 mg/dL)
  if (bilirubin !== null) {
    parameters.push('Bilirubin');
    if (bilirubin <= 1.2) scores.push(100);
    else if (bilirubin <= 2.0) scores.push(70);
    else if (bilirubin <= 3.0) scores.push(50);
    else scores.push(25);
    
    if (bilirubin > 1.2) issues.push('Elevated bilirubin');
  }
  
  // Albumin (normal: 3.5-5.5 g/dL)
  if (albumin !== null) {
    parameters.push('Albumin');
    if (albumin >= 3.5 && albumin <= 5.5) scores.push(100);
    else if (albumin >= 3.0) scores.push(75);
    else scores.push(50);
    
    if (albumin < 3.5) issues.push('Low albumin (liver or kidney issue)');
  }
  
  // ALP
  if (alp !== null) {
    parameters.push('ALP');
    if (alp >= 30 && alp <= 120) scores.push(100);
    else if (alp <= 150) scores.push(80);
    else scores.push(60);
  }
  
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 90;
  
  return {
    score: Math.round(avgScore),
    weight: 15,
    parametersEvaluated: parameters,
    status: avgScore >= 85 ? 'optimal' : avgScore >= 70 ? 'good' : avgScore >= 55 ? 'borderline' : avgScore >= 40 ? 'abnormal' : 'critical',
    keyIssues: issues
  };
};

// Calculate Hematologic Health Score (10% weight)
const calculateHematologicScore = (analysisData: EnhancedAnalysisResult): SystemScore => {
  const hemoglobin = getLabValue(analysisData, ['hemoglobin', 'hb']);
  const rbc = getLabValue(analysisData, ['rbc', 'red blood cell']);
  const wbc = getLabValue(analysisData, ['wbc', 'white blood cell']);
  const platelets = getLabValue(analysisData, ['platelet']);
  const mcv = getLabValue(analysisData, ['mcv', 'mean corpuscular volume']);
  
  const scores: number[] = [];
  const parameters: string[] = [];
  const issues: string[] = [];
  
  // Hemoglobin (WHO Guidelines)
  if (hemoglobin !== null) {
    parameters.push('Hemoglobin');
    // Gender-specific ranges (assuming mixed or using conservative threshold)
    if (hemoglobin >= 12 && hemoglobin <= 17) scores.push(100);
    else if (hemoglobin >= 11 && hemoglobin < 12) {
      scores.push(70);
      issues.push('Mild anemia');
    } else if (hemoglobin >= 9) {
      scores.push(50);
      issues.push('Moderate anemia');
    } else if (hemoglobin < 9) {
      scores.push(25);
      issues.push('Severe anemia');
    } else if (hemoglobin > 17) {
      scores.push(75);
      issues.push('Elevated hemoglobin');
    }
  }
  
  // RBC Count
  if (rbc !== null) {
    parameters.push('RBC Count');
    if (rbc >= 4.0 && rbc <= 6.0) scores.push(100);
    else scores.push(75);
  }
  
  // WBC Count
  if (wbc !== null) {
    parameters.push('WBC Count');
    if (wbc >= 4.0 && wbc <= 11.0) scores.push(100);
    else if (wbc < 4.0) {
      scores.push(65);
      issues.push('Low white blood cell count');
    } else if (wbc <= 15.0) {
      scores.push(70);
      issues.push('Elevated white blood cell count');
    } else {
      scores.push(45);
      issues.push('High white blood cell count (possible infection)');
    }
  }
  
  // Platelets
  if (platelets !== null) {
    parameters.push('Platelets');
    if (platelets >= 150 && platelets <= 400) scores.push(100);
    else if (platelets >= 100 && platelets < 150) {
      scores.push(70);
      issues.push('Low platelet count');
    } else if (platelets < 100) {
      scores.push(40);
      issues.push('Thrombocytopenia (low platelets)');
    } else {
      scores.push(75);
      issues.push('Elevated platelets');
    }
  }
  
  // MCV (microcytic, normocytic, macrocytic)
  if (mcv !== null) {
    parameters.push('MCV');
    if (mcv >= 80 && mcv <= 100) scores.push(100);
    else if (mcv < 80) {
      scores.push(70);
      issues.push('Low MCV (microcytic anemia - possible iron deficiency)');
    } else {
      scores.push(75);
      issues.push('High MCV (macrocytic anemia)');
    }
  }
  
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 85;
  
  return {
    score: Math.round(avgScore),
    weight: 10,
    parametersEvaluated: parameters,
    status: avgScore >= 85 ? 'optimal' : avgScore >= 70 ? 'good' : avgScore >= 55 ? 'borderline' : avgScore >= 40 ? 'abnormal' : 'critical',
    keyIssues: issues
  };
};

// Calculate Endocrine Health Score (10% weight)
const calculateEndocrineScore = (analysisData: EnhancedAnalysisResult): SystemScore => {
  const tsh = getLabValue(analysisData, ['tsh', 'thyroid stimulating hormone']);
  const t3 = getLabValue(analysisData, ['t3', 'triiodothyronine']);
  const t4 = getLabValue(analysisData, ['t4', 'thyroxine']);
  const vitaminD = getLabValue(analysisData, ['vitamin d', '25-oh vitamin d']);
  
  const scores: number[] = [];
  const parameters: string[] = [];
  const issues: string[] = [];
  
  // TSH (normal: 0.4-4.0 mIU/L)
  if (tsh !== null) {
    parameters.push('TSH');
    if (tsh >= 0.4 && tsh <= 4.0) scores.push(100);
    else if (tsh > 4.0 && tsh <= 10.0) {
      scores.push(65);
      issues.push('Elevated TSH suggests hypothyroidism');
    } else if (tsh > 10.0) {
      scores.push(40);
      issues.push('High TSH indicates hypothyroidism');
    } else if (tsh < 0.4) {
      scores.push(70);
      issues.push('Low TSH suggests hyperthyroidism');
    }
  }
  
  // T3
  if (t3 !== null) {
    parameters.push('T3');
    if (t3 >= 80 && t3 <= 200) scores.push(100);
    else scores.push(75);
  }
  
  // T4
  if (t4 !== null) {
    parameters.push('T4');
    if (t4 >= 5.0 && t4 <= 12.0) scores.push(100);
    else scores.push(75);
  }
  
  // Vitamin D
  if (vitaminD !== null) {
    parameters.push('Vitamin D');
    if (vitaminD >= 30) scores.push(100); // Sufficient
    else if (vitaminD >= 20) {
      scores.push(70);
      issues.push('Vitamin D insufficiency');
    } else {
      scores.push(50);
      issues.push('Vitamin D deficiency');
    }
  }
  
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 85;
  
  return {
    score: Math.round(avgScore),
    weight: 10,
    parametersEvaluated: parameters,
    status: avgScore >= 85 ? 'optimal' : avgScore >= 70 ? 'good' : avgScore >= 55 ? 'borderline' : avgScore >= 40 ? 'abnormal' : 'critical',
    keyIssues: issues
  };
};

// Apply risk factor modifiers
const applyRiskModifiers = (
  baseScore: number,
  demographics?: Demographics,
  clinicalContext?: any
): { finalScore: number; modifiers: ScoreModifier[] } => {
  let finalScore = baseScore;
  const modifiers: ScoreModifier[] = [];
  
  // Age modifier
  if (demographics?.age && demographics.age > 60) {
    finalScore -= 5;
    modifiers.push({
      factor: 'Age > 60',
      impact: -5,
      description: 'Age-related health risk adjustment'
    });
  }
  
  // Smoking
  if (clinicalContext?.smoking || clinicalContext?.isSmoker) {
    finalScore -= 10;
    modifiers.push({
      factor: 'Smoking',
      impact: -10,
      description: 'Smoking significantly increases health risks'
    });
  }
  
  // Family history
  if (clinicalContext?.familyHistory) {
    finalScore -= 5;
    modifiers.push({
      factor: 'Family History',
      impact: -5,
      description: 'Family history of chronic disease'
    });
  }
  
  // Sedentary lifestyle
  const isLifestyleString = typeof clinicalContext?.lifestyle === 'string';
  const lifestyleIncludesSedentary = isLifestyleString && clinicalContext.lifestyle.toLowerCase().includes('sedentary');
  
  if (lifestyleIncludesSedentary || clinicalContext?.exerciseFrequency === 'none') {
    finalScore -= 5;
    modifiers.push({
      factor: 'Sedentary Lifestyle',
      impact: -5,
      description: 'Lack of physical activity'
    });
  }
  
  // Ensure score stays within 0-100
  finalScore = Math.max(0, Math.min(100, finalScore));
  
  return { finalScore: Math.round(finalScore), modifiers };
};

// Get score category
const getScoreCategory = (score: number): { 
  category: 'excellent' | 'good' | 'fair' | 'needs-attention' | 'critical';
  label: string;
  color: string;
} => {
  if (score >= 90) return { category: 'excellent', label: 'Excellent Health', color: 'text-green-600' };
  if (score >= 75) return { category: 'good', label: 'Good Health', color: 'text-green-500' };
  if (score >= 60) return { category: 'fair', label: 'Fair Health', color: 'text-yellow-500' };
  if (score >= 40) return { category: 'needs-attention', label: 'Needs Attention', color: 'text-orange-500' };
  return { category: 'critical', label: 'Critical Attention Required', color: 'text-red-600' };
};

// Generate recommendations based on breakdown
const generateRecommendations = (breakdown: Omit<HealthScoreBreakdown, 'recommendations'>): string[] => {
  const recommendations: string[] = [];
  const { systemScores } = breakdown;
  
  // Priority: Focus on lowest scoring systems
  const systemArray = [
    { name: 'Metabolic', score: systemScores.metabolic },
    { name: 'Cardiovascular', score: systemScores.cardiovascular },
    { name: 'Kidney', score: systemScores.kidney },
    { name: 'Liver', score: systemScores.liver },
    { name: 'Hematologic', score: systemScores.hematologic },
    { name: 'Endocrine', score: systemScores.endocrine }
  ].sort((a, b) => a.score.score - b.score.score);
  
  // Add recommendations for the 3 lowest scoring systems
  systemArray.slice(0, 3).forEach(system => {
    if (system.score.score < 70 && system.score.keyIssues.length > 0) {
      recommendations.push(`${system.name}: ${system.score.keyIssues[0]}`);
    }
  });
  
  // General recommendations based on overall score
  if (breakdown.overallScore < 60) {
    recommendations.push('Schedule immediate consultation with your healthcare provider');
  } else if (breakdown.overallScore < 75) {
    recommendations.push('Consider lifestyle modifications and follow-up testing');
  }
  
  return recommendations.slice(0, 5); // Max 5 recommendations
};

// Main calculation function
export const calculateHealthScore = (
  analysisData: EnhancedAnalysisResult,
  demographics?: Demographics,
  clinicalContext?: any
): HealthScoreBreakdown => {
  // Calculate all system scores
  const metabolic = calculateMetabolicScore(analysisData);
  const cardiovascular = calculateCardiovascularScore(analysisData);
  const kidney = calculateKidneyScore(analysisData);
  const liver = calculateLiverScore(analysisData);
  const hematologic = calculateHematologicScore(analysisData);
  const endocrine = calculateEndocrineScore(analysisData);
  
  // Calculate weighted overall score
  const baseScore = 
    (metabolic.score * metabolic.weight / 100) +
    (cardiovascular.score * cardiovascular.weight / 100) +
    (kidney.score * kidney.weight / 100) +
    (liver.score * liver.weight / 100) +
    (hematologic.score * hematologic.weight / 100) +
    (endocrine.score * endocrine.weight / 100);
  
  // Apply risk modifiers
  const { finalScore, modifiers } = applyRiskModifiers(baseScore, demographics, clinicalContext);
  
  // Get category
  const { category, label, color } = getScoreCategory(finalScore);
  
  // Build preliminary breakdown
  const preliminaryBreakdown = {
    overallScore: finalScore,
    category,
    categoryLabel: label,
    categoryColor: color,
    systemScores: {
      metabolic,
      cardiovascular,
      kidney,
      liver,
      hematologic,
      endocrine
    },
    modifiers,
    recommendations: [],
    comparisonToPopulation: demographics?.age 
      ? `Compared to the Indian population in your age group (${demographics.age} years), your health score is ${finalScore >= 75 ? 'above average' : finalScore >= 60 ? 'average' : 'below average'}.`
      : undefined
  };
  
  // Generate recommendations
  const recommendations = generateRecommendations(preliminaryBreakdown);
  
  return {
    ...preliminaryBreakdown,
    recommendations
  };
};
