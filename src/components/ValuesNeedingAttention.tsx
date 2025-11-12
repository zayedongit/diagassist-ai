import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { EnhancedAnalysisResult, extractAbnormalPanels } from "@/types/medicalAnalysis";

interface ValuesNeedingAttentionProps {
  analysisData: EnhancedAnalysisResult;
}

export const ValuesNeedingAttention = ({ analysisData }: ValuesNeedingAttentionProps) => {
  const abnormalPanels = extractAbnormalPanels(analysisData);
  
  // Collect all abnormal lab values
  const allAbnormalValues = abnormalPanels.flatMap(panel => 
    panel.abnormalLabs || []
  );

  const valueCount = allAbnormalValues.length;

  if (valueCount === 0) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('high')) {
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    } else if (statusLower.includes('low')) {
      return <TrendingDown className="w-4 h-4 text-blue-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-orange-500" />;
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('high')) {
      return 'border-red-200 bg-red-50/50';
    } else if (statusLower.includes('low')) {
      return 'border-blue-200 bg-blue-50/50';
    }
    return 'border-orange-200 bg-orange-50/50';
  };

  return (
    <Card className="border-red-200 bg-gradient-to-br from-red-50/50 to-pink-50/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Badge 
            variant="destructive" 
            className="px-4 py-2 text-base font-poppins font-semibold"
          >
            {valueCount} Value{valueCount !== 1 ? 's' : ''} Need{valueCount === 1 ? 's' : ''} Attention
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allAbnormalValues.map((lab, index) => (
            <div 
              key={index}
              className={`flex items-start justify-between gap-4 p-3 rounded-lg border ${getStatusColor(lab.status)}`}
            >
              <div className="flex items-start gap-3 flex-1">
                {getStatusIcon(lab.status)}
                <div className="space-y-1">
                  <p className="font-inter font-semibold text-navy">{lab.name}</p>
                  <p className="text-sm text-slate">
                    <span className="font-medium">{lab.value} {lab.unit}</span>
                    {lab.referenceRange && (
                      <span className="text-slate/70"> • Normal: {lab.referenceRange}</span>
                    )}
                  </p>
                </div>
              </div>
              <Badge 
                variant={lab.status.toLowerCase().includes('high') ? 'destructive' : 'secondary'}
                className="shrink-0"
              >
                {lab.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
