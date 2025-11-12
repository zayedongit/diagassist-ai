import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, TestTube, Stethoscope, Utensils } from 'lucide-react';
import type { HealthImprovementPlan } from '@/utils/generate30DayPlan';
import type { ActivityCompletion } from '@/hooks/useHealthJourney';

interface DayDetailsSheetProps {
  day: number;
  plan: HealthImprovementPlan;
  completions: ActivityCompletion[];
  onClose: () => void;
  onToggleActivity: (dayNumber: number, activityType: string, activityName: string) => void;
  onAddNote: (dayNumber: number, activityName: string, notes: string) => void;
}

export const DayDetailsSheet = ({
  day,
  plan,
  completions,
  onClose,
  onToggleActivity,
  onAddNote,
}: DayDetailsSheetProps) => {
  const [notes, setNotes] = useState<Record<string, string>>({});

  const week = Math.ceil(day / 7);
  const weekData = plan.weeklyBreakdown[week - 1];

  const activities = [
    ...(plan.dailyActivities?.map((a) => ({
      type: a.type,
      name: a.activity,
      icon: Activity,
      details: `${a.frequency} • ${a.duration}`,
    })) || []),
    ...(plan.dietaryPlan?.foodsToAdd?.slice(0, 1).map((item) => ({
      type: 'diet',
      name: `Add: ${item}`,
      icon: Utensils,
      details: 'Daily dietary recommendation',
    })) || []),
  ];

  const milestones = [
    ...plan.testsRequired
      .filter((t) => t.timing.includes(`Week ${week}`))
      .map((t) => ({
        type: 'test',
        name: t.testName,
        icon: TestTube,
        details: `${t.reason} • ${t.urgency}`,
      })),
    ...plan.specialistReferrals
      .filter((r) => r.timeframe.includes(`Week ${week}`))
      .map((r) => ({
        type: 'specialist',
        name: r.specialty,
        icon: Stethoscope,
        details: `${r.reason} • Priority: ${r.priority}`,
      })),
  ];

  const isActivityCompleted = (activityName: string) => {
    const completion = completions.find(
      (c) => c.day_number === day && c.activity_name === activityName
    );
    return completion?.completed || false;
  };

  const getActivityNotes = (activityName: string) => {
    const completion = completions.find(
      (c) => c.day_number === day && c.activity_name === activityName
    );
    return completion?.notes || '';
  };

  const handleSaveNote = (activityName: string) => {
    const note = notes[activityName];
    if (note !== undefined) {
      onAddNote(day, activityName, note);
    }
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Day {day} Activities</SheetTitle>
          <SheetDescription>
            Week {week}: {weekData?.focus}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Daily Activities */}
          {activities.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Daily Activities</h3>
              <div className="space-y-4">
                {activities.map((activity, idx) => {
                  const Icon = activity.icon;
                  const completed = isActivityCompleted(activity.name);
                  const existingNotes = getActivityNotes(activity.name);

                  return (
                    <div key={idx} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={completed}
                          onCheckedChange={() =>
                            onToggleActivity(day, activity.type, activity.name)
                          }
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span className="font-medium">{activity.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.details}
                          </p>
                        </div>
                      </div>

                      <div className="pl-9 space-y-2">
                        <Textarea
                          placeholder="Add notes about this activity..."
                          value={notes[activity.name] ?? existingNotes}
                          onChange={(e) =>
                            setNotes({ ...notes, [activity.name]: e.target.value })
                          }
                          className="min-h-[60px]"
                        />
                        {notes[activity.name] !== undefined && (
                          <Button
                            size="sm"
                            onClick={() => handleSaveNote(activity.name)}
                          >
                            Save Note
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Milestones */}
          {milestones.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Milestones & Appointments</h3>
              <div className="space-y-3">
                {milestones.map((milestone, idx) => {
                  const Icon = milestone.icon;
                  return (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 text-amber-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{milestone.name}</span>
                            <Badge variant="secondary">{milestone.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {milestone.details}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};