import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Mic, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedAnalysisResult } from '@/types/medicalAnalysis';

interface VoiceFollowUpAgentProps {
  analysisData: EnhancedAnalysisResult;
  clinicalAssessmentData: any;
  isMobile?: boolean;
}

interface VoiceContext {
  patient_report: string;
  abnormal_findings: string;
  clinical_symptoms: string;
  recommendations: string;
  patient_demographics: string;
}

export const VoiceFollowUpAgent = ({ 
  analysisData, 
  clinicalAssessmentData,
  isMobile = false
}: VoiceFollowUpAgentProps) => {
  const [voiceContext, setVoiceContext] = useState<VoiceContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const prepareContext = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: functionError } = await supabase.functions.invoke(
          'prepare-voice-context',
          {
            body: {
              analysisData,
              clinicalAssessmentData
            }
          }
        );

        if (functionError) throw functionError;
        
        setVoiceContext(data);
        setRetryCount(0); // Reset retry count on success
      } catch (err) {
        console.error('Error preparing voice context:', err);
        setError('Unable to initialize voice assistant. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    prepareContext();
  }, [analysisData, clinicalAssessmentData]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setIsLoading(true);
    
    // Re-trigger the useEffect by updating a dependency
    setTimeout(() => {
      const prepareContext = async () => {
        try {
          const { data, error: functionError } = await supabase.functions.invoke(
            'prepare-voice-context',
            {
              body: {
                analysisData,
                clinicalAssessmentData
              }
            }
          );

          if (functionError) throw functionError;
          
          setVoiceContext(data);
          setRetryCount(0);
        } catch (err) {
          console.error('Error preparing voice context (retry):', err);
          setError('Unable to initialize voice assistant. Please try again.');
        } finally {
          setIsLoading(false);
        }
      };

      prepareContext();
    }, 1000);
  };

  if (isLoading) {
    return (
      <Card className={`shadow-lg border-2 border-primary/30 ${isMobile ? 'mx-4' : ''}`}>
        <CardContent className={`${isMobile ? 'p-4' : 'p-8'} flex items-center justify-center`}>
          <Loader2 className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} animate-spin text-primary`} />
          <span className={`ml-3 text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
            Loading voice assistant...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`shadow-lg border-2 border-destructive/30 ${isMobile ? 'mx-4' : ''}`}>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <p className="text-sm text-destructive mb-3">{error}</p>
          <button 
            onClick={handleRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Retry ({retryCount}/3)
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!voiceContext) return null;

  // Get first abnormal finding for example questions
  const firstAbnormal = analysisData.medicalPanels
    ?.find(panel => panel.abnormalLabs && panel.abnormalLabs.length > 0)
    ?.abnormalLabs[0];

  return (
    <Card className={`shadow-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 ${isMobile ? 'mx-4' : ''}`}>
      <CardHeader className={isMobile ? 'p-4' : ''}>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${isMobile ? 'p-2' : 'p-3'} bg-primary/20 rounded-xl`}>
            <Mic className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-primary`} />
          </div>
          <div className="flex-1">
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-foreground mb-1`}>
              Have Questions About Your Report?
            </h3>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
              Talk to Zara, our AI assistant who has reviewed your complete analysis and can answer your questions
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={`space-y-4 ${isMobile ? 'p-4 pt-0' : ''}`}>
        <div className={`bg-background rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-border min-h-[200px]`}>
          <elevenlabs-convai agent-id="agent_7601k9wd9yfje8ta73nd9apejndt" />
        </div>
        
        <div className={`${isMobile ? 'text-[11px]' : 'text-xs'} text-muted-foreground space-y-2`}>
          <p className="font-medium text-foreground">💡 Try asking:</p>
          <ul className={`list-disc list-inside ${isMobile ? 'space-y-0.5' : 'space-y-1'} ml-2`}>
            {firstAbnormal && (
              <li>Why is my {firstAbnormal.name} {firstAbnormal.status?.toLowerCase()}?</li>
            )}
            <li>Should I be worried about my abnormal findings?</li>
            <li>What lifestyle changes should I make?</li>
            <li>Which specialist should I see first?</li>
          </ul>
          
          <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} italic mt-3 pt-3 border-t border-border`}>
            💡 This AI assistant is for educational purposes only. Always consult your doctor for medical decisions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
