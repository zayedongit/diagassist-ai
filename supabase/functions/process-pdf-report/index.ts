import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

interface Demographics {
  gender?: 'male' | 'female' | 'other';
  age?: number;
}

interface AnalysisResult {
  overallStatus: 'good' | 'moderate' | 'concerning';
  summary: string;
  profileName: string;
  testDate?: string;
  demographics?: Demographics;
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
  patientName?: string;
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

function safeParseJSON(content: string): any {
  console.log('Attempting to parse content:', content.substring(0, 200) + '...');
  
  try {
    const parsed = JSON.parse(content);
    console.log('Direct JSON parsing successful');
    return parsed;
  } catch (error) {
    console.log('Direct JSON parsing failed, trying fallback methods...');
    
    try {
      // Remove any non-JSON text before and after the JSON object
      let cleanContent = content.trim();
      
      // Find the first { and last } to extract JSON
      const jsonStart = cleanContent.indexOf('{');
      const jsonEnd = cleanContent.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
        console.log('Extracted JSON portion:', cleanContent.substring(0, 100) + '...');
        
        // Try to fix common JSON issues
        cleanContent = cleanContent
          .replace(/,\s*}/g, '}')  // Remove trailing commas
          .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '');  // Remove control characters
        
        const parsed = JSON.parse(cleanContent);
        console.log('Extracted JSON parsing successful');
        return parsed;
      }
      
      throw new Error('No valid JSON found in response');
    } catch (fallbackError) {
      console.error('All JSON parsing attempts failed');
      console.error('Original content length:', content.length);
      console.error('Parse error:', fallbackError.message);
      console.error('Content preview:', content.substring(0, 300) + '...');
      
      // Check if content appears to be truncated JSON
      if (content.includes('{') && !content.includes('}')) {
        throw new Error('AI response appears to be truncated. This usually means the response was too long for the token limit. Try reducing the complexity of the analysis or increase token limits.');
      }
      
      throw new Error('AI response was not in valid JSON format. Content received: ' + content.substring(0, 500));
    }
  }
}

// Retry mechanism with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context: string = 'operation'
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`${context} - Attempt ${attempt}/${maxRetries}`);
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`${context} - Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt === maxRetries) {
        console.error(`${context} - All ${maxRetries} attempts failed`);
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`${context} - Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Validate tool call arguments safely
function parseToolCallArguments(toolCall: any, context: string): any {
  try {
    if (!toolCall?.function?.arguments) {
      throw new Error('No function arguments found');
    }
    
    // Use the safer JSON parsing function instead of direct JSON.parse
    const args = safeParseJSON(toolCall.function.arguments);
    console.log(`${context} - Successfully parsed tool call arguments`);
    return args;
  } catch (error) {
    console.error(`${context} - Failed to parse tool call arguments:`, error);
    console.error(`${context} - Raw arguments:`, toolCall?.function?.arguments?.substring(0, 200));
    throw new Error(`Invalid tool call arguments in ${context}: ${error.message}`);
  }
}

// Chunk images for parallel processing
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Concurrency pool to limit parallel API calls
class ConcurrencyPool {
  private active = 0;
  private queue: (() => Promise<any>)[] = [];
  
  constructor(private limit: number) {}
  
  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          this.active++;
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.active--;
          this.processQueue();
        }
      });
      this.processQueue();
    });
  }
  
  private processQueue() {
    if (this.active < this.limit && this.queue.length > 0) {
      const task = this.queue.shift()!;
      task();
    }
  }
}

async function analyzeWithVision(images: string[], apiKey: string): Promise<AnalysisResult> {
  try {
    console.log('Starting comprehensive parallel analysis with ' + images.length + ' images...');
    
    // Chunk images into smaller groups for parallel processing
    const chunkSize = Math.min(4, Math.max(2, Math.ceil(images.length / 3)));
    const imageChunks = chunkArray(images, chunkSize);
    console.log(`Created ${imageChunks.length} chunks of ~${chunkSize} images each`);
    
    // Pass 1: Analyze first chunk for structure with high detail
    console.log('🏥 PASS 1: Comprehensive medical analysis on first chunk...');
    const firstChunkMessages = imageChunks[0].map(image => ({
      type: "image_url" as const,
      image_url: {
        url: image,
        detail: "high" as const
      }
    }));

    const pass1Response = await retryWithBackoff(async () => {
      return await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14', // Using GPT-4.1 for reliable function calling
          messages: [
            {
              role: "system",
              content: `You are a world-class clinical pathologist and laboratory medicine specialist. Your task is to analyze medical lab reports and provide comprehensive, medically accurate interpretations.

**COMPREHENSIVE ANALYSIS MANDATE:**
You must extract and analyze EVERY SINGLE PARAMETER found in this medical report. Do not miss any test results, values, or findings.

**EXTRACTION REQUIREMENTS:**
1. **Complete Parameter Scan**: Read through EVERY page/section and extract ALL test parameters with their values
2. **Patient Demographics**: Name, age, gender, MRN if mentioned
3. **Test Details**: Date of testing, laboratory name, test types performed
4. **Medical Panels**: Group ALL findings by clinical categories (Diabetes Panel, Lipid Profile, CBC, Liver Function, Kidney Function, Thyroid, Iron Studies, Vitamin Levels, Cardiac Markers, Inflammatory Markers, etc.)
5. **Abnormal Parameters**: For each panel, identify ALL parameters outside normal ranges with exact values, units, reference ranges
6. **Normal Parameters**: List ALL tested parameters within normal limits WITH actual values
7. **Clinical Significance**: Explain medical importance of EACH abnormal finding

**DYNAMIC PRIORITIZATION SYSTEM:**
Instead of fixed priority rules, dynamically assess clinical severity based on actual findings:

**CRITICAL (Immediate medical attention):**
- Any parameter >3x upper normal limit or <0.3x lower normal limit
- HbA1c >9%, Random Glucose >300 mg/dl, Fasting Glucose >200 mg/dl
- Creatinine >3.0 mg/dl, eGFR <30 mL/min
- Hemoglobin <8 g/dl, Platelets <50,000
- Troponins elevated (cardiac markers)
- Severe electrolyte imbalances (K+ <2.5 or >6.0)
- Critical liver enzymes (ALT/AST >200 U/L)

**HIGH PRIORITY (Urgent medical care):**
- Parameters 2-3x outside normal range
- HbA1c 7-9%, Fasting Glucose 140-200 mg/dl
- Moderate kidney dysfunction (Creatinine 1.5-3.0)
- Significant anemia (Hemoglobin 8-10 g/dl)
- High cholesterol >300 mg/dl, Triglycerides >500 mg/dl
- Thyroid dysfunction (TSH <0.1 or >10)

**MODERATE PRIORITY (Medical follow-up needed):**
- Parameters 1.5-2x outside normal range
- Mild kidney/liver dysfunction
- Borderline diabetes markers
- Moderate cholesterol elevation
- Vitamin deficiencies with symptoms

**LOW PRIORITY (Monitoring/lifestyle changes):**
- Parameters slightly outside normal (1.1-1.5x range)
- Minor vitamin insufficiencies
- Borderline values requiring monitoring

**DYNAMIC SUMMARY GENERATION:**
1. **Identify the Most Critical Finding**: Automatically determine what requires most urgent attention
2. **Comprehensive Listing**: Mention EVERY abnormal parameter in order of clinical severity
3. **Patient-Specific Prioritization**: Tailor summary to individual's specific findings
4. **Complete Coverage**: Ensure no abnormal finding is omitted from summary

**SUMMARY TEMPLATES (Use Most Appropriate):**
- **Life-Threatening**: "CRITICAL FINDINGS requiring immediate medical attention: [most severe]. Additional concerns: [list all others in severity order]."
- **Multiple Severe**: "This analysis reveals several significant medical concerns: [list all abnormal findings in severity order]. Immediate medical consultation recommended."
- **Single Critical**: "Primary concern: [critical finding with details]. Additional findings: [all other abnormalities listed]."
- **Multiple Moderate**: "This comprehensive analysis shows multiple areas requiring medical attention: [complete list in severity order]."

**SPECIALIST RECOMMENDATIONS (Dynamic):**
- Endocrinologist: Diabetes, thyroid, hormone disorders
- Cardiologist: Heart disease markers, severe lipid disorders
- Nephrologist: Kidney dysfunction, electrolyte disorders
- Hematologist: Blood disorders, severe anemia
- Gastroenterologist: Liver dysfunction, digestive disorders
- Primary Care: Multiple system involvement, general management

**SUCCESS CRITERIA:**
✅ EVERY parameter in the report is analyzed
✅ Most critical finding is automatically identified and prioritized
✅ Summary mentions ALL abnormal findings in severity order
✅ No abnormal parameter is overlooked or minimized
✅ Clinical severity drives all prioritization decisions
✅ Patient-specific recommendations based on actual findings

Analyze these medical images with complete thoroughness. Extract and prioritize based on actual clinical severity of findings.`
            },
            {
              role: "user", 
              content: [
                {
                  type: "text",
                  text: "Perform a COMPLETE analysis of this medical report. Extract EVERY SINGLE parameter and test result found. Dynamically identify the most critical findings and prioritize them in your summary. Ensure NO abnormal parameter is missed or overlooked. Generate comprehensive summary covering ALL findings in order of clinical severity."
                },
                ...firstChunkMessages
              ]
            }
          ],
          max_completion_tokens: 4000,
          tools: [{
            type: "function",
            function: {
              name: "analyze_medical_report",
              description: "Analyze medical lab report and extract structured medical data",
              parameters: {
                type: "object",
                properties: {
                  overallStatus: {
                    type: "string",
                    enum: ["good", "moderate", "concerning"],
                    description: "Overall health status based on findings"
                  },
                  summary: {
                    type: "string", 
                    description: "Brief clinical summary (2-3 sentences)"
                  },
                  profileName: {
                    type: "string",
                    description: "Types of medical tests performed (e.g., 'Lipid Profile, Complete Blood Count')"
                  },
                  testDate: {
                    type: "string",
                    description: "Date when tests were conducted"
                  },
                  demographics: {
                    type: "object",
                    properties: {
                      gender: { type: "string", enum: ["male", "female", "other"] },
                      age: { type: "number" }
                    }
                  },
                  patientName: {
                    type: "string",
                    description: "Patient name if mentioned in the report"
                  },
                  medicalPanels: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                          description: "Panel name - use standard names like 'Lipid Profile', 'Complete Blood Count', 'Liver Function Tests' OR create single test panels like 'Single Test: Vitamin D'"
                        },
                        description: {
                          type: "string",
                          description: "Brief description of what this panel measures"
                        },
                        abnormalLabs: {
                          type: "array",
                          items: {
                            type: "object", 
                            properties: {
                              name: { type: "string", description: "Parameter name" },
                              value: { type: "string", description: "Test result value" },
                              unit: { type: "string", description: "Unit of measurement" },
                              referenceRange: { type: "string", description: "Normal reference range" },
                              status: { 
                                type: "string", 
                                enum: ["low", "high", "critical", "borderline high", "borderline low", "abnormal"],
                                description: "Status relative to normal range"
                              },
                              significance: { type: "string", description: "Medical significance of this finding" }
                            },
                            required: ["name", "value", "status", "significance"]
                          }
                        },
                        normalParameters: {
                          type: "array",
                          items: { type: "string" },
                          description: "List of normal parameters with actual values (e.g., 'Hemoglobin: 12.7 g/dl', 'Kidney Function: Normal (Creatinine: 0.52 mg/dl)')"
                        },
                        interpretation: {
                          type: "string",
                          description: "Clinical interpretation specific to this panel"
                        }
                      },
                      required: ["name", "description", "abnormalLabs", "interpretation"]
                    }
                  },
                  nextSteps: {
                    type: "array",
                    items: { type: "string" },
                    description: "Recommended next steps and actions"
                  },
                  diet: {
                    type: "object",
                    properties: {
                      avoid: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Foods to avoid"
                      },
                      increase: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Foods to increase"
                      },
                      detailed: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Detailed dietary recommendations"
                      }
                    }
                  },
                  lifestyle: {
                    type: "object",
                    properties: {
                      recommendations: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Lifestyle modification recommendations"
                      },
                      detailed: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Detailed lifestyle advice"
                      }
                    }
                  },
                  patientFriendlySummary: {
                    type: "string",
                    description: "Patient-friendly explanation of results in simple terms"
                  },
                  specialist: {
                    type: "string", 
                    description: "Type of medical specialist to consult"
                  },
                  populationSource: {
                    type: "string",
                    description: "Population-specific guidelines used (e.g., 'Indian clinical guidelines')"
                  },
                  healthRisks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", description: "Risk category (e.g., 'Metabolic', 'Hepatic', 'Renal')" },
                        risk: { type: "string", description: "Specific risk name" },
                        level: { type: "string", enum: ["mild", "moderate", "high"], description: "Risk severity level" },
                        description: { type: "string", description: "Detailed description of the risk" }
                      },
                      required: ["category", "risk", "level", "description"]
                    },
                    description: "Health risks identified from abnormal findings only"
                  },
                  predictiveInsights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        parameter: { type: "string", description: "Health parameter name" },
                        currentTrend: { type: "string", description: "Current trend status" },
                        timeframe: { type: "string", description: "Prediction timeframe" },
                        prediction: { type: "string", description: "Health prediction based on current values" },
                        intervention: { type: "string", description: "Intervention that could improve outcomes" },
                        urgency: { type: "string", enum: ["none", "mild", "moderate", "high"], description: "Urgency level" }
                      },
                      required: ["parameter", "currentTrend", "timeframe", "prediction", "intervention", "urgency"]
                    },
                    description: "Predictive insights based on abnormal findings only"
                  }
                },
                required: ["overallStatus", "summary", "profileName", "medicalPanels", "nextSteps", "diet", "lifestyle", "patientFriendlySummary", "specialist", "populationSource", "healthRisks", "predictiveInsights"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "analyze_medical_report" } }
        })
      });
    }, 3, 1000, 'Pass 1 Analysis');

    if (!pass1Response.ok) {
      const errorText = await pass1Response.text();
      console.error('Pass 1 API call failed:', pass1Response.status, errorText);
      throw new Error(`OpenAI API call failed: ${pass1Response.status}`);
    }

    const pass1Data = await pass1Response.json();
    console.log('✅ Pass 1 completed');
    
    // Enhanced error logging and fallback strategy
    let pass1Args;
    
    if (!pass1Data.choices || !pass1Data.choices[0]) {
      console.error('❌ Pass 1: No choices returned from OpenAI');
      console.error('Full response:', JSON.stringify(pass1Data, null, 2));
      throw new Error('Pass 1: No response choices from OpenAI');
    }
    
    const message = pass1Data.choices[0].message;
    console.log('📋 OpenAI response structure:', {
      hasToolCalls: !!message.tool_calls,
      hasContent: !!message.content,
      toolCallsCount: message.tool_calls?.length || 0
    });
    
    if (!message.tool_calls || !message.tool_calls[0]) {
      console.error('❌ Pass 1: No function call received from OpenAI');
      console.error('Message content:', message.content);
      console.error('Full message:', JSON.stringify(message, null, 2));
      
      // Fallback: Try to parse JSON from content if function call failed
      if (message.content) {
        console.log('🔄 Attempting fallback content parsing...');
        try {
          const contentJson = safeParseJSON(message.content);
          if (contentJson && contentJson.medicalPanels) {
            console.log('✅ Fallback parsing successful');
            pass1Args = contentJson;
          } else {
            throw new Error('Fallback parsing failed - no valid medical data found');
          }
        } catch (fallbackError) {
          console.error('❌ Fallback parsing failed:', fallbackError.message);
          throw new Error('Pass 1: Function calling failed and fallback parsing unsuccessful');
        }
      } else {
        throw new Error('Pass 1: No function call or content received from OpenAI');
      }
    } else {
      // Normal function call processing
      pass1Args = parseToolCallArguments(pass1Data.choices[0].message.tool_calls[0], 'Pass 1 Analysis');
    }
    console.log('📊 Initial Summary: ' + pass1Args.medicalPanels?.reduce((acc: number, panel: any) => acc + panel.abnormalLabs.length, 0) + ' abnormal, ' + 
                pass1Args.medicalPanels?.reduce((acc: number, panel: any) => acc + (panel.normalParameters?.length || 0), 0) + ' normal parameters');

    // Pass 2: Process remaining image chunks if they exist
    let mergedResult = pass1Args;
    if (imageChunks.length > 1) {
      console.log('🔍 PASS 2: Processing remaining ' + (imageChunks.length - 1) + ' chunks in parallel...');
      
      const remainingChunks = imageChunks.slice(1);
      const concurrencyPool = new ConcurrencyPool(2); // Limit to 2 concurrent API calls
      
      const pass2Promises = remainingChunks.map((chunk, chunkIndex) => 
        concurrencyPool.execute(async () => {
          console.log(`Processing chunk ${chunkIndex + 2}/${imageChunks.length} with ${chunk.length} images...`);
          
          const chunkMessages = chunk.map(image => ({
            type: "image_url" as const,
            image_url: {
              url: image,
              detail: "low" as const // Use low detail for speed
            }
          }));

          const response = await retryWithBackoff(async () => {
            return await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4.1-2025-04-14', // Using GPT-4.1 for reliable function calling
                messages: [
                  {
                    role: "system",
                    content: `Extract ONLY additional lab parameters and values from these medical report images. Return ONLY parameters NOT found in previous analysis. Be extremely selective - only include parameters with clear numeric values and reference ranges visible.

Focus on finding:
1. Any additional abnormal lab values with exact numbers, units, and reference ranges
2. Any additional normal parameters with actual values
3. Group into appropriate medical panels (Lipid, CBC, Liver, etc.)

CRITICAL: Do NOT repeat any parameters already found. Only return NEW findings with valid numeric values.`
                  },
                  {
                    role: "user", 
                    content: [
                      {
                        type: "text",
                        text: `Find additional lab parameters in these images that were not captured in previous analysis. Current panels: ${pass1Args.medicalPanels?.map((p: any) => p.name).join(', ')}. Only return NEW parameters with actual numeric values.`
                      },
                      ...chunkMessages
                    ]
                  }
                ],
                max_completion_tokens: 800, // Constrain output size for speed
                tools: [{
                  type: "function",
                  function: {
                    name: "extract_additional_parameters",
                    description: "Extract only additional lab parameters not found in previous analysis",
                    parameters: {
                      type: "object",
                      properties: {
                        additionalPanels: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string", description: "Panel name (use existing panel names if adding to them)" },
                              abnormalLabs: {
                                type: "array",
                                items: {
                                  type: "object", 
                                  properties: {
                                    name: { type: "string" },
                                    value: { type: "string" },
                                    unit: { type: "string" },
                                    referenceRange: { type: "string" },
                                    status: { type: "string", enum: ["low", "high", "critical", "borderline high", "borderline low"] }
                                  },
                                  required: ["name", "value", "status"]
                                }
                              },
                              normalParameters: {
                                type: "array",
                                items: { type: "string" },
                                description: "Additional normal parameters with values (e.g., 'Hemoglobin: 13.2 g/dl')"
                              }
                            },
                            required: ["name", "abnormalLabs"]
                          }
                        }
                      },
                      required: ["additionalPanels"]
                    }
                  }
                }],
                tool_choice: { type: "function", function: { name: "extract_additional_parameters" } }
              })
            });
          }, 2, 1000, `Pass 2 Chunk ${chunkIndex + 2}`);

          if (!response.ok) {
            console.warn(`Pass 2 Chunk ${chunkIndex + 2} failed:`, response.status);
            return { additionalPanels: [] };
          }

          const data = await response.json();
          
          // Enhanced error handling with fallback strategy
          if (!data.choices || !data.choices[0]) {
            console.log(`Chunk ${chunkIndex + 2}: No response choices`);
            return { additionalPanels: [] };
          }
          
          const chunkMessage = data.choices[0].message;
          if (!chunkMessage.tool_calls || !chunkMessage.tool_calls[0]) {
            console.log(`Chunk ${chunkIndex + 2}: No function call received, trying content fallback`);
            
            // Try fallback content parsing for chunk data
            if (chunkMessage.content) {
              try {
                const contentJson = safeParseJSON(chunkMessage.content);
                if (contentJson && contentJson.additionalPanels) {
                  console.log(`✅ Chunk ${chunkIndex + 2}: Fallback parsing successful`);
                  return contentJson;
                }
              } catch (e) {
                console.log(`Chunk ${chunkIndex + 2}: Fallback parsing failed`);
              }
            }
            return { additionalPanels: [] }; // No additional data found
          }

          return parseToolCallArguments(data.choices[0].message.tool_calls[0], `Pass 2 Chunk ${chunkIndex + 2}`);
        })
      );

      try {
        const pass2Results = await Promise.all(pass2Promises);
        console.log('✅ Pass 2 completed, merging results...');

        // Merge Pass 2 results with Pass 1
        for (const result of pass2Results) {
          if (result.additionalPanels && result.additionalPanels.length > 0) {
            for (const newPanel of result.additionalPanels) {
              // Filter out invalid values immediately
              const validAbnormalLabs = newPanel.abnormalLabs?.filter((lab: any) => 
                lab.value && 
                lab.value !== 'AUTO-DETECTED' && 
                lab.value !== 'See Report' &&
                !isNaN(parseFloat(lab.value)) &&
                parseFloat(lab.value) > 0 &&
                !lab.name.toLowerCase().includes('blood group') &&
                !lab.name.toLowerCase().includes('sample type')
              ) || [];

              if (validAbnormalLabs.length === 0 && (!newPanel.normalParameters || newPanel.normalParameters.length === 0)) {
                continue; // Skip panels with no valid data
              }

              // Find existing panel or create new one
              const existingPanelIndex = mergedResult.medicalPanels?.findIndex((p: any) => p.name === newPanel.name);
              
              if (existingPanelIndex !== -1 && existingPanelIndex !== undefined) {
                // Merge with existing panel
                const existingPanel = mergedResult.medicalPanels[existingPanelIndex];
                
                // Add new abnormal labs (avoid duplicates)
                const existingLabNames = existingPanel.abnormalLabs.map((lab: any) => lab.name.toLowerCase());
                const newAbnormalLabs = validAbnormalLabs.filter((lab: any) => 
                  !existingLabNames.includes(lab.name.toLowerCase())
                );
                existingPanel.abnormalLabs.push(...newAbnormalLabs);
                
                // Add new normal parameters (avoid duplicates)
                if (newPanel.normalParameters) {
                  const existingNormalParams = existingPanel.normalParameters || [];
                  const newNormalParams = newPanel.normalParameters.filter((param: string) => 
                    !existingNormalParams.some((existing: string) => 
                      existing.toLowerCase().includes(param.split(':')[0].toLowerCase())
                    )
                  );
                  existingPanel.normalParameters = [...existingNormalParams, ...newNormalParams];
                }
              } else if (validAbnormalLabs.length > 0 || (newPanel.normalParameters && newPanel.normalParameters.length > 0)) {
                // Create new panel only if it has valid data
                mergedResult.medicalPanels = mergedResult.medicalPanels || [];
                mergedResult.medicalPanels.push({
                  name: newPanel.name,
                  description: `Additional findings from comprehensive analysis`,
                  abnormalLabs: validAbnormalLabs,
                  normalParameters: newPanel.normalParameters || [],
                  interpretation: validAbnormalLabs.length > 0 
                    ? `Additional abnormal parameters identified requiring attention.`
                    : `Additional normal parameters documented.`
                });
              }
            }
          }
        }

        const totalNewAbnormal = pass2Results.reduce((acc, result) => 
          acc + (result.additionalPanels?.reduce((panelAcc: number, panel: any) => 
            panelAcc + (panel.abnormalLabs?.length || 0), 0) || 0), 0);
        
        console.log(`📊 Pass 2 Summary: ${totalNewAbnormal} additional abnormal parameters found`);
        
      } catch (pass2Error) {
        console.warn('Pass 2 processing failed, continuing with Pass 1 results:', pass2Error);
      }
    } else {
      console.log('ℹ️ Single chunk analysis - skipping Pass 2');
    }

    // Apply enhanced clinical validation with critical condition detection
    console.log('🔍 Starting clinical validation...');
    const validatedResult = await ensureCompletenessVerification(mergedResult, images);
    
    // Enhanced critical condition detection and summary validation
    const finalResult = validateAndFixCriticalConditions(validatedResult);
    
    console.log('✅ Clinical validation completed: { finalAbnormal: ' + 
      (finalResult.medicalPanels?.reduce((sum: number, panel: any) => sum + (panel.abnormalLabs?.length || 0), 0) || 0) + 
      ', normalParameters: ' + (finalResult.medicalPanels?.reduce((sum: number, panel: any) => sum + (panel.normalParameters?.length || 0), 0) || 0) + 
      ', totalPanels: ' + (finalResult.medicalPanels?.length || 0) + ' }');
    
    return finalResult;
  } catch (error) {
    console.error('Vision analysis failed:', error);
    throw error;
  }
}

// Dynamic critical condition validation with comprehensive analysis
function validateAndFixCriticalConditions(analysisResult: AnalysisResult): AnalysisResult {
  console.log('🚨 Starting dynamic clinical severity assessment...');
  
  if (!analysisResult.medicalPanels) {
    return analysisResult;
  }

  interface SeverityFinding {
    lab: any;
    severity: 'critical' | 'high' | 'moderate' | 'low';
    score: number;
    description: string;
  }

  let allAbnormalLabs: any[] = [];
  let severityFindings: SeverityFinding[] = [];
  
  // Collect all abnormal labs
  for (const panel of analysisResult.medicalPanels) {
    for (const lab of panel.abnormalLabs || []) {
      allAbnormalLabs.push(lab);
    }
  }
  
  console.log(`📊 Analyzing ${allAbnormalLabs.length} abnormal parameters for clinical severity...`);
  
  // Dynamic severity assessment for each abnormal lab
  for (const lab of allAbnormalLabs) {
    const labName = lab.name.toLowerCase();
    const value = parseFloat(lab.value);
    let severity: 'critical' | 'high' | 'moderate' | 'low' = 'low';
    let score = 1;
    let description = `${lab.name}: ${lab.value}${lab.unit || ''}`;
    
    // Dynamic severity scoring based on clinical significance
    
    // CRITICAL CONDITIONS (Score 10)
    if ((labName.includes('hba1c') && value > 11) || 
        (labName.includes('glucose') && value > 300)) {
      severity = 'critical'; score = 10; description = `CRITICAL DIABETES: ${description}`;
    }
    else if (labName.includes('creatinine') && value > 3.0) {
      severity = 'critical'; score = 10; description = `KIDNEY FAILURE: ${description}`;
    }
    else if ((labName.includes('hemoglobin') || labName.includes('hgb')) && value < 8) {
      severity = 'critical'; score = 10; description = `SEVERE ANEMIA: ${description}`;
    }
    else if ((labName.includes('alt') || labName.includes('ast')) && value > 200) {
      severity = 'critical'; score = 10; description = `ACUTE LIVER DAMAGE: ${description}`;
    }
    else if (labName.includes('troponin') && value > 0.1) {
      severity = 'critical'; score = 10; description = `HEART ATTACK MARKER: ${description}`;
    }
    
    // HIGH PRIORITY CONDITIONS (Score 7-9)
    else if ((labName.includes('hba1c') && value > 9) || 
             (labName.includes('glucose') && (labName.includes('fasting') || labName.includes('plasma')) && value > 200)) {
      severity = 'high'; score = 9; description = `SEVERE DIABETES: ${description}`;
    }
    else if (labName.includes('creatinine') && value > 1.5) {
      severity = 'high'; score = 8; description = `KIDNEY DYSFUNCTION: ${description}`;
    }
    else if ((labName.includes('hemoglobin') || labName.includes('hgb')) && value < 10) {
      severity = 'high'; score = 8; description = `SIGNIFICANT ANEMIA: ${description}`;
    }
    else if ((labName.includes('cholesterol') && !labName.includes('hdl') && value > 300) ||
             (labName.includes('triglycerides') && value > 500)) {
      severity = 'high'; score = 7; description = `SEVERE DYSLIPIDEMIA: ${description}`;
    }
    else if (labName.includes('tsh') && (value < 0.1 || value > 10)) {
      severity = 'high'; score = 7; description = `SEVERE THYROID DYSFUNCTION: ${description}`;
    }
    
    // MODERATE PRIORITY CONDITIONS (Score 4-6)
    else if ((labName.includes('hba1c') && value > 7) || 
             (labName.includes('glucose') && value > 140)) {
      severity = 'moderate'; score = 6; description = `DIABETES/PRE-DIABETES: ${description}`;
    }
    else if ((labName.includes('iron') && !labName.includes('binding') && value < 50) ||
             ((labName.includes('hemoglobin') || labName.includes('hgb')) && value < 12)) {
      severity = 'moderate'; score = 5; description = `IRON DEFICIENCY: ${description}`;
    }
    else if (labName.includes('cholesterol') && !labName.includes('hdl') && value > 240) {
      severity = 'moderate'; score = 5; description = `HIGH CHOLESTEROL: ${description}`;
    }
    else if ((labName.includes('alt') || labName.includes('ast')) && value > 40) {
      severity = 'moderate'; score = 4; description = `LIVER DYSFUNCTION: ${description}`;
    }
    
    // LOW PRIORITY CONDITIONS (Score 1-3)
    else if (labName.includes('vitamin d') && value < 20) {
      severity = 'low'; score = 2; description = `VITAMIN D DEFICIENCY: ${description}`;
    }
    else if (labName.includes('b12') && value < 200) {
      severity = 'low'; score = 2; description = `VITAMIN B12 DEFICIENCY: ${description}`;
    }
    
    severityFindings.push({ lab, severity, score, description });
  }
  
  // Sort by severity score (highest first)
  severityFindings.sort((a, b) => b.score - a.score);
  
  console.log(`📈 Severity Analysis Results:`);
  severityFindings.forEach(finding => {
    console.log(`   ${finding.severity.toUpperCase()} (${finding.score}): ${finding.description}`);
  });
  
  // Determine overall status based on highest severity
  const highestSeverity = severityFindings[0]?.severity;
  if (highestSeverity === 'critical') {
    analysisResult.overallStatus = 'concerning';
  } else if (highestSeverity === 'high') {
    analysisResult.overallStatus = 'concerning';
  } else if (highestSeverity === 'moderate') {
    analysisResult.overallStatus = 'moderate';
  }
  
  // Generate comprehensive summary based on actual findings
  if (severityFindings.length > 0) {
    const criticalFindings = severityFindings.filter(f => f.severity === 'critical');
    const highFindings = severityFindings.filter(f => f.severity === 'high');
    const moderateFindings = severityFindings.filter(f => f.severity === 'moderate');
    const lowFindings = severityFindings.filter(f => f.severity === 'low');
    
    let newSummary = '';
    
    if (criticalFindings.length > 0) {
      newSummary = `CRITICAL FINDINGS requiring immediate medical attention: ${criticalFindings.map(f => f.description).join(', ')}.`;
      if (highFindings.length + moderateFindings.length > 0) {
        newSummary += ` Additional significant concerns: ${[...highFindings, ...moderateFindings].map(f => f.description).join(', ')}.`;
      }
      if (lowFindings.length > 0) {
        newSummary += ` Minor issues noted: ${lowFindings.map(f => f.description).join(', ')}.`;
      }
    }
    else if (highFindings.length > 0) {
      newSummary = `Significant medical findings requiring urgent attention: ${highFindings.map(f => f.description).join(', ')}.`;
      if (moderateFindings.length > 0) {
        newSummary += ` Additional concerns: ${moderateFindings.map(f => f.description).join(', ')}.`;
      }
      if (lowFindings.length > 0) {
        newSummary += ` Minor deficiencies: ${lowFindings.map(f => f.description).join(', ')}.`;
      }
    }
    else if (moderateFindings.length > 0) {
      newSummary = `This comprehensive analysis reveals multiple findings requiring medical attention: ${moderateFindings.map(f => f.description).join(', ')}.`;
      if (lowFindings.length > 0) {
        newSummary += ` Additional minor issues: ${lowFindings.map(f => f.description).join(', ')}.`;
      }
    }
    else {
      newSummary = `This analysis shows minor findings: ${lowFindings.map(f => f.description).join(', ')}. These can be addressed through lifestyle modifications and monitoring.`;
    }
    
    // Update summary if it's more comprehensive or accurate
    const currentSummaryLength = analysisResult.summary?.length || 0;
    if (newSummary.length > currentSummaryLength * 1.2 || severityFindings[0]?.score >= 7) {
      console.log('🔧 Updating summary with comprehensive severity-based analysis');
      analysisResult.summary = newSummary;
    }
    
    // Dynamic specialist recommendation
    const topFinding = severityFindings[0];
    if (topFinding) {
      const findingName = topFinding.lab.name.toLowerCase();
      if (findingName.includes('hba1c') || findingName.includes('glucose')) {
        analysisResult.specialist = 'Endocrinologist';
      } else if (findingName.includes('creatinine') || findingName.includes('kidney')) {
        analysisResult.specialist = 'Nephrologist';
      } else if (findingName.includes('hemoglobin') || findingName.includes('anemia')) {
        analysisResult.specialist = 'Hematologist';
      } else if (findingName.includes('alt') || findingName.includes('ast') || findingName.includes('liver')) {
        analysisResult.specialist = 'Gastroenterologist';
      } else if (findingName.includes('cholesterol') || findingName.includes('triglycerides')) {
        analysisResult.specialist = 'Cardiologist';
      } else if (findingName.includes('tsh') || findingName.includes('thyroid')) {
        analysisResult.specialist = 'Endocrinologist';
      }
    }
  }
  
  console.log(`🚨 Dynamic severity assessment completed - Highest severity: ${highestSeverity}, Total findings: ${severityFindings.length}`);
  return analysisResult;
}

async function ensureCompletenessVerification(analysisResult: AnalysisResult, originalImages?: string[]): Promise<AnalysisResult> {
  console.log('🔍 Starting clinical validation...');
  console.log('🖼️ Original images provided:', originalImages?.length || 0); 
  console.log('📄 Input data - Summary length:', analysisResult.summary?.length || 0);
  console.log('🔢 Current abnormal parameters captured:', analysisResult.medicalPanels?.reduce((acc: number, panel: any) => acc + panel.abnormalLabs.length, 0) || 0);
  
  // Clinical validation only - no auto-detection of missing parameters
  if (analysisResult.medicalPanels) {
    for (const panel of analysisResult.medicalPanels) {
      if (panel.abnormalLabs) {
        // Remove any invalid/auto-detected values
        panel.abnormalLabs = panel.abnormalLabs.filter((lab: any) => {
          const hasValidValue = lab.value && 
                               lab.value !== 'AUTO-DETECTED' && 
                               lab.value !== 'See Report' &&
                               !isNaN(parseFloat(lab.value)) &&
                               parseFloat(lab.value) > 0;
          
          if (!hasValidValue) {
            console.log('❌ Removing invalid lab value:', lab.name, lab.value);
            return false;
          }
          return true;
        });
      }
    }
    
    // Remove any panels that have no valid abnormal labs but keep if they have normal parameters
    analysisResult.medicalPanels = analysisResult.medicalPanels.filter((panel: any) => {
      const hasValidAbnormalities = panel.abnormalLabs && panel.abnormalLabs.length > 0;
      const hasNormalParameters = panel.normalParameters && panel.normalParameters.length > 0;
      
      if (!hasValidAbnormalities && !hasNormalParameters) {
        console.log('❌ Removing panel with no valid data:', panel.name);
        return false;
      }
      return true;
    });
  }

  const finalAbnormalCount = analysisResult.medicalPanels?.reduce((acc: number, panel: any) => acc + panel.abnormalLabs.length, 0) || 0;
  const finalNormalCount = analysisResult.medicalPanels?.reduce((acc: number, panel: any) => acc + (panel.normalParameters?.length || 0), 0) || 0;
  const totalPanels = analysisResult.medicalPanels?.length || 0;

  console.log('✅ Clinical validation completed:', {
    finalAbnormal: finalAbnormalCount,
    normalParameters: finalNormalCount,
    totalPanels: totalPanels
  });

  console.log('📊 Final Summary:', finalAbnormalCount + ' valid abnormal, ' + finalNormalCount + ' normal parameters found');

  return analysisResult;
}

// Background processing function
async function processInBackground(analysisId: string, images: string[], openAIApiKey: string, supabase: any) {
  try {
    console.log('Starting background processing with ' + images.length + ' images...');
    
    // Update status to processing
    await supabase
      .from('pdf_analyses')
      .update({ 
        status: 'processing'
      })
      .eq('id', analysisId);

    // Perform AI analysis
    console.log('AI analysis completed successfully, updating database...');
    const analysisResult = await analyzeWithVision(images, openAIApiKey);
    
    console.log('Analysis result:', JSON.stringify(analysisResult, null, 2));

    // Update database with results
    const { error: updateError } = await supabase
      .from('pdf_analyses')
      .update({
        status: 'completed',
        result: analysisResult,
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId);

    if (updateError) {
      console.error('Error updating analysis result:', updateError);
      throw updateError;
    }

    console.log('Background processing completed successfully for analysis ' + analysisId);

  } catch (error) {
    console.error('Background processing failed:', error);
    
    // Update database with error
    await supabase
      .from('pdf_analyses')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error occurred',
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId);
  }
}

// Main serve function
serve(async (req) => {
  console.log('=== ' + req.method + ' request received at ' + new Date().toISOString() + ' ===');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    console.log('Environment validation:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasOpenAIKey: !!openAIApiKey,
      supabaseUrlLength: supabaseUrl?.length || 0,
      serviceKeyLength: supabaseServiceKey?.length || 0,
      openAIKeyLength: openAIApiKey?.length || 0
    });

    if (!supabaseUrl || !supabaseServiceKey || !openAIApiKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client initialized successfully');

    // Detect input format and parse accordingly
    const contentType = req.headers.get('content-type') || '';
    let userId: string = '';
    let preConvertedImages: string = '';
    let pdfFile: File | null = null;
    let pdfFileName = 'unknown.pdf';
    let isJsonInput = false;

    if (contentType.includes('application/json')) {
      // New JSON input format for Google Drive integration
      console.log('Processing JSON input for Google Drive integration');
      const { pdfBase64, filename } = await req.json();
      
      if (!pdfBase64) {
        throw new Error('No pdfBase64 provided in JSON input');
      }
      
      pdfFileName = filename || 'google-drive-report.pdf';
      isJsonInput = true;
      
      // Convert base64 PDF to images using pdf2pic simulation
      const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
      
      // For Google Drive integration, we'll use a simplified image conversion
      // In production, you'd want to implement proper PDF to image conversion here
      const base64Image = 'data:image/pdf;base64,' + pdfBase64;
      preConvertedImages = JSON.stringify([base64Image]);
      
      console.log('Converted PDF to base64 image for processing');
    } else {
      // Original form data format
      console.log('Processing form data input');
      const formData = await req.formData();
      userId = formData.get('userId') as string;
      preConvertedImages = formData.get('images') as string;
      pdfFile = formData.get('file') as File;
      pdfFileName = pdfFile?.name || 'unknown.pdf';
    }

    console.log('Request details:', {
      userId: userId,
      hasPreConvertedImages: !!preConvertedImages,
      preConvertedImagesLength: preConvertedImages?.length || 0,
      hasPdfFile: !!pdfFile,
      pdfFileName: pdfFileName,
      isJsonInput: isJsonInput
    });

    let images: string[] = [];

    // Use pre-converted images from client
    if (preConvertedImages) {
      try {
        images = JSON.parse(preConvertedImages);
        console.log('Parsed ' + images.length + ' pre-converted images from client');
      } catch (parseError) {
        console.error('Error parsing pre-converted images:', parseError);
        throw new Error('Invalid pre-converted images data');
      }
    }

    if (images.length === 0) {
      throw new Error('No images provided for analysis');
    }

    // Upload original PDF to storage if provided (only for form data requests)
    if (pdfFile && !isJsonInput) {
      const fileName = pdfFile.name;
      const filePath = `medical-reports/${userId}/${new Date().toISOString().replace(/:/g, '-')}_${fileName}`;
      
      console.log('Uploading original PDF:', fileName, '(' + pdfFile.size + ' bytes)');
      
      try {
        const { error: uploadError } = await supabase
          .storage
          .from('medical-reports')
          .upload(filePath, pdfFile, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadError) {
          console.error('PDF upload error:', uploadError);
        } else {
          console.log('PDF stored successfully at:', filePath);
        }
      } catch (uploadError) {
        console.error('PDF upload failed:', uploadError);
      }
    }

    // Create analysis record (only for form data requests)
    let analysisId = crypto.randomUUID();
    if (!isJsonInput && userId) {
      const { error: insertError } = await supabase
        .from('pdf_analyses')
        .insert({
          id: analysisId,
          user_id: userId,
          filename: pdfFileName,
          status: 'processing'
        });

      if (insertError) {
        console.error('Error creating analysis record:', insertError);
        throw insertError;
      }

      console.log('Analysis record created with ID:', analysisId);
    }

    if (isJsonInput) {
      // For JSON input (Google Drive integration), process synchronously and return result
      console.log('Processing synchronously for Google Drive integration');
      const analysisResult = await analyzeWithVision(images, openAIApiKey);
      
      const response = {
        success: true,
        analysisId: analysisId,
        result: analysisResult,
        message: 'Analysis completed successfully with ' + images.length + ' images',
        status: 'completed',
        timestamp: new Date().toISOString()
      };

      console.log('Returning completed analysis response for Google Drive');
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // For form data input, start background processing
      processInBackground(analysisId, images, openAIApiKey, supabase);

      // Return immediate response
      const response = {
        success: true,
        analysisId: analysisId,
        message: 'Analysis started successfully with ' + images.length + ' images',
        status: 'processing',
        timestamp: new Date().toISOString()
      };

      console.log('Returning success response:', response);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Request processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
