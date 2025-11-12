-- Create health plan notifications table
CREATE TABLE public.health_plan_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_start_date date NOT NULL,
  notifications_enabled boolean DEFAULT true,
  morning_time time DEFAULT '08:00:00',
  afternoon_time time DEFAULT '14:00:00',
  evening_time time DEFAULT '19:00:00',
  timezone text DEFAULT 'UTC',
  push_subscription jsonb,
  activity_reminders boolean DEFAULT true,
  test_reminders boolean DEFAULT true,
  milestone_celebrations boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, plan_start_date)
);

-- Create activity completions table
CREATE TABLE public.activity_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_start_date date NOT NULL,
  day_number integer NOT NULL CHECK (day_number >= 1 AND day_number <= 30),
  activity_type text NOT NULL,
  activity_name text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, plan_start_date, day_number, activity_name)
);

-- Create health score history table
CREATE TABLE public.health_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id text,
  overall_score numeric(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  metabolic_score numeric(5,2),
  cardiovascular_score numeric(5,2),
  kidney_score numeric(5,2),
  liver_score numeric(5,2),
  hematologic_score numeric(5,2),
  endocrine_score numeric(5,2),
  notes text,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_plan_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_score_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_plan_notifications
CREATE POLICY "Users can view their own notification settings"
  ON public.health_plan_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification settings"
  ON public.health_plan_notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification settings"
  ON public.health_plan_notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notification settings"
  ON public.health_plan_notifications FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for activity_completions
CREATE POLICY "Users can view their own activity completions"
  ON public.activity_completions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own activity completions"
  ON public.activity_completions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own activity completions"
  ON public.activity_completions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own activity completions"
  ON public.activity_completions FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for health_score_history
CREATE POLICY "Users can view their own health score history"
  ON public.health_score_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own health score history"
  ON public.health_score_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own health score history"
  ON public.health_score_history FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_health_plan_notifications_user_id ON public.health_plan_notifications(user_id);
CREATE INDEX idx_activity_completions_user_id ON public.activity_completions(user_id);
CREATE INDEX idx_activity_completions_plan_date ON public.activity_completions(plan_start_date);
CREATE INDEX idx_health_score_history_user_id ON public.health_score_history(user_id);
CREATE INDEX idx_health_score_history_recorded_at ON public.health_score_history(recorded_at DESC);

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_plan_notifications_updated_at
  BEFORE UPDATE ON public.health_plan_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_completions_updated_at
  BEFORE UPDATE ON public.activity_completions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();