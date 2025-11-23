import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysisData, clinicalAssessmentData } = await req.json();

    if (!analysisData) {
      throw new Error('analysisData is required');
    }

    // Generate patient_report: Comprehensive summary
    const patient_report = `
OVERALL STATUS: ${analysisData.overallStatus?.toUpperCase() || 'UNDER REVIEW'}

SUMMARY: ${analysisData.summary || 'Analysis in progress'}

KEY FINDINGS:
${analysisData.medicalPanels?.map((panel: any) => 
  `- ${panel.name}: ${panel.interpretation || 'Normal findings'}`
).join('\n') || 'No panels available'}

PATIENT INFO: ${analysisData.demographics?.age || 'Age unknown'} years old, ${analysisData.demographics?.gender || 'Gender unknown'}
TEST DATE: ${analysisData.demographics?.testDate || 'Date unknown'}
`.trim();

    // Generate abnormal_findings: List ALL abnormal values with details
    const abnormal_findings = analysisData.medicalPanels
      ?.filter((panel: any) => panel.abnormalLabs && panel.abnormalLabs.length > 0)
      .map((panel: any) => {
        const findings = panel.abnormalLabs.map((lab: any) => 
          `  - ${lab.name}: ${lab.value} ${lab.unit || ''} (${lab.status?.toUpperCase() || 'ABNORMAL'}, Reference: ${lab.referenceRange || 'N/A'})`
        ).join('\n');
        return `${panel.name}:\n${findings}`;
      })
      .join('\n\n') || 'No abnormal findings detected';

    // Generate clinical_symptoms: Extract from clinical assessment
    const symptomsParts = [];
    
    if (clinicalAssessmentData?.redFlags && clinicalAssessmentData.redFlags.length > 0) {
      symptomsParts.push(`Warning Signs: ${clinicalAssessmentData.redFlags.join(', ')}`);
    }
    
    if (clinicalAssessmentData?.possibleConditions && clinicalAssessmentData.possibleConditions.length > 0) {
      symptomsParts.push(`Possible Conditions: ${clinicalAssessmentData.possibleConditions.map((c: any) => 
        `${c.condition} (${c.probability} probability)`
      ).join(', ')}`);
    }

    if (clinicalAssessmentData?.clinicalSummary) {
      symptomsParts.push(`Clinical Summary: ${clinicalAssessmentData.clinicalSummary}`);
    }

    const clinical_symptoms = symptomsParts.length > 0 
      ? symptomsParts.join('\n\n') 
      : 'No specific symptoms reported during clinical assessment';

    // Generate recommendations: Action items
    const recommendationsParts = [];

    if (clinicalAssessmentData?.investigations && clinicalAssessmentData.investigations.length > 0) {
      recommendationsParts.push('🩺 TESTS RECOMMENDED:');
      clinicalAssessmentData.investigations.forEach((inv: any, i: number) => {
        recommendationsParts.push(`${i + 1}. ${inv.test} - ${inv.reason} (${inv.urgency})`);
      });
    }

    if (clinicalAssessmentData?.referrals && clinicalAssessmentData.referrals.length > 0) {
      recommendationsParts.push('\n👨‍⚕️ SPECIALIST REFERRALS:');
      clinicalAssessmentData.referrals.forEach((ref: any, i: number) => {
        recommendationsParts.push(`${i + 1}. ${ref.specialty} - ${ref.reason} (${ref.timeframe})`);
      });
    }

    if (analysisData.diet?.increase && analysisData.diet.increase.length > 0) {
      recommendationsParts.push('\n🥗 DIETARY RECOMMENDATIONS:');
      analysisData.diet.increase.slice(0, 5).forEach((item: string) => {
        recommendationsParts.push(`• ${item}`);
      });
    }

    if (analysisData.lifestyle?.recommendations && analysisData.lifestyle.recommendations.length > 0) {
      recommendationsParts.push('\n🏃 LIFESTYLE CHANGES:');
      analysisData.lifestyle.recommendations.slice(0, 5).forEach((item: string) => {
        recommendationsParts.push(`• ${item}`);
      });
    }

    const recommendations = recommendationsParts.length > 0
      ? recommendationsParts.join('\n')
      : 'Continue maintaining healthy lifestyle habits';

    // Generate patient_demographics
    const patient_demographics = `${analysisData.demographics?.age || 'Age unknown'}-year-old ${analysisData.demographics?.gender || 'patient'}`;

    return new Response(
      JSON.stringify({
        patient_report,
        abnormal_findings,
        clinical_symptoms,
        recommendations,
        patient_demographics
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error preparing voice context:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});
