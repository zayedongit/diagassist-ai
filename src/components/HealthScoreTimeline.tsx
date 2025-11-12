import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';

interface ScoreHistory {
  id: string;
  overall_score: number;
  metabolic_score: number | null;
  cardiovascular_score: number | null;
  kidney_score: number | null;
  liver_score: number | null;
  hematologic_score: number | null;
  endocrine_score: number | null;
  recorded_at: string;
}

interface HealthScoreTimelineProps {
  currentScore: number;
}

export const HealthScoreTimeline = ({ currentScore }: HealthScoreTimelineProps) => {
  const [history, setHistory] = useState<ScoreHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSystems, setShowSystems] = useState(false);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '6m' | '1y' | 'all'>('30d');

  useEffect(() => {
    fetchHistory();
  }, [timeRange]);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('health_score_history')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: true });

      // Apply time range filter
      const now = new Date();
      let startDate: Date;
      switch (timeRange) {
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '6m':
          startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      if (timeRange !== 'all') {
        query = query.gte('recorded_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching score history:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = history.map((entry) => ({
    date: format(new Date(entry.recorded_at), 'MMM dd'),
    overall: parseFloat(entry.overall_score.toString()),
    metabolic: entry.metabolic_score ? parseFloat(entry.metabolic_score.toString()) : null,
    cardiovascular: entry.cardiovascular_score ? parseFloat(entry.cardiovascular_score.toString()) : null,
    kidney: entry.kidney_score ? parseFloat(entry.kidney_score.toString()) : null,
    liver: entry.liver_score ? parseFloat(entry.liver_score.toString()) : null,
    hematologic: entry.hematologic_score ? parseFloat(entry.hematologic_score.toString()) : null,
    endocrine: entry.endocrine_score ? parseFloat(entry.endocrine_score.toString()) : null,
  }));

  const calculateChange = () => {
    if (history.length < 2) return { change: 0, percentage: 0 };
    
    const firstScore = parseFloat(history[0].overall_score.toString());
    const change = currentScore - firstScore;
    const percentage = (change / firstScore) * 100;
    
    return { change, percentage };
  };

  const { change, percentage } = calculateChange();

  const getTrendIcon = () => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading score history...</div>;
  }

  if (history.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <h3 className="font-semibold mb-2">No Score History Yet</h3>
          <p className="text-sm text-muted-foreground">
            Your health score timeline will appear here as you track your progress over time.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-lg mb-1">Health Score Timeline</h3>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(1)} points ({percentage >= 0 ? '+' : ''}{percentage.toFixed(1)}%)
            </span>
            <span className="text-sm text-muted-foreground">since {format(new Date(history[0].recorded_at), 'MMM dd')}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {(['30d', '90d', '6m', '1y', 'all'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === 'all' ? 'All' : range.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSystems(!showSystems)}
        >
          {showSystems ? 'Show Overall Only' : 'Show All Systems'}
        </Button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          
          <Line
            type="monotone"
            dataKey="overall"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            name="Overall Score"
            dot={{ r: 4 }}
          />

          {showSystems && (
            <>
              <Line
                type="monotone"
                dataKey="metabolic"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Metabolic"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="cardiovascular"
                stroke="#ef4444"
                strokeWidth={2}
                name="Cardiovascular"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="kidney"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Kidney"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="liver"
                stroke="#10b981"
                strokeWidth={2}
                name="Liver"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="hematologic"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Blood"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="endocrine"
                stroke="#ec4899"
                strokeWidth={2}
                name="Endocrine"
                dot={{ r: 3 }}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>

      {history.length > 1 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{history.length}</div>
            <div className="text-xs text-muted-foreground">Total Check-ins</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{Math.max(...history.map(h => parseFloat(h.overall_score.toString()))).toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">Best Score</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">
              {(history.reduce((sum, h) => sum + parseFloat(h.overall_score.toString()), 0) / history.length).toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">Average Score</div>
          </div>
        </div>
      )}
    </Card>
  );
};