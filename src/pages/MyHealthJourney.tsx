import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, TrendingUp, Activity, Award } from 'lucide-react';
import { HealthPlanCalendar } from '@/components/HealthPlanCalendar';
import { HealthScoreTimeline } from '@/components/HealthScoreTimeline';
import { NotificationSettingsPanel } from '@/components/NotificationSettingsPanel';
import { useHealthJourney } from '@/hooks/useHealthJourney';
import { GlobalNav } from '@/components/GlobalNav';
import { generate30DayPlan } from '@/utils/generate30DayPlan';
import type { HealthScoreBreakdown } from '@/utils/healthScoreCalculator';
import type { HealthImprovementPlan } from '@/utils/generate30DayPlan';

export default function MyHealthJourney() {
  const [plan, setPlan] = useState<HealthImprovementPlan | null>(null);
  const [breakdown, setBreakdown] = useState<HealthScoreBreakdown | null>(null);
  const [planStartDate, setPlanStartDate] = useState<string>('');

  useEffect(() => {
    // Load plan from localStorage
    const savedPlan = localStorage.getItem('healthImprovementPlan');
    const savedBreakdown = localStorage.getItem('healthScoreBreakdown');
    const savedStartDate = localStorage.getItem('planStartDate');

    if (savedPlan && savedBreakdown) {
      setPlan(JSON.parse(savedPlan));
      setBreakdown(JSON.parse(savedBreakdown));
      setPlanStartDate(savedStartDate || new Date().toISOString().split('T')[0]);
    } else if (savedBreakdown) {
      // Generate plan if we have breakdown but no plan
      const parsedBreakdown = JSON.parse(savedBreakdown);
      const newPlan = generate30DayPlan(parsedBreakdown);
      const startDate = new Date().toISOString().split('T')[0];
      
      setPlan(newPlan);
      setBreakdown(parsedBreakdown);
      setPlanStartDate(startDate);
      
      localStorage.setItem('healthImprovementPlan', JSON.stringify(newPlan));
      localStorage.setItem('planStartDate', startDate);
    }
  }, []);

  const {
    completions,
    loading,
    toggleActivity,
    addNote,
    getCompletionStats,
  } = useHealthJourney(plan, planStartDate);

  if (!plan || !breakdown) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white/5 via-white to-white/5 dark:from-gray-900 dark:via-background dark:to-gray-900">
        <div className="container mx-auto px-4 py-12">
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-bold mb-2">No Active Health Journey</h2>
            <p className="text-muted-foreground mb-6">
              Complete a health analysis to start your personalized 30-day improvement plan
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Get Started
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const stats = getCompletionStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white/5 via-white to-white/5 dark:from-gray-900 dark:via-background dark:to-gray-900">
      <GlobalNav theme="light" />
      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Health Journey</h1>
          <p className="text-muted-foreground">
            Track your progress and stay on top of your health goals
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Day</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.currentDay} / 30
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Completion</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.completionRate.toFixed(0)}%
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Streak</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.currentStreak} days
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-foreground" />
              <span className="text-sm text-muted-foreground">Score</span>
            </div>
            <div className="text-2xl font-bold">
              {breakdown.overallScore.toFixed(0)}
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">30-Day Calendar</h2>
                  <p className="text-sm text-muted-foreground">
                    {plan.overallGoal}
                  </p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {stats.daysRemaining} days left
                </Badge>
              </div>

              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading calendar...
                </div>
              ) : (
                <HealthPlanCalendar
                  plan={plan}
                  planStartDate={planStartDate}
                  completions={completions}
                  onToggleActivity={toggleActivity}
                  onAddNote={addNote}
                />
              )}
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <HealthScoreTimeline currentScore={breakdown.overallScore} />

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Target Systems</h3>
              <div className="flex flex-wrap gap-2">
                {plan.targetSystems.map((system, idx) => (
                  <Badge key={idx} variant="outline">
                    {system}
                  </Badge>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Tracking Metrics</h3>
              <ul className="space-y-2">
                {plan.trackingMetrics.map((metric, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                    <span className="text-sm">{metric}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <NotificationSettingsPanel planStartDate={planStartDate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}