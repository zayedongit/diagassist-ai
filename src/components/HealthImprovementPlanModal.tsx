import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Calendar, FileText, Utensils, Activity, AlertCircle, Stethoscope } from 'lucide-react';
import { HealthImprovementPlan } from '@/utils/generate30DayPlan';
import { generate30DayPlanPdf } from '@/utils/generate30DayPlanPdf';

interface HealthImprovementPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: HealthImprovementPlan;
  patientName?: string;
}

const getSystemLabel = (systemName: string): string => {
  const labels: Record<string, string> = {
    metabolic: 'Metabolic Health',
    cardiovascular: 'Cardiovascular Health',
    kidney: 'Kidney Function',
    liver: 'Liver Function',
    hematologic: 'Blood Health',
    endocrine: 'Endocrine Health'
  };
  return labels[systemName] || systemName;
};

const getUrgencyColor = (urgency: string) => {
  if (urgency === 'urgent') return 'destructive';
  if (urgency === 'important') return 'default';
  return 'secondary';
};

const getPriorityColor = (priority: string) => {
  if (priority === 'high') return 'destructive';
  if (priority === 'medium') return 'default';
  return 'secondary';
};

export const HealthImprovementPlanModal = ({ 
  isOpen, 
  onClose, 
  plan, 
  patientName 
}: HealthImprovementPlanModalProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    await generate30DayPlanPdf(plan, patientName);
    setIsDownloading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-poppins flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            30-Day Health Improvement Plan
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Personalized action plan based on your health score analysis
          </p>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Plan</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="diet">Diet</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Focus Areas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {plan.targetSystems.map(system => (
                      <Badge key={system} variant="default">
                        {getSystemLabel(system)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Your Health Goal</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {plan.overallGoal}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Key Activities</h3>
                  <ul className="space-y-2">
                    {plan.dailyActivities.slice(0, 5).map((activity, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-0.5">▶</span>
                        <div>
                          <p className="font-medium">{activity.activity}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.frequency} • {activity.duration}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly Plan Tab */}
          <TabsContent value="weekly" className="space-y-4">
            {plan.weeklyBreakdown.map((week) => (
              <Card key={week.week}>
                <CardContent className="pt-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">Week {week.week}</h3>
                      <Badge variant="outline">{week.focus}</Badge>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-2">Goals:</p>
                      <ul className="text-sm space-y-1">
                        {week.goals.map((goal, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span>{goal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Daily Schedule:</p>
                      <div className="space-y-2">
                        {week.activities.map((day, idx) => (
                          <div key={idx} className="text-xs bg-muted/50 p-2 rounded">
                            <p className="font-semibold text-sm mb-1">{day.day}</p>
                            <p><span className="font-medium">Morning:</span> {day.morning}</p>
                            <p><span className="font-medium">Afternoon:</span> {day.afternoon}</p>
                            <p><span className="font-medium">Evening:</span> {day.evening}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Tests & Referrals Tab */}
          <TabsContent value="tests" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Tests Required
                  </h3>
                  <div className="space-y-3">
                    {plan.testsRequired.map((test, idx) => (
                      <div key={idx} className="border-l-4 border-primary pl-3 py-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{test.testName}</p>
                            <p className="text-xs text-muted-foreground mt-1">{test.reason}</p>
                            <p className="text-xs text-slate font-medium mt-1">
                              Timing: {test.timing}
                            </p>
                          </div>
                          <Badge variant={getUrgencyColor(test.urgency)} className="text-xs">
                            {test.urgency}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {plan.specialistReferrals.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-blue-600" />
                      Specialist Referrals
                    </h3>
                    <div className="space-y-3">
                      {plan.specialistReferrals.map((referral, idx) => (
                        <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-semibold text-sm">{referral.specialty}</p>
                            <Badge variant={getPriorityColor(referral.priority)} className="text-xs">
                              {referral.priority} priority
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{referral.reason}</p>
                          <p className="text-xs font-medium text-blue-700">
                            Timeframe: {referral.timeframe}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dietary Plan Tab */}
          <TabsContent value="diet" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-green-600" />
                    Foods to Add
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {plan.dietaryPlan.foodsToAdd.map((food, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-green-600">+</span>
                        <span>{food}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3 text-red-600">Foods to Limit</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {plan.dietaryPlan.foodsToLimit.map((food, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-red-600">−</span>
                        <span>{food}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3">Sample Meal Plan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium text-sm mb-2">Breakfast Options:</p>
                      <ul className="text-xs space-y-1">
                        {plan.dietaryPlan.weeklyMealPlan.breakfast.slice(0, 4).map((meal, idx) => (
                          <li key={idx}>• {meal}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-2">Lunch Options:</p>
                      <ul className="text-xs space-y-1">
                        {plan.dietaryPlan.weeklyMealPlan.lunch.slice(0, 4).map((meal, idx) => (
                          <li key={idx}>• {meal}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-2">Dinner Options:</p>
                      <ul className="text-xs space-y-1">
                        {plan.dietaryPlan.weeklyMealPlan.dinner.slice(0, 4).map((meal, idx) => (
                          <li key={idx}>• {meal}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-2">Snack Options:</p>
                      <ul className="text-xs space-y-1">
                        {plan.dietaryPlan.weeklyMealPlan.snacks.map((snack, idx) => (
                          <li key={idx}>• {snack}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="font-medium text-sm mb-1">Hydration Goals</p>
                  <p className="text-xs text-muted-foreground">{plan.dietaryPlan.hydrationGoals}</p>
                </div>

                {plan.dietaryPlan.supplementsIfNeeded.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="font-medium text-sm mb-2">Recommended Supplements</p>
                    <ul className="text-xs space-y-1">
                      {plan.dietaryPlan.supplementsIfNeeded.map((supplement, idx) => (
                        <li key={idx}>• {supplement}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Daily Activities
                </h3>
                <div className="space-y-3">
                  {plan.dailyActivities.map((activity, idx) => (
                    <div key={idx} className="border-l-4 border-primary pl-3 py-2">
                      <p className="font-medium text-sm">{activity.activity}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {activity.type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {activity.frequency}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {activity.duration}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Benefits: {activity.benefitsSystem.map(s => getSystemLabel(s)).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold text-lg mb-3">Tracking Metrics</h3>
                  <ul className="space-y-2">
                    {plan.trackingMetrics.map((metric, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <input type="checkbox" className="mt-0.5" />
                        <span>{metric}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Close Preview
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isDownloading}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Generating PDF...' : 'Download PDF Plan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
