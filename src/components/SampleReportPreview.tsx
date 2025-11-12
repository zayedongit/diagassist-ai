import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, TrendingDown } from "lucide-react";

export const SampleReportPreview = () => {
  const sampleData = {
    patientName: "████████████", // Masked
    age: "38y",
    gender: "Female",
    testDate: "N/A",
    abnormalValues: [
      { name: "HbA1c", value: "6.41%", status: "HIGH", icon: TrendingUp },
      { name: "Fasting Glucose", value: "107.67 mg/dl", status: "HIGH", icon: TrendingUp },
      { name: "Triglycerides", value: "339.73 mg/dl", status: "HIGH", icon: TrendingUp },
      { name: "Platelet Count", value: "135 10^3/uL", status: "LOW", icon: TrendingDown },
      { name: "Total Cholesterol", value: "212.8 mg/dl", status: "HIGH", icon: TrendingUp },
      { name: "VLDL Cholesterol", value: "67.95 mg/dl", status: "HIGH", icon: TrendingUp },
      { name: "TSH", value: "6.15 μIU/mL", status: "HIGH", icon: TrendingUp }
    ],
    immediateActions: [
      "Schedule follow-up with endocrinologist for diabetes management",
      "Consult dietitian for dietary modifications",
      "Further evaluation for hypothyroidism and proteinuria"
    ],
    dietaryChanges: {
      add: ["Fiber-rich foods (fruits, vegetables, whole grains)", "Lean proteins"],
      limit: ["Sugary foods and beverages", "High-fat foods"]
    },
    lifestyle: [
      "Regular physical activity - 150 minutes/week",
      "Maintain healthy weight"
    ]
  };

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 hover:border-primary hover:text-primary transition-colors"
        >
          <FileText className="w-4 h-4" />
          View Sample Report
        </Button>
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-[400px] max-h-[600px] overflow-y-auto backdrop-blur-xl bg-white/95 shadow-2xl"
        side="bottom"
        align="center"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="border-b border-slate/20 pb-3">
            <h4 className="font-poppins font-semibold text-lg text-navy mb-2">Sample Report Preview</h4>
            <div className="flex items-center gap-3 text-sm text-slate">
              <span className="font-mono bg-slate/10 px-2 py-1 rounded">{sampleData.patientName}</span>
              <span>{sampleData.age}</span>
              <span>{sampleData.gender}</span>
            </div>
          </div>

          {/* Abnormal Values */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="destructive" className="text-xs">
                {sampleData.abnormalValues.length} Values Need Attention
              </Badge>
            </div>
            <div className="space-y-2">
              {sampleData.abnormalValues.slice(0, 5).map((value, idx) => {
                const Icon = value.icon;
                return (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between text-xs bg-slate/5 p-2 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3 h-3 text-red-500" />
                      <span className="font-medium text-navy">{value.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate">{value.value}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {value.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {sampleData.abnormalValues.length > 5 && (
                <p className="text-xs text-slate/70 text-center pt-1">
                  +{sampleData.abnormalValues.length - 5} more values
                </p>
              )}
            </div>
          </div>

          {/* Action Items */}
          <div>
            <h5 className="font-inter font-semibold text-sm text-navy mb-2">Immediate Actions</h5>
            <ul className="space-y-1.5 text-xs text-slate">
              {sampleData.immediateActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">{idx + 1}.</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dietary Changes */}
          <div>
            <h5 className="font-inter font-semibold text-sm text-navy mb-2">Dietary Changes</h5>
            <div className="space-y-2 text-xs">
              <div>
                <p className="font-medium text-green-700 mb-1">Add:</p>
                <ul className="space-y-1">
                  {sampleData.dietaryChanges.add.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate">
                      <span className="text-green-500">+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-red-700 mb-1">Limit:</p>
                <ul className="space-y-1">
                  {sampleData.dietaryChanges.limit.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate">
                      <span className="text-red-500">-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Lifestyle */}
          <div>
            <h5 className="font-inter font-semibold text-sm text-navy mb-2">Lifestyle</h5>
            <ul className="space-y-1.5 text-xs text-slate">
              {sampleData.lifestyle.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate/20">
            <p className="text-xs text-slate/70 italic">
              * Patient name masked for privacy. This is a sample report showing typical output format.
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
