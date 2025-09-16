import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

interface LabValue {
  name: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  status: 'normal' | 'low' | 'high' | 'critical';
  significance?: string;
}

interface MedicalPanel {
  name: string;
  description: string;
  abnormalLabs: LabValue[];
  normalParameters?: string[];
  interpretation: string;
}

interface AnalysisResult {
  overallStatus: 'good' | 'moderate' | 'concerning';
  summary: string;
  demographics?: {
    gender?: 'male' | 'female' | 'other';
    age?: number;
  };
  medicalPanels: MedicalPanel[];
  nextSteps: string[];
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
  healthRisks?: Array<{
    category: string;
    risk: string;
    level: 'mild' | 'moderate' | 'high';
    description: string;
  }>;
  predictiveInsights?: Array<{
    parameter: string;
    currentTrend: string;
    timeframe: string;
    prediction: string;
    intervention: string;
    urgency: 'none' | 'mild' | 'moderate' | 'high';
  }>;
}

// Clinical validation function - minimal filtering, preserve AI analysis
function validateClinicalData(analysisResult: any): any {
  console.log('🔍 Starting minimal clinical data validation...');
  
  if (!analysisResult.medicalPanels) {
    return analysisResult;
  }

  let totalValidAbnormalities = 0;

  // Minimal validation - only remove obviously invalid data
  analysisResult.medicalPanels = analysisResult.medicalPanels.filter((panel: any) => {
    // Remove any "Additional Findings" panels
    if (panel.name === 'Additional Findings' || panel.name.toLowerCase().includes('additional')) {
      console.log('❌ Removing Additional/auto-generated panel:', panel.name);
      return false;
    }
    
    // Basic validation of abnormal labs - only remove obviously invalid entries
    if (panel.abnormalLabs) {
      panel.abnormalLabs = panel.abnormalLabs.filter((lab: any) => {
        // Must have numeric value
        const numericValue = parseFloat(lab.value);
        const hasValidNumericValue = lab.value && 
                                    lab.value !== 'AUTO-DETECTED' && 
                                    lab.value !== 'See Report' &&
                                    !isNaN(numericValue) &&
                                    numericValue > 0;
        
        if (!hasValidNumericValue) {
          console.log('❌ Filtering out invalid lab:', lab.name, lab.value);
          return false;
        }

        // REDUCED VALIDATION - Trust AI analysis more
        // Only filter out obviously impossible values or clear normal values
        const labName = lab.name.toLowerCase();
        
        // Only filter out clearly normal HbA1c (very conservative)
        if (labName.includes('hba1c') || labName.includes('a1c')) {
          const a1cValue = numericValue;
          if (a1cValue <= 5.6) {  // Only remove clearly normal values
            console.log('✅ HbA1c is clearly normal, removing from abnormal:', a1cValue);
            if (!panel.normalParameters) panel.normalParameters = [];
            panel.normalParameters.push(`${lab.name}: ${lab.value} ${lab.unit || ''}`);
            return false;
          }
        }

        // Trust AI for all other parameters - preserve abnormal findings
        console.log('✅ Preserving abnormal parameter (AI determined):', lab.name, lab.value);
        totalValidAbnormalities++;
        return true;
      });
    }
    
    // Keep panel if it has any abnormal values
    const hasAbnormalLabs = panel.abnormalLabs && panel.abnormalLabs.length > 0;
    if (!hasAbnormalLabs) {
      console.log('❌ Removing panel with no abnormalities:', panel.name);
    }
    return hasAbnormalLabs;
  });

  // Enhanced critical condition detection and summary validation
  if (totalValidAbnormalities === 0) {
    analysisResult.overallStatus = 'good';
    analysisResult.summary = 'All tested parameters are within normal limits. Overall health indicators appear good.';
    console.log('✅ Updated status to good - no valid abnormalities found');
  } else {
    // Critical condition detection with comprehensive checking
    let criticalConditions = [];
    let hasCriticalDiabetes = false;
    let hasIronDeficiency = false;
    let hasHighCholesterol = false;
    let hasThyroidIssues = false;
    let hasKidneyIssues = false;
    let hasLiverIssues = false;
    
    // Scan all abnormal labs for critical conditions
    for (const panel of analysisResult.medicalPanels) {
      for (const lab of panel.abnormalLabs || []) {
        const labName = lab.name.toLowerCase();
        const value = parseFloat(lab.value);
        
        // Critical diabetes detection
        if ((labName.includes('hba1c') && value > 9) || 
            (labName.includes('glucose') && (labName.includes('fasting') || labName.includes('plasma')) && value > 200)) {
          hasCriticalDiabetes = true;
          criticalConditions.push(`Severe diabetes (${lab.name}: ${lab.value}${lab.unit || ''})`);
          console.log(`🚨 Critical diabetes detected: ${lab.name} = ${value}`);
        }
        
        // Iron deficiency detection
        if ((labName.includes('iron') && !labName.includes('binding')) || 
            (labName.includes('hemoglobin') && value < 12)) {
          hasIronDeficiency = true;
          criticalConditions.push(`Iron deficiency (${lab.name}: ${lab.value}${lab.unit || ''})`);
          console.log(`🔴 Iron deficiency detected: ${lab.name} = ${value}`);
        }
        
        // High cholesterol detection
        if (labName.includes('cholesterol') && !labName.includes('hdl') && value > 240) {
          hasHighCholesterol = true;
          criticalConditions.push(`High cholesterol (${lab.name}: ${lab.value}${lab.unit || ''})`);
        }
        
        // Thyroid issues detection
        if (labName.includes('tsh') && (value < 0.4 || value > 4.0)) {
          hasThyroidIssues = true;
          criticalConditions.push(`Thyroid dysfunction (${lab.name}: ${lab.value}${lab.unit || ''})`);
        }
        
        // Kidney issues detection
        if (labName.includes('creatinine') && value > 1.2) {
          hasKidneyIssues = true;
          criticalConditions.push(`Kidney dysfunction (${lab.name}: ${lab.value}${lab.unit || ''})`);
        }
        
        // Liver issues detection
        if ((labName.includes('alt') || labName.includes('ast')) && value > 40) {
          hasLiverIssues = true;
          criticalConditions.push(`Liver dysfunction (${lab.name}: ${lab.value}${lab.unit || ''})`);
        }
      }
    }
    
    // Summary validation and reconstruction if needed
    const currentSummary = analysisResult.summary?.toLowerCase() || '';
    const needsSummaryFix = (hasCriticalDiabetes && !currentSummary.includes('diabetes')) ||
                           (criticalConditions.length > 1 && currentSummary.includes('vitamin d') && currentSummary.indexOf('vitamin d') < 50);
    
    if (needsSummaryFix || criticalConditions.length > 0) {
      console.log('🔧 Reconstructing summary to prioritize critical conditions...');
      
      if (hasCriticalDiabetes) {
        const diabetesLab = analysisResult.medicalPanels
          .flatMap(panel => panel.abnormalLabs || [])
          .find(lab => lab.name.toLowerCase().includes('hba1c') && parseFloat(lab.value) > 9);
        
        if (diabetesLab) {
          analysisResult.summary = `This report shows SEVERE DIABETES with ${diabetesLab.name} of ${diabetesLab.value}${diabetesLab.unit || ''}, indicating dangerously poor blood sugar control requiring immediate medical attention.`;
          
          // Add other critical conditions
          const otherConditions = criticalConditions.filter(c => !c.toLowerCase().includes('diabetes'));
          if (otherConditions.length > 0) {
            analysisResult.summary += ` Additional significant findings include: ${otherConditions.join(', ')}.`;
          }
        }
      } else if (criticalConditions.length > 0) {
        analysisResult.summary = `This comprehensive analysis reveals multiple significant findings: ${criticalConditions.join(', ')}. These conditions require medical attention and appropriate management.`;
      }
      
      console.log('✅ Summary reconstructed to prioritize critical conditions');
    }
    
    // Set appropriate status and specialist based on findings
    if (hasCriticalDiabetes) {
      analysisResult.overallStatus = 'concerning';
      if (!analysisResult.specialist?.toLowerCase().includes('endocrinologist')) {
        analysisResult.specialist = 'Endocrinologist';
        console.log('✅ Updated specialist to Endocrinologist for critical diabetes');
      }
    } else if (criticalConditions.length > 0) {
      analysisResult.overallStatus = 'concerning';
    } else if (totalValidAbnormalities <= 2) {
      analysisResult.overallStatus = 'moderate';
    }
  }

  console.log(`✅ Enhanced clinical validation completed - ${totalValidAbnormalities} abnormal parameters, critical conditions: ${criticalConditions.length}`);
  return analysisResult;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏥 Starting text-based medical analysis...');
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('Missing OpenAI API key');
      throw new Error('OpenAI API key not configured');
    }
    console.log('✅ OpenAI API key found');

    const requestBody = await req.json();
    const { text, filename, textLength } = requestBody;
    
    if (!text) {
      throw new Error('No extracted text provided');
    }

    if (text.length < 50) {
      throw new Error('Extracted text is too short. Please ensure the PDF contains readable medical data.');
    }

    console.log(`Processing report: ${filename}`);
    console.log(`Text length: ${textLength} characters`);
    console.log('Text preview:', text.substring(0, 300));

    console.log('🏥 Starting two-pass text-based analysis...');

    // PASS 1: Structured Analysis
    console.log('📋 PASS 1: Comprehensive medical analysis...');
    const pass1Prompt = `You are an expert clinical pathologist analyzing a comprehensive laboratory report. Perform COMPLETE analysis extracting EVERY parameter found in the text.

Medical Report Text:
${text}

COMPREHENSIVE EXTRACTION REQUIREMENTS:
1. Extract EVERY SINGLE parameter with numbers found in the report - do not miss any test results
2. NEVER use placeholders, AUTO-DETECTED, or made-up values
3. MANDATORY COMPREHENSIVE SCAN - Analyze ALL sections including:
   - Blood Sugar Panel (HbA1c, Fasting Glucose, Random Glucose, OGTT)
   - Complete Blood Count (Hemoglobin, WBC, RBC, Platelets, MCV, MCH, MCHC)
   - Lipid Profile (Total Cholesterol, LDL, HDL, Triglycerides, Ratios)
   - Liver Function (ALT, AST, Bilirubin, ALP, Total Protein, Albumin)
   - Kidney Function (Creatinine, Urea, BUN, eGFR, Uric Acid)
   - Thyroid Function (TSH, T3, T4, Free T3, Free T4)
   - Iron Studies (Serum Iron, Ferritin, TIBC, Transferrin Saturation)
   - Vitamin Levels (Vitamin D, B12, Folate, other vitamins)
   - Cardiac Markers (Troponins, CK-MB, LDH if present)
   - Inflammatory Markers (ESR, CRP if present)
   - Electrolytes (Sodium, Potassium, Chloride if present)
   - Hormonal Tests (any hormones mentioned)
   - Urine Analysis (all urine parameters if present)
   - Any other specialized tests or parameters found

DYNAMIC CLINICAL SEVERITY ASSESSMENT:
Automatically determine the most critical findings based on actual values:

CRITICAL CONDITIONS (overallStatus: "concerning", urgent medical attention):
- HbA1c >11% or Random Glucose >300 mg/dl or Fasting Glucose >250 mg/dl
- Creatinine >3.0 mg/dl or eGFR <30 mL/min
- Hemoglobin <8 g/dl or >18 g/dl
- ALT/AST >200 U/L (acute liver damage)
- Troponins elevated (heart attack markers)
- Severe electrolyte imbalances

SEVERE CONDITIONS (overallStatus: "concerning", immediate care):
- HbA1c >9% or Fasting Glucose >200 mg/dl (severe diabetes)
- Creatinine 1.5-3.0 mg/dl (kidney dysfunction)
- Hemoglobin 8-10 g/dl (significant anemia)
- Total Cholesterol >300 mg/dl or Triglycerides >500 mg/dl
- TSH <0.1 or >10 mIU/L (severe thyroid dysfunction)

MODERATE CONDITIONS (overallStatus: "moderate", medical follow-up):
- HbA1c 7-9% or Fasting Glucose 126-200 mg/dl
- Iron deficiency (Serum Iron <50 μg/dl, Hemoglobin <12 g/dl)
- Total Cholesterol 240-300 mg/dl
- Mild-moderate liver/kidney dysfunction
- Thyroid abnormalities (TSH 0.1-0.4 or 4-10)

MINOR CONDITIONS (overallStatus: "good" or "moderate"):
- Vitamin deficiencies (D <20 ng/mL, B12 <200 pg/mL)
- Borderline values slightly outside normal ranges

DYNAMIC SUMMARY GENERATION:
Generate summary based on ACTUAL FINDINGS in order of clinical severity:
1. Start with MOST CRITICAL finding if present
2. List ALL abnormal parameters in decreasing order of severity
3. Mention EVERY abnormal finding - do not omit any
4. Use appropriate medical urgency language based on severity

SUMMARY EXAMPLES:
- Critical: "CRITICAL FINDINGS: [most severe condition]. Additional concerns: [list all other abnormal parameters in severity order]."
- Severe: "This report shows [SEVERE CONDITION] with [specific values]. Additional significant findings: [all other abnormalities listed]."
- Multiple findings: "This comprehensive analysis reveals multiple medical concerns: [list ALL abnormal parameters in severity order]."

SPECIALIST RECOMMENDATIONS (based on most critical finding):
- Endocrinologist: Diabetes (HbA1c >7%), thyroid disorders
- Nephrologist: Kidney dysfunction (Creatinine >1.5)
- Cardiologist: Heart disease markers, severe dyslipidemia
- Hematologist: Blood disorders, severe anemia
- Gastroenterologist: Liver dysfunction

COMPREHENSIVE REFERENCE RANGES:
- HbA1c: Normal <5.7%, Pre-diabetic 5.7-6.4%, Diabetic ≥6.5%, Poor control >9%, CRITICAL >11%
- Fasting Glucose: Normal <100, Pre-diabetic 100-125, Diabetic ≥126, CRITICAL >200 mg/dl
- Hemoglobin: Men 13.5-17.5, Women 12.0-15.5 g/dl, CRITICAL <8 or >18 g/dl
- Creatinine: Normal 0.6-1.2 mg/dl, CRITICAL >3.0 mg/dl
- Total Cholesterol: Optimal <200, Borderline 200-239, High ≥240, CRITICAL >300 mg/dl
- ALT/AST: Normal <40 U/L, CRITICAL >200 U/L
- TSH: Normal 0.4-4.0 mIU/L, CRITICAL <0.1 or >10 mIU/L

SUCCESS CRITERIA:
✅ EVERY parameter in the report is extracted and analyzed
✅ Most critical finding automatically identified and prioritized
✅ Summary covers ALL abnormal findings in clinical severity order
✅ Appropriate overallStatus based on highest severity finding
✅ Correct specialist recommendation for most critical condition
✅ NO abnormal parameter is overlooked or minimized

Respond with JSON only - no markdown formatting:`;

    const pass1Response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14', // Using GPT-4.1 for reliable analysis
        messages: [
          {
            role: 'system',
            content: 'You are an expert medical AI that analyzes laboratory reports with precision. Always reference specific findings from the provided report text.'
          },
          {
            role: 'user',
            content: pass1Prompt
          }
        ],
        max_completion_tokens: 3000,
      }),
    });

    if (!pass1Response.ok) {
      const errorData = await pass1Response.text();
      console.error('Pass 1 OpenAI API error:', errorData);
      throw new Error(`Pass 1 OpenAI API error: ${pass1Response.status}`);
    }

    const pass1Data = await pass1Response.json();
    const pass1Text = pass1Data.choices[0].message.content.trim();
    console.log('✅ Pass 1 completed');

    // Parse Pass 1 result
    let analysisResult: AnalysisResult;
    try {
      const cleanedText = pass1Text.replace(/```json\n?|\n?```/g, '').trim();
      analysisResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Pass 1 JSON parsing error:', parseError);
      throw new Error('Invalid response format from Pass 1 analysis');
    }

    // Apply clinical validation to remove invalid data
    console.log('🏥 Applying minimal clinical validation...');
    analysisResult = validateClinicalData(analysisResult);

    // Additional comprehensive logging for debugging
    console.log('📊 FINAL ANALYSIS SUMMARY:');
    console.log(`   Overall Status: ${analysisResult.overallStatus}`);
    console.log(`   Summary: ${analysisResult.summary?.substring(0, 200)}...`);
    console.log(`   Medical Panels: ${analysisResult.medicalPanels?.length || 0}`);
    
    // Log all abnormal findings for verification
    let allAbnormalLabs = [];
    analysisResult.medicalPanels?.forEach(panel => {
      panel.abnormalLabs?.forEach(lab => {
        allAbnormalLabs.push(`${lab.name}: ${lab.value}${lab.unit || ''} (${lab.status})`);
      });
    });
    console.log(`   All Abnormal Labs: [${allAbnormalLabs.join(', ')}]`);
    console.log(`   Specialist Recommended: ${analysisResult.specialist}`);

    // Final logging
    const finalAbnormalCount = analysisResult.medicalPanels?.reduce((sum: number, panel: any) => 
      sum + (panel.abnormalLabs?.length || 0), 0) || 0;
    console.log(`📊 Final analysis: ${finalAbnormalCount} clinically valid abnormal parameters`);

    // Validate the response structure
    if (!analysisResult.overallStatus || !analysisResult.summary || !analysisResult.medicalPanels || !analysisResult.nextSteps || !analysisResult.diet || !analysisResult.lifestyle || !analysisResult.patientFriendlySummary || !analysisResult.specialist || !analysisResult.populationSource) {
      throw new Error('Incomplete analysis result - missing required fields');
    }

    // Additional validation for specific content
    if (analysisResult.summary.toLowerCase().includes('cholesterol levels are slightly elevated') && 
        !text.toLowerCase().includes('cholesterol')) {
      throw new Error('AI provided generic response - analysis must be based on actual report content');
    }

    console.log('AI analysis completed successfully, updating database...');
    
    // Apply clinical validation to ensure data reliability
    analysisResult = validateClinicalData(analysisResult);
    
    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-medical-report function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during analysis',
        details: error.toString()
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
