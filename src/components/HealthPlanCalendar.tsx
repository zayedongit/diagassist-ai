import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Activity, TestTube, Stethoscope, Utensils, Heart } from 'lucide-react';
import type { HealthImprovementPlan } from '@/utils/generate30DayPlan';
import type { ActivityCompletion } from '@/hooks/useHealthJourney';
import { DayDetailsSheet } from './DayDetailsSheet';

interface HealthPlanCalendarProps {
  plan: HealthImprovementPlan;
  planStartDate: string;
  completions: ActivityCompletion[];
  onToggleActivity: (dayNumber: number, activityType: string, activityName: string) => void;
  onAddNote: (dayNumber: number, activityName: string, notes: string) => void;
}

export const HealthPlanCalendar = ({
  plan,
  planStartDate,
  completions,
  onToggleActivity,
  onAddNote,
}: HealthPlanCalendarProps) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const getWeekForDay = (day: number) => {
    return Math.ceil(day / 7);
  };

  const getActivitiesForDay = (day: number) => {
    const activities: Array<{ type: string; name: string; icon: any }> = [];

    // Add daily activities
    plan.dailyActivities?.forEach((activity) => {
      activities.push({
        type: activity.type,
        name: activity.activity,
        icon: Activity,
      });
    });

    // Dietary activities (add one per day)
    if (plan.dietaryPlan?.foodsToAdd?.[0]) {
      activities.push({
        type: 'diet',
        name: `Add: ${plan.dietaryPlan.foodsToAdd[0]}`,
        icon: Utensils,
      });
    }

    return activities;
  };

  const getMilestonesForDay = (day: number) => {
    const milestones: Array<{ type: string; name: string; icon: any }> = [];

    // Check for tests
    plan.testsRequired.forEach((test) => {
      if (test.timing.includes(`Week ${getWeekForDay(day)}`)) {
        milestones.push({
          type: 'test',
          name: test.testName,
          icon: TestTube,
        });
      }
    });

    // Check for specialist referrals
    plan.specialistReferrals.forEach((referral) => {
      if (referral.timeframe.includes(`Week ${getWeekForDay(day)}`)) {
        milestones.push({
          type: 'specialist',
          name: referral.specialty,
          icon: Stethoscope,
        });
      }
    });

    return milestones;
  };

  const getDayCompletionRate = (day: number) => {
    const activities = getActivitiesForDay(day);
    if (activities.length === 0) return 0;

    const completedCount = activities.filter((activity) => {
      const completion = completions.find(
        (c) => c.day_number === day && c.activity_name === activity.name
      );
      return completion?.completed;
    }).length;

    return (completedCount / activities.length) * 100;
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'activity':
        return 'bg-blue-500';
      case 'diet':
        return 'bg-green-500';
      case 'test':
        return 'bg-red-500';
      case 'specialist':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const startDate = new Date(planStartDate);
  const today = new Date();
  const currentDay = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <>
      <div className="grid grid-cols-7 gap-2">
        {/* Week headers */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}

        {/* Days */}
        {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
          const activities = getActivitiesForDay(day);
          const milestones = getMilestonesForDay(day);
          const completionRate = getDayCompletionRate(day);
          const isPast = day < currentDay;
          const isToday = day === currentDay;
          const isFuture = day > currentDay;

          return (
            <Card
              key={day}
              className={cn(
                'relative p-3 cursor-pointer transition-all hover:shadow-md',
                isToday && 'ring-2 ring-primary',
                isPast && 'bg-muted/50',
                isFuture && 'opacity-70'
              )}
              onClick={() => setSelectedDay(day)}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-2">
                <span className={cn('text-sm font-semibold', isToday && 'text-primary')}>
                  {day}
                </span>
                {isToday && (
                  <Badge variant="default" className="text-xs px-1 py-0">
                    Today
                  </Badge>
                )}
              </div>

              {/* Completion ring */}
              {activities.length > 0 && (
                <div className="relative w-8 h-8 mx-auto mb-2">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 14}`}
                      strokeDashoffset={`${2 * Math.PI * 14 * (1 - completionRate / 100)}`}
                      className={cn(
                        'transition-all duration-500',
                        completionRate === 100 ? 'text-green-500' : 'text-primary'
                      )}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {completionRate === 100 ? (
                      <Heart className="w-3 h-3 text-green-500 fill-current" />
                    ) : (
                      <span className="text-xs font-medium">
                        {Math.round(completionRate)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Activity dots */}
              <div className="flex gap-1 flex-wrap justify-center mb-1">
                {activities.slice(0, 3).map((activity, idx) => (
                  <div
                    key={idx}
                    className={cn('w-2 h-2 rounded-full', getActivityColor(activity.type))}
                    title={activity.name}
                  />
                ))}
                {activities.length > 3 && (
                  <div className="w-2 h-2 rounded-full bg-gray-400" title="More activities" />
                )}
              </div>

              {/* Milestone icons */}
              {milestones.length > 0 && (
                <div className="flex gap-1 justify-center">
                  {milestones.slice(0, 2).map((milestone, idx) => {
                    const Icon = milestone.icon;
                    return <Icon key={idx} className="w-3 h-3 text-amber-500" title={milestone.name} />;
                  })}
                </div>
              )}

              {/* Week separator */}
              {day % 7 === 0 && day < 30 && (
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-border" />
              )}
            </Card>
          );
        })}
      </div>

      {/* Week focus labels */}
      <div className="mt-6 space-y-2">
        {plan.weeklyBreakdown.map((week, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <Badge variant="outline">Week {idx + 1}</Badge>
            <span className="text-muted-foreground">{week.focus}</span>
          </div>
        ))}
      </div>

      {/* Day details sheet */}
      {selectedDay && (
        <DayDetailsSheet
          day={selectedDay}
          plan={plan}
          completions={completions}
          onClose={() => setSelectedDay(null)}
          onToggleActivity={onToggleActivity}
          onAddNote={onAddNote}
        />
      )}
    </>
  );
};