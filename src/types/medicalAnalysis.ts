export interface LabValue {
  name: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  status: 'normal' | 'low' | 'high' | 'critical';
  significance?: string;
}

export interface MedicalPanel {
  name: string;
  description: string;
  abnormalLabs: LabValue[];
  normalParameters?: string[];
  interpretation: string;
}

export interface Demographics {
  gender?: 'male' | 'female' | 'other';
  age?: number;
}

export interface HealthRisk {
  category: string;
  risk: string;
  level: 'mild' | 'moderate' | 'high';
  description: string;
}

export interface PredictiveInsight {
  parameter: string;
  currentTrend: string;
  timeframe: string;
  prediction: string;
  intervention: string;
  urgency: 'none' | 'mild' | 'moderate' | 'high';
}

export interface ManagementRecommendation {
  category: string;
  recommendation: string;
  frequency?: string;
  reasoning?: string;
}

export interface EnhancedAnalysisResult {
  overallStatus: 'good' | 'moderate' | 'concerning';
  summary: string;
  profileName: string;
  testDate?: string;
  demographics?: Demographics;
  medicalPanels: MedicalPanel[];
  nextSteps: string[];
  nextStepsStructured?: {
    consultation?: string[];
    investigation?: string[];
    lifestyle?: string[];
  };
  // RAG grounding: reference sources used to ground the explanations
  sources?: { id: string; source: string; tier?: number; title?: string; url?: string }[];
  citedSourceIds?: string[];
  grounded?: boolean;
  diet: {
    avoid: string[];
    increase: string[];
    detailed: string[];
  };
  lifestyle: {
    recommendations: string[];
    detailed: string[];
  };
  patientFriendlySummary: string;
  specialist: string;
  populationSource: string;
  patientName?: string;
  healthRisks?: HealthRisk[];
  predictiveInsights?: PredictiveInsight[];
  managementRecommendations?: ManagementRecommendation[];
  // Legacy compatibility fields
  labs?: LabValue[];
  keyFindings?: string[];
}

// Legacy support for existing components
export interface LegacyAnalysisResult {
  overallStatus: 'good' | 'moderate' | 'concerning';
  keyFindings?: string[];
  detailedAnalysis?: string[];
  summary: string;
  labs?: LabValue[];
  diet: {
    avoid: string[];
    increase: string[];
    lifestyle?: string[];
  };
  lifestyle?: string[];
  specialist: string;
  patientName?: string;
}

// Helper function to normalize data for backward compatibility
export const normalizeAnalysisData = (data: EnhancedAnalysisResult | LegacyAnalysisResult): LegacyAnalysisResult => {
  // If it's already legacy format, return as is
  if ('labs' in data || !('medicalPanels' in data)) {
    return data as LegacyAnalysisResult;
  }

  // Convert enhanced format to legacy format
  const enhanced = data as EnhancedAnalysisResult;
  const allAbnormalLabs = enhanced.medicalPanels.flatMap(panel => panel.abnormalLabs);
  
  return {
    overallStatus: enhanced.overallStatus,
    summary: enhanced.summary,
    detailedAnalysis: enhanced.medicalPanels.map(panel => 
      `${panel.name}: ${panel.interpretation}`
    ),
    labs: allAbnormalLabs,
    diet: {
      avoid: enhanced.diet.avoid,
      increase: enhanced.diet.increase,
      lifestyle: enhanced.lifestyle.recommendations
    },
    lifestyle: enhanced.lifestyle.recommendations,
    specialist: enhanced.specialist,
    patientName: enhanced.patientName
  };
};

export const extractAbnormalPanels = (data: EnhancedAnalysisResult): MedicalPanel[] => {
  return data.medicalPanels.filter(panel => panel.abnormalLabs.length > 0);
};