import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Activity, AlertTriangle, Utensils, Heart, MessageCircle, FileText, Download, Calendar } from "lucide-react";
import { SummaryCard } from "@/components/SummaryCard";
import { HealthRiskDashboardWithTimeline } from "@/components/HealthRiskDashboard";
import { UnderstandingYourNumbers } from "@/components/UnderstandingYourNumbers";
import { MedicalChatAgent } from "@/components/MedicalChatAgent";
import { EnhancedAnalysisResult, extractAbnormalPanels } from "@/types/medicalAnalysis";
import { parseClinicalContext } from "@/utils/parseClinicalContext";
import { HealthScoreCard } from "@/components/HealthScoreCard";
import { calculateHealthScore } from "@/utils/healthScoreCalculator";
import { HealthImprovementPlanModal } from "@/components/HealthImprovementPlanModal";
import { generate30DayPlan } from "@/utils/generate30DayPlan";
import { AuthPrompt } from "@/components/AuthPrompt";
import { useAuth } from "@/hooks/useAuth";

interface MobileResultsViewProps {
  analysisData: any;
  enhancedData: EnhancedAnalysisResult | null;
  clinicalAssessmentData: any;
  onClinicalAssessmentComplete: (data: any) => void;
  onDownloadReport: () => void;
  onPreviewReport: () => void;
  onDismiss: () => void;
}

export const MobileResultsView = ({
  analysisData,
  enhancedData,
  clinicalAssessmentData,
  onClinicalAssessmentComplete,
  onDownloadReport,
  onPreviewReport,
  onDismiss
}: MobileResultsViewProps) => {
  const { user } = useAuth();
  const [currentCard, setCurrentCard] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const cards = [
    {
      id: 'chat',
      title: 'Clinical Chat',
      icon: MessageCircle,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50'
    },
    {
      id: 'score',
      title: 'Health Score',
      icon: Activity,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'plan',
      title: '30-Day Plan',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'risks',
      title: 'Health Risks',
      icon: AlertTriangle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50'
    },
    {
      id: 'numbers',
      title: 'Your Numbers',
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      id: 'recommendations',
      title: 'Recommendations',
      icon: Heart,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    }
  ];

  const goToNext = () => {
    setCurrentCard((prev) => (prev + 1) % cards.length);
  };

  const goToPrevious = () => {
    setCurrentCard((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  // Swipe disabled per user request - only dismiss gesture remains

  // Custom touch handlers for dismiss gesture with visual feedback
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const touchY = touch.clientY;
    
    // Only allow dismiss gesture if:
    // 1. Touch starts in top 50px of the screen
    // 2. Content is scrolled to the top
    const scrollTop = contentRef.current?.scrollTop || 0;
    
    if (touchY < 50 && scrollTop === 0) {
      setTouchStartY(touchY);
      setIsSwiping(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY;
    
    // Only show visual feedback for downward swipes
    if (deltaY > 0) {
      setIsSwiping(true);
      setSwipeOffset(Math.min(deltaY, 200)); // Cap at 200px
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    
    const touch = e.changedTouches[0];
    const deltaY = touch.clientY - touchStartY;
    
    // Trigger dismiss if swiped down more than 100px
    if (deltaY > 100) {
      handleDismiss();
    }
    
    setIsSwiping(false);
    setSwipeOffset(0);
    setTouchStartY(null);
  };

  const renderCardContent = () => {
    const card = cards[currentCard];

    switch (card.id) {
      case 'score':
        return enhancedData ? (
          <div className="pb-4">
            <HealthScoreCard 
              breakdown={calculateHealthScore(
                enhancedData,
                analysisData.demographics,
                parseClinicalContext(clinicalAssessmentData)
              )}
            />
          </div>
        ) : (
          <p className="text-slate text-center py-8">No health data available for scoring</p>
        );
      
      case 'plan':
        if (!enhancedData) {
          return <p className="text-slate text-center py-8">Complete health score analysis to view your 30-day plan</p>;
        }

        const healthScoreBreakdown = calculateHealthScore(
          enhancedData,
          analysisData.demographics,
          parseClinicalContext(clinicalAssessmentData)
        );
        const improvementPlan = generate30DayPlan(healthScoreBreakdown);

        return (
          <div className="space-y-4 pb-4">
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-navy">Your 30-Day Plan</h3>
                    <p className="text-sm text-muted-foreground">Personalized improvement strategy</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <h4 className="font-medium text-sm text-navy mb-2">Focus Areas</h4>
                  <div className="flex flex-wrap gap-2">
                    {improvementPlan.targetSystems.map(system => (
                      <Badge key={system} variant="default" className="text-xs">
                        {system.charAt(0).toUpperCase() + system.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <h4 className="font-medium text-sm text-navy mb-2">Your Goal</h4>
                  <p className="text-xs text-slate leading-relaxed">
                    {improvementPlan.overallGoal}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <p className="text-2xl font-bold text-red-600 mb-1">
                      {improvementPlan.testsRequired.length}
                    </p>
                    <p className="text-xs text-red-700">Tests</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                    <p className="text-2xl font-bold text-orange-600 mb-1">
                      {improvementPlan.specialistReferrals.length}
                    </p>
                    <p className="text-xs text-orange-700">Referrals</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <p className="text-2xl font-bold text-green-600 mb-1">
                      {improvementPlan.dailyActivities.length}
                    </p>
                    <p className="text-xs text-green-700">Activities</p>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h4 className="font-medium text-sm text-navy mb-3">4-Week Overview</h4>
                  <div className="space-y-2">
                    {improvementPlan.weeklyBreakdown.map((week) => (
                      <div key={week.week} className="bg-white rounded p-2 border border-blue-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-blue-700">Week {week.week}</span>
                          <Badge variant="outline" className="text-xs">{week.focus}</Badge>
                        </div>
                        <ul className="space-y-0.5">
                          {week.goals.slice(0, 2).map((goal, idx) => (
                            <li key={idx} className="text-xs text-slate flex items-start">
                              <span className="text-green-600 mr-1">✓</span>
                              <span>{goal}</span>
                            </li>
                          ))}
                          {week.goals.length > 2 && (
                            <li className="text-xs text-muted-foreground italic">
                              +{week.goals.length - 2} more goals
                            </li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={() => {
                    if (!user) {
                      setShowAuthPrompt(true);
                    } else {
                      setIsPlanModalOpen(true);
                    }
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Full Plan & Download PDF
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Comprehensive 4-week action plan with tests, referrals, activities, and dietary guidance
                </p>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'chat':
        const createEnhancedAnalysisContext = (data: any) => {
          return JSON.stringify({
            summary: data.summary,
            overallStatus: data.overallStatus,
            medicalPanels: data.medicalPanels || [],
            demographics: data.demographics
          });
        };

        return (
          <div className="pb-4">
            <MedicalChatAgent
              analysisContext={createEnhancedAnalysisContext(analysisData)}
              demographics={analysisData.demographics}
              abnormalPanels={enhancedData?.medicalPanels || []}
              mode="clinical-triage"
              onClinicalAssessmentComplete={onClinicalAssessmentComplete}
            />
          </div>
        );
      
      case 'risks':
        return enhancedData ? (
          <HealthRiskDashboardWithTimeline 
            analysisData={enhancedData}
            demographics={enhancedData.demographics}
          />
        ) : (
          <p className="text-slate text-center py-8">No health risk data available</p>
        );
      
      case 'numbers':
        return enhancedData ? (
          <UnderstandingYourNumbers 
            analysisData={enhancedData}
          />
        ) : (
          <p className="text-slate text-center py-8">No lab data available</p>
        );
      
      case 'recommendations':
        return (
          <div className="space-y-4">
            {/* Diet Recommendations */}
            {analysisData.diet && (
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Utensils className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-navy">Dietary Guidance</h4>
                  </div>
                  
                  {analysisData.diet.increase && analysisData.diet.increase.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-green-700 mb-2">Foods to Include:</p>
                      <ul className="space-y-1">
                        {analysisData.diet.increase.map((item: string, idx: number) => (
                          <li key={idx} className="text-sm text-slate flex items-start">
                            <span className="text-green-600 mr-2">+</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysisData.diet.avoid && analysisData.diet.avoid.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-red-700 mb-2">Foods to Limit:</p>
                      <ul className="space-y-1">
                        {analysisData.diet.avoid.map((item: string, idx: number) => (
                          <li key={idx} className="text-sm text-slate flex items-start">
                            <span className="text-red-600 mr-2">-</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Lifestyle Recommendations */}
            {analysisData.lifestyle?.recommendations && analysisData.lifestyle.recommendations.length > 0 && (
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Heart className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-navy">Lifestyle Changes</h4>
                  </div>
                  <ul className="space-y-2">
                    {analysisData.lifestyle.recommendations.map((item: string, idx: number) => (
                      <li key={idx} className="text-sm text-slate flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Next Steps */}
            {analysisData.nextSteps && analysisData.nextSteps.length > 0 && (
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-navy mb-4">Next Steps</h4>
                  <ul className="space-y-2">
                    {analysisData.nextSteps.map((step: string, idx: number) => (
                      <li key={idx} className="text-sm text-slate flex items-start">
                        <span className="text-purple-600 mr-2 font-semibold">{idx + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  const currentCardData = cards[currentCard];
  const Icon = currentCardData.icon;

  return (
    <div 
      className={`fixed inset-0 bg-white z-40 overflow-hidden pt-16 transition-transform duration-300 ${
        isDismissing ? 'translate-y-full' : ''
      }`}
      style={{
        transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
        transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Dismiss Indicator */}
      {swipeOffset > 30 && (
        <div 
          className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-gray-800/80 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm animate-fade-in"
        >
          {swipeOffset > 100 ? '👋 Release to close' : '⬇️ Swipe down to close'}
        </div>
      )}
      
      
      {/* Header with touch handlers for dismiss gesture */}
      <div 
        className="bg-gradient-to-br from-primary/10 to-primary/5 px-4 py-3 border-b border-border"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${currentCardData.bgColor}`}>
              <Icon className={`w-4 h-4 ${currentCardData.color}`} />
            </div>
            <h2 className="text-base font-semibold text-navy">{currentCardData.title}</h2>
          </div>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
            {currentCard + 1} / {cards.length}
          </Badge>
        </div>

        {/* Progress Dots with Labels - Smaller size */}
        <div className="flex items-center justify-center gap-3">
          {cards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => setCurrentCard(idx)}
              className="flex flex-col items-center gap-0.5 transition-all"
              aria-label={`Go to ${card.title}`}
            >
              <div className={`rounded-full transition-all duration-300 ${
                idx === currentCard 
                  ? 'w-2 h-2 bg-primary' 
                  : 'w-1.5 h-1.5 bg-primary/30'
              }`} />
              <span className={`text-[9px] font-medium transition-colors ${
                idx === currentCard 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`}>
                {card.title === 'Clinical Chat' ? 'Chat' : 
                 card.title === 'Health Score' ? 'Score' :
                 card.title === '30-Day Plan' ? 'Plan' :
                 card.title === 'Health Risks' ? 'Risks' :
                 card.title === 'Your Numbers' ? 'Numbers' : 'Recs'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content - No touch handlers, allows free scrolling */}
      <div
        ref={contentRef}
        className="h-[calc(100vh-200px)] overflow-y-auto px-4 py-6"
      >
        <div className="animate-fade-in">
          {renderCardContent()}
        </div>
      </div>

      {/* Navigation Footer - Only show after clinical chat is complete */}
      {clinicalAssessmentData && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-lg" 
             style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <Button
              onClick={goToPrevious}
              disabled={currentCard === 0}
              variant="outline"
              size="lg"
              className="rounded-xl min-h-[48px] min-w-[48px] flex-col gap-1"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-[10px]">Prev</span>
            </Button>

            <div className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px]">
              <span className="text-xs font-medium text-foreground">{currentCardData.title}</span>
              <span className="text-[10px] text-muted-foreground">Tap arrows</span>
            </div>

            <Button
              onClick={goToNext}
              disabled={currentCard === cards.length - 1}
              variant="outline"
              size="lg"
              className="rounded-xl min-h-[48px] min-w-[48px] flex-col gap-1"
            >
              <ChevronRight className="w-5 h-5" />
              <span className="text-[10px]">Next</span>
            </Button>
          </div>
        </div>
      )}

      {/* 30-Day Improvement Plan Modal */}
      {enhancedData && (
        <HealthImprovementPlanModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          plan={generate30DayPlan(calculateHealthScore(
            enhancedData,
            analysisData.demographics,
            parseClinicalContext(clinicalAssessmentData)
          ))}
          patientName={analysisData.demographics?.name || analysisData.patientName}
        />
      )}

      {/* Authentication Prompt for 30-Day Plan */}
      <AuthPrompt 
        open={showAuthPrompt} 
        onOpenChange={setShowAuthPrompt}
        onAuthSuccess={() => {
          setShowAuthPrompt(false);
          setIsPlanModalOpen(true);
        }}
      />
    </div>
  );
};
