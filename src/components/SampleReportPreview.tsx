import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Calendar, Target, Activity, Utensils, FlaskConical, Stethoscope, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from "date-fns";

export const SampleReportPreview = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const startDate = startOfMonth(new Date());
  const endDate = endOfMonth(addDays(startDate, 30));
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

  // Generate 30-day schedule with activities
  const generateDailySchedule = () => {
    const schedule: Record<string, Array<{ type: string; activity: string; icon: any; color: string }>> = {};
    
    for (let day = 1; day <= 30; day++) {
      const date = addDays(startDate, day - 1);
      const dateKey = format(date, 'yyyy-MM-dd');
      const weekNum = Math.ceil(day / 7);
      
      schedule[dateKey] = [
        { type: "exercise", activity: "30-min walk", icon: Activity, color: "text-white/80" },
        { type: "monitoring", activity: "BP check (2x)", icon: CheckCircle2, color: "text-white/80" },
        { type: "diet", activity: "Healthy meals", icon: Utensils, color: "text-orange-600" }
      ];

      // Add week-specific activities
      if (weekNum === 1 && day === 2) {
        schedule[dateKey].push({ type: "test", activity: "Baseline blood tests", icon: FlaskConical, color: "text-red-600" });
      }
      if (weekNum === 1 && day === 4) {
        schedule[dateKey].push({ type: "appointment", activity: "Doctor review", icon: Stethoscope, color: "text-purple-600" });
      }
      if (weekNum === 2 && day === 12) {
        schedule[dateKey].push({ type: "test", activity: "Iron Studies & Electrolytes", icon: FlaskConical, color: "text-red-600" });
      }
      if (weekNum === 2 && day === 10) {
        schedule[dateKey].push({ type: "appointment", activity: "Specialist appointment", icon: Stethoscope, color: "text-purple-600" });
      }
      if (weekNum === 3 && day === 19) {
        schedule[dateKey].push({ type: "test", activity: "Urine Microalbumin", icon: FlaskConical, color: "text-red-600" });
      }
      if (weekNum === 3 && day === 21) {
        schedule[dateKey].push({ type: "test", activity: "B12 & Folate", icon: FlaskConical, color: "text-red-600" });
      }
      if (weekNum === 4 && day === 28) {
        schedule[dateKey].push({ type: "test", activity: "Comprehensive testing", icon: FlaskConical, color: "text-red-600" });
      }
      if (weekNum === 4 && day === 30) {
        schedule[dateKey].push({ type: "appointment", activity: "Progress review", icon: Stethoscope, color: "text-purple-600" });
      }
    }
    
    return schedule;
  };

  const dailySchedule = generateDailySchedule();

  // Get activities for selected date
  const getActivitiesForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return dailySchedule[dateKey] || [];
  };

  // Generate calendar days for display (including padding)
  const calendarDays = () => {
    const start = startOfWeek(startDate);
    const end = endOfWeek(addDays(startDate, 29));
    return eachDayOfInterval({ start, end });
  };

  const isInPlan = (date: Date) => {
    const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff >= 0 && daysDiff < 30;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,255,255,0.14)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,255,255,0.10)';
          }}
          className="group relative px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-full font-poppins font-semibold text-sm sm:text-base text-white transition-all duration-400 hover:scale-105 active:scale-95 overflow-hidden backdrop-blur-lg"
          style={{ 
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(255,255,255,0.10)'
          }}
        >
          <span className="flex items-center justify-center gap-2 relative z-10">
            <FileText className="w-4 h-4" />
            View Sample Report
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] md:max-w-[80vw] lg:max-w-[1000px] h-[85vh] p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2 pb-4 border-b bg-gradient-to-r from-white/5 to-white/5 rounded-t-lg p-6">
              <Calendar className="w-12 h-12 mx-auto text-primary mb-2" />
              <h2 className="text-2xl md:text-3xl font-poppins font-bold text-navy">
                30-Day Health Improvement Plan
              </h2>
              <p className="text-sm text-muted-foreground">
                Personalized Action Plan for Better Health
              </p>
            </div>

            {/* Focus Areas */}
            <Card className="border-primary/20 bg-gradient-to-br from-white/5 to-white/5 animate-fade-in">
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
            <Card className="border-white/10 bg-gradient-to-br from-green-50/50 to-emerald-50/30 animate-fade-in">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-white/80" />
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
                        <CheckCircle2 className="w-4 h-4 text-white/80" />
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

            {/* Interactive 30-Day Calendar */}
            <Card className="animate-fade-in border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                  Interactive 30-Day Schedule
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Click on any day to see scheduled activities
                </p>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="space-y-4">
                  {/* Weekday Headers */}
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-xs font-semibold text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays().map((date, idx) => {
                      const dateKey = format(date, 'yyyy-MM-dd');
                      const activities = dailySchedule[dateKey] || [];
                      const inPlan = isInPlan(date);
                      const isSelected = selectedDate && isSameDay(date, selectedDate);
                      
                      return (
                        <Popover key={idx}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`h-16 p-1 flex flex-col items-center justify-start relative ${
                                !inPlan ? 'opacity-30 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'
                              } ${isSelected ? 'border-primary bg-primary/10' : ''}`}
                              disabled={!inPlan}
                              onClick={() => setSelectedDate(date)}
                            >
                              <span className={`text-xs font-semibold ${inPlan ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {format(date, 'd')}
                              </span>
                              {inPlan && activities.length > 0 && (
                                <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                                  {activities.slice(0, 4).map((activity, aIdx) => (
                                    <div
                                      key={aIdx}
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        activity.type === 'test' ? 'bg-red-500' :
                                        activity.type === 'appointment' ? 'bg-purple-500' :
                                        activity.type === 'exercise' ? 'bg-green-500' :
                                        activity.type === 'diet' ? 'bg-orange-500' :
                                        'bg-blue-500'
                                      }`}
                                    />
                                  ))}
                                </div>
                              )}
                            </Button>
                          </PopoverTrigger>
                          {inPlan && (
                            <PopoverContent className="w-80 pointer-events-auto" align="start">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    {format(date, 'EEEE, MMM d')}
                                  </h4>
                                  <Badge variant="secondary" className="text-xs">
                                    Day {Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1}
                                  </Badge>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                  {activities.map((activity, aIdx) => {
                                    const Icon = activity.icon;
                                    return (
                                      <div key={aIdx} className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                                        <Icon className={`w-4 h-4 ${activity.color} flex-shrink-0 mt-0.5`} />
                                        <div className="flex-1">
                                          <p className="text-xs font-medium">{activity.activity}</p>
                                          <p className="text-xs text-muted-foreground capitalize">{activity.type}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </PopoverContent>
                          )}
                        </Popover>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="pt-4 border-t">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Activity Types:</p>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-muted-foreground">Exercise</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-xs text-muted-foreground">Monitoring</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-xs text-muted-foreground">Diet</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs text-muted-foreground">Tests</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-xs text-muted-foreground">Appointments</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />
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
                  <Utensils className="w-5 h-5 text-white/80" />
                  Dietary Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-green-700 mb-2 text-sm">Foods to Add</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {samplePlan.dietaryPlan.add.map((food, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-green-50/50 p-2 rounded">
                        <span className="text-white/80">•</span>
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
