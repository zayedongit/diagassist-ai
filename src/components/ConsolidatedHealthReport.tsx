import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Heart,
  Stethoscope,
  FileText,
  Users,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react";
import { EnhancedAnalysisResult, extractAbnormalPanels, MedicalPanel } from "@/types/medicalAnalysis";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ConsolidatedHealthReportProps {
  analysisData: EnhancedAnalysisResult;
  clinicalAssessmentData?: any;
}

export const ConsolidatedHealthReport = ({ 
  analysisData, 
  clinicalAssessmentData 
}: ConsolidatedHealthReportProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    abnormalities: true,
    clinical: true,
    interpretation: true,
    actions: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const abnormalPanels = extractAbnormalPanels(analysisData);
  const abnormalValuesCount = abnormalPanels.reduce(
    (sum, panel) => sum + panel.abnormalLabs.length, 
    0
  );

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'good':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Good Health',
          description: 'Your results show positive health indicators'
        };
      case 'moderate':
        return {
          icon: AlertCircle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Needs Attention',
          description: 'Some values require monitoring and lifestyle adjustments'
        };
      case 'concerning':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Action Required',
          description: 'Several abnormalities detected - consult your healthcare provider'
        };
      default:
        return {
          icon: Activity,
          color: 'text-white/80',
          bgColor: 'bg-white/5',
          borderColor: 'border-white/10',
          label: 'Results Available',
          description: 'Your analysis is complete'
        };
    }
  };

  const statusInfo = getStatusInfo(analysisData.overallStatus);
  const StatusIcon = statusInfo.icon;

  const getLabStatusIcon = (status: string) => {
    switch (status) {
      case 'high':
      case 'critical':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'low':
        return <TrendingDown className="w-4 h-4 text-orange-500" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
  };

  const getLabStatusColor = (status: string) => {
    switch (status) {
      case 'high':
      case 'critical':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'low':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      default:
        return 'text-green-700 bg-green-50 border-green-200';
    }
  };

  const getProbabilityBadgeVariant = (probability: string) => {
    switch (probability?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getUrgencyBadgeVariant = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case 'urgent':
      case 'essential':
        return 'destructive';
      case 'recommended':
        return 'default';
      case 'routine':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="border-2 shadow-elegant overflow-hidden">
      {/* SECTION 1: At-a-Glance Overview */}
      <CardHeader className={cn("pb-4", statusInfo.bgColor, statusInfo.borderColor, "border-b-2")}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn("p-3 rounded-xl", statusInfo.bgColor, "ring-2", statusInfo.borderColor)}>
              <StatusIcon className={cn("w-6 h-6", statusInfo.color)} />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-white mb-1">
                {statusInfo.label}
              </CardTitle>
              <p className="text-sm text-white/60">{statusInfo.description}</p>
            </div>
          </div>
          
          <div className="flex gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {abnormalPanels.length}
              </div>
              <div className="text-xs text-white/60">Panel{abnormalPanels.length !== 1 ? 's' : ''}</div>
            </div>
            <Separator orientation="vertical" className="h-auto" />
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-red-600">
                {abnormalValuesCount}
              </div>
              <div className="text-xs text-white/60">Abnormal</div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Patient-Friendly Summary */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-sm sm:text-base text-white/90 leading-relaxed">
            {analysisData.patientFriendlySummary || analysisData.summary}
          </p>
        </div>

        {/* SECTION 2: Abnormalities That Need Attention */}
        {abnormalPanels.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => toggleSection('abnormalities')}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-white">
                  Values Needing Attention
                </h3>
                <Badge variant="destructive" className="ml-2">
                  {abnormalValuesCount}
                </Badge>
              </div>
              {expandedSections.abnormalities ? (
                <ChevronUp className="w-5 h-5 text-white/60" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white/60" />
              )}
            </button>

            {expandedSections.abnormalities && (
              <div className="space-y-4 animate-fade-in">
                {abnormalPanels.map((panel, panelIndex) => (
                  <div key={panelIndex} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-white">{panel.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {panel.abnormalLabs.length} abnormal
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {panel.abnormalLabs.map((lab, labIndex) => (
                        <div
                          key={labIndex}
                          className={cn(
                            "flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border",
                            getLabStatusColor(lab.status)
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {getLabStatusIcon(lab.status)}
                            <div>
                              <p className="font-medium text-white text-sm">{lab.name}</p>
                              {lab.significance && (
                                <p className="text-xs text-white/60 mt-0.5">{lab.significance}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right sm:text-left">
                            <p className="font-bold text-white">
                              {lab.value} {lab.unit}
                            </p>
                            {lab.referenceRange && (
                              <p className="text-xs text-white/60">
                                Normal: {lab.referenceRange}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {panel.interpretation && (
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <p className="text-sm text-white/90">{panel.interpretation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: Clinical Context & Findings */}
        {clinicalAssessmentData && (
          <div className="space-y-3">
            <button
              onClick={() => toggleSection('clinical')}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-white/5 to-white/5 border-2 border-purple-200 rounded-xl hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-white">
                  Clinical Assessment & Context
                </h3>
              </div>
              {expandedSections.clinical ? (
                <ChevronUp className="w-5 h-5 text-white/60" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white/60" />
              )}
            </button>

            {expandedSections.clinical && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                {/* Possible Conditions */}
                {clinicalAssessmentData.possibleConditions && 
                 clinicalAssessmentData.possibleConditions.length > 0 && (
                  <div className="bg-white/5 border border-purple-200 rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-primary" />
                      Possible Conditions
                    </h4>
                    <div className="space-y-2">
                      {clinicalAssessmentData.possibleConditions.map((condition: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                          <span className="text-sm font-medium text-white">{condition.name}</span>
                          <Badge variant={getProbabilityBadgeVariant(condition.probability)} className="text-xs">
                            {condition.probability}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    {clinicalAssessmentData.possibleConditions[0]?.rationale && (
                      <p className="text-xs text-white/60 mt-3 leading-relaxed">
                        {clinicalAssessmentData.possibleConditions[0].rationale}
                      </p>
                    )}
                  </div>
                )}

                {/* Recommended Tests */}
                {clinicalAssessmentData.investigations && 
                 clinicalAssessmentData.investigations.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Recommended Tests
                    </h4>
                    <div className="space-y-2">
                      {clinicalAssessmentData.investigations.map((investigation: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                          <span className="text-sm font-medium text-white">{investigation.test}</span>
                          <Badge variant={getUrgencyBadgeVariant(investigation.urgency)} className="text-xs">
                            {investigation.urgency}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Specialist Referrals */}
                {clinicalAssessmentData.referrals && 
                 clinicalAssessmentData.referrals.length > 0 && (
                  <div className="bg-white/5 border border-indigo-200 rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Specialist Referrals
                    </h4>
                    <div className="space-y-2">
                      {clinicalAssessmentData.referrals.map((referral: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                          <span className="text-sm font-medium text-white">{referral.specialty}</span>
                          <Badge variant="outline" className="text-xs">
                            {referral.timeframe}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warning Signs */}
                {clinicalAssessmentData.redFlags && 
                 clinicalAssessmentData.redFlags.length > 0 && (
                  <div className="bg-white/5 border border-yellow-200 rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning-600" />
                      Warning Signs to Watch For
                    </h4>
                    <ul className="space-y-2">
                      {clinicalAssessmentData.redFlags.slice(0, 4).map((flag: string, index: number) => (
                        <li key={index} className="text-sm text-white/90 flex items-start gap-2 p-2 bg-yellow-50 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-warning-600 mt-1.5 flex-shrink-0"></span>
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: What This Means For You */}
        <div className="space-y-3">
          <button
            onClick={() => toggleSection('interpretation')}
            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200 rounded-xl hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-white">
                What This Means For You
              </h3>
            </div>
            {expandedSections.interpretation ? (
              <ChevronUp className="w-5 h-5 text-white/60" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white/60" />
            )}
          </button>

          {expandedSections.interpretation && (
            <div className="bg-white/5 border border-green-200 rounded-xl p-4 space-y-4 animate-fade-in">
              <div className="space-y-3">
                {abnormalPanels.map((panel, index) => (
                  <div key={index} className="bg-green-50/50 border border-green-200 rounded-lg p-3">
                    <h5 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      {panel.name}
                    </h5>
                    <p className="text-sm text-white/90 leading-relaxed">
                      {panel.interpretation}
                    </p>
                  </div>
                ))}
              </div>

              {analysisData.patientFriendlySummary && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h5 className="font-semibold text-white mb-2">In Simple Terms:</h5>
                  <p className="text-sm text-white/90 leading-relaxed">
                    {analysisData.patientFriendlySummary}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 5: Recommended Actions */}
        {clinicalAssessmentData && clinicalAssessmentData.management && (
          <div className="space-y-3">
            <button
              onClick={() => toggleSection('actions')}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-white/5 to-white/5 border-2 border-cyan-200 rounded-xl hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-cyan-600" />
                <h3 className="text-lg font-semibold text-white">
                  Your Action Plan
                </h3>
              </div>
              {expandedSections.actions ? (
                <ChevronUp className="w-5 h-5 text-white/60" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white/60" />
              )}
            </button>

            {expandedSections.actions && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                {/* Dietary Recommendations */}
                {clinicalAssessmentData.management.diet && 
                 clinicalAssessmentData.management.diet.length > 0 && (
                  <div className="bg-white/5 border border-green-200 rounded-xl p-4">
                    <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-green-600" />
                      Dietary Changes
                    </h5>
                    <ul className="space-y-2">
                      {clinicalAssessmentData.management.diet.map((item: string, index: number) => (
                        <li key={index} className="text-sm text-white/90 flex items-start gap-2 p-2 bg-green-50 rounded">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Lifestyle Modifications */}
                {clinicalAssessmentData.management.lifestyle && 
                 clinicalAssessmentData.management.lifestyle.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-white/80" />
                      Lifestyle Changes
                    </h5>
                    <ul className="space-y-2">
                      {clinicalAssessmentData.management.lifestyle.map((item: string, index: number) => (
                        <li key={index} className="text-sm text-white/90 flex items-start gap-2 p-2 bg-white/5 rounded">
                          <CheckCircle2 className="w-4 h-4 text-white/80 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* General Recommendations */}
                {clinicalAssessmentData.management.generalRx && 
                 clinicalAssessmentData.management.generalRx.length > 0 && (
                  <div className="bg-white/5 border border-purple-200 rounded-xl p-4">
                    <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-purple-600" />
                      General Care
                    </h5>
                    <ul className="space-y-2">
                      {clinicalAssessmentData.management.generalRx.map((item: string, index: number) => (
                        <li key={index} className="text-sm text-white/90 flex items-start gap-2 p-2 bg-white/5 rounded">
                          <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Next Steps Footer */}
        {analysisData.nextSteps && analysisData.nextSteps.length > 0 && (
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Important Next Steps
            </h4>
            <ul className="space-y-2">
              {analysisData.nextSteps.map((step, index) => (
                <li key={index} className="text-sm text-white/90 flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
