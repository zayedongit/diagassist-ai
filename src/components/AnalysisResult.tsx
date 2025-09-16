import { Download, Heart, AlertTriangle, CheckCircle, Brain, BarChart3, Activity, User, Stethoscope, FileText, TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getMarkerPositionAndCategory } from "@/utils/labMarker";
import { EnhancedAnalysisResult, LegacyAnalysisResult, normalizeAnalysisData, extractAbnormalPanels } from "@/types/medicalAnalysis";
import { HealthRisksSection } from "./HealthRisksSection";
import { PredictiveInsightsSection } from "./PredictiveInsightsSection";
import { ParameterContextSection } from "./ParameterContextSection";
import { NextStepsSection } from "./NextStepsSection";
import { LabRangeBar } from "./LabRangeBar";
import { getPopulationData } from "@/utils/populationData";

// Utility function to format text with proper line breaks and bullets
const formatAnalysisText = (text: string) => {
  if (!text) return [];
  
  // Split by sentences first, then convert to bullet points
  const sentences = text.split(/[.!?]+/).filter(s => s.trim() && s.trim().length > 10);
  
  if (sentences.length <= 1) {
    // If only one sentence, return as paragraph
    return [{
      type: 'paragraph' as const,
      content: text.trim()
    }];
  }
  
  // Convert sentences to bullet points
  const bulletPoints = sentences.map(sentence => sentence.trim()).filter(sentence => sentence);
  
  return [{
    type: 'bulletList' as const,
    header: '',
    bullets: bulletPoints
  }];
};

interface AnalysisResultProps {
  patientName?: string;
  analysisData: EnhancedAnalysisResult | LegacyAnalysisResult;
  onDownload: () => void;
  isAuthenticated?: boolean;
  onLoginClick?: () => void;
}

export const AnalysisResult = ({ 
  patientName, 
  analysisData, 
  onDownload, 
  isAuthenticated = false, 
  onLoginClick 
}: AnalysisResultProps) => {
  // Normalize data for backward compatibility
  const normalizedData = normalizeAnalysisData(analysisData);
  const isEnhancedData = 'medicalPanels' in analysisData;
  const enhancedData = isEnhancedData ? analysisData as EnhancedAnalysisResult : null;

  // Helper function to expand generic food categories to specific food names
  const expandFoodCategories = (items: string[]) => {
    const foodMapping: Record<string, string[]> = {
      'high-sodium foods': ['Processed meats (salami, bacon, ham)', 'Canned soups', 'Frozen dinners', 'Chips and crackers', 'Pickled foods', 'Restaurant fast food'],
      'processed foods': ['Packaged snacks', 'Instant noodles', 'Frozen pizza', 'Canned meals', 'Processed cheese', 'Sugary cereals'],
      'saturated fats': ['Butter', 'Full-fat dairy', 'Fried foods', 'Red meat (beef, lamb)', 'Coconut oil', 'Palm oil'],
      'trans fats': ['Margarine', 'Bakery items', 'Fried fast food', 'Packaged cookies', 'Donuts', 'Microwave popcorn'],
      'refined sugar': ['Candy', 'Soda', 'Pastries', 'Ice cream', 'Fruit juices', 'Energy drinks'],
      'alcohol': ['Beer', 'Wine', 'Spirits', 'Cocktails'],
      'caffeine': ['Coffee (limit to 1-2 cups)', 'Energy drinks', 'Dark chocolate (excess)', 'Green tea (excess)']
    };

    const expandedItems: string[] = [];
    
    items.forEach(item => {
      const lowerItem = item.toLowerCase();
      let found = false;
      
      // Check if the item matches any category
      Object.keys(foodMapping).forEach(category => {
        if (lowerItem.includes(category.toLowerCase()) || category.toLowerCase().includes(lowerItem)) {
          expandedItems.push(...foodMapping[category]);
          found = true;
        }
      });
      
      // If no mapping found, use the original item
      if (!found) {
        expandedItems.push(item);
      }
    });
    
    return [...new Set(expandedItems)]; // Remove duplicates
  };

  // Create expanded analysis data with specific food names
  const expandedAnalysisData = {
    ...normalizedData,
    diet: {
      ...normalizedData.diet,
      avoid: expandFoodCategories(normalizedData.diet.avoid)
    }
  };
  const getStatusInfo = () => {
    switch (normalizedData.overallStatus) {
      case 'good':
        return {
          icon: CheckCircle,
          color: 'text-success',
          bgColor: 'bg-success/10',
          text: 'Good Health',
          description: 'Your results look good overall'
        };
      case 'moderate':
        return {
          icon: AlertTriangle,
          color: 'text-warning',
          bgColor: 'bg-warning/10',
          text: 'Moderate Issues',
          description: 'Some values need attention'
        };
      case 'concerning':
        return {
          icon: AlertTriangle,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          text: 'Needs Attention',
          description: 'Please consult a healthcare provider'
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          text: 'Analysis Complete',
          description: 'Review your results'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Status Card */}
      <Card className="shadow-card border-l-4 border-l-primary">
        <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
          <div className="flex items-start sm:items-center space-x-2 sm:space-x-3">
            <div className={`p-1.5 sm:p-2 rounded-full ${statusInfo.bgColor} flex-shrink-0`}>
              <StatusIcon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${statusInfo.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg md:text-xl text-persian-blue">{statusInfo.text}</CardTitle>
              {/* Patient Greeting directly under status */}
              {patientName && (
                <h3 className="text-sm sm:text-base md:text-lg font-medium mt-1 text-persian-blue">
                  Hi {patientName}
                </h3>
              )}
              <p className="text-xs sm:text-sm text-persian-blue">{statusInfo.description}</p>
                {patientName && (
                  <p className="text-xs sm:text-sm text-persian-blue">Here are your report results</p>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Patient Demographics */}
            {enhancedData?.demographics && (
              <div className="bg-muted/10 rounded-lg p-3 border border-border/20">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-persian-blue">
                  {enhancedData.demographics.age && (
                    <span>Age: {enhancedData.demographics.age} years</span>
                  )}
                  {enhancedData.demographics.gender && (
                    <span>Gender: {enhancedData.demographics.gender}</span>
                  )}
                  {enhancedData.testDate && (
                    <span>Test Date: {enhancedData.testDate}</span>
                  )}
                </div>
              </div>
            )}

            {/* Summary in Simple Terms - Prominent Golden Card */}
            {normalizedData.summary && (
              <Card className="shadow-xl border-2 border-warning/30 bg-gradient-to-br from-warning/20 via-warning/15 to-warning/10 overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="flex-shrink-0 self-center sm:self-start">
                      <div className="p-2 sm:p-3 bg-warning/30 rounded-xl shadow-md">
                        <FileText className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-warning-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 flex items-center text-center sm:text-left text-persian-blue">
                        📋 Summary in Simple Terms
                      </h3>
                      <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 md:p-5 border border-warning/20">
                        <p className="text-sm sm:text-base leading-relaxed font-medium text-persian-blue">
                          {normalizedData.summary}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Next Steps - Moved here after patient details */}
            <NextStepsSection 
              analysisData={analysisData} 
              specialist={normalizedData.specialist}
            />

            {/* Enhanced Medical Panels Section */}
            {enhancedData?.medicalPanels && enhancedData.medicalPanels.some(panel => 
              panel.name !== 'Additional Findings' &&
              !panel.name.toLowerCase().includes('additional') &&
              panel.abnormalLabs.filter(lab => 
                !lab.name.toLowerCase().includes('blood group') &&
                !lab.name.toLowerCase().includes('sample type') &&
                !lab.name.toLowerCase().includes('rh typing') &&
                !lab.name.toLowerCase().includes('abo') &&
                !lab.name.toLowerCase().includes('blood type') &&
                lab.value !== 'AUTO-DETECTED' &&
                lab.value !== 'See Report' &&
                !isNaN(parseFloat(lab.value)) &&
                parseFloat(lab.value) > 0
              ).length > 0
            ) && (
              <div>
                <h4 className="text-lg font-semibold mb-3 flex items-center space-x-2 text-persian-blue">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  <span>Medical Panel Analysis</span>
                </h4>
                <div className="space-y-4">
                  {enhancedData.medicalPanels
                    .filter(panel => 
                      panel.name !== 'Additional Findings' &&
                      !panel.name.toLowerCase().includes('additional') &&
                      panel.abnormalLabs.filter(lab => 
                        !lab.name.toLowerCase().includes('blood group') &&
                        !lab.name.toLowerCase().includes('sample type') &&
                        !lab.name.toLowerCase().includes('rh typing') &&
                        !lab.name.toLowerCase().includes('abo') &&
                        !lab.name.toLowerCase().includes('blood type') &&
                        lab.value !== 'AUTO-DETECTED' &&
                        lab.value !== 'See Report' &&
                        !isNaN(parseFloat(lab.value)) &&
                        parseFloat(lab.value) > 0
                      ).length > 0
                    )
                    .map((panel, index) => {
                       // Use panel.normalParameters if available from enhanced analysis
                       const getNormalParametersForPanel = (panelName: string, panel?: any) => {
                         if (panel?.normalParameters && panel.normalParameters.length > 0) {
                           return panel.normalParameters;
                         }
                         
                          // Fallback to static list based on panel name
                          const lowerName = panelName.toLowerCase();
                          if (lowerName.includes('lipid') || lowerName.includes('cholesterol')) {
                            return ['Total Cholesterol', 'HDL Cholesterol', 'LDL Cholesterol', 'Triglycerides', 'VLDL Cholesterol', 'Non-HDL Cholesterol'];
                          } else if (lowerName.includes('cbc') || lowerName.includes('blood count') || lowerName.includes('complete blood')) {
                            return ['White Blood Cells', 'Red Blood Cells', 'Hemoglobin', 'Hematocrit', 'Platelets', 'Mean Cell Volume', 'MCH', 'MCHC', 'RDW'];
                          } else if (lowerName.includes('liver') || lowerName.includes('hepatic')) {
                            return ['ALT', 'AST', 'Bilirubin', 'Alkaline Phosphatase', 'Albumin', 'Total Protein', 'GGT', 'Direct Bilirubin'];
                          } else if (lowerName.includes('kidney') || lowerName.includes('renal')) {
                            return ['Creatinine', 'Blood Urea Nitrogen', 'eGFR', 'Uric Acid', 'Sodium', 'Potassium', 'Chloride', 'CO2'];
                          } else if (lowerName.includes('thyroid')) {
                            return ['TSH', 'Free T4', 'Free T3', 'Total T4', 'Total T3', 'TPO Antibodies', 'Thyroglobulin'];
                          } else if (lowerName.includes('sugar') || lowerName.includes('glucose') || lowerName.includes('hba1c') || lowerName.includes('diabetes')) {
                            return ['Fasting Glucose', 'HbA1c', 'Random Glucose', 'Insulin', 'C-Peptide', 'Glucose Tolerance'];
                          } else if (lowerName.includes('blood group') || lowerName.includes('typing') || lowerName.includes('rh factor')) {
                            return []; // Blood group has no "normal" parameters to list
                          } else if (lowerName.includes('vitamin') || lowerName.includes('mineral') || lowerName.includes('other')) {
                            return ['Vitamin D', 'Vitamin B12', 'Folate', 'Iron', 'TIBC', 'Ferritin', 'Calcium', 'Magnesium'];
                          } else if (lowerName.includes('cardiac') || lowerName.includes('heart')) {
                            return ['Troponin', 'CK-MB', 'BNP', 'NT-proBNP', 'CRP', 'Homocysteine'];
                          }
                          
                          // For other panels, try to extract from description or return generic
                          return ['Various Parameters'];
                       };

                        // Filter out blood group/typing parameters and invalid values from abnormal labs
                        const filteredAbnormalLabs = panel.abnormalLabs.filter(lab => 
                          !lab.name.toLowerCase().includes('blood group') &&
                          !lab.name.toLowerCase().includes('sample type') &&
                          !lab.name.toLowerCase().includes('rh typing') &&
                          !lab.name.toLowerCase().includes('abo') &&
                          !lab.name.toLowerCase().includes('blood type') &&
                          lab.value !== 'AUTO-DETECTED' &&
                          lab.value !== 'See Report' &&
                          !isNaN(parseFloat(lab.value)) &&
                          parseFloat(lab.value) > 0
                        );

                        if (filteredAbnormalLabs.length === 0) {
                          return null; // Don't render if no actual abnormal values
                        }

                        const normalParameters = getNormalParametersForPanel(panel.name, panel);
                        const abnormalNames = filteredAbnormalLabs.map(lab => lab.name);
                         // Enhanced data already has actual values in normalParameters
                         const actualNormalParameters = panel?.normalParameters && panel.normalParameters.length > 0 
                           ? panel.normalParameters 
                           : normalParameters.filter(param => !abnormalNames.includes(param));

                      return (
                        <div key={index} className="bg-muted/20 rounded-xl p-4 border border-border/30">
                          <h5 className="font-semibold mb-2 flex items-center space-x-2 text-persian-blue">
                            <FileText className="w-4 h-4 text-primary" />
                            <span>{panel.name}</span>
                          </h5>
                          <p className="text-sm mb-3 text-persian-blue">{panel.description}</p>
                          
                           {/* Enhanced Color-Coded Bars with Human Icons */}
                           <div className="mb-6">
                             <h6 className="text-base font-semibold text-foreground mb-4 flex items-center space-x-2">
                               <BarChart3 className="w-5 h-5 text-primary" />
                               <span>Your Position vs Population Range</span>
                             </h6>
                             <div className="bg-gradient-to-br from-destructive/8 via-warning/8 to-primary/8 rounded-xl p-5 border-2 border-destructive/30 shadow-lg">
                               <div className="flex items-center space-x-2 mb-4">
                                 <div className="bg-primary/20 p-2 rounded-full">
                                   <User className="w-4 h-4 text-primary" />
                                 </div>
                                 <p className="text-sm text-muted-foreground font-medium">
                                   The enhanced bars below show exactly where your values stand compared to the general population. 
                                   Your position is marked with a human icon (👤) showing your percentile ranking.
                                 </p>
                               </div>
                               
                               {/* Legend */}
                               <div className="flex flex-wrap items-center justify-center gap-4 mb-5 p-3 bg-background/60 rounded-lg border border-border/40">
                                 <div className="flex items-center space-x-2">
                                   <div className="w-4 h-4 bg-success/80 rounded"></div>
                                   <span className="text-xs font-medium text-success">Normal Range</span>
                                 </div>
                                 <div className="flex items-center space-x-2">
                                   <div className="w-4 h-4 bg-warning/80 rounded"></div>
                                   <span className="text-xs font-medium text-warning">Borderline</span>
                                 </div>
                                 <div className="flex items-center space-x-2">
                                   <div className="w-4 h-4 bg-destructive/80 rounded"></div>
                                   <span className="text-xs font-medium text-destructive">High Risk</span>
                                 </div>
                                 <div className="flex items-center space-x-2">
                                   <User className="w-4 h-4 text-primary" />
                                   <span className="text-xs font-medium text-primary">Your Position</span>
                                 </div>
                               </div>
                               
                               <div className="space-y-5">
                                 {filteredAbnormalLabs.map((lab, labIndex) => {
                                   // Calculate position for human icon using population data
                                   const labData = {
                                     name: lab.name,
                                     value: lab.value,
                                     referenceRange: lab.referenceRange,
                                     status: lab.status as 'normal' | 'low' | 'high' | 'critical'
                                   };
                                   
                                   // Get appropriate population data for this lab parameter
                                   const popData = getPopulationData(lab.name);
                                   const markerResult = getMarkerPositionAndCategory(labData, popData);
                                   
                                   return (
                                     <div key={labIndex} className="group">
                                       <div className="bg-background/90 rounded-xl border-2 border-border/50 overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 hover:border-primary/30">
                                         <div className="relative">
                                            <LabRangeBar
                                              labName={lab.name}
                                              value={lab.value}
                                              unit={lab.unit}
                                              referenceRange={lab.referenceRange}
                                              status={lab.status as 'normal' | 'low' | 'high' | 'critical'}
                                            />
                                         </div>
                                         {lab.significance && (
                                           <div className="px-5 pb-4 bg-gradient-to-r from-muted/30 to-muted/10">
                                             <div className="flex items-start space-x-2">
                                               <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                               <div>
                                                 <p className="text-xs font-semibold text-primary mb-1">Clinical Significance:</p>
                                                 <p className="text-xs text-muted-foreground leading-relaxed">{lab.significance}</p>
                                               </div>
                                             </div>
                                           </div>
                                         )}
                                       </div>
                                       
                                       {/* Position Interpretation */}
                                       <div className="mt-2 px-2">
                                         <p className="text-center text-xs text-muted-foreground italic">
                                           {markerResult.position <= 15 && "Your value is significantly lower than most people"}
                                           {markerResult.position > 15 && markerResult.position <= 30 && "Your value is below average range"}
                                           {markerResult.position > 30 && markerResult.position <= 70 && "Your value is within typical population range"}
                                           {markerResult.position > 70 && markerResult.position <= 85 && "Your value is above average range"}
                                           {markerResult.position > 85 && "Your value is significantly higher than most people"}
                                         </p>
                                       </div>
                                     </div>
                                   );
                                 })}
                               </div>
                               
                               {/* Summary note */}
                               <div className="mt-5 p-4 bg-primary/10 rounded-lg border border-primary/20">
                                 <div className="flex items-start space-x-2">
                                   <TrendingUp className="w-4 h-4 text-primary mt-0.5" />
                                   <div>
                                     <p className="text-xs font-semibold text-primary mb-1">Understanding Your Results:</p>
                                     <p className="text-xs text-muted-foreground leading-relaxed">
                                       These visual ranges help you understand where your lab values stand compared to the general population. 
                                       Remember that "abnormal" doesn't always mean dangerous - many values can be improved with lifestyle changes or medical guidance.
                                     </p>
                                   </div>
                                 </div>
                               </div>
                             </div>
                           </div>

                           {/* Normal Parameters - Only show if more than 1 abnormal parameter */}
                          {filteredAbnormalLabs.length > 1 && actualNormalParameters.length > 0 && actualNormalParameters[0] !== 'Various Parameters' && (
                            <div className="mb-3">
                              <h6 className="text-sm font-medium text-foreground mb-2 flex items-center space-x-1">
                                <CheckCircle className="w-3 h-3 text-success" />
                                <span>Normal Parameters Analyzed</span>
                              </h6>
                              <div className="bg-success/5 rounded-lg p-3 border border-success/20">
                                <div className="grid grid-cols-1 gap-1 mb-2">
                                  {actualNormalParameters.map((param, paramIndex) => (
                                    <div key={paramIndex} className="flex items-center space-x-2 py-1">
                                      <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                                      <span className="text-xs text-foreground font-medium">
                                        {param}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  These parameters were within normal ranges
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* Enhanced Clinical Interpretation */}
                          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
                            <h6 className="text-sm font-semibold text-primary mb-2 flex items-center space-x-2">
                              <Stethoscope className="w-4 h-4" />
                              <span>Clinical Interpretation</span>
                            </h6>
                            <div className="space-y-3">
                              <p className="text-sm text-foreground leading-relaxed">{panel.interpretation}</p>
                              
                              {/* Robust Analysis Based on Parameters */}
                              {filteredAbnormalLabs.length === 1 && (
                                <div className="bg-warning/10 rounded-lg p-3 border border-warning/20">
                                  <p className="text-xs font-medium text-warning mb-1">Single Parameter Analysis:</p>
                                  <p className="text-xs text-foreground leading-relaxed">
                                    {filteredAbnormalLabs[0].name.toLowerCase().includes('hba1c') && 
                                      "Your HbA1c level indicates your average blood sugar over the past 2-3 months. This single elevated reading suggests the need for diabetes management and lifestyle modifications."}
                                    {filteredAbnormalLabs[0].name.toLowerCase().includes('glucose') && 
                                      "Your glucose level is elevated, which may indicate pre-diabetes or diabetes. This requires immediate attention through dietary changes and medical consultation."}
                                    {filteredAbnormalLabs[0].name.toLowerCase().includes('cholesterol') && 
                                      "Your cholesterol level is outside the optimal range. This single parameter suggests cardiovascular health needs attention through diet and possibly medication."}
                                    {filteredAbnormalLabs[0].name.toLowerCase().includes('vitamin d') && 
                                      "Your Vitamin D level is deficient. This single parameter affects bone health, immunity, and overall well-being. Supplementation and sun exposure are typically recommended."}
                                    {!filteredAbnormalLabs[0].name.toLowerCase().includes('hba1c') && 
                                     !filteredAbnormalLabs[0].name.toLowerCase().includes('glucose') && 
                                     !filteredAbnormalLabs[0].name.toLowerCase().includes('cholesterol') && 
                                     !filteredAbnormalLabs[0].name.toLowerCase().includes('vitamin d') && 
                                      "This single abnormal parameter requires attention. While other parameters are normal, addressing this specific issue is important for overall health."}
                                  </p>
                                </div>
                              )}
                              
                              {filteredAbnormalLabs.length > 1 && (
                                <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                                  <p className="text-xs font-medium text-destructive mb-1">Multiple Parameter Analysis:</p>
                                  <p className="text-xs text-foreground leading-relaxed">
                                    Multiple abnormal values suggest a systemic health concern that requires comprehensive medical evaluation. 
                                    The combination of these parameters indicates {panel.name.toLowerCase().includes('diabetes') ? 'metabolic dysfunction' : 
                                    panel.name.toLowerCase().includes('lipid') ? 'cardiovascular risk factors' : 
                                    panel.name.toLowerCase().includes('liver') ? 'hepatic function concerns' : 
                                    panel.name.toLowerCase().includes('kidney') ? 'renal function issues' : 
                                    'health system imbalance'} requiring immediate medical attention.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Patient-Friendly Summary */}
            {enhancedData?.patientFriendlySummary && (
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center space-x-2">
                  <User className="w-5 h-5 text-primary" />
                  <span>What This Means for You</span>
                </h4>
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-4 border border-primary/20">
                  <p className="text-sm text-foreground leading-relaxed">{enhancedData.patientFriendlySummary}</p>
                 </div>
               </div>
             )}

             {/* Aggregated Normal Parameters Section - Only show for multiple abnormal parameters */}
             {enhancedData?.medicalPanels && (() => {
               // Collect all normal parameters from all panels with their values
               const allNormalParameters: string[] = [];
               let totalAbnormal = 0;
               
               enhancedData.medicalPanels.forEach(panel => {
                 if (panel.normalParameters && panel.normalParameters.length > 0) {
                   allNormalParameters.push(...panel.normalParameters);
                 }
                 if (panel.abnormalLabs && panel.abnormalLabs.length > 0) {
                   totalAbnormal += panel.abnormalLabs.length;
                 }
               });
               
               const totalAnalyzed = allNormalParameters.length + totalAbnormal;
               
               // Only show if there are multiple abnormal parameters
               return allNormalParameters.length > 0 && totalAbnormal > 1 ? (
                 <div>
                   <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center space-x-2">
                     <CheckCircle className="w-5 h-5 text-success" />
                     <span>Complete Analysis Summary</span>
                   </h4>
                   <div className="bg-gradient-to-r from-success/10 to-primary/5 rounded-xl p-4 border border-success/20 mb-4">
                     <div className="flex items-center justify-between mb-4">
                       <div className="text-center">
                         <div className="text-2xl font-bold text-success">{totalAnalyzed}</div>
                         <div className="text-sm text-muted-foreground">Total Parameters</div>
                       </div>
                       <div className="text-center">
                         <div className="text-2xl font-bold text-success">{allNormalParameters.length}</div>
                         <div className="text-sm text-muted-foreground">Normal ✓</div>
                       </div>
                       <div className="text-center">
                         <div className="text-2xl font-bold text-warning">{totalAbnormal}</div>
                         <div className="text-sm text-muted-foreground">Needs Attention</div>
                       </div>
                     </div>
                   </div>
                   
                   <h5 className="text-md font-medium text-foreground mb-3 flex items-center space-x-2">
                     <CheckCircle className="w-4 h-4 text-success" />
                     <span>Normal Parameters (with values)</span>
                   </h5>
                   <div className="bg-success/5 rounded-xl p-4 border border-success/20">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                       {allNormalParameters.map((parameter, index) => (
                         <div key={index} className="flex items-center space-x-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                           <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                           <span className="text-sm text-foreground font-medium">{parameter}</span>
                         </div>
                       ))}
                     </div>
                     <p className="text-xs text-muted-foreground mt-3 text-center opacity-75">
                       ✓ All {allNormalParameters.length} parameters above are within healthy reference ranges
                     </p>
                   </div>
                 </div>
              ) : null;
            })()}

             {/* Health Risks Section */}
             <HealthRisksSection analysisData={analysisData} />

            {/* Predictive Insights Section */}
            <PredictiveInsightsSection analysisData={analysisData} />

            {/* Normal Parameters with Values Card - HIDDEN as per user request */}
            {/* User requested to hide normal values completely */}

            {/* Parameter Context Section - Visual aids and explanations */}
            {(() => {
              const allAbnormalLabs = enhancedData?.medicalPanels?.flatMap(panel => panel.abnormalLabs) || 
                                     normalizedData.labs?.filter(lab => lab.status !== 'normal') || [];
              return allAbnormalLabs.length > 0 ? (
                <ParameterContextSection abnormalLabs={allAbnormalLabs} />
              ) : null;
            })()}


            {/* Fallback to Legacy Analysis for backward compatibility */}
            {!enhancedData && normalizedData.detailedAnalysis && normalizedData.detailedAnalysis.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <span>Complete Analysis Report</span>
                </h4>
                <div className="bg-muted/20 rounded-xl p-4 border border-border/30">
                  <div className="space-y-2">
                    {normalizedData.detailedAnalysis.map((analysis, index) => (
                      <div key={index} className="flex items-start space-x-3 pb-2 border-b border-border/20 last:border-b-0 last:pb-0">
                        <span className="text-primary mt-1 font-mono text-xs min-w-fit">•</span>
                        <span className="text-sm leading-relaxed text-foreground font-mono">{analysis}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Clinical Summary */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-app-blue" />
                <span>Analysis Summary</span>
              </h4>
              <div className="bg-gradient-to-r from-app-light/30 to-background rounded-xl p-4 border border-app-blue/20">
                <div className="space-y-4">
                  {formatAnalysisText(normalizedData.summary).map((section, index) => (
                    <div key={index}>
                      {section.type === 'bulletList' ? (
                        <div>
                          {section.header && (
                            <div className="text-sm font-semibold text-foreground mb-2 flex items-center space-x-2">
                              {section.header.includes('CRITICAL') && (
                                <AlertTriangle className="w-4 h-4 text-destructive" />
                              )}
                              <span className={section.header.includes('CRITICAL') ? 'text-destructive' : 'text-foreground'}>
                                {section.header.replace('CRITICAL ALERTS:', 'CRITICAL ALERTS')}
                              </span>
                            </div>
                          )}
                          <ul className="space-y-2 ml-4">
                            {section.bullets.map((bullet, bulletIndex) => (
                              <li key={bulletIndex} className="text-sm text-foreground leading-relaxed flex items-start space-x-2">
                                <span className="text-primary mt-1 text-xs">•</span>
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="text-sm text-foreground leading-relaxed">
                          {section.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Laboratory Results - Only show if there are abnormal parameters */}
      {normalizedData.labs && normalizedData.labs.filter(lab => lab.status !== 'normal').length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span>Key Abnormal Parameters</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {normalizedData.labs
              .filter(lab => lab.status !== 'normal')
              .map((lab, index) => (
                <div key={index} className="bg-gradient-to-r from-warning/5 to-destructive/5 rounded-xl p-4 border border-warning/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <h5 className="font-medium text-foreground text-base">{lab.name}</h5>
                      <Badge 
                        variant={lab.status === 'critical' ? 'destructive' : lab.status === 'high' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {lab.status === 'critical' ? 'CRITICAL' : lab.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-right mt-2 sm:mt-0">
                      <span className="text-lg font-bold text-foreground">
                        {lab.value} {lab.unit}
                      </span>
                      {lab.referenceRange && (
                        <div className="text-xs text-muted-foreground">
                          Normal: {lab.referenceRange}
                        </div>
                      )}
                    </div>
                  </div>
                  
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Normal Parameters Section - Only show if there are normal params AND multiple abnormal ones */}
      {(() => {
        const normalLabs = analysisData.labs?.filter(lab => lab.status === 'normal') || [];
        const abnormalLabs = analysisData.labs?.filter(lab => lab.status !== 'normal') || [];
        
        // Only show normal parameters if there are multiple abnormal parameters
        return normalLabs.length > 0 && abnormalLabs.length > 1 ? (
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>Normal Parameters Analyzed</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-success/5 rounded-xl p-4 border border-success/20">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {normalLabs.map((lab, index) => (
                    <div key={index} className="flex items-center space-x-2 py-1">
                      <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                      <span className="text-sm text-foreground">{lab.name}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-success/20">
                  <p className="text-xs text-center text-muted-foreground">
                    These parameters were within normal ranges
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Premium Features Section - Show enhanced recommendations */}
      {(expandedAnalysisData.diet.avoid.length > 0 || expandedAnalysisData.diet.increase.length > 0 || expandedAnalysisData.lifestyle?.length > 0) && (
        <>
          {isAuthenticated ? (
            <>
              {/* Authenticated: Show full recommendations */}
              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {/* Diet Card */}
                {(expandedAnalysisData.diet.avoid.length > 0 || expandedAnalysisData.diet.increase.length > 0) && (
                  <Card className="shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg flex items-center space-x-2">
                        <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        <span>Diet Changes</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                      {expandedAnalysisData.diet.avoid.length > 0 && (
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-foreground mb-2">AVOID:</h4>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {expandedAnalysisData.diet.avoid.map((item, index) => (
                              <Badge key={index} variant="outline" className="text-xs text-foreground bg-background border-border">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {expandedAnalysisData.diet.increase.length > 0 && (
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-foreground mb-2">INCREASE:</h4>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {expandedAnalysisData.diet.increase.map((item, index) => (
                              <Badge key={index} variant="outline" className="text-xs text-foreground bg-background border-border">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-2 border-t">
                        <h5 className="text-xs font-medium text-muted-foreground mb-2">Helpful Resources:</h5>
                        <div className="space-y-1">
                          <a 
                            href="https://www.healthline.com/nutrition/50-super-healthy-foods" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline block"
                          >
                            • 50 Super Healthy Foods - Healthline
                          </a>
                          <a 
                            href="https://www.youtube.com/watch?v=TvVVTMD3YT8" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline block"
                          >
                            • Healthy Eating Tips - Mayo Clinic (Video)
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Enhanced Lifestyle Card */}
                {expandedAnalysisData.lifestyle && expandedAnalysisData.lifestyle.length > 0 && (
                  <Card className="shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg flex items-center space-x-2">
                        <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        <span>Actionable Lifestyle Modifications</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Physical Activity Section */}
                        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
                          <h4 className="text-sm font-semibold text-primary mb-3 flex items-center space-x-2">
                            <Heart className="w-4 h-4" />
                            <span>Physical Activity (Start This Week)</span>
                          </h4>
                          <div className="grid gap-2 text-xs">
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Daily Walking:</strong> Start with 15-20 minutes after meals, gradually increase to 45 minutes</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Strength Training:</strong> 2x per week - bodyweight exercises (push-ups, squats, lunges)</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Flexibility:</strong> 10-minute stretching routine every morning and evening</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Activity Tracking:</strong> Use phone app or pedometer, aim for 8,000-10,000 steps daily</span>
                            </div>
                          </div>
                        </div>

                        {/* Sleep & Stress Management */}
                        <div className="bg-gradient-to-r from-app-blue/5 to-app-blue/10 rounded-xl p-4 border border-app-blue/20">
                          <h4 className="text-sm font-semibold text-app-blue mb-3 flex items-center space-x-2">
                            <Brain className="w-4 h-4" />
                            <span>Sleep & Stress Management</span>
                          </h4>
                          <div className="grid gap-2 text-xs">
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Sleep Schedule:</strong> Fixed bedtime (10-11 PM) and wake time, 7-8 hours nightly</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Screen Time:</strong> No devices 1 hour before bed, use blue light filters after sunset</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Stress Relief:</strong> 10-15 minutes daily meditation using apps like Headspace or Calm</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Deep Breathing:</strong> Practice 4-7-8 technique: Inhale 4s, Hold 7s, Exhale 8s (3x daily)</span>
                            </div>
                          </div>
                        </div>

                        {/* Monitoring & Tracking */}
                        <div className="bg-gradient-to-r from-warning/5 to-warning/10 rounded-xl p-4 border border-warning/20">
                          <h4 className="text-sm font-semibold text-warning mb-3 flex items-center space-x-2">
                            <BarChart3 className="w-4 h-4" />
                            <span>Health Monitoring (Weekly Tasks)</span>
                          </h4>
                          <div className="grid gap-2 text-xs">
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Weight Check:</strong> Same day/time weekly (preferably Monday mornings)</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Blood Pressure:</strong> Monitor 2x weekly if elevated (home device recommended)</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Symptom Journal:</strong> Daily 2-minute log of energy, mood, and physical symptoms</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Lab Follow-up:</strong> Schedule repeat tests in 3-6 months as recommended</span>
                            </div>
                          </div>
                        </div>

                        {/* Hydration & Habits */}
                        <div className="bg-gradient-to-r from-success/5 to-success/10 rounded-xl p-4 border border-success/20">
                          <h4 className="text-sm font-semibold text-success mb-3 flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>Daily Habits (Easy Wins)</span>
                          </h4>
                          <div className="grid gap-2 text-xs">
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Hydration:</strong> Start day with 1 glass water, aim for 8-10 glasses total</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Meal Timing:</strong> Eat every 3-4 hours, avoid late night eating (after 8 PM)</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Posture Breaks:</strong> Stand/stretch every 30 minutes if desk job</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-success mt-1">✓</span>
                              <span><strong>Social Connection:</strong> Schedule 1 meaningful conversation daily (family/friends)</span>
                            </div>
                          </div>
                        </div>

                        {/* Emergency Protocols */}
                        <div className="bg-gradient-to-r from-destructive/5 to-destructive/10 rounded-xl p-4 border border-destructive/20">
                          <h4 className="text-sm font-semibold text-destructive mb-3 flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Know When to Seek Help</span>
                          </h4>
                          <div className="grid gap-2 text-xs">
                            <div className="flex items-start space-x-2">
                              <span className="text-destructive mt-1">⚠</span>
                              <span><strong>Chest Pain/Pressure:</strong> Call emergency services immediately</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-destructive mt-1">⚠</span>
                              <span><strong>Severe Symptoms:</strong> Contact healthcare provider within 24 hours</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-destructive mt-1">⚠</span>
                              <span><strong>Medication Changes:</strong> Never adjust prescriptions without consulting doctor</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 mt-4 border-t">
                        <h5 className="text-xs font-medium text-muted-foreground mb-2">Helpful Resources:</h5>
                        <div className="space-y-1">
                          <a 
                            href="https://www.mayoclinic.org/healthy-lifestyle/fitness/basics/fitness-basics/hlv-20049447" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline block"
                          >
                            • Fitness Basics - Mayo Clinic
                          </a>
                          <a 
                            href="https://www.youtube.com/watch?v=aUaInS6HIGo" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline block"
                          >
                            • 5 Simple Lifestyle Changes (Video)
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Enhanced Lifestyle Modifications */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center space-x-2">
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <span>Enhanced Actionable Lifestyle Modifications</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {/* Physical Activity Block */}
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/30 p-4 rounded-lg border border-yellow-200/30">
                      <h4 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Physical Activity
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-foreground">•</span>
                          <span className="text-sm text-foreground/80">Engage in regular cardiovascular exercise like walking or cycling</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-foreground">•</span>
                          <span className="text-sm text-foreground/80">Aim for 150 minutes of moderate-intensity exercise per week</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-foreground">•</span>
                          <span className="text-sm text-foreground/80">Include strength training exercises twice per week</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-foreground">•</span>
                          <span className="text-sm text-foreground/80">Take regular breaks from prolonged sitting</span>
                        </div>
                      </div>
                    </div>

                    {/* Sleep & Stress Management Block */}
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/30 p-4 rounded-lg border border-yellow-200/30">
                      <h4 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        Sleep & Stress Management
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-foreground">•</span>
                          <span className="text-sm text-foreground/80">Maintain 7-9 hours of quality sleep per night</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-foreground">•</span>
                          <span className="text-sm text-foreground/80">Establish a consistent sleep schedule</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-foreground">•</span>
                          <span className="text-sm text-foreground/80">Practice stress reduction techniques (meditation, deep breathing)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-foreground">•</span>
                          <span className="text-sm text-foreground/80">Limit screen time before bedtime</span>
                        </div>
                      </div>
                    </div>

                    {/* Health Monitoring Block */}
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/30 p-4 rounded-lg border border-yellow-200/30">
                      <h4 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Health Monitoring
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-foreground">•</span>
                          <span className="text-sm text-foreground/80">Monitor cholesterol levels regularly</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-foreground">•</span>
                          <span className="text-sm text-foreground/80">Track blood pressure weekly if elevated</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-foreground">•</span>
                          <span className="text-sm text-foreground/80">Maintain a healthy weight within BMI range</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-foreground">•</span>
                          <span className="text-sm text-foreground/80">Schedule regular health check-ups with your doctor</span>
                        </div>
                      </div>
                    </div>

                    {/* Emergency Protocols Block */}
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/30 p-4 rounded-lg border border-red-200">
                      <h4 className="font-semibold mb-3 text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Emergency Protocols
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-red-600">•</span>
                          <span className="text-sm text-foreground/80">Seek immediate medical attention for chest pain or shortness of breath</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-red-600">•</span>
                          <span className="text-sm text-foreground/80">Contact emergency services (911) for severe symptoms</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-red-600">•</span>
                          <span className="text-sm text-foreground/80">Keep emergency contact numbers readily available</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-red-600">•</span>
                          <span className="text-sm text-foreground/80">Know the location of nearest emergency room</span>
                        </div>
                      </div>
                    </div>

                    {/* Personalized Tips Based on Results */}
                    {(enhancedData?.lifestyle?.recommendations || expandedAnalysisData.lifestyle) && (
                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/30 p-4 rounded-lg border border-green-200">
                        <h4 className="font-semibold mb-3 text-green-600 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Personalized Tips Based on Your Results
                        </h4>
                        <div className="space-y-2">
                          {enhancedData?.lifestyle?.recommendations ? (
                            enhancedData.lifestyle.recommendations.map((item, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <span className="text-green-600">•</span>
                                <span className="text-sm text-foreground/80">{item}</span>
                              </div>
                            ))
                          ) : (
                            expandedAnalysisData.lifestyle?.map((item, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <span className="text-green-600">•</span>
                                <span className="text-sm text-foreground/80">{item}</span>
                              </div>
                            ))
                          )}
                        </div>
                        {/* Enhanced Detailed Lifestyle Guidance */}
                        {enhancedData?.lifestyle?.detailed && enhancedData.lifestyle.detailed.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-green-200">
                            <h5 className="font-medium text-green-700 mb-2">Detailed Guidance:</h5>
                            <div className="space-y-2">
                              {enhancedData.lifestyle.detailed.map((detail, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <span className="text-green-600">→</span>
                                  <span className="text-sm text-foreground/80">{detail}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Download Button for Premium Users */}
              <div className="flex justify-center pt-4">
                <Button 
                  variant="default" 
                  size="lg" 
                  onClick={onDownload}
                  className="w-full sm:w-auto sm:min-w-48 h-12 sm:h-10 text-sm sm:text-base"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Download Report
                </Button>
              </div>
            </>
          ) : (
            /* Unauthenticated: Show Premium Feature Prompt with blurred preview */
            <div className="space-y-4">
              {/* Blurred Preview of Premium Features */}
              <div className="relative">
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 blur-sm opacity-50 pointer-events-none">
                  <Card className="shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg flex items-center space-x-2">
                        <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        <span>Diet Changes</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground mb-2">AVOID:</h4>
                        <div className="flex flex-wrap gap-1 mb-3">
                          <Badge variant="outline" className="text-xs">Processed foods</Badge>
                          <Badge variant="outline" className="text-xs">High sugar items</Badge>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground mb-2">INCREASE:</h4>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">Green vegetables</Badge>
                          <Badge variant="outline" className="text-xs">Whole grains</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg flex items-center space-x-2">
                        <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                        <span>Lifestyle</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        <li className="text-xs sm:text-sm flex items-start space-x-2">
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-success mt-0.5" />
                          <span>Regular exercise routine</span>
                        </li>
                        <li className="text-xs sm:text-sm flex items-start space-x-2">
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-success mt-0.5" />
                          <span>Adequate sleep schedule</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Premium Gate Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-3 p-6 border-2 border-dashed border-primary/30 rounded-lg bg-background/95 backdrop-blur-sm shadow-lg max-w-md">
                    <div className="flex items-center justify-center space-x-2 text-primary">
                      <Download className="w-5 h-5" />
                      <span className="font-semibold">Premium Feature</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Unlock detailed recommendations and download reports for just ₹150
                    </p>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="mt-2"
                      onClick={onLoginClick}
                    >
                      Unlock Premium Features
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
    </div>
  );
};