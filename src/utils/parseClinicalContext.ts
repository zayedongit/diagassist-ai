export interface ClinicalContext {
  symptoms?: string[];
  familyHistory?: string[];
  medications?: string[];
  lifestyle?: {
    smoking?: boolean;
    alcohol?: string;
    exercise?: string;
    diet?: string;
  };
  conditions?: Array<{
    name: string;
    probability: string;
  }>;
}

/**
 * Parse clinical assessment data to extract relevant clinical context
 */
export function parseClinicalContext(clinicalReport: any): ClinicalContext {
  if (!clinicalReport) return {};

  const context: ClinicalContext = {
    symptoms: [],
    familyHistory: [],
    medications: [],
    lifestyle: {},
    conditions: []
  };

  // Extract symptoms from chat conversation or questions
  if (clinicalReport.symptoms && Array.isArray(clinicalReport.symptoms)) {
    context.symptoms = clinicalReport.symptoms;
  }

  // Extract family history
  if (clinicalReport.familyHistory && Array.isArray(clinicalReport.familyHistory)) {
    context.familyHistory = clinicalReport.familyHistory;
  }

  // Extract medications
  if (clinicalReport.medications && Array.isArray(clinicalReport.medications)) {
    context.medications = clinicalReport.medications;
  }

  // Extract lifestyle factors
  if (clinicalReport.lifestyle) {
    context.lifestyle = {
      smoking: clinicalReport.lifestyle.smoking || false,
      alcohol: clinicalReport.lifestyle.alcohol || 'none',
      exercise: clinicalReport.lifestyle.exercise || 'sedentary',
      diet: clinicalReport.lifestyle.diet || 'balanced'
    };
  }

  // Extract possible conditions identified in clinical assessment
  if (clinicalReport.possibleConditions && Array.isArray(clinicalReport.possibleConditions)) {
    context.conditions = clinicalReport.possibleConditions.map((condition: any) => ({
      name: condition.name,
      probability: condition.probability
    }));
  }

  return context;
}

/**
 * Extract clinical factors that contribute to health risks
 */
export function extractRiskFactorsFromContext(context: ClinicalContext): string[] {
  const factors: string[] = [];

  // Lifestyle factors
  if (context.lifestyle?.smoking) {
    factors.push('Current smoker');
  }

  if (context.lifestyle?.alcohol && context.lifestyle.alcohol !== 'none') {
    factors.push(`Alcohol consumption: ${context.lifestyle.alcohol}`);
  }

  if (context.lifestyle?.exercise === 'sedentary' || context.lifestyle?.exercise === 'minimal') {
    factors.push('Sedentary lifestyle');
  }

  // Family history
  if (context.familyHistory && context.familyHistory.length > 0) {
    context.familyHistory.forEach(history => {
      if (history.toLowerCase().includes('heart') || history.toLowerCase().includes('cardiac')) {
        factors.push('Family history of heart disease');
      }
      if (history.toLowerCase().includes('diabetes')) {
        factors.push('Family history of diabetes');
      }
      if (history.toLowerCase().includes('hypertension') || history.toLowerCase().includes('blood pressure')) {
        factors.push('Family history of hypertension');
      }
    });
  }

  // Medications that indicate existing conditions
  if (context.medications && context.medications.length > 0) {
    context.medications.forEach(med => {
      const medLower = med.toLowerCase();
      if (medLower.includes('statin') || medLower.includes('cholesterol')) {
        factors.push('On cholesterol medication');
      }
      if (medLower.includes('metformin') || medLower.includes('diabetes')) {
        factors.push('On diabetes medication');
      }
      if (medLower.includes('blood pressure') || medLower.includes('hypertension')) {
        factors.push('On blood pressure medication');
      }
    });
  }

  return factors;
}
