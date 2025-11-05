import { RiskScore } from './healthRiskCalculator';
import { ClinicalContext } from './parseClinicalContext';

export interface RiskProjection {
  year: number;
  noChangesRisk: number;
  withInterventionRisk: number;
}

export interface TimelineProjections {
  cardiovascular: RiskProjection[];
  diabetes: RiskProjection[];
  recommendations: {
    lifestyle: string[];
    dietary: string[];
    medical: string[];
  };
  potentialBenefits: string[];
}

/**
 * Calculate risk progression over time without intervention
 * Based on medical literature showing natural disease progression
 */
function calculateNoInterventionProgression(
  currentRisk: number,
  riskLevel: string,
  years: number
): number {
  // Natural progression rates based on risk level
  let annualIncreaseRate: number;
  
  if (riskLevel === 'very-high') {
    annualIncreaseRate = 0.08; // 8% increase per year
  } else if (riskLevel === 'high') {
    annualIncreaseRate = 0.06; // 6% increase per year
  } else if (riskLevel === 'moderate') {
    annualIncreaseRate = 0.04; // 4% increase per year
  } else {
    annualIncreaseRate = 0.02; // 2% increase per year
  }
  
  // Compound increase over years with ceiling at 100
  const projectedRisk = currentRisk * Math.pow(1 + annualIncreaseRate, years);
  return Math.min(projectedRisk, 100);
}

/**
 * Calculate risk with lifestyle intervention
 * Based on clinical studies showing intervention benefits
 */
function calculateInterventionProgression(
  currentRisk: number,
  riskLevel: string,
  years: number
): number {
  // Immediate reduction in first year (lifestyle changes have quick impact)
  let firstYearReduction: number;
  let ongoingAnnualReduction: number;
  
  if (riskLevel === 'very-high') {
    firstYearReduction = 0.25; // 25% reduction in first year
    ongoingAnnualReduction = 0.05; // 5% additional reduction per year
  } else if (riskLevel === 'high') {
    firstYearReduction = 0.30; // 30% reduction in first year
    ongoingAnnualReduction = 0.06; // 6% additional reduction per year
  } else if (riskLevel === 'moderate') {
    firstYearReduction = 0.35; // 35% reduction in first year
    ongoingAnnualReduction = 0.07; // 7% additional reduction per year
  } else {
    firstYearReduction = 0.15; // 15% reduction in first year
    ongoingAnnualReduction = 0.03; // 3% additional reduction per year
  }
  
  if (years === 0) return currentRisk;
  
  // First year impact
  let projectedRisk = currentRisk * (1 - firstYearReduction);
  
  // Ongoing years (compound reduction with floor at 5)
  if (years > 1) {
    const remainingYears = years - 1;
    projectedRisk = projectedRisk * Math.pow(1 - ongoingAnnualReduction, remainingYears);
  }
  
  return Math.max(projectedRisk, 5); // Minimum 5% baseline risk
}

/**
 * Generate risk projections for cardiovascular disease
 */
function projectCardiovascularRisk(cvRisk: RiskScore): RiskProjection[] {
  const timePoints = [0, 1, 5, 10];
  
  return timePoints.map(years => ({
    year: years,
    noChangesRisk: calculateNoInterventionProgression(
      cvRisk.score,
      cvRisk.level,
      years
    ),
    withInterventionRisk: calculateInterventionProgression(
      cvRisk.score,
      cvRisk.level,
      years
    )
  }));
}

/**
 * Generate risk projections for diabetes
 */
function projectDiabetesRisk(diabetesRisk: RiskScore): RiskProjection[] {
  const timePoints = [0, 1, 5, 10];
  
  return timePoints.map(years => ({
    year: years,
    noChangesRisk: calculateNoInterventionProgression(
      diabetesRisk.score,
      diabetesRisk.level,
      years
    ),
    withInterventionRisk: calculateInterventionProgression(
      diabetesRisk.score,
      diabetesRisk.level,
      years
    )
  }));
}

/**
 * Generate specific recommendations based on risk factors and clinical context
 */
function generateRecommendations(
  cvRisk: RiskScore,
  diabetesRisk: RiskScore,
  clinicalContext?: ClinicalContext
): TimelineProjections['recommendations'] {
  const lifestyle: string[] = [];
  const dietary: string[] = [];
  const medical: string[] = [];
  
  // Prioritize smoking cessation if smoker
  if (clinicalContext?.lifestyle?.smoking) {
    lifestyle.push('🚭 Smoking cessation - HIGHEST PRIORITY (reduces CV risk by 50% within 1 year)');
  }
  
  // Cardiovascular recommendations
  if (cvRisk.level === 'high' || cvRisk.level === 'very-high') {
    lifestyle.push('Aerobic exercise 150 min/week (brisk walking, cycling, swimming)');
    lifestyle.push('Stress management (meditation, yoga, deep breathing)');
    dietary.push('Mediterranean diet - rich in olive oil, fish, nuts, vegetables');
    dietary.push('Reduce sodium intake to <2g/day');
    dietary.push('Limit saturated fat to <7% of calories');
    medical.push('Statin therapy for cholesterol management');
    medical.push('Blood pressure monitoring and control');
  } else if (cvRisk.level === 'moderate') {
    lifestyle.push('Moderate exercise 30 min/day, 5 days/week');
    dietary.push('Increase fiber intake (oats, beans, fruits, vegetables)');
    dietary.push('Choose lean proteins (fish, poultry, legumes)');
  }
  
  // Diabetes recommendations
  if (diabetesRisk.level === 'high' || diabetesRisk.level === 'very-high') {
    lifestyle.push('Weight loss goal: 7-10% of body weight if overweight');
    lifestyle.push('Resistance training 2-3 times/week');
    dietary.push('Low glycemic index foods - whole grains, non-starchy vegetables');
    dietary.push('Limit refined carbohydrates and sugary beverages');
    dietary.push('Portion control - use smaller plates, measure servings');
    medical.push('HbA1c monitoring every 3 months');
    medical.push('Consider metformin if pre-diabetic (consult doctor)');
  } else if (diabetesRisk.level === 'moderate') {
    lifestyle.push('Maintain healthy weight through balanced diet and exercise');
    dietary.push('Balanced meals with complex carbs, protein, and healthy fats');
    dietary.push('Limit added sugars to <25g/day');
  }
  
  // Universal recommendations
  if (lifestyle.length === 0) {
    lifestyle.push('Stay physically active - aim for 150 min/week');
    lifestyle.push('Maintain healthy sleep (7-9 hours/night)');
  }
  if (dietary.length === 0) {
    dietary.push('Eat plenty of fruits and vegetables (5+ servings/day)');
    dietary.push('Stay hydrated - drink 8 glasses of water daily');
  }
  if (medical.length === 0) {
    medical.push('Annual health checkups and lab work');
    medical.push('Maintain up-to-date vaccinations');
  }
  
  // Add exercise recommendations based on current level
  if (clinicalContext?.lifestyle?.exercise === 'sedentary') {
    lifestyle.unshift('Start with 10-15 min daily walks, build up gradually to 150 min/week');
  }
  
  // Family history specific recommendations
  if (clinicalContext?.familyHistory && clinicalContext.familyHistory.length > 0) {
    const hasDiabetesHistory = clinicalContext.familyHistory.some(h => h.toLowerCase().includes('diabetes'));
    const hasCardiacHistory = clinicalContext.familyHistory.some(h => h.toLowerCase().includes('heart') || h.toLowerCase().includes('cardiac'));
    
    if (hasDiabetesHistory) {
      medical.push('Regular screening critical due to family history of diabetes');
    }
    if (hasCardiacHistory) {
      medical.push('Cardiac screening recommended due to family history');
    }
  }
  
  return { lifestyle, dietary, medical };
}

/**
 * Generate potential benefit statements
 */
function generatePotentialBenefits(
  cvRisk: RiskScore,
  diabetesRisk: RiskScore,
  projections: { cardiovascular: RiskProjection[]; diabetes: RiskProjection[] }
): string[] {
  const benefits: string[] = [];
  
  // Calculate 10-year improvements
  const cv10Year = projections.cardiovascular[3];
  const diabetes10Year = projections.diabetes[3];
  
  const cvReduction = cv10Year.noChangesRisk - cv10Year.withInterventionRisk;
  const diabetesReduction = diabetes10Year.noChangesRisk - diabetes10Year.withInterventionRisk;
  
  // Cardiovascular benefits
  if (cvReduction > 20) {
    benefits.push(`Reduce cardiovascular disease risk by ${Math.round(cvReduction)}% over 10 years with lifestyle changes`);
    benefits.push('Lower risk of heart attack and stroke by up to 30-40%');
  } else if (cvReduction > 10) {
    benefits.push(`Reduce cardiovascular disease risk by ${Math.round(cvReduction)}% over 10 years`);
  }
  
  // Diabetes benefits
  if (diabetesReduction > 20) {
    benefits.push(`Reduce diabetes risk by ${Math.round(diabetesReduction)}% over 10 years with intervention`);
    benefits.push('Weight loss of 7-10% can reduce diabetes risk by 58%');
  } else if (diabetesReduction > 10) {
    benefits.push(`Reduce diabetes risk by ${Math.round(diabetesReduction)}% over 10 years`);
  }
  
  // General benefits
  if (cvRisk.level === 'high' || diabetesRisk.level === 'high') {
    benefits.push('Improved energy levels and quality of life within weeks');
    benefits.push('Better sleep quality and mental health');
    benefits.push('Reduced need for medications in the future');
  }
  
  // Life expectancy
  if (cvRisk.level === 'very-high' || diabetesRisk.level === 'very-high') {
    benefits.push('Potentially add 5-10 years of healthy life expectancy');
  } else if (cvRisk.level === 'high' || diabetesRisk.level === 'high') {
    benefits.push('Potentially add 3-7 years of healthy life expectancy');
  }
  
  // Default message if no specific benefits
  if (benefits.length === 0) {
    benefits.push('Maintain optimal health and prevent disease progression');
    benefits.push('Build strong foundation for long-term wellness');
  }
  
  return benefits;
}

/**
 * Main function to generate complete timeline projections
 */
export function generateRiskTimeline(
  cardiovascularRisk: RiskScore,
  diabetesRisk: RiskScore,
  clinicalContext?: ClinicalContext
): TimelineProjections {
  const cvProjections = projectCardiovascularRisk(cardiovascularRisk);
  const diabetesProjections = projectDiabetesRisk(diabetesRisk);
  const recommendations = generateRecommendations(cardiovascularRisk, diabetesRisk, clinicalContext);
  const potentialBenefits = generatePotentialBenefits(
    cardiovascularRisk,
    diabetesRisk,
    { cardiovascular: cvProjections, diabetes: diabetesProjections }
  );
  
  return {
    cardiovascular: cvProjections,
    diabetes: diabetesProjections,
    recommendations,
    potentialBenefits
  };
}
