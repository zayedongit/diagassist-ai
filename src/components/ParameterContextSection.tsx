import { Info, HelpCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { LabValue } from "@/types/medicalAnalysis";
import { LabRangeBar } from "./LabRangeBar";
import { getMarkerPositionAndCategory } from "@/utils/labMarker";
import { getPopulationData } from "@/utils/populationData";

interface ParameterContextSectionProps {
  abnormalLabs: LabValue[];
}

export const ParameterContextSection = ({ abnormalLabs }: ParameterContextSectionProps) => {
  // Filter out blood group, non-medical parameters, and AUTO-DETECTED values
  const filteredLabs = abnormalLabs.filter(lab => 
    !lab.name.toLowerCase().includes('blood group') &&
    !lab.name.toLowerCase().includes('sample type') &&
    !lab.name.toLowerCase().includes('rh typing') &&
    !lab.name.toLowerCase().includes('abo') &&
    !lab.name.toLowerCase().includes('blood type') &&
    lab.value !== 'AUTO-DETECTED' &&
    lab.value !== 'See Report' &&
    !isNaN(parseFloat(lab.value))
  );

  const getParameterContext = (lab: LabValue) => {
    const labName = lab.name.toLowerCase();
    
    // Define parameter contexts
    const contexts: Record<string, {
      whatItMeans: string;
      possibleCauses: string[];
      bodyConnection: string;
    }> = {
      'total cholesterol': {
        whatItMeans: 'Total cholesterol measures all types of cholesterol in your blood. It\'s a key indicator of cardiovascular health and shows how well your body processes fats.',
        possibleCauses: ['High-fat diet', 'Lack of exercise', 'Genetics', 'Stress', 'Certain medications', 'Underlying health conditions'],
        bodyConnection: 'Cholesterol is used by your body to build cell membranes and produce hormones, but too much can build up in arteries.'
      },
      'ldl cholesterol': {
        whatItMeans: 'LDL (bad) cholesterol carries cholesterol from your liver to cells. High levels can lead to plaque buildup in arteries.',
        possibleCauses: ['Saturated fat intake', 'Trans fats', 'Genetics', 'Obesity', 'Diabetes', 'Smoking'],
        bodyConnection: 'LDL particles can get stuck in artery walls, leading to narrowing and increased heart disease risk.'
      },
      'hdl cholesterol': {
        whatItMeans: 'HDL (good) cholesterol helps remove other forms of cholesterol from your bloodstream and transport them to the liver for disposal.',
        possibleCauses: ['Lack of exercise', 'Smoking', 'Poor diet', 'Genetics', 'Certain medications', 'Being overweight'],
        bodyConnection: 'HDL acts like a cleanup crew, removing harmful cholesterol from artery walls and protecting your heart.'
      },
      'triglycerides': {
        whatItMeans: 'Triglycerides are fats in your blood that provide energy. High levels combined with other factors increase heart disease risk.',
        possibleCauses: ['Excess calories', 'Sugar intake', 'Alcohol consumption', 'Obesity', 'Diabetes', 'Kidney disease'],
        bodyConnection: 'When you eat more calories than your body needs, the extra calories are converted to triglycerides and stored as fat.'
      },
      'glucose': {
        whatItMeans: 'Blood glucose (sugar) is your body\'s main source of energy. Levels that are too high or low can indicate problems with insulin function.',
        possibleCauses: ['Diabetes', 'Pre-diabetes', 'Stress', 'Medications', 'Recent meals', 'Lack of sleep'],
        bodyConnection: 'Glucose provides energy to every cell in your body, regulated by insulin from your pancreas.'
      },
      'hemoglobin': {
        whatItMeans: 'Hemoglobin is the protein in red blood cells that carries oxygen from your lungs to the rest of your body.',
        possibleCauses: ['Iron deficiency', 'Chronic disease', 'Blood loss', 'Kidney problems', 'Genetic conditions', 'Poor nutrition'],
        bodyConnection: 'Each hemoglobin molecule can carry four oxygen molecules, delivering vital oxygen to your tissues.'
      },
      'creatinine': {
        whatItMeans: 'Creatinine is a waste product from muscle breakdown that your kidneys filter out. Levels indicate how well your kidneys are working.',
        possibleCauses: ['Kidney disease', 'Dehydration', 'High protein intake', 'Intense exercise', 'Certain medications', 'Muscle disorders'],
        bodyConnection: 'Your kidneys act as filters, removing creatinine and other waste products from your blood to form urine.'
      },
      'alt': {
        whatItMeans: 'ALT (alanine aminotransferase) is an enzyme found mainly in the liver. High levels can indicate liver damage or inflammation.',
        possibleCauses: ['Fatty liver disease', 'Viral hepatitis', 'Alcohol use', 'Medications', 'Obesity', 'Autoimmune conditions'],
        bodyConnection: 'Your liver processes toxins, produces proteins, and stores energy. ALT is released when liver cells are damaged.'
      },
      'ast': {
        whatItMeans: 'AST (aspartate aminotransferase) is an enzyme found in liver, heart, and muscle. Elevated levels may indicate tissue damage.',
        possibleCauses: ['Liver disease', 'Heart problems', 'Muscle damage', 'Alcohol use', 'Medications', 'Vigorous exercise'],
        bodyConnection: 'AST helps convert amino acids into energy. It\'s released into blood when cells containing it are damaged.'
      },
      'tsh': {
        whatItMeans: 'TSH (thyroid stimulating hormone) controls your thyroid gland, which regulates metabolism, energy, and growth.',
        possibleCauses: ['Thyroid disorders', 'Stress', 'Medications', 'Pregnancy', 'Aging', 'Autoimmune conditions'],
        bodyConnection: 'Your pituitary gland releases TSH to tell your thyroid how much thyroid hormone to produce.'
      }
    };

    // Find matching context or provide generic one
    for (const [key, context] of Object.entries(contexts)) {
      if (labName.includes(key)) {
        return context;
      }
    }

    // Generic context for unknown parameters
    return {
      whatItMeans: `${lab.name} is a laboratory parameter that helps assess your health status. Your value of ${lab.value} ${lab.unit || ''} is ${lab.status}.`,
      possibleCauses: ['Various medical conditions', 'Lifestyle factors', 'Medications', 'Genetics', 'Recent activities or diet'],
      bodyConnection: 'This parameter provides information about specific body functions and helps healthcare providers assess your overall health.'
    };
  };

  if (filteredLabs.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-primary">
          <Info className="w-5 h-5" />
          <span>Understanding Your Numbers</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredLabs.map((lab, index) => {
            const context = getParameterContext(lab);
            
            // Skip positioning for AUTO-DETECTED values
            const markerResult = lab.value === 'AUTO-DETECTED' || lab.value === 'See Report' 
              ? { position: 50, category: 'Unknown' as const }
              : getMarkerPositionAndCategory(lab, getPopulationData(lab.name));
            
            return (
              <Collapsible key={index}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <div className="flex items-center space-x-2 text-left">
                      <HelpCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-medium">{lab.name}</span>
                      <Badge variant={lab.status === 'critical' ? 'destructive' : 'secondary'}>
                        {lab.status}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">Click to learn more</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                    {/* Visual Range Bar - Hide for AUTO-DETECTED values */}
                    {lab.value !== 'AUTO-DETECTED' && lab.value !== 'See Report' && (
                      <LabRangeBar
                        labName={lab.name}
                        value={lab.value}
                        unit={lab.unit}
                        referenceRange={lab.referenceRange}
                        status={lab.status}
                      />
                    )}
                    
                    {/* Show message for AUTO-DETECTED values */}
                    {(lab.value === 'AUTO-DETECTED' || lab.value === 'See Report') && (
                      <div className="bg-muted/10 rounded-lg p-3 border border-border/20">
                        <p className="text-sm text-muted-foreground">
                          <strong>Note:</strong> This parameter was detected in your report but requires manual review 
                          to determine the exact value and its clinical significance. Please consult your healthcare provider.
                        </p>
                      </div>
                    )}
                    
                    {/* What It Means */}
                    <div className="bg-blue/5 rounded-lg p-3 border border-blue/20">
                      <h5 className="font-semibold text-foreground mb-2 flex items-center space-x-1">
                        <Info className="w-4 h-4 text-blue" />
                        <span>What This Means</span>
                      </h5>
                      <p className="text-sm text-foreground">{context.whatItMeans}</p>
                    </div>
                    
                    {/* Body Connection */}
                    <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                      <h5 className="font-semibold text-foreground mb-2">How It Relates to Your Body</h5>
                      <p className="text-sm text-foreground">{context.bodyConnection}</p>
                    </div>
                    
                    {/* Possible Causes */}
                    <div className="bg-warning/5 rounded-lg p-3 border border-warning/20">
                      <h5 className="font-semibold text-foreground mb-2 flex items-center space-x-1">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <span>Possible Contributing Factors</span>
                      </h5>
                      <ul className="text-sm text-foreground space-y-1">
                        {context.possibleCauses.map((cause, causeIndex) => (
                          <li key={causeIndex} className="flex items-start space-x-2">
                            <span className="text-warning mt-1.5 text-xs">•</span>
                            <span>{cause}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Disclaimer */}
                    <div className="bg-muted/10 rounded-lg p-3 border border-border/20">
                      <p className="text-xs text-muted-foreground">
                        <strong>Note:</strong> These are possible contributing factors, not definitive causes. 
                        Your healthcare provider can help determine the specific reasons for your results and 
                        appropriate next steps.
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};