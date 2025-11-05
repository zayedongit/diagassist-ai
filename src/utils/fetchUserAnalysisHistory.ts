import { supabase } from '@/integrations/supabase/client';
import { EnhancedAnalysisResult } from '@/types/medicalAnalysis';

export interface AnalysisHistoryItem {
  id: string;
  created_at: string;
  result: EnhancedAnalysisResult;
}

export async function fetchUserAnalysisHistory(
  userId: string,
  limit: number = 5
): Promise<AnalysisHistoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('pdf_analyses')
      .select('id, created_at, result')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('result', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching analysis history:', error);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      created_at: item.created_at,
      result: item.result as unknown as EnhancedAnalysisResult
    }));
  } catch (error) {
    console.error('Error in fetchUserAnalysisHistory:', error);
    return [];
  }
}
