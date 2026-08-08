import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { LabRangeBar } from "@/components/LabRangeBar";
import { EnhancedAnalysisResult, LegacyAnalysisResult } from "@/types/medicalAnalysis";
import { getParameterContext } from "@/utils/parameterContextDatabase";

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


  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'high':
      case 'critical':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'low':
        return <TrendingDown className="w-4 h-4 text-white/70" />;
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
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-white/5">
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
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-white/5">
      <CardHeader className="p-3 sm:p-4 lg:p-6">
        <CardTitle className="flex items-center gap-2 text-persian-blue text-base sm:text-lg lg:text-xl">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
          Understanding Your Numbers
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Detailed explanations of your abnormal test results
        </p>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6 pt-0">
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
                <div className="mt-2 p-3 sm:p-4 bg-white/40 rounded-lg border border-primary/10 space-y-3 sm:space-y-4">
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
                  <h5 className="font-medium text-white mb-1.5 sm:mb-2 text-sm sm:text-base">What It Means</h5>
                  <p className="text-xs sm:text-sm text-white/90 bg-white/5 p-2.5 sm:p-3 rounded border border-white/10 leading-relaxed">
                    {context.whatItMeans}
                  </p>
                </div>
                
                {/* Body Connection */}
                <div>
                  <h5 className="font-medium text-white mb-1.5 sm:mb-2 text-sm sm:text-base">Body Connection</h5>
                  <p className="text-xs sm:text-sm text-white/90 bg-green-50 p-2.5 sm:p-3 rounded border border-green-200 leading-relaxed">
                    {context.bodyConnection}
                  </p>
                </div>
                
                {/* Possible Contributing Factors */}
                <div>
                    <h5 className="font-medium text-white mb-2">Possible Contributing Factors</h5>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                      <ul className="space-y-1">
                        {context.possibleCauses.map((cause, causeIndex) => (
                          <li key={causeIndex} className="text-sm text-white/90 flex items-start gap-2">
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
          <p className="text-xs text-white/80">
            <strong>Note:</strong> These explanations are for educational purposes. 
            Always discuss your results with your healthcare provider for proper interpretation and treatment recommendations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};