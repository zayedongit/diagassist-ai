import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { EnhancedAnalysisResult, extractAbnormalPanels } from "@/types/medicalAnalysis";

interface AbnormalPanelsSummaryProps {
  analysisData: EnhancedAnalysisResult;
}

export const AbnormalPanelsSummary = ({ analysisData }: AbnormalPanelsSummaryProps) => {
  const abnormalPanels = extractAbnormalPanels(analysisData);
  const panelCount = abnormalPanels.length;

  if (panelCount === 0) {
    return null;
  }

  return (
    <Card id="abnormal-panels-section" className="border-orange-200 bg-gradient-to-br from-orange-50/50 to-orange-100/30 animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center animate-scale-in">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <CardTitle className="text-xl font-poppins text-navy">
            I found abnormalities in {panelCount} panel{panelCount !== 1 ? 's' : ''}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 stagger-fade-in">
          {abnormalPanels.map((panel, index) => (
            <li key={index} className="flex items-start gap-3 text-slate">
              <span className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></span>
              <span className="font-inter text-base">{panel.name}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
