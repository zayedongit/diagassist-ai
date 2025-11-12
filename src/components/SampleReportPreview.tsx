import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, Calendar, Target, Activity, Utensils, FlaskConical, Stethoscope, CheckCircle2 } from "lucide-react";

export const SampleReportPreview = () => {
  const samplePlan = {
    focusAreas: ["Kidney Function", "Blood Health"],
    overallGoal: "Improve targeted body systems through lifestyle modifications, dietary changes, and medical monitoring over the next 30 days",
    dailyActivities: [
      { activity: "30-minute brisk walk", frequency: "Daily" },
      { activity: "Blood pressure monitoring", frequency: "Twice daily" },
      { activity: "Hydration tracking", frequency: "3 times daily" },
      { activity: "Quality sleep routine", frequency: "7-8 hours nightly" },
      { activity: "Stress reduction practice", frequency: "Daily (meditation/yoga)" }
    ],
    testsRequired: [
      { test: "Serum Creatinine & eGFR", timing: "Week 4", urgency: "High Priority" },
      { test: "Urine Microalbumin", timing: "Week 3", urgency: "High Priority" },
      { test: "Complete Blood Count", timing: "Week 4", urgency: "High Priority" },
      { test: "Iron Studies", timing: "Week 2", urgency: "High Priority" },
      { test: "Electrolytes", timing: "Week 2", urgency: "Routine" },
      { test: "Vitamin B12 & Folate", timing: "Week 3", urgency: "Routine" }
    ],
    specialistReferrals: [
      { specialty: "Nephrologist", priority: "MEDIUM", timeframe: "Within 2 weeks" },
      { specialty: "Hematologist", priority: "MEDIUM", timeframe: "Within 2 weeks" }
    ],
    weeklyBreakdown: [
      {
        week: 1,
        title: "Assessment & Foundation",
        goals: ["Get baseline tests done", "Start daily activity routine", "Begin dietary changes", "Establish monitoring habits"]
      },
      {
        week: 2,
        title: "Implementation & Consistency",
        goals: ["Maintain daily exercise routine", "Full dietary compliance", "Establish sleep schedule", "Monitor key metrics daily"]
      },
      {
        week: 3,
        title: "Optimization & Intensification",
        goals: ["Increase exercise intensity", "Refine dietary choices", "Optimize supplement timing", "Advanced monitoring"]
      },
      {
        week: 4,
        title: "Consolidation & Review",
        goals: ["Comprehensive testing", "Review progress with specialists", "Refine ongoing plan", "Celebrate achievements"]
      }
    ],
    dietaryPlan: {
      add: [
        "Leafy greens (spinach, kale)",
        "Lean proteins (fish, chicken)",
        "Whole grains (brown rice, quinoa)",
        "Fresh fruits and berries",
        "Nuts and seeds"
      ],
      limit: [
        "Processed foods and snacks",
        "High-sodium foods",
        "Refined sugars",
        "Red meat and fatty foods",
        "Alcohol"
      ],
      sampleMeals: [
        "Oatmeal with berries and nuts",
        "Grilled chicken salad with olive oil",
        "Baked salmon with steamed vegetables",
        "Greek yogurt with fruit"
      ]
    },
    trackingMetrics: [
      "Daily blood pressure readings",
      "Daily water intake (8+ glasses)",
      "Exercise duration and intensity",
      "Sleep quality and duration",
      "Medication compliance"
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
            <div className="text-center space-y-2 pb-4 border-b bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-lg p-6">
              <Calendar className="w-12 h-12 mx-auto text-primary mb-2" />
              <h2 className="text-2xl md:text-3xl font-poppins font-bold text-navy">
                30-Day Health Improvement Plan
              </h2>
              <p className="text-sm text-muted-foreground">
                Personalized Action Plan for Better Health
              </p>
            </div>

            {/* Focus Areas */}
            <Card className="border-primary/20 bg-gradient-to-br from-blue-50/50 to-cyan-50/30 animate-fade-in">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-poppins text-navy">
                    Focus Areas
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {samplePlan.focusAreas.map((area, index) => (
                    <Badge key={index} variant="secondary" className="mr-2 px-4 py-2 text-sm">
                      {area}
                    </Badge>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {samplePlan.overallGoal}
                </p>
              </CardContent>
            </Card>

            {/* Daily Activities */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/30 animate-fade-in">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-green-600" />
                  <CardTitle className="text-lg font-poppins text-navy">
                    Daily Activities Overview
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {samplePlan.dailyActivities.map((activity, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-green-100"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-sm">{activity.activity}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {activity.frequency}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tests Required */}
            <Card className="animate-fade-in border-red-200 bg-gradient-to-br from-red-50/30 to-pink-50/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FlaskConical className="w-5 h-5 text-red-600" />
                  Tests Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {samplePlan.testsRequired.slice(0, 4).map((test, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white/70 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{test.test}</p>
                      <p className="text-xs text-muted-foreground">{test.timing}</p>
                    </div>
                    <Badge 
                      variant={test.urgency === "High Priority" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {test.urgency}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Specialist Referrals */}
            <Card className="animate-fade-in border-orange-200 bg-gradient-to-br from-orange-50/30 to-amber-50/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Stethoscope className="w-5 h-5 text-orange-600" />
                  Specialist Referrals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {samplePlan.specialistReferrals.map((referral, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white/70 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{referral.specialty}</p>
                      <p className="text-xs text-muted-foreground">{referral.timeframe}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {referral.priority}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Separator />

            {/* 4-Week Action Plan */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                  4-Week Action Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {samplePlan.weeklyBreakdown.map((week, idx) => (
                    <div key={idx} className="border-l-4 border-primary/30 pl-4 py-2">
                      <h4 className="font-semibold text-sm text-primary mb-2">
                        Week {week.week}: {week.title}
                      </h4>
                      <ul className="space-y-1">
                        {week.goals.map((goal, gIdx) => (
                          <li key={gIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{goal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Dietary Plan */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Utensils className="w-5 h-5 text-green-600" />
                  Dietary Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-green-700 mb-2 text-sm">Foods to Add</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {samplePlan.dietaryPlan.add.map((food, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-green-50/50 p-2 rounded">
                        <span className="text-green-600">•</span>
                        <span>{food}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-red-700 mb-2 text-sm">Foods to Limit</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {samplePlan.dietaryPlan.limit.map((food, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-red-50/50 p-2 rounded">
                        <span className="text-red-600">•</span>
                        <span>{food}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-primary mb-2 text-sm">Sample Meals</h4>
                  <div className="space-y-1">
                    {samplePlan.dietaryPlan.sampleMeals.map((meal, idx) => (
                      <div key={idx} className="text-xs bg-blue-50/50 p-2 rounded">
                        {meal}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress Tracking */}
            <Card className="animate-fade-in border-purple-200 bg-gradient-to-br from-purple-50/30 to-pink-50/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-purple-600" />
                  Progress Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Daily/Weekly Metrics to Monitor:
                </p>
                <div className="space-y-2">
                  {samplePlan.trackingMetrics.map((metric, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-white/70 rounded">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      <span className="text-xs">{metric}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Footer Note */}
            <div className="text-center pt-4 pb-2 border-t">
              <p className="text-xs text-muted-foreground italic">
                This is a sample 30-day improvement plan. Your actual plan will be personalized based on your specific health score results and target body systems requiring attention.
              </p>
              <p className="text-xs text-muted-foreground italic mt-2">
                Disclaimer: This plan is for informational purposes only and does not replace professional medical advice. Always consult your healthcare provider before making significant health changes.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
