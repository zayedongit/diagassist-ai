import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  let criticalConditions: string[] = [];
  
  if (totalValidAbnormalities === 0) {
    analysisResult.overallStatus = 'good';
    analysisResult.summary = 'All tested parameters are within normal limits. Overall health indicators appear good.';
    console.log('✅ Updated status to good - no valid abnormalities found');
  } else {
    // Critical condition detection with comprehensive checking
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
        
        // Liver issues detection - use proper thresholds
        if (labName.includes('alt') || labName.includes('ast')) {
          if (value > 200) {
            // Acute liver damage - truly critical
            hasLiverIssues = true;
            criticalConditions.push(`Acute liver damage (${lab.name}: ${lab.value}${lab.unit || ''})`);
          } else if (value > 100) {
            // Moderate elevation - concerning but not acute damage
            hasLiverIssues = true;
            criticalConditions.push(`Liver enzyme elevation (${lab.name}: ${lab.value}${lab.unit || ''})`);
          }
          // Values 40-100 are mild elevation, not critical - don't add to critical conditions
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
          .flatMap((panel: MedicalPanel) => panel.abnormalLabs || [])
          .find((lab: LabValue) => lab.name.toLowerCase().includes('hba1c') && parseFloat(lab.value) > 9);
        
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

// Retry mechanism with exponential backoff for rate limiting
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 4,
  baseDelay: number = 2000,
  context: string = 'operation'
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`${context} - Attempt ${attempt}/${maxRetries}`);
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message.toLowerCase();
      
      // Check if it's a rate limit error (429)
      const isRateLimit = errorMessage.includes('429') || 
                         errorMessage.includes('rate limit') || 
                         errorMessage.includes('too many requests');
      
      console.warn(`${context} - Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt === maxRetries) {
        console.error(`${context} - All ${maxRetries} attempts failed`);
        
        // Provide user-friendly error message for rate limiting
        if (isRateLimit) {
          throw new Error('AI API is currently experiencing high traffic. Please try again in a few moments.');
        }
        throw lastError;
      }
      
      // For rate limiting, use longer delays
      const multiplier = isRateLimit ? 3 : 2;
      const delay = baseDelay * Math.pow(multiplier, attempt - 1) + Math.random() * 1000;
      
      console.log(`${context} - Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏥 Starting medical analysis...');
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('Missing Lovable AI API key');
      throw new Error('Lovable AI API key not configured');
    }
    console.log('✅ Lovable AI API key found');

    // Parse request body - handle both JSON and FormData
    let text: string;
    let filename: string = 'Medical Report';
    let requestUserId: string | undefined = undefined;
    
    const contentType = req.headers.get('content-type') || '';
    console.log('📥 Content-Type:', contentType);
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData with images
      console.log('📄 Processing FormData with images...');
      const formData = await req.formData();
      const userId = formData.get('userId') as string;
      requestUserId = userId;
      const imagesJson = formData.get('images') as string;
      
      console.log('👤 User ID:', userId);
      
      if (!imagesJson) {
        throw new Error('No images provided in FormData');
      }
      
      // Validate and parse images JSON with better error handling
      let images;
      try {
        console.log('📝 Images JSON length:', imagesJson.length);
        console.log('📝 Images JSON preview:', imagesJson.substring(0, 100));
        images = JSON.parse(imagesJson);
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
        console.error('❌ Failed to parse images JSON:', errorMessage);
        console.error('❌ Images JSON content:', imagesJson);
        throw new Error(`Invalid images data format: ${errorMessage}`);
      }
      
      if (!Array.isArray(images) || images.length === 0) {
        throw new Error('Images must be a non-empty array');
      }
      
      console.log(`📸 Received ${images.length} images`);
      
      // Use Lovable AI vision to extract text from images
      console.log('🔍 Extracting text from images using AI vision...');
      console.log(`📊 Processing ${images.length} pages for comprehensive analysis`);
      const visionPrompt = `You are analyzing a ${images.length}-page medical laboratory report. Extract ALL text from EVERY page sequentially.

CRITICAL INSTRUCTIONS:
- Process EVERY image in order (page 1, page 2, page 3, etc.)
- Extract EVERY test parameter name, value, unit, and reference range
- Pay special attention to abnormal values (marked with *, H, L, or outside reference range)
- Include patient demographics (name, age, gender, date)
- Include all section headers and panel names
- Do NOT skip any pages or test results
- Prioritize test results over headers/footers

IMPORTANT: Many medical reports have test values on multiple pages. Extract from ALL pages, not just the first few.

Return the complete extracted text maintaining the original structure and organization.`;
      
      const visionResponse = await retryWithBackoff(async () => {
        console.log('🔑 API Key configured:', !!LOVABLE_API_KEY);
        console.log('📡 Calling Lovable AI vision API with Gemini 2.5 Pro...');
        
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro', // Best for image-text + OCR
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: visionPrompt },
                  ...images.map((img: string) => ({
                    type: 'image_url',
                    image_url: { url: img }
                  }))
                ]
              }
            ],
            max_tokens: 16000,
            temperature: 0.3,
          }),
        });

        console.log('📡 Vision API response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error('❌ Vision API error:', response.status, errorData);
          
          // Better error messages for common issues
          if (response.status === 401) {
            throw new Error('Authentication failed: Lovable AI API key is invalid or not configured. Please contact support.');
          }
          if (response.status === 402) {
            throw new Error('Payment required: Please add credits to your Lovable AI workspace.');
          }
          if (response.status === 429) {
            throw new Error('Rate limit exceeded: Please try again in a few moments.');
          }
          
          throw new Error(`Vision API call failed: ${response.status} - ${errorData}`);
        }

        return response;
      }, 4, 2000, 'Vision Text Extraction');
      
      const visionData = await visionResponse.json();
      text = visionData.choices[0].message.content.trim();
      console.log('✅ Text extracted from images');
      console.log('📝 Extracted text length:', text.length);
      console.log('📝 Text preview:', text.substring(0, 500));
      
      // Validate extracted text contains actual medical data
      if (text.length < 500 && images.length > 1) {
        console.error('❌ Extracted text is suspiciously short for a multi-page report');
        throw new Error(`Text extraction may be incomplete. Only ${text.length} characters extracted from ${images.length} pages. Please try again or contact support if the issue persists.`);
      }
      
      // Check if text contains common medical report markers
      const hasLabValues = /\d+\.?\d*\s*(?:mg\/dL|mmol\/L|g\/dL|%|cells\/μL|U\/L|mIU\/L)/i.test(text);
      if (!hasLabValues && text.length < 1000) {
        console.warn('⚠️ Extracted text may not contain valid lab values');
        throw new Error('Unable to find valid laboratory values in the extracted text. Please ensure the uploaded file contains a medical lab report.');
      }
      
    } else {
      // Handle JSON with pre-extracted text
      console.log('📄 Processing JSON with extracted text...');
      const requestBody = await req.json();
      text = requestBody.text;
      filename = requestBody.filename || filename;
      
      if (!text) {
        throw new Error('No extracted text provided');
      }
    }
    
    if (text.length < 50) {
      throw new Error('Extracted text is too short. Please ensure the PDF contains readable medical data.');
    }

    console.log(`Processing report: ${filename}`);
    console.log(`Text length: ${text.length} characters`);

    console.log('🏥 Starting two-pass text-based analysis...');

    // PASS 1: Structured Analysis with retry logic
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

SUMMARY GENERATION (CRITICAL - READ CAREFULLY):
Generate a human-friendly, reassuring summary that explains findings in layman terms:

TONE & LANGUAGE RULES (MUST FOLLOW):
- Use simple, non-frightening language that a family member would use
- Be reassuring, supportive, and hopeful
- Avoid ALL medical jargon and specific parameter values
- Focus on general health insights rather than technical numbers
- NEVER use alarming words like "ACUTE", "SEVERE", "CRITICAL" unless truly life-threatening
- Be a caring health companion, not a clinical diagnosis machine

CONTENT GUIDELINES:
- NEVER mention specific lab values, numbers, or percentages
- For mildly elevated values (10-30% above normal): "shows room for improvement"
- For moderately elevated values (30-50% above): "needs attention and lifestyle adjustments"
- For significantly elevated values (>50% above): "requires medical consultation"
- ALWAYS end with hope and actionable direction
- Use "your body" not "your labs"
- Focus on "what you can do" not "what's wrong"

EXAMPLES OF GOOD VS BAD LANGUAGE:
❌ BAD: "ACUTE LIVER DAMAGE with ALT 82 requiring immediate attention"
✅ GOOD: "Your liver enzymes show mild elevation, which often improves with healthy lifestyle changes like reducing alcohol and eating a balanced diet"

❌ BAD: "SEVERE DIABETES with HbA1c 10.6% indicating dangerously poor control"
✅ GOOD: "Your blood sugar management needs attention. The good news is that with proper care, medication, and lifestyle changes, many people successfully bring these levels down to healthier ranges"

❌ BAD: "Critical iron deficiency causing severe anemia"
✅ GOOD: "Your iron levels are lower than ideal, which can make you feel tired. This is common and typically improves with iron-rich foods or supplements"

❌ BAD: "Multiple abnormalities detected across panels"
✅ GOOD: "Your results show a few areas where your body could use some extra support through simple lifestyle changes"

EXAMPLE SUMMARIES BY SEVERITY:
Good Status: "Great news! Your test results show that your body is functioning well. Any values that caught our attention are minor and easily managed. Keep up the healthy habits that are working for you."

Moderate Status: "Your results show a few areas where your body could use some support. These are opportunities to improve your health with manageable changes to diet and lifestyle. Early awareness means you can take positive action now."

Concerning Status: "Your results show some areas that would benefit from medical attention. Early detection is positive - it means you can work with your doctor to improve your health. Many of these conditions respond very well to treatment when caught early."

KEY PRINCIPLES:
- Be a supportive friend, not a medical report
- Emphasize hope and empowerment over fear
- Use "shows room for improvement" instead of "abnormal"  
- Use "could benefit from attention" instead of "elevated"
- Use "needs support" instead of "dysfunction"
- Always include reassuring context about treatability and hope


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

REQUIRED JSON STRUCTURE - You MUST return this exact structure:
{
  "overallStatus": "good" | "moderate" | "concerning",
  "summary": "string - patient-friendly summary following the tone guidelines above",
  "demographics": {
    "gender": "male" | "female" | "other",
    "age": number
  },
  "medicalPanels": [
    {
      "name": "string - panel name like 'Diabetes Panel', 'Lipid Profile', etc.",
      "description": "string - brief description of what this panel measures",
      "abnormalLabs": [
        {
          "name": "string - parameter name",
          "value": "string - the actual numeric value",
          "unit": "string - unit of measurement",
          "referenceRange": "string - normal reference range",
          "status": "low" | "high" | "critical",
          "significance": "string - brief clinical significance"
        }
      ],
      "normalParameters": ["string - list of normal parameters in this panel"],
      "interpretation": "string - clinical interpretation of this panel"
    }
  ],
  "nextSteps": ["string - actionable next steps for the patient"],
  "diet": {
    "avoid": ["string - foods to avoid"],
    "increase": ["string - foods to increase"],
    "detailed": ["string - detailed dietary recommendations"]
  },
  "lifestyle": {
    "recommendations": ["string - lifestyle recommendations"],
    "detailed": ["string - detailed lifestyle guidance"]
  },
  "patientFriendlySummary": "string - very friendly, reassuring explanation in simple terms",
  "specialist": "string - recommended specialist to consult",
  "populationSource": "string - reference to population data source used",
  "healthRisks": [
    {
      "category": "string - risk category",
      "risk": "string - specific risk",
      "level": "mild" | "moderate" | "high",
      "description": "string - risk description"
    }
  ],
  "predictiveInsights": [
    {
      "parameter": "string - parameter name",
      "currentTrend": "string - current trend",
      "timeframe": "string - prediction timeframe",
      "prediction": "string - what might happen",
      "intervention": "string - how to prevent/improve",
      "urgency": "none" | "mild" | "moderate" | "high"
    }
  ]
}

Respond with JSON only matching this exact structure - no markdown formatting:`;

      const pass1Response = await retryWithBackoff(async () => {
        console.log('📡 Calling Lovable AI for Pass 1 analysis with Gemini 2.5 Flash...');
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash', // Fast and efficient for text analysis
            messages: [
              {
                role: 'user',
                content: pass1Prompt
              }
            ],
            response_format: { type: "json_object" },
            max_tokens: 16000,
            temperature: 0.3,
          }),
        });

      console.log('📡 Pass 1 API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Lovable AI API error:', response.status, errorData);
        
        // Better error messages
        if (response.status === 401) {
          throw new Error('Authentication failed: Lovable AI API key is invalid. Please contact support.');
        }
        if (response.status === 402) {
          throw new Error('Payment required: Please add credits to your Lovable AI workspace.');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded: Please try again in a few moments.');
        }
        
        throw new Error(`AI API call failed: ${response.status} - ${errorData}`);
      }

      return response;
    }, 4, 2000, 'Pass 1 Analysis');

    const pass1Data = await pass1Response.json();
    const pass1Text = pass1Data.choices[0].message.content.trim();
    console.log('✅ Pass 1 completed');

    // Parse Pass 1 result with robust fallback
    let analysisResult: AnalysisResult;
    try {
      const cleanedText = pass1Text.replace(/```json\n?|\n?```/g, '').trim();
      analysisResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.warn('Pass 1 JSON parsing failed, attempting fallback extraction...');
      try {
        let content = pass1Text.trim();
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          content = content.substring(start, end + 1)
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          analysisResult = JSON.parse(content);
        } else {
          throw new Error('No JSON object found in response');
        }
      } catch (fallbackErr) {
        console.error('Pass 1 JSON parsing error:', fallbackErr);
        throw new Error('Invalid response format from Pass 1 analysis');
      }
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
    let allAbnormalLabs: string[] = [];
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

    // Validate the response structure with detailed logging
    const missingFields = [];
    if (!analysisResult.overallStatus) missingFields.push('overallStatus');
    if (!analysisResult.summary) missingFields.push('summary');
    if (!analysisResult.medicalPanels) missingFields.push('medicalPanels');
    if (!analysisResult.nextSteps) missingFields.push('nextSteps');
    if (!analysisResult.diet) missingFields.push('diet');
    if (!analysisResult.lifestyle) missingFields.push('lifestyle');
    if (!analysisResult.patientFriendlySummary) missingFields.push('patientFriendlySummary');
    if (!analysisResult.specialist) missingFields.push('specialist');
    if (!analysisResult.populationSource) missingFields.push('populationSource');
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      console.error('📋 Received analysis result keys:', Object.keys(analysisResult));
      throw new Error(`Incomplete analysis result - missing: ${missingFields.join(', ')}`);
    }

    // Additional validation for specific content
    if (analysisResult.summary.toLowerCase().includes('cholesterol levels are slightly elevated') && 
        !text.toLowerCase().includes('cholesterol')) {
      throw new Error('AI provided generic response - analysis must be based on actual report content');
    }

    // Store the analysis result in the database for retrieval
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Generate analysis ID
      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        const { error: insertError } = await supabase
          .from('pdf_analyses')
          .insert({
            id: analysisId,
            user_id: requestUserId || 'anonymous',
            status: 'completed',
            result: analysisResult,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (insertError) {
          console.error('Failed to store analysis result:', insertError);
          // Continue without storing to database
        } else {
          console.log('✅ Analysis result stored in database with ID:', analysisId);
        }
        
        // Return the expected format for background processing
        return new Response(JSON.stringify({
          success: true,
          analysisId: analysisId,
          status: 'completed',
          message: 'Analysis completed successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Fallback: return direct analysis result
      }
    }
    
    // Fallback: return analysis result directly (old format)
    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-medical-report function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during analysis';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
