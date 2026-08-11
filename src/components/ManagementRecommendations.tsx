import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, Activity, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";

interface ManagementRecommendation {
  category: string;
  recommendation: string;
  frequency?: string;
  reasoning?: string;
}

interface ManagementRecommendationsProps {
  recommendations: ManagementRecommendation[];
}

export const ManagementRecommendations = ({ recommendations }: ManagementRecommendationsProps) => {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('medication')) return Pill;
    if (lower.includes('monitoring') || lower.includes('test')) return Activity;
    if (lower.includes('follow-up') || lower.includes('appointment')) return Calendar;
    if (lower.includes('lifestyle')) return CheckCircle2;
    return AlertCircle;
  };

  const getCategoryColor = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('medication')) return 'text-foreground';
    if (lower.includes('monitoring')) return 'text-purple-600';
    if (lower.includes('follow-up')) return 'text-orange-600';
    if (lower.includes('lifestyle')) return 'text-green-600';
    return 'text-primary';
  };

  return (
    <Card className="border-primary/30 shadow-lg">
      <CardHeader className="bg-primary/5">
        <CardTitle className="flex items-center space-x-2 text-primary">
          <Pill className="w-5 h-5" />
          <span>Detailed Management Plan</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {recommendations.map((rec, index) => {
            const Icon = getCategoryIcon(rec.category);
            const colorClass = getCategoryColor(rec.category);
            
            return (
              <div 
                key={index} 
                className="bg-muted/20 rounded-lg p-4 border-l-4 border-l-primary hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full bg-background ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {rec.category}
                      </Badge>
                      {rec.frequency && (
                        <span className="text-xs text-muted-foreground">
                          {rec.frequency}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      {rec.recommendation}
                    </p>
                    {rec.reasoning && (
                      <p className="text-xs text-muted-foreground italic">
                        💡 {rec.reasoning}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-card dark:bg-blue-950/20 rounded-lg border border-white/10 dark:border-blue-800">
          <p className="text-sm text-foreground flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
            <span>
              <strong>Important:</strong> These recommendations are based on your test results. 
              Always discuss any new medications or significant lifestyle changes with your healthcare provider before implementation.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
