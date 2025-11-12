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
          analysisResult.summary = `Your blood sugar levels need attention, with an HbA1c of ${diabetesLab.value}${diabetesLab.unit || ''}. This shows your glucose has been running higher than optimal over recent months. The encouraging news is that with dietary adjustments, appropriate medication, and regular monitoring, many people bring these levels into a healthier range and feel significantly better.`;
          
          // Add other critical conditions with gentle language
          const otherConditions = criticalConditions.filter(c => !c.toLowerCase().includes('diabetes'));
          if (otherConditions.length > 0) {
            analysisResult.summary += ` Additional areas that could benefit from attention include: ${otherConditions.join(', ')}.`;
          }
        }
      } else if (criticalConditions.length > 0) {
        analysisResult.summary = `Your results show several areas that would benefit from medical attention: ${criticalConditions.join(', ')}. Early detection is positive - it means you can work with your doctor to improve your health. Many of these conditions respond very well to treatment when caught early.`;
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
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('Missing OpenAI API key');
      throw new Error('OpenAI API key not configured');
    }
    console.log('✅ OpenAI API key found');

    // Declare variables at function scope
    let text = '';
    let filename = 'report.pdf';
    
    // Parse request body - handle both JSON and FormData
    let requestUserId: string | undefined = undefined;
    let images: string[] = [];
    
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
      
      // Validate and parse images JSON
      try {
        console.log('📝 Images JSON length:', imagesJson.length);
        images = JSON.parse(imagesJson);
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
        console.error('❌ Failed to parse images JSON:', errorMessage);
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
      
      // Process images in small batches to avoid token/size limits
      const BATCH_SIZE = 4;
      const segments: string[] = [];

      for (let start = 0; start < images.length; start += BATCH_SIZE) {
        const end = Math.min(start + BATCH_SIZE, images.length);
        const batch = images.slice(start, end);
        console.log(`📦 Vision batch ${start + 1}-${end} of ${images.length}`);

        const visionResponse = await retryWithBackoff(async () => {
          console.log('🔑 API Key configured:', !!OPENAI_API_KEY);
          console.log('📡 Calling OpenAI Vision API with GPT-4o for batch...');
          
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: `${visionPrompt}\n\nProcess ONLY pages ${start + 1}-${end}. Return plain text, preserve structure.` },
                    ...batch.map((img: string) => ({
                      type: 'image_url',
                      image_url: { url: img }
                    }))
                  ]
                }
              ],
              max_tokens: 4000,
              temperature: 0.1,
            }),
          });
  
          console.log('📡 Vision API response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Vision API error response:', errorText);
            let errorData = errorText;
            try { errorData = JSON.parse(errorText); } catch {}
            if (response.status === 401) {
              throw new Error('Authentication failed: OpenAI API key is invalid. Please check your API key.');
            }
            if (response.status === 402) {
              throw new Error('Payment required: Please add credits to your OpenAI account.');
            }
            if (response.status === 429) {
              throw new Error('Rate limit exceeded: Please try again in a few moments.');
            }
            const errorMessage = typeof errorData === 'object' ? JSON.stringify(errorData) : errorData;
            throw new Error(`Vision API call failed: ${response.status} - ${errorMessage}`);
          }
  
          return response;
        }, 4, 2000, 'Vision Text Extraction');
  
        const visionData = await visionResponse.json();
        const segment = visionData.choices?.[0]?.message?.content?.trim?.() ?? '';
        console.log(`✅ Batch extracted length: ${segment.length}`);
        segments.push(segment);
      }

      text = segments.join('\n\n---\n\n');
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
      // Handle JSON with images array or pre-extracted text
      console.log('📄 Processing JSON request...');
      const requestBody = await req.json();
      requestUserId = requestBody.userId;
      filename = requestBody.filename || filename;
      
      console.log('👤 User ID:', requestUserId);
      
      if (requestBody.images && Array.isArray(requestBody.images)) {
        // Process images array
        images = requestBody.images;
        console.log(`📸 Received ${images.length} images via JSON`);
        
        if (images.length === 0) {
          throw new Error('Images array is empty');
        }
        
        // Use vision API to extract text from images
        console.log('🔍 Extracting text from images using AI vision...');
        const visionPrompt = `You are analyzing a ${images.length}-page medical laboratory report. Extract ALL text from EVERY page sequentially.

CRITICAL INSTRUCTIONS:
- Process EVERY image in order (page 1, page 2, page 3, etc.)
- Extract EVERY test parameter name, value, unit, and reference range
- Pay special attention to abnormal values (marked with *, H, L, or outside reference range)
- Include patient demographics (name, age, gender, date)
- Include all section headers and panel names
- Do NOT skip any pages or test results
- Prioritize test results over headers/footers

Return the complete extracted text maintaining the original structure and organization.`;
        
        const BATCH_SIZE = 4;
        const segments: string[] = [];
        const MAX_OCR_PAGES = 25; // Cap for very long PDFs
        const imagesToProcess = images.length > MAX_OCR_PAGES ? images.slice(0, MAX_OCR_PAGES) : images;
        
        if (images.length > MAX_OCR_PAGES) {
          console.log(`⚠️ PDF has ${images.length} pages, processing first ${MAX_OCR_PAGES} for OCR`);
        }

        // Process batches in parallel with concurrency of 2
        const CONCURRENCY = 2;
        
        for (let start = 0; start < imagesToProcess.length; start += BATCH_SIZE * CONCURRENCY) {
          const batchPromises = [];
          
          for (let c = 0; c < CONCURRENCY; c++) {
            const batchStart = start + (c * BATCH_SIZE);
            if (batchStart >= imagesToProcess.length) break;
            
            const end = Math.min(batchStart + BATCH_SIZE, imagesToProcess.length);
            const batch = imagesToProcess.slice(batchStart, end);
            
            console.log(`📦 Starting OCR batch ${batchStart + 1}-${end} of ${imagesToProcess.length}`);
            
            batchPromises.push(
              retryWithBackoff(async () => {
                console.log(`📡 OCR batch ${batchStart + 1}-${end} with gpt-4o-mini (faster)...`);
                
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                      {
                        role: 'user',
                        content: [
                          { type: 'text', text: `${visionPrompt}\n\nProcess ONLY pages ${batchStart + 1}-${end}. Return plain text, preserve structure.` },
                          ...batch.map((img: string) => ({
                            type: 'image_url',
                            image_url: { url: img }
                          }))
                        ]
                      }
                    ],
                    max_tokens: 2048,
                  }),
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error('❌ OpenAI Vision API error:', response.status, errorText);
                  throw new Error(`Vision API failed: ${response.status} ${errorText}`);
                }

                const visionData = await response.json();
                const segment = visionData.choices?.[0]?.message?.content?.trim?.() ?? '';
                console.log(`✅ Batch ${batchStart + 1}-${end} extracted: ${segment.length} chars`);
                
                return { batchStart, segment };
              }, 3, 2000, `OCR batch ${batchStart + 1}-${end}`)
            );
          }
          
          // Wait for current parallel batches to complete
          const results = await Promise.all(batchPromises);
          
          // Sort by batch start to maintain page order
          for (const result of results.sort((a, b) => a.batchStart - b.batchStart)) {
            segments.push(result.segment);
          }
        }

        text = segments.join('\n\n---\n\n');
        console.log('✅ Text extracted from images via OCR');
        console.log('📝 Extracted text length:', text.length);
        console.log('📝 Text preview:', text.substring(0, 500));
        
      } else if (requestBody.text) {
        // Use pre-extracted text
        text = requestBody.text;
        console.log('📝 Using pre-extracted text, length:', text.length);
      } else {
        throw new Error('No images or extracted text provided');
      }
    }
    
    if (text.length < 50) {
      throw new Error('Extracted text is too short. Please ensure the PDF contains readable medical data.');
    }
    
    console.log(`Processing report: ${filename}`);
    console.log(`Text length: ${text.length} characters`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Create analysis record FIRST with processing status
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('📝 Creating analysis record:', analysisId);
    
    const { error: insertError } = await supabase
      .from('pdf_analyses')
      .insert({
        id: analysisId,
        user_id: requestUserId || null,
        status: 'processing',
        filename: filename,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (insertError) {
      console.error('Failed to create analysis record:', insertError);
      throw new Error('Failed to initiate analysis');
    }
    
    console.log('✅ Analysis record created, processing in background');
    
    // Process analysis in background - just start the async function without awaiting
    (async () => {
      try {
        console.log('🔄 Background analysis started for:', analysisId);

    console.log('🏥 Starting medical-grade text-based analysis...');

    // PASS 1: MEDICAL-GRADE Structured Analysis with Clinical Precision
    console.log('📋 PASS 1: Medical-grade comprehensive analysis...');
    const pass1Prompt = `You are a board-certified clinical pathologist with 20+ years of experience analyzing laboratory reports. Perform MEDICAL-GRADE analysis with ABSOLUTE ACCURACY.

Medical Report Text:
${text}

=== CRITICAL MEDICAL ACCURACY REQUIREMENTS ===

🎯 ZERO TOLERANCE FOR ERRORS:
- Every number must be EXACT from the report
- Every interpretation must be CLINICALLY ACCURATE
- Use proper medical terminology and clinical thresholds
- NEVER make assumptions or use generic statements
- CRITICAL: Identify ACUTE conditions with precision

=== COMPREHENSIVE EXTRACTION - MANDATORY ===

Extract EVERY parameter from ALL sections:

1. **BLOOD SUGAR & DIABETES PANEL**:
   - HbA1c (glycated hemoglobin)
   - Fasting Plasma Glucose (FPG)
   - Random Blood Sugar (RBS)
   - Post-Prandial Glucose (PPG)
   - OGTT (Oral Glucose Tolerance Test) if present
   - Insulin, C-Peptide if present

2. **COMPLETE BLOOD COUNT (CBC)**:
   - Hemoglobin (Hb)
   - Total RBC count
   - Total WBC count with differential (Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils)
   - Platelet count
   - PCV/Hematocrit
   - MCV, MCH, MCHC (RBC indices)
   - RDW (Red Cell Distribution Width)

3. **IRON STUDIES** (CRITICAL for iron deficiency):
   - Serum Iron
   - Ferritin (storage iron)
   - TIBC (Total Iron Binding Capacity)
   - Transferrin Saturation %
   - Note: Hemoglobin <12 g/dL (women) or <13 g/dL (men) = Anemia

4. **LIPID PROFILE**:
   - Total Cholesterol
   - LDL Cholesterol (bad cholesterol)
   - HDL Cholesterol (good cholesterol)
   - VLDL Cholesterol
   - Triglycerides
   - Total Cholesterol/HDL Ratio
   - LDL/HDL Ratio

5. **LIVER FUNCTION TESTS (LFTs)** - CRITICAL THRESHOLDS:
   - ALT (SGPT): Normal <40 U/L
     * 40-100 U/L = Mild elevation
     * 100-200 U/L = Moderate elevation
     * >200 U/L = ACUTE HEPATOCELLULAR INJURY (requires immediate evaluation)
   - AST (SGOT): Normal <40 U/L
     * >200 U/L with ALT >200 = ACUTE LIVER DAMAGE
   - Alkaline Phosphatase (ALP)
   - Total Bilirubin, Direct Bilirubin, Indirect Bilirubin
   - Total Protein, Albumin, Globulin, A/G Ratio
   - GGT (Gamma-Glutamyl Transferase)

6. **KIDNEY FUNCTION TESTS (KFTs)**:
   - Serum Creatinine (Normal: 0.6-1.2 mg/dL)
   - Blood Urea Nitrogen (BUN)
   - Urea
   - eGFR (estimated Glomerular Filtration Rate)
   - Uric Acid
   - Electrolytes: Sodium, Potassium, Chloride, Bicarbonate

7. **THYROID FUNCTION**:
   - TSH (Thyroid Stimulating Hormone)
   - Free T4 (Thyroxine)
   - Free T3 (Triiodothyronine)
   - Total T4, Total T3
   - TPO Antibodies, Thyroglobulin Antibodies

8. **VITAMIN & MINERAL LEVELS**:
   - Vitamin D (25-OH Vitamin D): Normal >30 ng/mL, Deficient <20 ng/mL
   - Vitamin B12: Normal >200 pg/mL
   - Folate (Folic Acid)
   - Calcium, Magnesium, Phosphorus
   - Zinc, Copper if present

9. **CARDIAC MARKERS** (if present):
   - Troponin I, Troponin T
   - CK-MB, CK-Total
   - LDH
   - BNP, NT-proBNP

10. **INFLAMMATORY MARKERS** (if present):
    - ESR (Erythrocyte Sedimentation Rate)
    - CRP (C-Reactive Protein)
    - hs-CRP (high-sensitivity CRP)

11. **HORMONAL TESTS** (if present):
    - Cortisol, ACTH
    - Testosterone, DHEA-S
    - Estrogen, Progesterone, FSH, LH
    - Prolactin, Growth Hormone

12. **URINE ANALYSIS** (if present):
    - Color, Appearance, pH, Specific Gravity
    - Protein, Glucose, Ketones
    - Blood, Bilirubin, Urobilinogen
    - WBC, RBC, Epithelial cells, Casts, Crystals

13. **SPECIALIZED TESTS** (extract any found):
    - Tumor markers (CEA, CA 19-9, PSA, AFP, etc.)
    - Autoimmune markers (ANA, RF, Anti-CCP)
    - Coagulation studies (PT, INR, aPTT)
    - Liver fibrosis scores
    - Any other specialized parameters

=== CLINICAL SEVERITY CLASSIFICATION - MEDICAL-GRADE ===

**CRITICAL CONDITIONS** → overallStatus: "concerning" + IMMEDIATE medical attention:

1. **ACUTE LIVER DAMAGE**:
   - ALT >200 U/L AND/OR AST >200 U/L
   - Interpretation: "Acute hepatocellular injury requiring immediate hepatology evaluation"
   - Specialist: Hepatologist/Gastroenterologist

2. **SEVERE UNCONTROLLED DIABETES**:
   - HbA1c >11% OR Fasting Glucose >250 mg/dL OR Random Glucose >300 mg/dL
   - Interpretation: "Severe hyperglycemia requiring urgent endocrinology consultation"
   - Specialist: Endocrinologist

3. **SEVERE ANEMIA**:
   - Hemoglobin <8 g/dL
   - Interpretation: "Severe anemia requiring urgent hematology evaluation"
   - Specialist: Hematologist

4. **ACUTE KIDNEY INJURY**:
   - Creatinine >3.0 mg/dL OR eGFR <30 mL/min
   - Interpretation: "Acute kidney injury/CKD Stage 4-5 requiring nephrology care"
   - Specialist: Nephrologist

5. **SEVERE ELECTROLYTE IMBALANCE**:
   - Potassium <2.5 or >6.0 mEq/L
   - Sodium <125 or >155 mEq/L
   - Interpretation: "Life-threatening electrolyte imbalance requiring emergency care"

**SEVERE CONDITIONS** → overallStatus: "concerning" + Urgent medical follow-up:

1. **IRON DEFICIENCY ANEMIA**:
   - Hemoglobin <12 g/dL (women) or <13 g/dL (men) AND
   - Ferritin <30 ng/mL OR Serum Iron <50 μg/dL
   - Interpretation: "Iron deficiency anemia requiring iron supplementation and cause evaluation"

2. **MODERATE-SEVERE DIABETES**:
   - HbA1c 9-11% OR Fasting Glucose 200-250 mg/dL
   - Interpretation: "Poorly controlled diabetes requiring medication adjustment"

3. **SIGNIFICANT LIVER DYSFUNCTION**:
   - ALT/AST 100-200 U/L
   - Interpretation: "Moderate hepatocellular injury requiring evaluation"

4. **SEVERE DYSLIPIDEMIA**:
   - Total Cholesterol >300 mg/dL OR Triglycerides >500 mg/dL OR LDL >190 mg/dL
   - Interpretation: "Severe dyslipidemia with high cardiovascular risk"

5. **SEVERE THYROID DYSFUNCTION**:
   - TSH <0.1 mIU/L (severe hyperthyroidism) OR >10 mIU/L (severe hypothyroidism)

**MODERATE CONDITIONS** → overallStatus: "moderate" + Medical follow-up recommended:

1. **CONTROLLED/BORDERLINE DIABETES**:
   - HbA1c 7-9% OR Fasting Glucose 126-200 mg/dL
   - Pre-diabetes: HbA1c 5.7-6.4% OR Fasting Glucose 100-125 mg/dL

2. **MILD ANEMIA**:
   - Hemoglobin 10-12 g/dL (women) or 10-13 g/dL (men)

3. **MODERATE DYSLIPIDEMIA**:
   - Total Cholesterol 240-300 mg/dL OR LDL 160-190 mg/dL

4. **MILD LIVER ENZYME ELEVATION**:
   - ALT/AST 40-100 U/L
   - Interpretation: "Mild hepatocellular inflammation - lifestyle modifications recommended"

5. **MILD-MODERATE KIDNEY DYSFUNCTION**:
   - Creatinine 1.3-3.0 mg/dL OR eGFR 30-60 mL/min

6. **THYROID ABNORMALITIES**:
   - TSH 0.1-0.4 mIU/L (mild hyperthyroidism) OR 4.0-10 mIU/L (mild hypothyroidism)

**MINOR CONDITIONS** → overallStatus: "good" or "moderate":

1. **VITAMIN DEFICIENCIES**:
   - Vitamin D <20 ng/mL (deficient) or 20-30 ng/mL (insufficient)
   - Vitamin B12 <200 pg/mL

2. **BORDERLINE ABNORMALITIES**:
   - Values 5-15% outside normal range

=== SUMMARY GENERATION - MEDICAL-GRADE BUT PATIENT-FRIENDLY ===

**TONE RULES** (CRITICAL):
- Be accurate but reassuring
- Use medical precision WITHOUT medical jargon
- Start with the most serious finding
- Explain clinical significance in layman terms
- End with hope and actionable steps

**LANGUAGE GUIDELINES**:
- For ACUTE LIVER DAMAGE: "Your liver enzyme levels are significantly elevated, indicating active liver inflammation that needs prompt medical evaluation"
- For IRON DEFICIENCY: "Your iron stores are lower than optimal, causing your hemoglobin to drop. This is common and treatable with iron supplements and dietary changes"
- For SEVERE DIABETES: "Your blood sugar has been running quite high over recent months. With proper medication, diet, and monitoring, many people successfully bring these levels down"

**SPECIALIST RECOMMENDATION** (Based on PRIMARY concern):
- Acute Liver Damage (ALT/AST >200) → Hepatologist/Gastroenterologist
- Iron Deficiency Anemia → Hematologist or Primary Care with Iron Therapy
- Diabetes (HbA1c >7%) → Endocrinologist
- Kidney Dysfunction → Nephrologist
- Severe Dyslipidemia → Cardiologist
- Thyroid Disorders → Endocrinologist

=== PATIENT NAME EXTRACTION (MANDATORY) ===

Search EXHAUSTIVELY for patient name in:
1. Report header/letterhead
2. "Patient Name:", "Name:", "Patient:", "Pt Name:", "Mr./Mrs./Ms." fields
3. Demographics section
4. Near DOB, Age, Gender fields
5. Billing/Registration info
6. Signature sections

ONLY use "Anonymous Patient" if absolutely no name found after thorough search.

=== JSON STRUCTURE (EXACT FORMAT REQUIRED) ===

{
  "patientName": "string - Full name extracted from report or 'Anonymous Patient'",
  "overallStatus": "good" | "moderate" | "concerning",
  "summary": "string - Clinically accurate, patient-friendly summary prioritizing most serious findings",
  "demographics": {
    "gender": "male" | "female" | "other",
    "age": number
  },
  "medicalPanels": [
    {
      "name": "string - Specific panel name (e.g., 'Diabetes Panel', 'Liver Function Tests')",
      "description": "string - Clinical description of panel purpose",
      "abnormalLabs": [
        {
          "name": "string - Exact parameter name",
          "value": "string - Exact numeric value from report",
          "unit": "string - Exact unit",
          "referenceRange": "string - Normal range from report or standard clinical range",
          "status": "low" | "high" | "critical",
          "significance": "string - Brief clinical significance with specific thresholds"
        }
      ],
      "normalParameters": ["string - List of normal parameter values in this panel with values"],
      "interpretation": "string - Medical-grade clinical interpretation with specific condition names"
    }
  ],
  "nextSteps": [
    "string - Specific, actionable clinical recommendations"
  ],
  "diet": {
    "avoid": ["string - Specific foods to avoid with clinical reasoning"],
    "increase": ["string - Specific foods to increase with clinical benefits"],
    "detailed": ["string - Detailed dietary recommendations based on conditions"]
  },
  "lifestyle": {
    "recommendations": ["string - Specific lifestyle changes"],
    "detailed": ["string - Detailed lifestyle guidance with clinical rationale"]
  },
  "patientFriendlySummary": "string - Simple, reassuring explanation",
  "specialist": "string - Specific specialist type for PRIMARY concern",
  "populationSource": "Clinical laboratory reference ranges and population health data",
  "healthRisks": [
    {
      "category": "string - Risk category",
      "risk": "string - Specific medical risk",
      "level": "mild" | "moderate" | "high",
      "description": "string - Clinical risk description"
    }
  ],
  "predictiveInsights": [
    {
      "parameter": "string - Parameter name",
      "currentTrend": "string - Current clinical trend",
      "timeframe": "string - Evidence-based timeframe",
      "prediction": "string - Clinical prediction",
      "intervention": "string - Evidence-based intervention",
      "urgency": "none" | "mild" | "moderate" | "high"
    }
  ]
}

CRITICAL SUCCESS CRITERIA:
✅ Every parameter extracted with exact values
✅ Acute conditions (ALT/AST >200, HbA1c >11, Hb <8, Creatinine >3) correctly identified
✅ Iron deficiency properly diagnosed (low Hb + low Ferritin/Iron)
✅ Most critical finding prioritized in summary
✅ Appropriate specialist for PRIMARY concern
✅ Clinical accuracy verified against standard medical guidelines

Respond ONLY with valid JSON matching the structure above - no markdown, no explanations:`;

      const pass1Response: Response = await retryWithBackoff(async (): Promise<Response> => {
        console.log('📡 Calling OpenAI API with GPT-4o-mini...');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
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
        console.error('❌ OpenAI API error:', response.status, errorData);
        
        if (response.status === 401) {
          throw new Error('Authentication failed: OpenAI API key is invalid. Please check your API key.');
        }
        if (response.status === 402) {
          throw new Error('Payment required: Please add credits to your OpenAI account.');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded: Please try again in a few moments.');
        }
        
        const errorMessage = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
        throw new Error(`AI API call failed: ${response.status} - ${errorMessage}`);
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

    // Update the existing analysis record with the result
    const { error: updateError } = await supabase
      .from('pdf_analyses')
      .update({
        status: 'completed',
        result: analysisResult,
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId);
    
    if (updateError) {
      console.error('Failed to update analysis result:', updateError);
      throw new Error('Failed to save analysis result');
    }
    
    console.log('✅ Analysis result stored in database with ID:', analysisId);
      } catch (bgError) {
        console.error('❌ CRITICAL BACKGROUND PROCESSING ERROR:', bgError);
        const errorMessage = bgError instanceof Error ? bgError.message : 'Unknown error';
        const errorStack = bgError instanceof Error ? bgError.stack : '';
        
        // Mark analysis as failed
        await supabase
          .from('pdf_analyses')
          .update({
            status: 'failed',
            error_message: errorMessage,
            admin_alerted: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', analysisId);

        // Send immediate SMS alert to admin
        try {
          await supabase.functions.invoke('send-admin-alert', {
            body: {
              analysisId,
              error: `${errorMessage}\n\nStack:\n${errorStack}`,
              userId: analysisId.split('_')[2] || 'unknown',
              timestamp: new Date().toISOString()
            }
          });
          console.log('✅ Admin SMS alert sent for failed analysis');
        } catch (alertError) {
          console.error('❌ Failed to send admin alert:', alertError);
          // Don't throw - we still want to continue even if alert fails
        }
      }
    })(); // Execute background task immediately
    
    // Return immediately with the analysis ID
    return new Response(JSON.stringify({
      success: true,
      analysisId: analysisId,
      status: 'processing',
      message: 'Analysis started, processing in background'
    }), {
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
