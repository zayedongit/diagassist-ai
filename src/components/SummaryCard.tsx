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
      return 'Great news! Your test results show that your body is functioning well. Keep up the healthy habits that are working for you.';
    case 'moderate':
    case 'attention':
      return `Your results show ${abnormalCount} areas that could benefit from some attention. Think of these as opportunities to optimize your health with simple lifestyle adjustments.`;
    case 'concerning':
    case 'critical':
      return `Your results indicate ${abnormalCount} areas that need prompt medical attention. While this may sound concerning, early detection means you can take effective action with your doctor's guidance.`;
    default:
      return 'Your test results have been carefully analyzed to give you insights into your health. The information below will help you understand what these numbers mean for your wellbeing.';
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