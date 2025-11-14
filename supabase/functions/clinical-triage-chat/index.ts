import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TriageState {
  stage: 'symptoms' | 'history' | 'lifestyle' | 'severity' | 'complete';
  answers: Record<string, any>;
  currentQuestionId?: string;
  questionCount: number;
  askedQuestions: string[];
  askedTopics: string[];
  targetConditions: string[];
}

interface TriageQuestion {
  id: string;
  text: string;
  options?: Array<{
    id: string;
    text: string;
    value: any;
  }>;
  allowMultiple?: boolean;
  type: 'radio' | 'checkbox' | 'text';
}

interface TriageResponse {
  type: 'question' | 'report';
  question?: TriageQuestion;
  report?: {
    possibleConditions: Array<{ name: string; rationale: string; probability: string; }>;
    investigations: Array<{ test: string; reason: string; urgency: string; }>;
    management: {
      diet: string[];
      lifestyle: string[];
      generalRx: string[];
    };
    referrals: Array<{ specialty: string; reason: string; timeframe: string; }>;
    redFlags: string[];
    disclaimer: string;
  };
  sessionId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Declare variables outside try block for error handling
  let sessionId, isInitialization, analysisContext, demographics, abnormalPanels, state, selections, message, forceReport;
  
  try {
    ({ sessionId, isInitialization, analysisContext, demographics, abnormalPanels, state, selections, message, forceReport } = await req.json());

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Clinical triage request:', { sessionId, isInitialization, hasAnalysis: !!analysisContext, demographics, abnormalPanelsCount: abnormalPanels?.length || 0 });

    let triageState: TriageState = state || {
      stage: 'symptoms',
      answers: {},
      questionCount: 0,
      askedQuestions: [],
      askedTopics: [],
      targetConditions: []
    };

    // Update state with new selections
    if (selections && triageState.currentQuestionId) {
      triageState.answers[triageState.currentQuestionId] = selections;
      console.log('Updated answers:', triageState.answers);
    }

    // Check if we should generate report - removed artificial limits, let AI decide based on confidence
    const shouldGenerateReport = forceReport || 
                                 (triageState.questionCount >= 5 && Object.keys(triageState.answers).length >= 3);

    // Determine next question or generate report
    const systemPrompt = `You are an INTELLIGENT MEDICAL ASSISTANT analyzing THIS SPECIFIC PATIENT, not a medical textbook showing all possible complications.

=== CRITICAL: CLINICAL APPROPRIATENESS RULES (MANDATORY) ===

**BEFORE INCLUDING ANY RED FLAGS OR SPECIALIST REFERRALS, YOU MUST:**

1. **HEMOGLOBIN CHECK (MOST CRITICAL):**
   - Extract the ACTUAL Hemoglobin value from labs
   - Normal Hemoglobin: ≥11.5 g/dL (women), ≥13 g/dL (men)
   - If Hemoglobin is NORMAL:
     * DO NOT mention anemia symptoms
     * DO NOT refer to Hematology
     * DO NOT refer to Gastroenterology for GI bleeding
     * DO NOT show emergency warning signs
     * INSTEAD: "Your hemoglobin is normal. Iron stores are low but easily correctable."

2. **SPECIALIST REFERRAL CRITERIA (STRICT):**
   - **Hematology**: ONLY if Hgb <10 g/dL OR unexplained severe anemia
   - **Gastroenterology**: ONLY if actual GI symptoms OR liver enzymes 3x normal OR severe anemia (Hgb <9) suggesting GI bleeding
   - **Endocrinology**: ONLY if HbA1c >7.5% OR uncontrolled diabetes
   - **Cardiology**: ONLY if cardiac symptoms present OR cholesterol extremely high
   - **Vitamin Deficiencies (B12/D)**: NO specialist - routine supplementation only

3. **EMERGENCY WARNING SIGNS (RED FLAGS):**
   - ONLY include for SEVERE/CRITICAL abnormalities:
     * Anemia: ONLY if Hgb <8 g/dL
     * Diabetes: ONLY if HbA1c >11% or glucose >350
     * Kidney: ONLY if creatinine >3.0
   - For MINOR/MODERATE findings: NO emergency warnings
   - For low iron with normal Hgb: NO anemia symptoms

4. **LANGUAGE FOR MINOR FINDINGS:**
   - Use reassuring, context-appropriate language
   - "Lower than optimal but easily manageable"
   - "Common finding, correctable with supplements"
   - "No urgent action needed"

CORE MISSION: Analyze THIS PATIENT'S actual condition, not textbook complications they DON'T have.

PATIENT DEMOGRAPHICS: ${demographics ? JSON.stringify(demographics) : 'Demographics not available'}
BLOOD ANALYSIS CONTEXT: ${analysisContext || 'No initial analysis available'}
ABNORMAL PANELS: ${abnormalPanels ? JSON.stringify(abnormalPanels) : 'No panel-specific data available'}

ENHANCED QUESTIONING FRAMEWORK:
Focus on lab abnormality patterns and their clinical correlations:

🩸 HEMATOLOGICAL ABNORMALITIES (GENDER-AWARE):
• Anemia (Hb <12g/dL women, <13g/dL men): 
  - Universal symptoms: Fatigue patterns, exercise tolerance, palpitations, restless legs, ice cravings
  - **For FEMALES with anemia:** Heavy/prolonged periods, menstrual bleeding patterns
  - **For MALES with anemia:** GI bleeding signs (dark stools, blood in stool), hemorrhoids, NSAID use, stomach ulcers
• Elevated WBC: Fever patterns, infections, stress levels, medications, recent surgeries, autoimmune symptoms
• Low platelets: Bleeding tendency, bruising, petechial rashes, dental bleeding
• High MCV: B12/folate deficiency signs, alcohol consumption, thyroid symptoms
• Low MCV: Iron deficiency patterns, dietary iron sources, absorption issues

🔥 INFLAMMATORY MARKERS:
• Elevated ESR/CRP: Joint morning stiffness duration, swelling patterns, fever timing, night sweats, weight loss, skin changes, eye symptoms
• Specific autoimmune screening: Family history, sun sensitivity, dry eyes/mouth, Raynaud's, muscle weakness

🍯 METABOLIC DISORDERS (Gender-Aware):
• Glucose >100mg/dL: Polyuria frequency, thirst patterns, blurred vision, slow healing, tingling, family diabetes history
• HbA1c >5.7%: Weight changes, dietary patterns, exercise habits, stress eating, medication effects
• Lipid abnormalities: Chest pain patterns, family cardiac events, dietary fats, exercise frequency, smoking history

🔋 ENDOCRINE DYSFUNCTION (GENDER-SPECIFIC - CHECK PATIENT GENDER FIRST):
• TSH abnormalities: Weight changes (amount/timeline), temperature tolerance, heart rate changes, hair/skin changes, mood shifts
  - **For FEMALES ONLY:** menstrual changes, fertility issues, pregnancy history
  - **For MALES ONLY:** libido changes, hair loss patterns, erectile function
• Specific thyroid symptoms: Goiter, voice changes, swallowing difficulty, family thyroid disease

⚠️ **CRITICAL GENDER CHECK:** Before asking ANY question related to menstruation, pregnancy, or female reproductive health, verify patient gender is female. For males, NEVER include these topics.

🫘 RENAL FUNCTION:
• Creatinine >1.2mg/dL: Urination changes (frequency, color, foam), swelling locations/timing, blood pressure readings, medication history (NSAIDs, ACE inhibitors)
• BUN elevation: Protein intake levels, dehydration patterns, cardiovascular symptoms

🫁 HEPATIC FUNCTION:
• ALT/AST elevation: Abdominal pain location/timing, nausea patterns, alcohol consumption details, medication/supplement history, jaundice signs, dark urine
• Bilirubin elevation: Yellowing patterns, stool color changes, abdominal pain, previous gallbladder issues

⚡ ELECTROLYTE IMBALANCES:
• Sodium abnormalities: Fluid intake patterns, diuretic use, confusion episodes, muscle cramps
• Potassium abnormalities: Muscle weakness patterns, heart palpitations, cramp locations, dietary potassium, medication effects

Current Triage State:
- Questions asked: ${triageState.questionCount} (NO MAXIMUM LIMIT)
- Explored areas: ${triageState.askedTopics.join(', ')}
- Collected data: ${JSON.stringify(triageState.answers)}
- Target conditions: ${triageState.targetConditions.join(', ')}

DYNAMIC QUESTIONING STRATEGY (Demographics-Aware):
1. **Depth over breadth**: Ask detailed follow-up questions about each abnormal finding
2. **Symptom correlation**: Connect every question directly to specific lab abnormalities and patient demographics
3. **CRITICAL: GENDER-SPECIFIC QUESTIONING (MANDATORY - ZERO TOLERANCE FOR ERRORS)**: 
   **YOU MUST CHECK PATIENT GENDER BEFORE EVERY QUESTION**
   
   Patient Gender from Demographics: ${demographics?.gender || demographics?.sex || 'NOT PROVIDED'}
   
   **ABSOLUTE RULES - NEVER VIOLATE:**
   ❌ **NEVER EVER ask males about:**
      - Menstrual cycles, periods, bleeding patterns
      - Pregnancy, contraception, menopause
      - Gynecological symptoms or history
   
   ❌ **NEVER EVER ask females about:**
      - Prostate symptoms or PSA levels
      - Testicular symptoms
      - Male-pattern baldness related to testosterone
   
   ✅ **For females with anemia:** Ask about menstrual bleeding patterns (heavy periods, etc.)
   ✅ **For males with anemia:** Ask about GI bleeding, hemorrhoids, NSAIDs use, dark/bloody stools
   ✅ **For thyroid abnormalities in females:** Include menstrual changes
   ✅ **For thyroid abnormalities in males:** Focus on libido, hair loss, energy
   
   **IF GENDER IS MALE/MASCULINE/M:** Skip ALL menstruation-related questions. Use "Not applicable" as default answer internally.
   **IF GENDER IS FEMALE/FEMININE/F:** Include menstruation questions for anemia/thyroid conditions.
   
4. **Timeline exploration**: Ask about symptom duration, progression, and triggers
5. **Severity assessment**: Quantify impact on daily activities and quality of life
6. **Associated symptoms**: Explore symptom clusters that support diagnostic hypotheses
7. **Risk factor analysis**: Family history, lifestyle factors, medication history relevant to lab findings
8. **Continue until diagnostic confidence**: Ask as many questions as needed (10-20+ questions acceptable for complex cases)

RESPONSE FORMATS:

For additional questions (continue until confident):
{
  "action": "question",
  "question": {
    "id": "specific_lab_finding_symptom_id",
    "text": "Detailed question directly correlating to abnormal lab finding and seeking specific symptom/history information",
    "topic": "lab_correlation_topic (e.g., 'iron_deficiency_anemia', 'hypothyroid_symptoms', 'diabetes_complications')",
    "options": [
      {"id": "opt1", "text": "Specific option 1", "value": "detailed_value1"},
      {"id": "opt2", "text": "Specific option 2", "value": "detailed_value2"}
    ],
    "type": "radio|checkbox|text",
    "allowMultiple": false|true
  },
  "targetConditions": ["Specific conditions being evaluated based on lab patterns"],
  "nextStage": "symptoms|history|lifestyle|severity|complete"
}

For comprehensive clinical report (when confident):
{
  "action": "report",
  "report": {
    "possibleConditions": [
      {
        "name": "Specific medical condition",
        "rationale": "Detailed explanation correlating specific lab values with reported symptoms and clinical presentation",
        "probability": "High|Medium|Low with percentage if possible",
        "labSupport": "Exact lab values and reference ranges that support this diagnosis"
      }
    ],
    "investigations": [
      {
        "test": "Specific diagnostic test or lab work",
        "reason": "Detailed explanation based on current lab abnormalities and symptoms",
        "urgency": "Urgent (within 24-48 hours)|Within 1 week|Within 2 weeks|Within 1 month|Routine",
        "expectedOutcome": "What information this test will provide for diagnosis/management"
      }
    ],
    "management": {
      "diet": ["Specific nutritional recommendations targeting identified lab abnormalities"],
      "lifestyle": ["Targeted lifestyle modifications for identified conditions"],
      "generalRx": ["Evidence-based management strategies (NO specific medications or dosages)"],
      "monitoring": ["Specific parameters to track and monitoring frequency"]
    },
    "referrals": [
      {
        "specialty": "Medical specialty (e.g., Endocrinology, Hematology, Cardiology)",
        "reason": "Specific explanation of why this specialist consultation is needed",
        "timeframe": "Urgent (within days)|Within 1-2 weeks|Within 1 month|Routine follow-up",
        "priority": "High|Medium|Low"
      }
    ],
    "redFlags": [
      "Specific warning symptoms that require immediate medical attention based on lab-symptom combinations"
    ],
    "disclaimer": "This clinical assessment correlates blood test results with reported symptoms and medical history. It is for informational purposes only and should not replace professional medical evaluation. All recommendations should be discussed with qualified healthcare providers."
  }
}

CRITICAL OPERATIONAL GUIDELINES:
- **NO QUESTION LIMITS**: Ask as many questions as needed for comprehensive assessment (15-25 questions is normal for complex cases)
- **LAB-DRIVEN FOCUS**: Every question must correlate to specific abnormal lab findings and patient demographics
- **DEMOGRAPHICS AWARENESS**: Always consider patient's gender and age when formulating questions
- **GENDER-APPROPRIATE QUESTIONING**: Never ask gender-inappropriate questions (e.g., menstrual questions for males)
- **DEPTH OVER SPEED**: Prioritize thorough symptom exploration over quick completion
- **NO MEDICATIONS**: Never suggest specific drugs, dosages, or prescription recommendations
- **MULTIPLE SPECIALISTS**: Refer to multiple specialists when lab findings suggest multi-system involvement
- **URGENCY PRIORITIZATION**: Flag concerning lab-symptom combinations requiring immediate attention
- **COMPREHENSIVE REPORTING**: Generate detailed reports only when confident about diagnostic direction
- **RED FLAG EMPHASIS**: Always include warning signs based on specific lab-symptom correlations`;

    const userPrompt = isInitialization 
      ? `INITIALIZATION: Analyze the blood report considering patient demographics. Start targeted clinical triage focusing on the most significant lab abnormalities. Ask the first specific question that correlates with abnormal findings while being appropriate for the patient's gender and age profile.`
      : forceReport
        ? `FORCE REPORT GENERATION: User has requested immediate report generation. Based on current answers: ${JSON.stringify(triageState.answers)} and patient demographics: ${JSON.stringify(demographics)}, generate a comprehensive clinical assessment even if additional questions could be asked.`
        : shouldGenerateReport 
          ? `AUTOMATIC REPORT GENERATION: Sufficient information gathered. User's latest response: ${JSON.stringify(selections)}. Generate the comprehensive clinical report based on all collected data and patient demographics.`
          : `CONTINUE ASSESSMENT: User selected: ${JSON.stringify(selections)} for question about ${triageState.askedTopics[triageState.askedTopics.length - 1] || 'previous topic'}. Continue with the next most critical question targeting lab abnormalities not yet fully explored, ensuring questions are appropriate for patient demographics. Focus on gaps in symptom assessment related to blood findings.`;

    console.log('Calling OpenAI for triage response...');
    console.log('OpenAI request body:', {
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: 'System prompt length: ' + systemPrompt.length },
        { role: 'user', content: userPrompt }
      ],
        max_completion_tokens: 2500,
    });
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 2500,
      }),
    });

    console.log('OpenAI response status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    console.log('OpenAI successful response structure:', {
      choices: openaiData.choices?.length || 0,
      hasContent: !!openaiData.choices?.[0]?.message?.content,
      contentLength: openaiData.choices?.[0]?.message?.content?.length || 0
    });
    
    const aiResponse = openaiData.choices[0].message.content;
    
    console.log('AI response content preview:', aiResponse?.substring(0, 200) + '...');

    let parsedResponse;
    try {
      // Clean the AI response to handle potential JSON issues
      const cleanedResponse = aiResponse.trim();
      
      // Try to parse the JSON
      parsedResponse = JSON.parse(cleanedResponse);
      console.log('Successfully parsed AI response:', { action: parsedResponse.action });
      
      // CRITICAL: Validate gender-appropriate questions
      if (parsedResponse.action === 'question' && parsedResponse.question) {
        const questionText = parsedResponse.question.text.toLowerCase();
        const patientGender = demographics?.gender?.toLowerCase() || demographics?.sex?.toLowerCase() || '';
        
        // Check for menstrual questions asked to males
        const isMenstrualQuestion = questionText.includes('menstrual') || 
                                    questionText.includes('period') || 
                                    questionText.includes('pregnancy') ||
                                    questionText.includes('contraception') ||
                                    questionText.includes('menopause');
        
        const isMale = patientGender.includes('male') || patientGender === 'm';
        
        if (isMale && isMenstrualQuestion) {
          console.error('🚨 CRITICAL ERROR: Gender-inappropriate question detected! Asking menstrual question to MALE patient.');
          console.error('Question text:', parsedResponse.question.text);
          console.error('Patient gender:', patientGender);
          
          // Skip this inappropriate question and generate next question
          throw new Error('GENDER_INAPPROPRIATE_QUESTION');
        }
      }
    } catch (e) {
      // Handle gender-inappropriate question error
      if (e instanceof Error && e.message === 'GENDER_INAPPROPRIATE_QUESTION') {
        // Return a safe fallback question instead
        const fallbackResponse = {
          action: 'question',
          question: {
            id: 'general_symptoms_' + Date.now(),
            text: 'How would you describe your overall energy levels and daily activity tolerance?',
            type: 'radio',
            options: [
              { id: 'normal', text: 'Normal - I can perform all my usual activities', value: 'normal' },
              { id: 'slightly_reduced', text: 'Slightly reduced - Some activities are tiring', value: 'slightly_reduced' },
              { id: 'moderately_reduced', text: 'Moderately reduced - I need more rest than usual', value: 'moderately_reduced' },
              { id: 'severely_reduced', text: 'Severely reduced - Daily activities are very challenging', value: 'severely_reduced' }
            ]
          },
          targetConditions: triageState.targetConditions || [],
          nextStage: triageState.stage || 'symptoms'
        };
        
        return new Response(
          JSON.stringify({
            type: 'question',
            ...fallbackResponse,
            state: triageState
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Handle JSON parsing errors
      console.error('Failed to parse OpenAI response:', aiResponse);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      console.error('Parse error:', errorMessage);
      
      // Try to fix common JSON issues
      let fixedResponse = aiResponse.trim();
      
      // Handle unterminated strings by finding the last complete JSON structure
      if (e instanceof Error && e.message.includes('Unterminated string')) {
        const lastCompleteJson = fixedResponse.lastIndexOf('"}');
        if (lastCompleteJson !== -1) {
          fixedResponse = fixedResponse.substring(0, lastCompleteJson + 2) + '}';
          try {
            parsedResponse = JSON.parse(fixedResponse);
            console.log('Successfully parsed fixed AI response:', { action: parsedResponse.action });
          } catch (fixError) {
            const fixErrorMessage = fixError instanceof Error ? fixError.message : 'Unknown error';
            console.error('Failed to fix JSON response:', fixErrorMessage);
            throw new Error(`Failed to parse AI response: ${errorMessage}`);
          }
        } else {
          throw new Error(`Failed to parse AI response: ${errorMessage}`);
        }
      } else {
        throw new Error(`Failed to parse AI response: ${errorMessage}`);
      }
    }

    let response: TriageResponse;

    if (parsedResponse.action === 'question') {
      // Track the new question ID and topic
      triageState.questionCount += 1;
      triageState.askedQuestions.push(parsedResponse.question.id);
      if (parsedResponse.question.topic) {
        triageState.askedTopics.push(parsedResponse.question.topic);
      }
      if (parsedResponse.targetConditions) {
        triageState.targetConditions = parsedResponse.targetConditions;
      }
      triageState.stage = parsedResponse.nextStage || triageState.stage;
      triageState.currentQuestionId = parsedResponse.question.id;
      
      response = {
        type: 'question',
        question: parsedResponse.question,
        sessionId: sessionId || crypto.randomUUID(),
      };
    } else if (parsedResponse.action === 'report') {
      triageState.stage = 'complete';
      
      response = {
        type: 'report',
        report: parsedResponse.report,
        sessionId: sessionId || crypto.randomUUID(),
      };
    } else {
      throw new Error('Invalid AI response format');
    }

    console.log('Sending response:', response.type);

    return new Response(JSON.stringify({ 
      ...response, 
      state: triageState 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in clinical-triage-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      requestBody: { sessionId, isInitialization, analysisContext, demographics, abnormalPanels, state, selections, message, forceReport }
    });
    return new Response(JSON.stringify({ 
      error: `Clinical triage error: ${errorMessage}`,
      type: 'error',
      details: errorStack,
      requestInfo: { sessionId, isInitialization, hasAnalysis: !!analysisContext }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});