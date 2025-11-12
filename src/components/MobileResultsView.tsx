import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Activity, AlertTriangle, Utensils, Heart, MessageCircle, FileText, Download } from "lucide-react";
import { useSwipe } from "@/hooks/useSwipe";
import { SummaryCard } from "@/components/SummaryCard";
import { HealthRiskDashboardWithTimeline } from "@/components/HealthRiskDashboard";
import { UnderstandingYourNumbers } from "@/components/UnderstandingYourNumbers";
import { MedicalChatAgent } from "@/components/MedicalChatAgent";
import { EnhancedAnalysisResult, extractAbnormalPanels } from "@/types/medicalAnalysis";

interface MobileResultsViewProps {
  analysisData: any;
  enhancedData: EnhancedAnalysisResult | null;
  clinicalAssessmentData: any;
  onClinicalAssessmentComplete: (data: any) => void;
  onDownloadReport: () => void;
  onPreviewReport: () => void;
}

export const MobileResultsView = ({
  analysisData,
  enhancedData,
  clinicalAssessmentData,
  onClinicalAssessmentComplete,
  onDownloadReport,
  onPreviewReport
}: MobileResultsViewProps) => {
  const [currentCard, setCurrentCard] = useState(0);

  const cards = [
    {
      id: 'summary',
      title: 'Summary',
      icon: Activity,
      color: 'text-blue-500',
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
    },
    {
      id: 'chat',
      title: 'Ask Questions',
      icon: MessageCircle,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50'
    }
  ];

  const goToNext = () => {
    setCurrentCard((prev) => (prev + 1) % cards.length);
  };

  const goToPrevious = () => {
    setCurrentCard((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const swipeHandlers = useSwipe({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrevious,
    minSwipeDistance: 50
  });

  const renderCardContent = () => {
    const card = cards[currentCard];

    switch (card.id) {
      case 'summary':
        return (
          <div className="space-y-4">
            <SummaryCard analysisData={analysisData} />
            <div className="flex gap-2">
              <Button 
                onClick={onPreviewReport}
                variant="outline"
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button 
                onClick={onDownloadReport}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
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
          <div className="h-[calc(100vh-300px)] min-h-[400px]">
            <MedicalChatAgent
              analysisContext={createEnhancedAnalysisContext(analysisData)}
              demographics={analysisData.demographics}
              abnormalPanels={enhancedData?.medicalPanels || []}
              mode="clinical-triage"
              onClinicalAssessmentComplete={onClinicalAssessmentComplete}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  const currentCardData = cards[currentCard];
  const Icon = currentCardData.icon;

  return (
    <div className="fixed inset-0 bg-white z-40 overflow-hidden pt-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${currentCardData.bgColor}`}>
              <Icon className={`w-5 h-5 ${currentCardData.color}`} />
            </div>
            <h2 className="text-lg font-semibold text-navy">{currentCardData.title}</h2>
          </div>
          <Badge variant="secondary" className="text-xs">
            {currentCard + 1} / {cards.length}
          </Badge>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2">
          {cards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => setCurrentCard(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentCard 
                  ? 'w-8 bg-primary' 
                  : 'w-2 bg-primary/30'
              }`}
              aria-label={`Go to ${card.title}`}
            />
          ))}
        </div>
      </div>

      {/* Swipeable Content */}
      <div
        className="h-[calc(100vh-180px)] overflow-y-auto px-4 py-6"
        {...swipeHandlers}
      >
        <div className="animate-fade-in">
          {renderCardContent()}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-3 flex items-center justify-between">
        <Button
          onClick={goToPrevious}
          variant="outline"
          size="sm"
          disabled={currentCard === 0}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex gap-1">
          {cards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => setCurrentCard(idx)}
              className={`w-8 h-8 rounded-lg transition-all ${
                idx === currentCard
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
              aria-label={card.title}
            >
              <card.icon className="w-4 h-4 mx-auto" />
            </button>
          ))}
        </div>

        <Button
          onClick={goToNext}
          variant="outline"
          size="sm"
          disabled={currentCard === cards.length - 1}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
