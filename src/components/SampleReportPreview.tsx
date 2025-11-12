import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { FileText, TrendingUp, TrendingDown, AlertTriangle, Activity, Heart, Droplet, Brain } from "lucide-react";

export const SampleReportPreview = () => {
  const sampleData = {
    abnormalPanels: [
      "Lipid Profile",
      "Blood Sugar & HbA1c", 
      "Kidney Function",
      "Thyroid Function"
    ],
    abnormalValues: [
      { name: "HbA1c", value: "6.41", unit: "%", status: "HIGH", range: "4.0-5.6", icon: TrendingUp },
      { name: "Fasting Glucose", value: "107.67", unit: "mg/dl", status: "HIGH", range: "70-100", icon: TrendingUp },
      { name: "Triglycerides", value: "339.73", unit: "mg/dl", status: "HIGH", range: "<150", icon: TrendingUp },
      { name: "Platelet Count", value: "135", unit: "10^3/uL", status: "LOW", range: "150-400", icon: TrendingDown },
      { name: "Total Cholesterol", value: "212.8", unit: "mg/dl", status: "HIGH", range: "<200", icon: TrendingUp },
      { name: "VLDL Cholesterol", value: "67.95", unit: "mg/dl", status: "HIGH", range: "<30", icon: TrendingUp },
      { name: "TSH", value: "6.15", unit: "μIU/mL", status: "HIGH", range: "0.4-4.0", icon: TrendingUp }
    ],
    metabolicCriteria: [
      { name: "Triglycerides", status: "Criterion Exceeded", met: true },
      { name: "HDL Cholesterol", status: "Within Normal Range", met: false },
      { name: "Blood Pressure", status: "Within Normal Range", met: false },
      { name: "Fasting Glucose", status: "Criterion Exceeded", met: true }
    ],
    clinicalHighlights: [
      { title: "Prediabetes", description: "HbA1c 6.41% indicates increased risk for type 2 diabetes", icon: Droplet },
      { title: "Dyslipidemia", description: "Elevated triglycerides and cholesterol levels", icon: Heart },
      { title: "Subclinical Hypothyroidism", description: "Elevated TSH levels requiring monitoring", icon: Activity },
      { title: "Cardiovascular Risk", description: "Multiple risk factors present", icon: Heart }
    ],
    immediateActions: [
      "Schedule follow-up with endocrinologist for diabetes management",
      "Consult dietitian for dietary modifications to lower triglycerides",
      "Thyroid function monitoring and potential treatment evaluation",
      "Cardiovascular risk assessment and management plan"
    ],
    dietaryChanges: {
      add: [
        "Fiber-rich foods (fruits, vegetables, whole grains)",
        "Lean proteins (fish, chicken, legumes)",
        "Omega-3 rich foods (salmon, walnuts)",
        "Low-glycemic index foods"
      ],
      limit: [
        "Sugary foods and beverages",
        "High-fat foods and fried items",
        "Processed foods and refined carbohydrates",
        "Excessive alcohol consumption"
      ]
    },
    lifestyle: [
      "Regular physical activity - 150 minutes/week of moderate exercise",
      "Maintain healthy weight (BMI 18.5-24.9)",
      "Stress management techniques (meditation, yoga)",
      "Adequate sleep (7-9 hours per night)",
      "Regular health monitoring and check-ups"
    ],
    followUp: [
      "Repeat HbA1c and lipid panel in 3 months",
      "Thyroid function tests in 6-8 weeks",
      "Blood pressure monitoring if elevated"
    ]
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 hover:border-primary hover:text-primary transition-colors"
        >
          <FileText className="w-4 h-4" />
          View Sample Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] md:max-w-[80vw] lg:max-w-[1000px] h-[85vh] p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2 pb-4 border-b">
              <h2 className="text-2xl md:text-3xl font-poppins font-bold text-navy">
                Sample Report Preview
              </h2>
              <p className="text-sm text-muted-foreground">
                See the comprehensive analysis you'll receive
              </p>
            </div>

            {/* Abnormal Panels Summary */}
            <Card className="border-orange-200 bg-gradient-to-br from-orange-50/50 to-orange-100/30 animate-fade-in">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center animate-scale-in">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <CardTitle className="text-xl font-poppins text-navy">
                    I found abnormalities in {sampleData.abnormalPanels.length} panels
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 stagger-fade-in">
                  {sampleData.abnormalPanels.map((panel, index) => (
                    <li key={index} className="flex items-start gap-3 text-slate">
                      <span className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></span>
                      <span className="font-inter text-base">{panel}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Values Needing Attention */}
            <Card className="border-red-200 bg-gradient-to-br from-red-50/50 to-pink-50/50 animate-fade-in">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge variant="destructive" className="text-base px-4 py-2">
                    {sampleData.abnormalValues.length} Values Need Attention
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 stagger-fade-in">
                  {sampleData.abnormalValues.map((value, idx) => {
                    const Icon = value.icon;
                    const isHigh = value.status === "HIGH";
                    return (
                      <div 
                        key={idx} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/70 p-3 rounded-lg border border-slate/10"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isHigh ? 'text-red-500' : 'text-blue-500'}`} />
                          <span className="font-semibold text-navy">{value.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-slate">
                            <span className="font-semibold">{value.value}</span> {value.unit}
                          </span>
                          <Badge 
                            variant={isHigh ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {value.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Normal: {value.range}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Health Risk Assessment */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Heart className="w-5 h-5 text-red-500" />
                  Metabolic Syndrome Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {sampleData.metabolicCriteria.map((criterion, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="font-medium text-sm">{criterion.name}</span>
                      <Badge 
                        variant={criterion.met ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {criterion.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Risk Score</span>
                    <span className="text-sm text-muted-foreground">2 of 5 criteria met</span>
                  </div>
                  <Progress value={40} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Clinical Highlights */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Brain className="w-5 h-5 text-primary" />
                  Clinical Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {sampleData.clinicalHighlights.map((highlight, idx) => {
                    const Icon = highlight.icon;
                    return (
                      <div key={idx} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                        <Icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-sm mb-1">{highlight.title}</h4>
                          <p className="text-xs text-muted-foreground">{highlight.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Immediate Actions */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg">Immediate Action Items</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {sampleData.immediateActions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-semibold">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate pt-0.5">{action}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Dietary Changes */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg">Dietary Changes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">+</span> Foods to Add
                  </h4>
                  <ul className="space-y-1.5">
                    {sampleData.dietaryChanges.add.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-1">•</span>
                        <span className="text-slate">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">−</span> Foods to Limit
                  </h4>
                  <ul className="space-y-1.5">
                    {sampleData.dietaryChanges.limit.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-red-500 mt-1">•</span>
                        <span className="text-slate">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Lifestyle Modifications */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg">Lifestyle Modifications</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {sampleData.lifestyle.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-primary text-lg mt-0.5">▶</span>
                      <span className="text-sm text-slate">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Follow-up Guidance */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg">Follow-up Guidance</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {sampleData.followUp.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate pt-0.5">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Footer Note */}
            <div className="text-center pt-4 pb-2">
              <p className="text-xs text-muted-foreground italic">
                This is a sample report demonstrating the comprehensive analysis you'll receive. Your actual report will be personalized based on your specific lab results.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
