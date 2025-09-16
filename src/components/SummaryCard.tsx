import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { EnhancedAnalysisResult, LegacyAnalysisResult } from "@/types/medicalAnalysis";

interface SummaryCardProps {
  summary?: string;
  overallStatus?: string;
  abnormalCount?: number;
  normalCount?: number;
  analysisData?: EnhancedAnalysisResult | LegacyAnalysisResult;
}

const getStatusIcon = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'good':
    case 'normal':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'moderate':
    case 'attention':
      return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    case 'concerning':
    case 'critical':
      return <XCircle className="w-5 h-5 text-red-600" />;
    default:
      return <Heart className="w-5 h-5 text-blue-600" />;
  }
};

const getStatusMessage = (status: string, abnormalCount: number = 0) => {
  switch (status?.toLowerCase()) {
    case 'good':
    case 'normal':
      return 'Your test results look good overall. Continue maintaining your healthy lifestyle.';
    case 'moderate':
    case 'attention':
      return `Some of your test results need attention (${abnormalCount} abnormal values). Follow the recommendations below.`;
    case 'concerning':
    case 'critical':
      return `Several test results require immediate attention (${abnormalCount} abnormal values). Please consult your doctor promptly.`;
    default:
      return 'Your test results have been analyzed. Please review the detailed findings below.';
  }
};

export const SummaryCard = ({ summary, overallStatus, abnormalCount = 0, normalCount = 0, analysisData }: SummaryCardProps) => {
  const statusIcon = getStatusIcon(overallStatus || 'review');
  const statusMessage = getStatusMessage(overallStatus || 'review', abnormalCount);
  
  return (
    <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3">
          {statusIcon}
          <div>
            <h2 className="text-lg font-semibold" style={{color: 'hsl(220, 74%, 42%)'}}>Summary in Simple Terms</h2>
            <p className="text-sm font-normal" style={{color: 'hsl(220, 74%, 42%)'}}>Easy-to-understand overview of your results</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats - Hide normal values, only show abnormal */}
        {abnormalCount > 0 && (
          <div className="flex flex-wrap gap-3 justify-center">
            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
              {abnormalCount} Values Need Attention
            </Badge>
          </div>
        )}
        
        {/* Summary Text */}
        <div className="bg-white/60 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm leading-relaxed" style={{color: 'hsl(220, 74%, 42%)'}}>
            {summary || statusMessage}
          </p>
        </div>
        
        {/* Key Message */}
        <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
          <p className="text-xs" style={{color: 'hsl(220, 74%, 42%)'}}>
            <strong>Remember:</strong> This summary provides a general overview. 
            Always discuss your results with your healthcare provider for personalized medical advice.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};