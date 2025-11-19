import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Activity, AlertTriangle, Utensils, Heart, MessageCircle, FileText, Download, Calendar, X, Hand, Home } from "lucide-react";
import { useSwipe } from "@/hooks/useSwipe";
import { useNavigate } from "react-router-dom";
import daigasstLogo from "@/assets/daigasst-logo.png";
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
  const navigate = useNavigate();
  const [currentCard, setCurrentCard] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [isChatComplete, setIsChatComplete] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Check if tutorial should be shown on first mount
  useEffect(() => {
    const tutorialShown = localStorage.getItem('mobile-results-tutorial-shown');
    if (!tutorialShown) {
      // Show tutorial after a brief delay for better UX
      setTimeout(() => setShowTutorial(true), 500);
    }
  }, []);

  const dismissTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('mobile-results-tutorial-shown', 'true');
  };

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

  const handleClinicalComplete = (data: any) => {
    setIsChatComplete(true);
    onClinicalAssessmentComplete(data);
  };

  const swipeHandlers = useSwipe({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrevious,
    minSwipeDistance: 50
  });

  // Custom touch handlers for horizontal swipe only
  const handleTouchStart = (e: React.TouchEvent) => {
    swipeHandlers.onTouchStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    swipeHandlers.onTouchMove(e);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    swipeHandlers.onTouchEnd();
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
                    // Allow all users to view and download 30-day plan without authentication
                    setIsPlanModalOpen(true);
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
          if (!data) return 'No analysis data available';
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
              demographics={analysisData?.demographics}
              abnormalPanels={enhancedData ? extractAbnormalPanels(enhancedData) : []}
              mode="clinical-triage"
              onClinicalAssessmentComplete={handleClinicalComplete}
              onNavigateNext={goToNext}
              analysisId={analysisData?.analysisId || analysisData?.id || `temp-${Date.now()}`}
              analysisTimestamp={analysisData?.timestamp || analysisData?.created_at || new Date().toISOString()}
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
      className={`fixed inset-0 bg-white z-50 overflow-hidden transition-transform duration-300 ${
        isDismissing ? 'translate-y-full' : ''
      } flex flex-col`}
    >
      {/* Header with Home Navigation */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Go to home"
          >
            <img src={daigasstLogo} alt="DaiGasst" className="h-8 w-auto" />
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </button>
        </div>
      </div>
      
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-4 py-4 border-b border-border mt-16">
        <h2 className="text-lg font-semibold text-navy">{currentCardData.title}</h2>
      </div>

      {/* Swipeable Content */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+96px)]"
        onTouchStart={cards[currentCard].id === 'chat' ? undefined : handleTouchStart}
        onTouchMove={cards[currentCard].id === 'chat' ? undefined : handleTouchMove}
        onTouchEnd={cards[currentCard].id === 'chat' ? undefined : handleTouchEnd}
      >
        <div className="animate-fade-in">
          {renderCardContent()}
        </div>
      </div>

      {/* Navigation Footer - Mobile Optimized */}
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
            <span className="text-[10px] text-muted-foreground">Swipe or tap arrows</span>
          </div>

          <Button
            onClick={goToNext}
            disabled={currentCard === cards.length - 1}
            variant={currentCard === 0 && isChatComplete ? "default" : "outline"}
            size="lg"
            className={`rounded-xl min-h-[48px] min-w-[48px] flex-col gap-1 ${
              currentCard === 0 && isChatComplete ? 'animate-pulse shadow-lg' : ''
            }`}
          >
            <ChevronRight className="w-5 h-5" />
            <span className="text-[10px]">{currentCard === 0 && isChatComplete ? 'View →' : 'Next'}</span>
          </Button>
        </div>
      </div>

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

      {/* First-Time Tutorial Overlay */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <Card className="max-w-sm w-full bg-white shadow-2xl animate-scale-in">
              <CardContent className="pt-6 space-y-6">
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissTutorial}
                  className="absolute top-2 right-2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>

                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Hand className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Navigate Your Results</h3>
                  <p className="text-sm text-muted-foreground">Learn how to explore all your health insights</p>
                </div>

                {/* Tutorial Steps */}
                <div className="space-y-4">
                  {/* Swipe Gesture */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-lg">👈</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-foreground">Swipe to Navigate</h4>
                        <p className="text-xs text-muted-foreground">Swipe left or right to move between screens</p>
                      </div>
                    </div>
                  </div>

                  {/* Next/Prev Buttons */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <ChevronRight className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-foreground">Use Navigation Buttons</h4>
                        <p className="text-xs text-muted-foreground">Tap Prev/Next buttons at the bottom</p>
                      </div>
                    </div>
                  </div>

                  {/* Available Screens */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <FileText className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-foreground">6 Sections Available</h4>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">Chat</Badge>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">Score</Badge>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">Plan</Badge>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">Risks</Badge>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">Numbers</Badge>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">Tips</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  onClick={dismissTutorial}
                  className="w-full h-12 text-base font-semibold"
                >
                  Got It, Let's Explore!
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  This tutorial won't show again
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
