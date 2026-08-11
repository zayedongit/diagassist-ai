import { Stethoscope, UserCheck, Utensils, Activity, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EnhancedAnalysisResult, LegacyAnalysisResult } from "@/types/medicalAnalysis";

interface NextStepsSectionProps {
  analysisData: EnhancedAnalysisResult | LegacyAnalysisResult;
  specialist?: string;
}

export const NextStepsSection = ({ analysisData, specialist }: NextStepsSectionProps) => {
  // Check if patient has actual anemia (not just low iron stores)
  const hasActualAnemia = (): boolean => {
    let hgbValue: number | null = null;
    
    if ('medicalPanels' in analysisData && analysisData.medicalPanels) {
      for (const panel of analysisData.medicalPanels) {
        if (panel.name.toLowerCase().includes('cbc') || 
            panel.name.toLowerCase().includes('complete blood count') ||
            panel.name.toLowerCase().includes('haematology') ||
            panel.name.toLowerCase().includes('hematology')) {
          
          const allLabs = panel.abnormalLabs || [];
          const hgbLab = allLabs.find(lab =>
            lab.name.toLowerCase().includes('hemoglobin') ||
            lab.name.toLowerCase().includes('haemoglobin') ||
            lab.name === 'Hb' || lab.name === 'Hgb'
          );
          
          if (hgbLab) {
            hgbValue = parseFloat(hgbLab.value);
            break;
          }
        }
      }
    }
    
    if (hgbValue === null) return false;
    
    // Anemia thresholds: Women <11.5, Men <13, Universal conservative <12
    const hasAnemia = hgbValue < 12;
    
    console.log(`[CLINICAL CHECK] Hemoglobin: ${hgbValue} g/dL - Anemia: ${hasAnemia ? 'YES' : 'NO'}`);
    return hasAnemia;
  };

  // Check severity of abnormality
  const getAbnormalitySeverity = (labName: string, value: number): 'mild' | 'moderate' | 'severe' | 'critical' => {
    const name = labName.toLowerCase();
    
    if (name.includes('hemoglobin') || name.includes('hb') || name.includes('hgb')) {
      if (value < 7) return 'critical';
      if (value < 9) return 'severe';
      if (value < 11) return 'moderate';
      return 'mild';
    }
    
    if (name.includes('hba1c')) {
      if (value > 11) return 'critical';
      if (value > 9) return 'severe';
      if (value > 7.5) return 'moderate';
      return 'mild';
    }
    
    if (name.includes('creatinine')) {
      if (value > 3) return 'critical';
      if (value > 2) return 'severe';
      if (value > 1.5) return 'moderate';
      return 'mild';
    }
    
    return 'mild';
  };

  // Generate medical investigation recommendations based on actual abnormal lab values - strict filtering
  const getMedicalInvestigations = () => {
    const investigations = [];
    const abnormalLabs: any[] = [];
    
    // Collect all abnormal labs with numeric values only - skip Additional Findings
    if ('medicalPanels' in analysisData && analysisData.medicalPanels) {
      for (const panel of analysisData.medicalPanels) {
        // Skip Additional Findings panels completely
        if (panel.name === 'Additional Findings' || panel.name.toLowerCase().includes('additional')) {
          continue;
        }
        
        if (panel.abnormalLabs) {
          abnormalLabs.push(...panel.abnormalLabs.filter(lab => 
            lab.value !== 'AUTO-DETECTED' && 
            lab.value !== 'See Report' &&
            !isNaN(parseFloat(lab.value)) &&
            parseFloat(lab.value) > 0 &&
            !lab.name.toLowerCase().includes('blood group') &&
            !lab.name.toLowerCase().includes('sample type')
          ));
        }
      }
    } else if ('labs' in analysisData && analysisData.labs) {
      abnormalLabs.push(...analysisData.labs.filter(lab => 
        lab.value !== 'AUTO-DETECTED' && 
        lab.value !== 'See Report' &&
        !isNaN(parseFloat(lab.value)) &&
        parseFloat(lab.value) > 0 &&
        !lab.name.toLowerCase().includes('blood group') &&
        !lab.name.toLowerCase().includes('sample type')
      ));
    }

    // Return empty if no valid abnormal values
    if (abnormalLabs.length === 0) {
      return [];
    }

    // Prioritize severe diabetes cases
    const glucoseAbnormalities = abnormalLabs.filter(lab => 
      lab.name.toLowerCase().includes('glucose') || 
      lab.name.toLowerCase().includes('hba1c') ||
      lab.name.toLowerCase().includes('diabetes')
    );
    
    if (glucoseAbnormalities.length > 0) {
      // Check if HbA1c is severely elevated (>9%)
      const severeHbA1c = glucoseAbnormalities.some(lab => 
        lab.name.toLowerCase().includes('hba1c') && 
        parseFloat(lab.value) > 9
      );
      
      // Check if fasting glucose is severely elevated (>200 mg/dL)
      const severeFasting = glucoseAbnormalities.some(lab => 
        lab.name.toLowerCase().includes('glucose') && 
        parseFloat(lab.value) > 200
      );

      if (severeHbA1c || severeFasting) {
        investigations.push({
          test: 'Immediate Diabetes Management',
          reason: 'Urgent assessment for severely uncontrolled diabetes and complications screening',
          timeframe: '1-2 days',
          urgency: 'urgent'
        });
        
        investigations.push({
          test: 'Diabetic Complications Screening',
          reason: 'Eye examination, kidney function, nerve assessment for diabetes complications',
          timeframe: '1 week',
          urgency: 'essential'
        });
      }
      
      investigations.push({
        test: 'HbA1c Follow-up',
        reason: 'Monitor diabetes control after treatment adjustment',
        timeframe: '6-8 weeks',
        urgency: 'essential'
      });
    }
    
    // Check for actual liver abnormalities
    const liverAbnormalities = abnormalLabs.filter(lab => 
      lab.name.toLowerCase().includes('alt') || 
      lab.name.toLowerCase().includes('ast') ||
      lab.name.toLowerCase().includes('bilirubin') ||
      lab.name.toLowerCase().includes('liver')
    );
    
    if (liverAbnormalities.length > 0) {
      investigations.push({
        test: 'Comprehensive Liver Panel',
        reason: 'Detailed assessment of liver function and enzymes',
        timeframe: '1-2 weeks',
        urgency: 'recommended'
      });
    }
    
    // Check for actual kidney abnormalities
    const kidneyAbnormalities = abnormalLabs.filter(lab => 
      lab.name.toLowerCase().includes('creatinine') || 
      lab.name.toLowerCase().includes('urea') ||
      lab.name.toLowerCase().includes('kidney')
    );
    
    if (kidneyAbnormalities.length > 0) {
      investigations.push({
        test: 'Complete Metabolic Panel',
        reason: 'Comprehensive kidney function assessment',
        timeframe: '1-2 weeks',
        urgency: 'recommended'
      });
    }

    // Check for vitamin D deficiency
    const vitaminDAbnormalities = abnormalLabs.filter(lab => 
      lab.name.toLowerCase().includes('vitamin d') && 
      parseFloat(lab.value) < 30
    );
    
    if (vitaminDAbnormalities.length > 0) {
      investigations.push({
        test: 'Vitamin D Follow-up',
        reason: 'Monitor vitamin D levels after supplementation',
        timeframe: '8-12 weeks',
        urgency: 'routine'
      });
    }
    
    // General follow-up only if there are actual abnormalities
    if (abnormalLabs.length > 0 && (analysisData.overallStatus === 'moderate' || analysisData.overallStatus === 'concerning')) {
      investigations.push({
        test: 'Follow-up Blood Work',
        reason: 'Repeat abnormal parameters to track changes',
        timeframe: '4-6 weeks',
        urgency: 'routine'
      });
    }
    
    return investigations;
  };

  // Generate specialist referral recommendations based on actual abnormal lab values - strict filtering
  const getSpecialistReferrals = () => {
    const referrals = [];
    const abnormalLabs: any[] = [];
    
    // Collect all abnormal labs with numeric values only - skip Additional Findings
    if ('medicalPanels' in analysisData && analysisData.medicalPanels) {
      for (const panel of analysisData.medicalPanels) {
        // Skip Additional Findings panels completely
        if (panel.name === 'Additional Findings' || panel.name.toLowerCase().includes('additional')) {
          continue;
        }
        
        if (panel.abnormalLabs) {
          abnormalLabs.push(...panel.abnormalLabs.filter(lab => 
            lab.value !== 'AUTO-DETECTED' && 
            lab.value !== 'See Report' &&
            !isNaN(parseFloat(lab.value)) &&
            parseFloat(lab.value) > 0 &&
            !lab.name.toLowerCase().includes('blood group') &&
            !lab.name.toLowerCase().includes('sample type')
          ));
        }
      }
    } else if ('labs' in analysisData && analysisData.labs) {
      abnormalLabs.push(...analysisData.labs.filter(lab => 
        lab.value !== 'AUTO-DETECTED' && 
        lab.value !== 'See Report' &&
        !isNaN(parseFloat(lab.value)) &&
        parseFloat(lab.value) > 0 &&
        !lab.name.toLowerCase().includes('blood group') &&
        !lab.name.toLowerCase().includes('sample type')
      ));
    }

    // Return empty if no valid abnormalities
    if (abnormalLabs.length === 0) {
      return [];
    }

    // Prioritize diabetes/glucose abnormalities - check for severe cases first
    const glucoseAbnormalities = abnormalLabs.filter(lab => 
      lab.name.toLowerCase().includes('glucose') || 
      lab.name.toLowerCase().includes('hba1c')
    );
    
    if (glucoseAbnormalities.length > 0) {
      // Check for severe/critical diabetes (HbA1c >9% or fasting glucose >200)
      const severeHbA1c = glucoseAbnormalities.some(lab => 
        lab.name.toLowerCase().includes('hba1c') && 
        parseFloat(lab.value) > 9
      );
      
      const severeFasting = glucoseAbnormalities.some(lab => 
        lab.name.toLowerCase().includes('glucose') && 
        parseFloat(lab.value) > 200
      );

      if (severeHbA1c || severeFasting) {
        referrals.push({
          specialty: 'Endocrinologist',
          reason: 'Urgent management of severely uncontrolled diabetes mellitus',
          timeframe: '1-2 weeks',
          priority: 'essential'
        });
      } else {
        referrals.push({
          specialty: 'Endocrinologist',
          reason: 'Diabetes management and metabolic evaluation',
          timeframe: '3-4 weeks',
          priority: 'recommended'
        });
      }
    }
    
    // Check for actual liver abnormalities
    const liverAbnormalities = abnormalLabs.filter(lab => 
      lab.name.toLowerCase().includes('alt') || 
      lab.name.toLowerCase().includes('ast') ||
      lab.name.toLowerCase().includes('bilirubin') ||
      lab.name.toLowerCase().includes('liver')
    );
    
    if (liverAbnormalities.length > 0) {
      referrals.push({
        specialty: 'Gastroenterologist',
        reason: 'Specialized liver function evaluation',
        timeframe: '2-4 weeks',
        priority: 'recommended'
      });
    }
    
    // Check for actual kidney abnormalities
    const kidneyAbnormalities = abnormalLabs.filter(lab => 
      lab.name.toLowerCase().includes('creatinine') || 
      lab.name.toLowerCase().includes('urea') ||
      lab.name.toLowerCase().includes('kidney')
    );
    
    if (kidneyAbnormalities.length > 0) {
      referrals.push({
        specialty: 'Nephrologist',
        reason: 'Kidney function specialist consultation',
        timeframe: '2-4 weeks',
        priority: 'recommended'
      });
    }

    // Check for vitamin D deficiency
    const vitaminDAbnormalities = abnormalLabs.filter(lab => 
      lab.name.toLowerCase().includes('vitamin d') && 
      parseFloat(lab.value) < 20
    );
    
    if (vitaminDAbnormalities.length > 0) {
      referrals.push({
        specialty: 'Primary Care Physician',
        reason: 'Vitamin D deficiency management and supplementation',
        timeframe: '1-2 weeks',
        priority: 'recommended'
      });
    }
    
    // Always recommend primary care follow-up if there are any abnormalities
    if (abnormalLabs.length > 0) {
      referrals.push({
        specialty: 'Primary Care Physician',
        reason: 'Discuss results and create comprehensive treatment plan',
        timeframe: '1-2 weeks',
        priority: 'essential'
      });
    }
    
    return referrals;
  };

  const investigations = getMedicalInvestigations();
  const referrals = getSpecialistReferrals();

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'destructive';
      case 'essential':
        return 'destructive';
      case 'recommended':
        return 'default';
      case 'routine':
        return 'secondary';
      case 'if needed':
      case 'if indicated':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'essential':
        return 'destructive';
      case 'recommended':
        return 'default';
      case 'if needed':
      case 'if indicated':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-primary">
          <Calendar className="w-5 h-5" />
          <span>Next Steps & Recommendations</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 1. Further Medical Investigation */}
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center space-x-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              <span>Further Medical Investigation</span>
            </h4>
            <div className="space-y-3">
              {investigations.map((investigation, index) => (
                <div key={index} className="bg-muted/20 rounded-lg p-4 border border-border/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h5 className="font-medium text-foreground">{investigation.test}</h5>
                        <Badge variant={getUrgencyBadge(investigation.urgency)}>
                          {investigation.urgency}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{investigation.reason}</p>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Timeframe: {investigation.timeframe}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* 2. Specialist Referrals */}
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-primary" />
              <span>Specialist Referrals</span>
            </h4>
            <div className="space-y-3">
              {referrals.map((referral, index) => (
                <div key={index} className="bg-muted/20 rounded-lg p-4 border border-border/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h5 className="font-medium text-foreground">{referral.specialty}</h5>
                        <Badge variant={getPriorityBadge(referral.priority)}>
                          {referral.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{referral.reason}</p>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Timeframe: {referral.timeframe}</span>
                      </div>
                    </div>
                    
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* 3. Lifestyle & Dietary Modifications (if authenticated) */}
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center space-x-2">
              <Utensils className="w-5 h-5 text-primary" />
              <span>Dietary & Lifestyle Plan</span>
            </h4>
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <p className="text-sm text-foreground mb-2">
                Comprehensive dietary and lifestyle recommendations are available as part of your detailed report.
              </p>
              <p className="text-xs text-muted-foreground">
                This includes specific food recommendations, meal planning, exercise guidelines, and lifestyle modifications 
                tailored to your specific results.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Step-by-Step Timeline */}
        <div className="mt-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border-2 border-primary/30 overflow-hidden">
          <div className="p-4 bg-primary/20 border-b border-primary/30">
            <h5 className="font-bold text-foreground flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span>Your Step-by-Step Action Timeline</span>
            </h5>
            <p className="text-xs text-muted-foreground mt-1">
              Follow this timeline to address your results systematically
            </p>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Week 1-2 */}
            <div className="bg-card dark:bg-gray-800 rounded-lg p-4 border-l-4 border-l-destructive shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="destructive" className="font-bold">Week 1-2</Badge>
                <span className="text-sm font-semibold text-foreground">Immediate Actions</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span><strong>Day 1-3:</strong> Schedule appointment with primary care physician to discuss results</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span><strong>Day 3-7:</strong> Begin dietary modifications (reduce sugar, increase fiber)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span><strong>Day 7-14:</strong> Attend doctor appointment, discuss medication options</span>
                </li>
              </ul>
            </div>

            {/* Week 2-4 */}
            <div className="bg-card dark:bg-gray-800 rounded-lg p-4 border-l-4 border-l-warning shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="default" className="font-bold bg-warning text-warning-foreground">Week 2-4</Badge>
                <span className="text-sm font-semibold text-foreground">Initial Management</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                  <span><strong>Week 2:</strong> Start prescribed medications if recommended</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                  <span><strong>Week 3:</strong> Complete any recommended follow-up blood tests</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                  <span><strong>Week 4:</strong> Begin regular exercise routine (30 min/day, 5x/week)</span>
                </li>
              </ul>
            </div>

            {/* Week 4-8 */}
            <div className="bg-card dark:bg-gray-800 rounded-lg p-4 border-l-4 border-l-blue-500 shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="secondary" className="font-bold bg-card text-foreground">Week 4-8</Badge>
                <span className="text-sm font-semibold text-foreground">Specialist Consultation</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                  <span><strong>Week 4-5:</strong> Schedule specialist appointment (if recommended)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                  <span><strong>Week 6:</strong> Attend specialist consultation, review detailed management plan</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                  <span><strong>Week 8:</strong> Follow-up blood work to assess initial response to treatment</span>
                </li>
              </ul>
            </div>

            {/* Week 8-12 */}
            <div className="bg-card dark:bg-gray-800 rounded-lg p-4 border-l-4 border-l-success shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="secondary" className="font-bold bg-success text-foreground">Week 8-12</Badge>
                <span className="text-sm font-semibold text-foreground">Progress Monitoring</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Week 8-10:</strong> Review test results with your doctor, adjust treatment if needed</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Week 10-12:</strong> Continue lifestyle modifications, track improvements</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Week 12:</strong> Schedule next follow-up appointment and repeat testing (usually in 8-12 weeks)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-muted/20 border-t border-border/30">
            <p className="text-xs text-muted-foreground italic text-center">
              💡 <strong>Remember:</strong> Consistency is key. Small, steady changes lead to the best long-term results.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};