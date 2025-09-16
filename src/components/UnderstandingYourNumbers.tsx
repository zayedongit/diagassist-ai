import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { LabRangeBar } from "@/components/LabRangeBar";
import { EnhancedAnalysisResult, LegacyAnalysisResult } from "@/types/medicalAnalysis";

interface UnderstandingYourNumbersProps {
  analysisData: EnhancedAnalysisResult | LegacyAnalysisResult;
}

export const UnderstandingYourNumbers = ({ analysisData }: UnderstandingYourNumbersProps) => {
  // Collect all abnormal labs from medical panels
  const abnormalLabs: any[] = [];
  
  if ('medicalPanels' in analysisData && analysisData.medicalPanels) {
    for (const panel of analysisData.medicalPanels) {
      if (panel.abnormalLabs) {
        abnormalLabs.push(...panel.abnormalLabs.filter(lab => 
          lab.value !== 'AUTO-DETECTED' && 
          lab.value !== 'See Report' &&
          !lab.name.toLowerCase().includes('blood group') &&
          !lab.name.toLowerCase().includes('sample type')
        ));
      }
    }
  }

  // Filter out duplicate labs and prioritize the most important ones
  const uniqueAbnormalLabs = abnormalLabs.filter((lab, index, self) =>
    index === self.findIndex(l => l.name === lab.name)
  );

  const getParameterContext = (lab: any) => {
    const contexts: Record<string, { whatItMeans: string; possibleCauses: string[]; bodyConnection: string; }> = {
      'glucose': {
        whatItMeans: 'Glucose is your body\'s primary fuel source. This test reveals how effectively your cells are using sugar for energy and whether your pancreas is producing adequate insulin to regulate blood sugar levels.',
        possibleCauses: ['Consuming high-glycemic foods (white bread, sweets)', 'Sedentary lifestyle reducing insulin sensitivity', 'Chronic stress elevating cortisol', 'Certain medications (steroids, diuretics)', 'Pancreatic dysfunction or insulin resistance', 'Hormonal changes during pregnancy or menopause'],
        bodyConnection: 'Elevated glucose damages the delicate lining of blood vessels throughout your body, particularly in the eyes (retinopathy), kidneys (nephropathy), and nerves (neuropathy). It also accelerates atherosclerosis, increasing heart attack and stroke risk.'
      },
      'hba1c': {
        whatItMeans: 'HbA1c is like a "glucose memory test" - it shows how well your blood sugar has been controlled over the past 2-3 months by measuring glucose attached to your red blood cells. It\'s the gold standard for diabetes monitoring.',
        possibleCauses: ['Inconsistent medication adherence', 'Unbalanced meal timing and portions', 'Inadequate physical activity patterns', 'Unmanaged emotional stress', 'Sleep disorders affecting glucose metabolism', 'Other health conditions like infections'],
        bodyConnection: 'High HbA1c indicates prolonged glucose exposure, accelerating the formation of advanced glycation end products (AGEs) that cause premature aging of tissues, particularly affecting cardiovascular, kidney, and nerve health.'
      },
      'cholesterol': {
        whatItMeans: 'Cholesterol is essential for cell membrane structure and hormone production, but excess amounts form fatty deposits in arteries. LDL ("bad") cholesterol builds up in artery walls, while HDL ("good") cholesterol helps remove it.',
        possibleCauses: ['Diet rich in saturated fats (red meat, full-fat dairy)', 'Trans fats from processed foods', 'Genetic predisposition (familial hypercholesterolemia)', 'Obesity and metabolic syndrome', 'Sedentary lifestyle', 'Smoking and excessive alcohol consumption'],
        bodyConnection: 'Excess cholesterol forms plaques in coronary arteries, increasing heart attack risk. It also affects cerebral circulation (stroke risk) and peripheral vessels (poor circulation in legs). The inflammatory response to cholesterol deposits accelerates atherosclerosis.'
      },
      'creatinine': {
        whatItMeans: 'Creatinine is a waste product from muscle metabolism that healthy kidneys efficiently filter out. Rising levels indicate declining kidney function, as your kidneys struggle to maintain their filtration capacity.',
        possibleCauses: ['Chronic dehydration reducing kidney blood flow', 'High protein diet overwhelming kidney capacity', 'Diabetes or high blood pressure damaging kidney filters', 'Certain medications (NSAIDs, ACE inhibitors)', 'Muscle disorders or intense exercise', 'Kidney stones or infections'],
        bodyConnection: 'Impaired kidney function affects your body\'s ability to regulate fluid balance, blood pressure, and electrolytes. It also impacts red blood cell production and bone health through disrupted mineral metabolism.'
      },
      'alt': {
        whatItMeans: 'ALT (Alanine Aminotransferase) is an enzyme primarily found inside liver cells. When liver cells are damaged, ALT leaks into the bloodstream, making it a sensitive marker of liver health and inflammation.',
        possibleCauses: ['Fatty liver disease from obesity or alcohol', 'Viral hepatitis infections', 'Medication-induced liver toxicity', 'Autoimmune liver conditions', 'Excessive alcohol consumption', 'Metabolic disorders affecting liver function'],
        bodyConnection: 'Your liver performs over 500 vital functions including detoxification, protein synthesis, and glucose regulation. Liver damage affects your body\'s ability to process toxins, maintain blood sugar, and produce essential proteins for blood clotting and immunity.'
      },
      'vitamin d': {
        whatItMeans: 'Vitamin D acts more like a hormone than a vitamin, regulating calcium absorption, immune function, and gene expression in over 200 genes. Deficiency is extremely common, especially in areas with limited sunlight.',
        possibleCauses: ['Limited sun exposure (office work, covering skin)', 'Dark skin requiring more sun for synthesis', 'Geographic location with limited UV radiation', 'Malabsorption disorders (celiac, Crohn\'s)', 'Kidney or liver disease affecting activation', 'Age-related decreased skin synthesis'],
        bodyConnection: 'Vitamin D deficiency weakens bones (osteoporosis risk), compromises immune function (increased infections), affects muscle strength and balance (fall risk), and may contribute to depression, autoimmune diseases, and cardiovascular problems.'
      },
      'triglycerides': {
        whatItMeans: 'Triglycerides are fats circulating in your blood, primarily from dietary fats and excess carbohydrates converted by the liver. High levels indicate metabolic dysfunction and increased cardiovascular risk.',
        possibleCauses: ['High carbohydrate diet converting to fat', 'Excessive alcohol consumption', 'Obesity and insulin resistance', 'Sedentary lifestyle patterns', 'Genetic predisposition', 'Certain medications and medical conditions'],
        bodyConnection: 'Elevated triglycerides contribute to arterial plaque formation, increase risk of pancreatitis, and often indicate metabolic syndrome - a cluster of conditions that raise diabetes and heart disease risk.'
      },
      'ldl': {
        whatItMeans: 'LDL (Low-Density Lipoprotein) cholesterol carries cholesterol from the liver to tissues. When oxidized, it becomes harmful, infiltrating artery walls and initiating the atherosclerotic process.',
        possibleCauses: ['Diet high in saturated and trans fats', 'Genetic factors affecting cholesterol metabolism', 'Insulin resistance and diabetes', 'Hypothyroidism slowing cholesterol clearance', 'Chronic inflammation', 'Sedentary lifestyle'],
        bodyConnection: 'Oxidized LDL particles are recognized as foreign by immune cells, triggering inflammation in artery walls. This process creates unstable plaques that can rupture, causing heart attacks and strokes.'
      },
      'hdl': {
        whatItMeans: 'HDL (High-Density Lipoprotein) is the "good" cholesterol that transports cholesterol from tissues back to the liver for disposal. Higher levels are protective against heart disease.',
        possibleCauses: ['Sedentary lifestyle reducing HDL production', 'Smoking damaging HDL particles', 'Excess refined carbohydrates', 'Genetic factors affecting HDL metabolism', 'Obesity and metabolic syndrome', 'Certain medications'],
        bodyConnection: 'HDL has anti-inflammatory and antioxidant properties, protecting artery walls from damage. It also helps remove excess cholesterol from peripheral tissues, maintaining vascular health and reducing atherosclerosis risk.'
      }
    };

    const labName = lab.name.toLowerCase();
    for (const [key, context] of Object.entries(contexts)) {
      if (labName.includes(key)) {
        return context;
      }
    }

    // Generic context for unrecognized labs
    return {
      whatItMeans: 'This parameter provides valuable insights into specific body functions and metabolic processes that your healthcare provider monitors to assess your overall health status.',
      possibleCauses: ['Various lifestyle factors including diet, exercise, and stress management', 'Genetic predisposition and family history', 'Environmental exposures and medication effects', 'Underlying health conditions and age-related changes'],
      bodyConnection: 'This marker reflects the complex interplay between your body systems and can provide early indicators of potential health changes that may benefit from lifestyle modifications or medical attention.'
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'high':
      case 'critical':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'low':
        return <TrendingDown className="w-4 h-4 text-blue-500" />;
      default:
        return <BarChart3 className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'low':
        return 'outline';
      case 'critical':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (uniqueAbnormalLabs.length === 0) {
    return (
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <BarChart3 className="w-5 h-5" />
            Understanding Your Numbers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm text-green-700 text-center">
              <strong>Great news!</strong> All your test values are within normal ranges. 
              Keep up the good work with your current lifestyle!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-persian-blue">
          <BarChart3 className="w-5 h-5" />
          Understanding Your Numbers
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Detailed explanations of your abnormal test results
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {uniqueAbnormalLabs.map((lab, index) => {
          const context = getParameterContext(lab);
          const statusIcon = getStatusIcon(lab.status);
          
          return (
            <Collapsible key={index}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 bg-white/60 rounded-lg border border-primary/20 hover:bg-white/80 transition-colors">
                  <div className="flex items-center gap-3">
                    {statusIcon}
                    <div className="text-left">
                      <h4 className="font-medium text-persian-blue">{lab.name}</h4>
                      <p className="text-sm text-persian-blue">
                        {lab.value} {lab.unit} (Ref: {lab.referenceRange || 'N/A'})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadge(lab.status)}>
                      {lab.status?.toUpperCase()}
                    </Badge>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                 <div className="mt-2 p-4 bg-white/40 rounded-lg border border-primary/10 space-y-4">
                    {/* Lab Range Bar with Dynamic Positioning */}
                    {!isNaN(parseFloat(lab.value)) && parseFloat(lab.value) > 0 && (
                      <LabRangeBar
                        labName={lab.name}
                        value={lab.value}
                        unit={lab.unit}
                        referenceRange={lab.referenceRange}
                        status={lab.status || 'normal'}
                      />
                    )}
                  
                  {/* What It Means */}
                  <div>
                    <h5 className="font-medium text-foreground mb-2">What It Means</h5>
                    <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded border border-blue-200">
                      {context.whatItMeans}
                    </p>
                  </div>
                  
                  {/* Body Connection */}
                  <div>
                    <h5 className="font-medium text-foreground mb-2">Body Connection</h5>
                    <p className="text-sm text-muted-foreground bg-green-50 p-3 rounded border border-green-200">
                      {context.bodyConnection}
                    </p>
                  </div>
                  
                  {/* Possible Contributing Factors */}
                  <div>
                    <h5 className="font-medium text-foreground mb-2">Possible Contributing Factors</h5>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                      <ul className="space-y-1">
                        {context.possibleCauses.map((cause, causeIndex) => (
                          <li key={causeIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></span>
                            {cause}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
        
        {/* Special Note for AUTO-DETECTED values */}
        <div className="mt-4 p-3 bg-muted/10 rounded-lg border border-border/20">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> These explanations are for educational purposes. 
            Always discuss your results with your healthcare provider for proper interpretation and treatment recommendations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};