import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { HealthImprovementPlan } from '@/utils/generate30DayPlan';

export interface ActivityCompletion {
  id: string;
  day_number: number;
  activity_type: string;
  activity_name: string;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
}

export const useHealthJourney = (plan: HealthImprovementPlan | null, planStartDate: string) => {
  const [completions, setCompletions] = useState<ActivityCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (plan && planStartDate) {
      fetchCompletions();
    }
  }, [plan, planStartDate]);

  const fetchCompletions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('activity_completions')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_start_date', planStartDate)
        .order('day_number', { ascending: true });

      if (error) throw error;
      setCompletions(data || []);
    } catch (error) {
      console.error('Error fetching completions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActivity = async (
    dayNumber: number,
    activityType: string,
    activityName: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const existing = completions.find(
        (c) =>
          c.day_number === dayNumber &&
          c.activity_name === activityName
      );

      if (existing) {
        // Toggle completion
        const newCompleted = !existing.completed;
        const { error } = await supabase
          .from('activity_completions')
          .update({
            completed: newCompleted,
            completed_at: newCompleted ? new Date().toISOString() : null,
          })
          .eq('id', existing.id);

        if (error) throw error;

        setCompletions((prev) =>
          prev.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  completed: newCompleted,
                  completed_at: newCompleted ? new Date().toISOString() : null,
                }
              : c
          )
        );

        if (newCompleted) {
          toast.success('Activity completed! 🎉');
        }
      } else {
        // Create new completion
        const { data, error } = await supabase
          .from('activity_completions')
          .insert({
            user_id: user.id,
            plan_start_date: planStartDate,
            day_number: dayNumber,
            activity_type: activityType,
            activity_name: activityName,
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setCompletions((prev) => [...prev, data]);
          toast.success('Activity completed! 🎉');
        }
      }
    } catch (error) {
      console.error('Error toggling activity:', error);
      toast.error('Failed to update activity');
    }
  };

  const addNote = async (dayNumber: number, activityName: string, notes: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const existing = completions.find(
        (c) => c.day_number === dayNumber && c.activity_name === activityName
      );

      if (existing) {
        const { error } = await supabase
          .from('activity_completions')
          .update({ notes })
          .eq('id', existing.id);

        if (error) throw error;

        setCompletions((prev) =>
          prev.map((c) => (c.id === existing.id ? { ...c, notes } : c))
        );
      }

      toast.success('Note saved');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to save note');
    }
  };

  const getCompletionStats = () => {
    const totalActivities = completions.length;
    const completedActivities = completions.filter((c) => c.completed).length;
    const completionRate =
      totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

    // Calculate current day
    const startDate = new Date(planStartDate);
    const today = new Date();
    const daysPassed = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentDay = Math.min(Math.max(daysPassed + 1, 1), 30);

    // Calculate streak
    let currentStreak = 0;
    for (let day = currentDay; day >= 1; day--) {
      const dayActivities = completions.filter((c) => c.day_number === day);
      if (dayActivities.length === 0) break;
      const dayCompleted = dayActivities.every((c) => c.completed);
      if (!dayCompleted) break;
      currentStreak++;
    }

    return {
      totalActivities,
      completedActivities,
      completionRate,
      currentDay,
      currentStreak,
      daysRemaining: Math.max(30 - currentDay + 1, 0),
    };
  };

  return {
    completions,
    loading,
    toggleActivity,
    addNote,
    getCompletionStats,
    refreshCompletions: fetchCompletions,
  };
};