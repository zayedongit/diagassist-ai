import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertCircle, Download, RefreshCw, Shield, Eye, FileText, Activity, CheckCircle, XCircle } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { AnimatedLoader } from "@/components/AnimatedLoader";
import { MedicalChatAgent } from "@/components/MedicalChatAgent";
import { ReportHeader } from "@/components/ReportHeader";
import { SummaryCard } from "@/components/SummaryCard";
import { ClinicalAssessmentHighlights } from "@/components/ClinicalAssessmentHighlights";
import { UnderstandingYourNumbers } from "@/components/UnderstandingYourNumbers";
import { HealthRiskDashboardWithTimeline } from "@/components/HealthRiskDashboard";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { generateEssentialReportPdf } from "@/utils/generateEssentialReportPdf";
import { StageProgress, Stage } from "@/components/StageProgress";
import { extractPdfText } from "@/utils/extractPdfText";
import { EnhancedAnalysisResult } from "@/types/medicalAnalysis";
import type { ProgressUpdate } from '@/utils/pdfToImages';
import heroBackground from "@/assets/hero-background.jpg";

interface DemoLinkValidation {
  valid: boolean;
  featureTier?: 'basic' | 'enhanced' | 'premium';
  reportsRemaining?: number;
  clientName?: string;
  paymentEnabled?: boolean;
  demoLinkId?: string;
  sessionUsage?: number;
  error?: string;
}

const DemoPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [validationStatus, setValidationStatus] = useState<DemoLinkValidation | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [demoSessionId, setDemoSessionId] = useState<string>('');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('idle');
  const [currentStage, setCurrentStage] = useState<Stage>('conversion');
  const [clinicalAssessmentData, setClinicalAssessmentData] = useState<any>(null);
  const [showPostChatSections, setShowPostChatSections] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewReportData, setPreviewReportData] = useState<any>(null);
  const [usedTextExtraction, setUsedTextExtraction] = useState(false);
  
  const pollingActiveRef = useRef(false);
  const currentPollingIdRef = useRef<string | null>(null);

  // Generate or retrieve demo session ID
  useEffect(() => {
    const existingSessionId = sessionStorage.getItem('demoSessionId');
    if (existingSessionId) {
      setDemoSessionId(existingSessionId);
    } else {
      const newSessionId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('demoSessionId', newSessionId);
      setDemoSessionId(newSessionId);
    }
  }, []);

  // Validate demo link on mount
  useEffect(() => {
    const validateDemoLink = async () => {
      if (!token || !demoSessionId) return;

      setIsValidating(true);
      try {
        const { data, error } = await supabase.functions.invoke('validate-demo-link', {
          body: { token, demoSessionId }
        });

        if (error) throw error;

        if (data.valid) {
          setValidationStatus(data);
          toast.success(`Welcome! ${data.reportsRemaining} reports remaining`);
        } else {
          setValidationStatus(data);
          toast.error(data.error || 'Invalid demo link');
        }
      } catch (err) {
        console.error('Validation error:', err);
        setValidationStatus({
          valid: false,
          error: 'Failed to validate demo link'
        });
        toast.error('Failed to validate demo link');
      } finally {
        setIsValidating(false);
      }
    };

    validateDemoLink();
  }, [token, demoSessionId]);

  // Poll for results
  const pollForResults = useCallback(async (id: string) => {
    if (pollingActiveRef.current && currentPollingIdRef.current !== id) {
      console.log('⛔ Cancelling previous polling for:', currentPollingIdRef.current);
      pollingActiveRef.current = false;
    }

    currentPollingIdRef.current = id;
    pollingActiveRef.current = true;
    
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      if (!pollingActiveRef.current || currentPollingIdRef.current !== id) {
        console.log('🛑 Polling cancelled');
        return;
      }

      try {
        attempts++;
        console.log(`📊 Polling attempt ${attempts}/${maxAttempts} for analysis: ${id}`);

        const { data, error } = await supabase.functions.invoke('get-analysis-result', {
          body: { analysisId: id, userId: demoSessionId }
        });

        if (error) throw error;

        if (data.status === 'completed' && data.result) {
          pollingActiveRef.current = false;
          setProcessingStatus('completed');
          setAnalysisData(data.result);
          setShowResults(true);
          setIsAnalyzing(false);
          
          // Increment demo usage
          if (token && validationStatus?.demoLinkId) {
            await supabase.functions.invoke('increment-demo-usage', {
              body: { 
                token, 
                analysisId: id,
                demoSessionId 
              }
            });
            
            // Update remaining count
            if (validationStatus.reportsRemaining !== undefined) {
              setValidationStatus({
                ...validationStatus,
                reportsRemaining: validationStatus.reportsRemaining - 1,
                sessionUsage: (validationStatus.sessionUsage || 0) + 1
              });
            }
          }
          
          toast.success('Analysis complete!');
          return;
        } else if (data.status === 'failed') {
          pollingActiveRef.current = false;
          setProcessingStatus('failed');
          setError(data.error || 'Analysis failed');
          setIsAnalyzing(false);
          toast.error('Analysis failed');
          return;
        }

        if (attempts >= maxAttempts) {
          pollingActiveRef.current = false;
          setProcessingStatus('timeout');
          setError('Analysis timeout - please try again');
          setIsAnalyzing(false);
          toast.error('Analysis timeout');
          return;
        }

        setTimeout(poll, 3000);
      } catch (err) {
        console.error('Polling error:', err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          pollingActiveRef.current = false;
          setIsAnalyzing(false);
          setError('Failed to retrieve results');
          toast.error('Failed to retrieve results');
        }
      }
    };

    poll();
  }, [token, demoSessionId, validationStatus]);

  // Handle file selection and analysis
  const handleFileSelect = async (file: File) => {
    if (!validationStatus?.valid) {
      toast.error('Invalid demo link');
      return;
    }

    if (validationStatus.reportsRemaining === 0) {
      toast.error('Demo link usage limit reached');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setIsAnalyzing(true);
    setProcessingStatus('processing');
    setCurrentStage('conversion');

    try {
      // Try text extraction first
      setUsedTextExtraction(false);
      const extractionResult = await extractPdfText(file);
      
      if (extractionResult.success && extractionResult.text && extractionResult.text.length > 100) {
        console.log('✅ Using fast text extraction path');
        setUsedTextExtraction(true);
        setCurrentStage('analysis');
        
        const { data, error } = await supabase.functions.invoke('analyze-medical-report', {
          body: {
            pdfText: extractionResult.text,
            userId: demoSessionId,
            filename: file.name,
            demoLinkId: validationStatus.demoLinkId,
            demoSessionId: demoSessionId,
            featureTier: validationStatus.featureTier
          }
        });

        if (error) throw error;
        
        setAnalysisId(data.analysisId);
        await pollForResults(data.analysisId);
      } else {
        // Fall back to OCR path
        console.log('📷 Using OCR path');
        setCurrentStage('conversion');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', demoSessionId);
        formData.append('demoLinkId', validationStatus.demoLinkId || '');
        formData.append('demoSessionId', demoSessionId);
        formData.append('featureTier', validationStatus.featureTier || 'basic');

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-pdf-report`, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });

        if (!response.ok) throw new Error('Failed to process PDF');
        
        const result = await response.json();
        setAnalysisId(result.analysisId);
        setCurrentStage('analysis');
        await pollForResults(result.analysisId);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setIsAnalyzing(false);
      toast.error('Failed to analyze report');
    }
  };

  // Handle reset
  const handleReset = () => {
    pollingActiveRef.current = false;
    currentPollingIdRef.current = null;
    setSelectedFile(null);
    setAnalysisData(null);
    setShowResults(false);
    setError(null);
    setIsAnalyzing(false);
    setAnalysisId(null);
    setProcessingStatus('idle');
    setClinicalAssessmentData(null);
    setShowPostChatSections(false);
  };

  // Clinical assessment completion
  const handleClinicalAssessmentComplete = (reportData: any) => {
    setClinicalAssessmentData(reportData);
    setShowPostChatSections(true);
    toast.success('Clinical assessment complete!');
  };

  // Prepare report data
  const prepareReportData = () => {
    if (!analysisData) return null;

    const allAbnormalLabs = analysisData.medicalPanels?.flatMap((panel: any) => 
      panel.abnormalLabs.map((lab: any) => ({
        parameter: lab.name,
        value: lab.value,
        unit: lab.unit || '',
        normalRange: lab.referenceRange || '',
        status: lab.status
      }))
    ) || [];

    return {
      patientInfo: {
        name: analysisData.patientName || analysisData.profileName,
        age: analysisData.demographics?.age,
        gender: analysisData.demographics?.gender,
        testDate: analysisData.testDate
      },
      overallStatus: analysisData.overallStatus,
      summary: analysisData.summary,
      abnormalLabs: allAbnormalLabs,
      actionItems: analysisData.nextSteps,
      dietaryRecommendations: {
        toAdd: analysisData.diet?.increase,
        toLimitOrAvoid: analysisData.diet?.avoid
      },
      lifestyleModifications: analysisData.lifestyle?.recommendations,
      followUpGuidance: analysisData.specialist ? 
        `Consult ${analysisData.specialist}. Retest recommended in 3-6 months.` : 
        'Retest recommended in 3-6 months. Consult your healthcare provider if symptoms worsen.'
    };
  };

  // Handle preview
  const handlePreviewReport = () => {
    const reportData = prepareReportData();
    if (reportData) {
      setPreviewReportData(reportData);
      setShowPreviewModal(true);
    } else {
      toast.error('No analysis data available for preview');
    }
  };

  // Handle download from preview
  const handleDownloadFromPreview = async () => {
    if (previewReportData) {
      await generateEssentialReportPdf(previewReportData);
      setShowPreviewModal(false);
    }
  };

  // Handle direct download
  const handleDownloadReport = async () => {
    const reportData = prepareReportData();
    if (reportData) {
      await generateEssentialReportPdf(reportData);
    } else {
      toast.error('No analysis data available for download');
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <AnimatedLoader />
              <p className="text-muted-foreground">Validating demo link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validationStatus?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Invalid Demo Link
            </CardTitle>
            <CardDescription>
              {validationStatus?.error || 'This demo link is not valid or has expired'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Demo Header */}
      <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <div>
                <h1 className="font-semibold">Demo Mode: {validationStatus.clientName}</h1>
                <p className="text-sm text-muted-foreground">
                  {validationStatus.featureTier?.toUpperCase()} Tier
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                {validationStatus.reportsRemaining} reports left
              </Badge>
              <Button onClick={() => navigate('/')} variant="ghost" size="sm">
                Exit Demo
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!showResults && !isAnalyzing && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">Upload Medical Report</h2>
              <p className="text-muted-foreground">
                Try our AI-powered medical report analysis
              </p>
            </div>

            {validationStatus.reportsRemaining === 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Usage Limit Reached</AlertTitle>
                <AlertDescription>
                  This demo link has reached its maximum usage limit. Please contact the administrator for a new demo link.
                </AlertDescription>
              </Alert>
            ) : (
              <UploadZone onFileSelect={handleFileSelect} />
            )}
          </div>
        )}

        {isAnalyzing && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <AnimatedLoader />
                  <StageProgress currentStage={currentStage} />
                  <p className="text-center text-muted-foreground">
                    Analyzing your medical report...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button onClick={handleReset} className="mt-4">
              Try Again
            </Button>
          </Alert>
        )}

        {showResults && analysisData && (
          <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Analysis Results</h2>
              <Button onClick={handleReset} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Analyze Another Report
              </Button>
            </div>

            <ReportHeader 
              patientName={analysisData.patientName || analysisData.profileName}
              demographics={analysisData.demographics}
              testDate={analysisData.testDate}
              overallStatus={analysisData.overallStatus}
            />
            <SummaryCard analysisData={analysisData} />

            {/* Medical Chat Agent - Available for Enhanced and Premium */}
            {(validationStatus.featureTier === 'enhanced' || validationStatus.featureTier === 'premium') && (
              <MedicalChatAgent
                mode="clinical-triage"
                analysisContext={JSON.stringify(analysisData)}
                demographics={analysisData.demographics}
                abnormalPanels={analysisData.medicalPanels}
                onClinicalAssessmentComplete={handleClinicalAssessmentComplete}
              />
            )}

            {/* Detailed Analysis Sections */}
            {(showPostChatSections || validationStatus.featureTier === 'basic') && (
              <div className="space-y-8">
                <ClinicalAssessmentHighlights 
                  clinicalData={clinicalAssessmentData}
                />
                <HealthRiskDashboardWithTimeline analysisData={analysisData} />
                <UnderstandingYourNumbers analysisData={analysisData} />

                {/* Preview and Download Buttons */}
                {clinicalAssessmentData && (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
                    <Button 
                      onClick={handlePreviewReport}
                      size="lg"
                      variant="outline"
                      className="gap-2"
                    >
                      <Eye className="w-5 h-5" />
                      Preview Report
                    </Button>
                    <Button 
                      onClick={handleDownloadReport}
                      size="lg"
                      className="gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download PDF
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <div className="mt-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
              <p className="text-sm text-center leading-relaxed">
                <span className="font-semibold">Disclaimer:</span> This is informational support only — not a medical diagnosis.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Report Preview Modal */}
      {previewReportData && (
        <ReportPreviewModal
          open={showPreviewModal}
          onOpenChange={setShowPreviewModal}
          reportData={previewReportData}
          onDownload={handleDownloadFromPreview}
        />
      )}
    </div>
  );
};

export default DemoPage;
