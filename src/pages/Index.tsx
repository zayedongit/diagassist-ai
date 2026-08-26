import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Activity, Heart, FileText, Download, RefreshCw, Brain, Eye, EyeOff, Lock, BarChart3, Stethoscope, CloudDownload, Shield, ArrowRight, ShieldCheck, FileCheck2, MessageCircle, TrendingUp, Calendar, Target, User, LogOut, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import { UploadZone } from "@/components/UploadZone";
import { AnimatedLoader } from "@/components/AnimatedLoader";
import { MedicalChatAgent } from "@/components/MedicalChatAgent";
import { generateMockPdf } from "@/components/MockPdfGenerator";
import { generateEssentialReportPdf } from "@/utils/generateEssentialReportPdf";
import { ComprehensiveReport } from "@/components/ComprehensiveReport";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ReportHeader } from "@/components/ReportHeader";
import { SummaryCard } from "@/components/SummaryCard";
import { ClinicalAssessmentHighlights } from "@/components/ClinicalAssessmentHighlights";
import { UnderstandingYourNumbers } from "@/components/UnderstandingYourNumbers";
import { HealthRiskDashboardWithTimeline } from "@/components/HealthRiskDashboard";
import { ConsolidatedHealthReport } from "@/components/ConsolidatedHealthReport";
import { EnhancedAnalysisResult, extractAbnormalPanels } from "@/types/medicalAnalysis";
import { parseClinicalContext } from "@/utils/parseClinicalContext";
import heroBackground from "@/assets/hero-background.jpg";
import readyBackground from "@/assets/ready-background.jpg";
import daigassistLogo from "@/assets/daigasst-logo.png";
import medicalReportIcon from "@/assets/medical-report-icon.png";
import heroOrganic from "@/assets/hero-organic.svg";
import { GlobalNav } from '@/components/GlobalNav';
import { fetchUserAnalysisHistory } from '@/utils/fetchUserAnalysisHistory';
import { PhoneAuth } from '@/components/PhoneAuth';
import { useAuth } from '@/hooks/useAuth';
import { CompressionProgress } from '@/components/CompressionProgress';
import type { ProgressUpdate } from '@/utils/pdfToImages';
import { StageProgress, Stage } from '@/components/StageProgress';
import { extractPdfText } from '@/utils/extractPdfText';
import { ReportPreviewModal } from '@/components/ReportPreviewModal';
import { MobileResultsView } from '@/components/MobileResultsView';
import { ReportChatWidget } from '@/components/ReportChatWidget';
import { useIsMobile } from '@/hooks/use-mobile';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { SampleReportPreview } from '@/components/SampleReportPreview';
import { AbnormalPanelsSummary } from '@/components/AbnormalPanelsSummary';
import { ValuesNeedingAttention } from '@/components/ValuesNeedingAttention';
import { HealthScoreCard } from '@/components/HealthScoreCard';
import { calculateHealthScore } from '@/utils/healthScoreCalculator';
import { calculateHealthRisks } from '@/utils/healthRiskCalculator';
import { RiskPredictionTimeline } from '@/components/RiskPredictionTimeline';
import { InteractiveRiskCalculator } from '@/components/InteractiveRiskCalculator';
import { ExploreAspects } from '@/components/ExploreAspects';
import { ResultsDashboard } from '@/components/ResultsDashboard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthPrompt } from '@/components/AuthPrompt';
import { ExportToDriveDialog } from '@/components/ExportToDriveDialog';


const Index = () => {
  const marbleRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (marbleRef.current) {
          marbleRef.current.style.backgroundPositionY = `${window.scrollY * 0.05}px`;
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal-on-scroll').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const enhancedData = analysisData && 'medicalPanels' in analysisData ? analysisData as EnhancedAnalysisResult : null;
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [extractionStep, setExtractionStep] = useState("");
  const [progressUpdate, setProgressUpdate] = useState<ProgressUpdate | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('idle');
  const [showExtraction, setShowExtraction] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentStage, setCurrentStage] = useState<Stage>('conversion');
  const [wasCompressed, setWasCompressed] = useState(false);
  const [clinicalAssessmentData, setClinicalAssessmentData] = useState<any>(null);
  const [showPostChatSections, setShowPostChatSections] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDriveSync, setIsDriveSync] = useState(false);
  const [usedTextExtraction, setUsedTextExtraction] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewReportData, setPreviewReportData] = useState<any>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  
  // Polling cancellation refs to prevent cross-contamination
  const pollingActiveRef = useRef(false);
  const currentPollingIdRef = useRef<string | null>(null);

  // Auto-scroll refs for smooth navigation
  const analysisRef = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<HTMLElement | null>(null);
  const abnormalPanelsRef = useRef<HTMLElement | null>(null);

  // Listen for auth dialog open events
  useEffect(() => {
    const handleOpenAuth = () => setShowAuthPrompt(true);
    window.addEventListener('open-auth-dialog', handleOpenAuth);
    return () => window.removeEventListener('open-auth-dialog', handleOpenAuth);
  }, []);

  // Helper function to scroll with animation
  const scrollToSection = (sectionId: string, delay: number = 300) => {
    setTimeout(() => {
      const section = document.getElementById(sectionId);
      if (section) {
        // Add entrance animation class before scrolling
        section.classList.add('animate-fade-in', 'animate-scale-in');
        
        // Add highlight effect
        section.style.transition = 'all 0.5s ease-out';
        section.style.boxShadow = '0 0 0 1px rgba(38, 50, 31, 0.2)';
        
        // Scroll into view
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Remove highlight after animation
        setTimeout(() => {
          section.style.boxShadow = 'none';
          section.classList.remove('animate-scale-in');
        }, 1000);
      }
    }, delay);
  };

  // Auto-scroll: When analysis starts, scroll to analysis section
  useEffect(() => {
    if (isAnalyzing && !isMobile) {
      scrollToSection('analysis-section', 300);
    }
  }, [isAnalyzing, isMobile]);

  // Database verification function for medical accuracy
  const verifyAnalysisIntegrity = async (checkAnalysisId: string): Promise<boolean> => {
    try {
      console.log('[AUDIT] Verifying analysis integrity:', checkAnalysisId);
      
      const { data, error } = await supabase
        .from('pdf_analyses')
        .select('id, result, created_at, status')
        .eq('id', checkAnalysisId)
        .single();
      
      if (error || !data) {
        console.error('[AUDIT] Integrity check failed:', error);
        toast.error('Unable to verify analysis data. Please refresh.');
        return false;
      }
      
      // Verify data consistency
      const resultData = data.result as any;
      const dbPatientName = resultData?.patientName;
      const statePatientName = analysisData?.patientName;
      
      if (dbPatientName && statePatientName && dbPatientName !== statePatientName) {
        console.error('[AUDIT] Data mismatch detected!', { 
          database: dbPatientName, 
          state: statePatientName 
        });
        toast.error('Data inconsistency detected. Refreshing from database...');
        await fetchFreshAnalysis(checkAnalysisId);
        return false;
      }
      
      console.log('[AUDIT] Integrity check passed');
      return true;
    } catch (error) {
      console.error('[AUDIT] Integrity verification error:', error);
      return false;
    }
  };

  // Fetch fresh analysis from database
  const fetchFreshAnalysis = async (fetchAnalysisId: string) => {
    try {
      console.log('[AUDIT] Fetching fresh analysis from database:', fetchAnalysisId);
      
      const { data, error } = await supabase
        .from('pdf_analyses')
        .select('*')
        .eq('id', fetchAnalysisId)
        .single();
      
      if (error) throw error;
      
      if (data?.result) {
        setAnalysisData(data.result as any as EnhancedAnalysisResult);
        setAnalysisTimestamp(data.created_at);
        setAnalysisId(data.id);
        console.log('[AUDIT] Fresh analysis data loaded from database');
        toast.success('Analysis data refreshed from database');
      }
    } catch (error) {
      console.error('[AUDIT] Error fetching fresh analysis:', error);
      toast.error('Failed to refresh analysis data');
    }
  };

  // Handle analysis completion with auto-refresh from database and auto-storage
  const handleAnalysisComplete = async (data: EnhancedAnalysisResult) => {
    console.log('[AUDIT] Analysis completed:', {
      patientName: data.patientName,
      testDate: data.testDate,
      panelsCount: data.medicalPanels?.length,
      timestamp: new Date().toISOString()
    });
    
    // CRITICAL: Clear all cached data first
    setAnalysisData(null);
    setClinicalAssessmentData(null);
    setShowPostChatSections(false);
    
    // Set initial data from response
    setAnalysisData(data);
    setAnalysisTimestamp(new Date().toISOString());
    setIsAnalyzing(false);
    
    // AUTO-STORAGE: Store comprehensive report automatically
    if (user && analysisId && data) {
      console.log('💾 AUTO-STORAGE: Initiating comprehensive report storage');
      
      try {
        // Generate comprehensive report
        const { generateFullComprehensiveReport } = await import('@/utils/generateFullComprehensiveReport');
        const { calculateHealthScore } = await import('@/utils/healthScoreCalculator');
        const { extractAbnormalPanels } = await import('@/types/medicalAnalysis');
        
        const healthScoreBreakdown = calculateHealthScore(
          data as any,
          data.demographics,
          {}
        );
        
        const abnormalPanels = extractAbnormalPanels(data as any).map(panel => ({
          panelName: panel.name || 'Unknown Panel',
          abnormalLabs: (panel.abnormalLabs || []).map(lab => ({
            parameter: lab.name,
            value: lab.value,
            unit: lab.unit || '',
            normalRange: lab.referenceRange || 'N/A',
            status: lab.status as 'high' | 'low' | 'normal'
          }))
        }));
        
        const valuesNeedingAttention = data.medicalPanels
          ?.flatMap((p: any) => p.abnormalLabs || [])
          .map((lab: any) => ({
            parameter: lab.name,
            value: lab.value,
            unit: lab.unit || '',
            normalRange: lab.referenceRange || 'N/A',
            status: lab.status as 'high' | 'low' | 'normal'
          })) || [];
        
        const result = await generateFullComprehensiveReport({
          patientInfo: {
            name: data.patientName || 'Not Available',
            age: data.demographics?.age,
            gender: data.demographics?.gender,
            testDate: data.testDate || 'Not Available'
          },
          summary: data.summary,
          overallStatus: data.overallStatus,
          healthScoreBreakdown,
          abnormalPanels,
          valuesNeedingAttention,
          clinicalAssessment: {},
          recommendations: {
            immediate: [],
            dietary: { toAdd: [], toLimitOrAvoid: [] },
            lifestyle: [],
            followUp: ''
          }
        });
        
        if (false && result.success && result.pdfBase64) { // cloud auto-storage disabled (account-free)
          console.log('📤 AUTO-STORAGE: Storing comprehensive report');
          
          const { error: storageError } = await supabase.functions.invoke('store-analysis-report', {
            body: {
              analysisId,
              pdfBase64: result.pdfBase64,
              reportType: 'comprehensive',
              filename: result.fileName
            }
          });
          
          if (storageError) {
            console.error('❌ AUTO-STORAGE: Failed to store report:', storageError);
          } else {
            console.log('✅ AUTO-STORAGE: Report stored successfully');
            
            // Check storage threshold
            await supabase.functions.invoke('check-storage-threshold', {
              body: { userId: user.id }
            });
          }
        }
      } catch (error) {
        console.error('❌ AUTO-STORAGE: Error during auto-storage:', error);
      }
    }
    
    // AUTO-REFRESH: Fetch fresh data from database after 2 seconds
    setTimeout(async () => {
      if (analysisId) {
        console.log('[AUDIT] Auto-refreshing analysis from database');
        await fetchFreshAnalysis(analysisId);
      }
    }, 2000);
  };

  // Questioning step removed: as soon as the analysis is ready, auto-complete the
  // (now-skipped) clinical assessment with an empty clinical context. Every downstream
  // section (report, health score, risk predictions) is gated on showPostChatSections
  // and tolerates empty clinical data, so this makes the full report render immediately
  // after the scan with no questions asked.
  useEffect(() => {
    if (showResults && analysisData && (!showPostChatSections || !clinicalAssessmentData)) {
      // Keep an empty placeholder in place even after a "Refresh" clears it, so the
      // risk/explore sections (which read clinical context) never disappear.
      if (!clinicalAssessmentData) setClinicalAssessmentData({});
      if (!showPostChatSections) setShowPostChatSections(true);
    }
  }, [showResults, analysisData, showPostChatSections, clinicalAssessmentData]);

  // Auto-scroll: when results are ready, land the user straight on their report.
  useEffect(() => {
    if (showResults && !isAnalyzing && !isMobile) {
      scrollToSection('comprehensive-report-section', 700);
    }
  }, [showResults, isAnalyzing, isMobile]);

  // Handle single report processing
  const handleDriveSync = async () => {
    try {
      // Process a sample report URL (replace with actual report URL when available)
      const sampleReportUrl = 'https://example.com/sample-report.pdf';
      
      const { data, error } = await supabase.functions.invoke('process-single-report', {
        body: {
          reportUrl: sampleReportUrl,
          filename: 'sample-medical-report.pdf'
        }
      });

      if (error) throw error;

      toast.success('Report processed successfully!');
      
      // Update the analysis data with the result
      if (data.result) {
        setAnalysisData(data.result);
        setAnalysisId(data.analysisId);
        setCurrentStage('results');
        setShowResults(true);
      }
      
    } catch (error) {
      console.error('Report processing error:', error);
      toast.error(`Report processing failed: ${error.message}`);
    } finally {
      setIsDriveSync(false);
    }
  };

  // Create enhanced analysis context for AI agent using medicalPanels data
  const createEnhancedAnalysisContext = (data: any) => {
    const baseContext = JSON.stringify(data);
    
    // Extract abnormal lab values - prefer medicalPanels, fallback to legacy
    const abnormalValues = [];
    const criticalFindings = [];
    const categories = {
      liver: [],
      kidney: [],
      lipids: [],
      hematology: [],
      endocrine: [],
      thyroid: [],
      other: []
    };
    
    // Use enhanced medicalPanels data if available
    if (data.medicalPanels && Array.isArray(data.medicalPanels)) {
      for (const panel of data.medicalPanels) {
        if (panel.abnormalLabs && Array.isArray(panel.abnormalLabs)) {
          for (const lab of panel.abnormalLabs) {
            const finding = `${lab.name}: ${lab.value} ${lab.unit || ''} (${lab.status}, ref: ${lab.referenceRange || 'N/A'})`;
            abnormalValues.push(finding);
            
            // Categorize by panel type
            const panelName = panel.name.toLowerCase();
            if (panelName.includes('liver')) {
              categories.liver.push(finding);
            } else if (panelName.includes('kidney')) {
              categories.kidney.push(finding);
            } else if (panelName.includes('lipid')) {
              categories.lipids.push(finding);
            } else if (panelName.includes('blood count') || panelName.includes('cbc')) {
              categories.hematology.push(finding);
            } else if (panelName.includes('blood sugar') || panelName.includes('hba1c')) {
              categories.endocrine.push(finding);
            } else if (panelName.includes('thyroid')) {
              categories.thyroid.push(finding);
            } else {
              categories.other.push(finding);
            }
            
            // Identify critical findings
            if (lab.status === 'high' || lab.status === 'low' || lab.status === 'critical') {
              criticalFindings.push(finding);
            }
          }
        }
      }
    } else if (data.detailedAnalysis && Array.isArray(data.detailedAnalysis)) {
      // Fallback to legacy format
      for (const item of data.detailedAnalysis) {
        if (item.status && item.status.toLowerCase() !== 'normal') {
          const finding = `${item.test}: ${item.value} ${item.unit || ''} (${item.status}, ref: ${item.referenceRange || 'N/A'})`;
          abnormalValues.push(finding);
          
          // Categorize findings for targeted questioning
          const testLower = item.test.toLowerCase();
          if (testLower.includes('alt') || testLower.includes('ast') || testLower.includes('bilirubin')) {
            categories.liver.push(finding);
          } else if (testLower.includes('creatinine') || testLower.includes('bun') || testLower.includes('egfr')) {
            categories.kidney.push(finding);
          } else if (testLower.includes('cholesterol') || testLower.includes('triglyceride') || testLower.includes('hdl') || testLower.includes('ldl')) {
            categories.lipids.push(finding);
          } else if (testLower.includes('hemoglobin') || testLower.includes('hematocrit') || testLower.includes('wbc') || testLower.includes('platelet')) {
            categories.hematology.push(finding);
          } else if (testLower.includes('glucose') || testLower.includes('hba1c')) {
            categories.endocrine.push(finding);
          } else if (testLower.includes('tsh') || testLower.includes('t3') || testLower.includes('t4')) {
            categories.thyroid.push(finding);
          } else {
            categories.other.push(finding);
          }
          
          // Identify critical findings
          if (item.status.toLowerCase().includes('high') || item.status.toLowerCase().includes('low')) {
            criticalFindings.push(finding);
          }
        }
      }
    }
    
    // Create enhanced context string with structured data
    const enhancedContext = `BLOOD REPORT ANALYSIS:

OVERALL STATUS: ${data.overallStatus || 'Unknown'}
PATIENT: ${data.patientName || 'Anonymous'}
DEMOGRAPHICS: ${data.demographics ? `Age: ${data.demographics.age || 'Unknown'}, Gender: ${data.demographics.gender || 'Unknown'}` : 'Not specified'}

ABNORMAL FINDINGS SUMMARY:
Total abnormalities detected: ${abnormalValues.length}

CATEGORICAL BREAKDOWN:
${categories.liver.length > 0 ? `🫁 LIVER FUNCTION: ${categories.liver.join('; ')}` : ''}
${categories.kidney.length > 0 ? `🫘 KIDNEY FUNCTION: ${categories.kidney.join('; ')}` : ''}
${categories.lipids.length > 0 ? `💊 LIPID PROFILE: ${categories.lipids.join('; ')}` : ''}
${categories.hematology.length > 0 ? `🩸 COMPLETE BLOOD COUNT: ${categories.hematology.join('; ')}` : ''}
${categories.endocrine.length > 0 ? `🔋 BLOOD SUGAR & HbA1c: ${categories.endocrine.join('; ')}` : ''}
${categories.thyroid.length > 0 ? `🦋 THYROID FUNCTION: ${categories.thyroid.join('; ')}` : ''}
${categories.other.length > 0 ? `⚗️ OTHER TESTS: ${categories.other.join('; ')}` : ''}

PRIORITY FINDINGS REQUIRING TARGETED ASSESSMENT: ${criticalFindings.join('; ')}

SUMMARY: ${data.summary || 'No summary available'}

RAW DATA: ${baseContext}`;
    
    return enhancedContext;
  };


  // Handle essential report download
  const handleDownloadEssentialReport = async () => {
    if (!analysisData) {
      toast.error('No analysis data available for report');
      return;
    }
    
    try {
      // Map analysis data to essential report format
      const allAbnormalLabs = analysisData.medicalPanels?.flatMap((panel: any) => 
        panel.abnormalLabs.map((lab: any) => ({
          parameter: lab.name,
          value: lab.value,
          unit: lab.unit || '',
          normalRange: lab.referenceRange || '',
          status: lab.status
        }))
      ) || [];

      await generateEssentialReportPdf({
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
      });
    } catch (error) {
      toast.error(`Failed to download report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Prepare report data for preview/download
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

  // Handle preview modal
  const handlePreviewReport = () => {
    const reportData = prepareReportData();
    if (reportData) {
      setPreviewReportData(reportData);
      setShowPreviewModal(true);
    } else {
      toast.error('No analysis data available for preview');
    }
  };

  // Handle download comprehensive report
  const handleDownloadComprehensiveReport = async () => {
    if (!analysisData || !enhancedData || !clinicalAssessmentData) {
      toast.error('Complete analysis data required for comprehensive report');
      return;
    }

    console.log('📄 Preparing comprehensive PDF with CURRENT patient data:', {
      patientName: analysisData.patientName,
      age: analysisData.demographics?.age,
      gender: analysisData.demographics?.gender,
      testDate: analysisData.testDate,
      panelsCount: analysisData.medicalPanels?.length
    });

    const { generateFullComprehensiveReport } = await import('@/utils/generateFullComprehensiveReport');
    const { calculateHealthScore } = await import('@/utils/healthScoreCalculator');
    const { extractAbnormalPanels } = await import('@/types/medicalAnalysis');
    const { parseClinicalContext } = await import('@/utils/parseClinicalContext');

    const healthScoreBreakdown = calculateHealthScore(
      enhancedData,
      analysisData.demographics,
      parseClinicalContext(clinicalAssessmentData)
    );

    const abnormalPanels = extractAbnormalPanels(enhancedData).map(panel => ({
      panelName: panel.name || 'Unknown Panel',
      abnormalLabs: (panel.abnormalLabs || []).map(lab => ({
        parameter: lab.name,
        value: lab.value,
        unit: lab.unit || '',
        normalRange: lab.referenceRange || 'N/A',
        status: lab.status as 'high' | 'low' | 'normal'
      }))
    }));

    const valuesNeedingAttention = enhancedData.medicalPanels
      .flatMap(p => p.abnormalLabs || [])
      .map(lab => ({
        parameter: lab.name,
        value: lab.value,
        unit: lab.unit || '',
        normalRange: lab.referenceRange || 'N/A',
        status: lab.status as 'high' | 'low' | 'normal'
      }));

    const result = await generateFullComprehensiveReport({
      patientInfo: {
        name: analysisData.patientName || 'Not Available',
        age: analysisData.demographics?.age,
        gender: analysisData.demographics?.gender,
        testDate: analysisData.testDate || 'Not Available'
      },
      summary: analysisData.summary,
      overallStatus: analysisData.overallStatus,
      healthScoreBreakdown,
      abnormalPanels,
      valuesNeedingAttention,
      clinicalAssessment: clinicalAssessmentData,
      recommendations: {
        immediate: clinicalAssessmentData.management?.generalRx || [],
        dietary: {
          toAdd: clinicalAssessmentData.management?.dietaryAdvice || [],
          toLimitOrAvoid: []
        },
        lifestyle: clinicalAssessmentData.management?.lifestyle || [],
        followUp: clinicalAssessmentData.followUp || ''
      }
    });
    
    console.log('🔍 STORAGE DEBUG - Comprehensive Report:', {
      resultSuccess: result.success,
      hasPdfBase64: !!result.pdfBase64,
      pdfBase64Length: result.pdfBase64?.length,
      analysisId: analysisId,
      fileName: result.fileName,
      userId: user?.id,
      isAuthenticated: !!user
    });
    
    // Store PDF in backend if generation successful
    if (result.success && result.pdfBase64 && analysisId) {
      console.log('✅ All conditions met - attempting to store comprehensive report');
      
      // Account-free build: cloud save disabled (users download their own copy).
      return;
      
      try {
        console.log('📤 Invoking store-analysis-report for comprehensive...');
        const { data, error } = await supabase.functions.invoke('store-analysis-report', {
          body: {
            analysisId,
            pdfBase64: result.pdfBase64,
            reportType: 'comprehensive',
            filename: result.fileName
          }
        });
        
        if (error) {
          console.error('❌ Edge function returned error:', error);
          toast.error('Failed to save report to cloud storage');
        } else {
          console.log('✅ Comprehensive report stored successfully:', data);
          toast.success('Report saved to your account');
        }
      } catch (error) {
        console.error('❌ Exception during storage:', error);
        toast.error('Error saving report to cloud');
      }
    } else {
      console.warn('⚠️ Storage skipped - condition failed:', {
        success: result.success,
        hasPdfBase64: !!result.pdfBase64,
        hasAnalysisId: !!analysisId
      });
    }
    
    console.log('✅ PDF generation completed');
  };

  // Handle download from preview modal
  const handleDownloadFromPreview = async () => {
    if (previewReportData) {
      await generateEssentialReportPdf(previewReportData);
      setShowPreviewModal(false);
    }
  };

  // Handle download 30-day plan
  const handleDownload30DayPlan = async () => {
    if (!analysisData || !enhancedData || !clinicalAssessmentData) {
      toast.error('Complete analysis data required for 30-day plan');
      return;
    }

    const { generate30DayPlan } = await import('@/utils/generate30DayPlan');
    const { generate30DayPlanPdf } = await import('@/utils/generate30DayPlanPdf');
    const { calculateHealthScore } = await import('@/utils/healthScoreCalculator');
    const { parseClinicalContext } = await import('@/utils/parseClinicalContext');

    const healthScoreBreakdown = calculateHealthScore(
      enhancedData,
      analysisData.demographics,
      parseClinicalContext(clinicalAssessmentData)
    );

    const plan = generate30DayPlan(healthScoreBreakdown);
    const result = await generate30DayPlanPdf(plan, analysisData.patientName || 'Patient');

    console.log('🔍 STORAGE DEBUG - 30-Day Plan:', {
      resultSuccess: result.success,
      hasPdfBase64: !!result.pdfBase64,
      pdfBase64Length: result.pdfBase64?.length,
      analysisId: analysisId,
      fileName: result.fileName,
      userId: user?.id,
      isAuthenticated: !!user
    });

    // Store PDF in backend if generation successful
    if (result.success && result.pdfBase64 && analysisId) {
      console.log('✅ All conditions met - attempting to store 30-day plan');
      
      // Account-free build: cloud save disabled (users download their own copy).
      return;
      
      try {
        console.log('📤 Invoking store-analysis-report for plan...');
        const { data, error } = await supabase.functions.invoke('store-analysis-report', {
          body: {
            analysisId,
            pdfBase64: result.pdfBase64,
            reportType: 'plan',
            filename: result.fileName
          }
        });
        
        if (error) {
          console.error('❌ Edge function returned error:', error);
          toast.error('Failed to save plan to cloud storage');
        } else {
          console.log('✅ 30-day plan stored successfully:', data);
          toast.success('Plan saved to your account');
        }
      } catch (error) {
        console.error('❌ Exception during plan storage:', error);
        toast.error('Error saving plan to cloud');
      }
    } else {
      console.warn('⚠️ Plan storage skipped - condition failed:', {
        success: result.success,
        hasPdfBase64: !!result.pdfBase64,
        hasAnalysisId: !!analysisId
      });
    }
  };

  // Handle clinical assessment completion
  const handleClinicalAssessmentComplete = (reportData: any) => {
    setClinicalAssessmentData(reportData);
    setShowPostChatSections(true); // Enable detailed analysis sections
    toast.success('Clinical assessment complete! Loading personalized analysis...');
    
    // Auto-scroll to summary section after completion - increased delay for DOM rendering
    setTimeout(() => {
      const summarySection = document.getElementById('summary-section');
      if (summarySection) {
        summarySection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
        
        // Add highlight animation
        summarySection.style.transition = 'box-shadow 0.5s ease-out';
        summarySection.style.boxShadow = '0 0 0 1px rgba(38, 50, 31, 0.2)';
        setTimeout(() => {
          summarySection.style.boxShadow = 'none';
        }, 2000);
      } else {
        // Retry after additional delay if element not found
        setTimeout(() => {
          const retrySection = document.getElementById('summary-section');
          if (retrySection) {
            retrySection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 500);
      }
    }, 1000);
    
    // Show auth prompt after 5 seconds if user is not logged in
    // Give extra time for auth state to load from remembered device
    setTimeout(() => {
      const isRemembered = localStorage.getItem('diagassist_remember_device') === 'true';
      // Only show auth prompt if device is not remembered and user is not authenticated
      if (!user && !isRemembered) {
        setShowAuthPrompt(true);
      }
    }, 5000);
  };


  // Initialize or restore analysis state from localStorage with validation
  useEffect(() => {
    const storedAnalysisId = localStorage.getItem('analysisId');
    const storedUserId = localStorage.getItem('currentUserId');
    const storedStatus = localStorage.getItem('processingStatus');
    const storedTimestamp = localStorage.getItem('analysisTimestamp');
    
    // Only restore if analysis is less than 1 hour old
    const ONE_HOUR = 60 * 60 * 1000;
    const isRecent = storedTimestamp && (Date.now() - parseInt(storedTimestamp)) < ONE_HOUR;
    
    if (storedAnalysisId && storedUserId && storedStatus !== 'completed' && storedStatus !== 'failed' && isRecent) {
      console.log('📦 Restoring recent analysis from localStorage:', storedAnalysisId);
      setAnalysisId(storedAnalysisId);
      setCurrentUserId(storedUserId);
      setProcessingStatus(storedStatus || 'processing');
      setIsAnalyzing(true);
      setExtractedText("Resuming analysis...");
      
      // Resume polling
      pollForResults(storedAnalysisId, storedUserId);
    } else if (storedAnalysisId) {
      // Clear stale data
      console.log('🧹 Clearing stale localStorage data');
      localStorage.removeItem('analysisId');
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('processingStatus');
      localStorage.removeItem('analysisTimestamp');
    }
  }, []);
  
  // Poll for analysis results with progressive intervals for better UX
  const pollForResults = useCallback(async (id: string, userId: string) => {
    console.log('🔄 Starting to poll for results for analysis:', id);
    pollingActiveRef.current = true;
    currentPollingIdRef.current = id;
    
    const maxPollingTime = 300000; // 5 minutes total timeout (increased for complex reports)
    const startTime = Date.now();
    let attempts = 0;
    
    const poll = async () => {
      // Check if polling should be cancelled
      if (!pollingActiveRef.current || currentPollingIdRef.current !== id) {
        console.log('🛑 Polling cancelled for:', id);
        return;
      }
      
      const elapsedTime = Date.now() - startTime;
      attempts++;
      
      // Progressive timeout messages for better UX
      if (elapsedTime >= 60000 && elapsedTime < 120000) {
        setExtractedText("Analysis in progress... Complex reports may take 2-3 minutes.");
      } else if (elapsedTime >= 120000 && elapsedTime < 240000) {
        setExtractedText("Still analyzing... This report contains detailed information that requires careful processing.");
      } else if (elapsedTime >= 240000) {
        setExtractedText("Final processing steps... Almost complete.");
      }
      
      if (elapsedTime >= maxPollingTime) {
        console.error('Analysis timeout after 5 minutes');
        setError('Analysis is taking longer than expected. This may be due to a very complex report or high server load. Please try again.');
        setIsAnalyzing(false);
        setProcessingStatus('failed');
        pollingActiveRef.current = false;
        currentPollingIdRef.current = null;
        localStorage.removeItem('analysisId');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('processingStatus');
        localStorage.removeItem('analysisTimestamp');
        return;
      }
      
      try {
        // Use the new edge function for secure anonymous access
        const { data, error } = await supabase.functions.invoke('get-analysis-result', {
          body: { analysisId: id, userId: userId }
        });
        
        if (error) {
          throw error;
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch analysis');
        }
        
        const analysis = data.analysis;
        setProcessingStatus(analysis.status);
        localStorage.setItem('processingStatus', analysis.status);
        
        if (analysis.status === 'completed' && analysis.result) {
          // Note: Database cleanup is handled by scheduled cleanup-old-analyses function
          
          // Normalize the analysis data structure
          const rawData = analysis.result;
          
          const normalizedData = {
            ...rawData,
            // Handle lifestyle data that might be nested under diet
            lifestyle: rawData.lifestyle || rawData.diet?.lifestyle || [],
            // Ensure diet structure exists with default arrays
            diet: {
              avoid: rawData.diet?.avoid || [],
              increase: rawData.diet?.increase || [],
              ...rawData.diet
            },
            // Map overallStatus to expected values
            overallStatus: rawData.overallStatus === 'normal' ? 'good' : rawData.overallStatus
          };
          
          setAnalysisData(normalizedData);
          setCurrentStage('results');
          setShowResults(true);
          setIsAnalyzing(false);
          setExtractedText(`Analysis completed successfully!`);
          
          pollingActiveRef.current = false;
          currentPollingIdRef.current = null;
          
          // Clear localStorage after successful completion
          localStorage.removeItem('analysisId');
          localStorage.removeItem('currentUserId');
          localStorage.removeItem('processingStatus');
          localStorage.removeItem('analysisTimestamp');
          
          toast.success('PDF analysis completed successfully!');
          
          // Send admin SMS alert for successful analysis (NON-NEGOTIABLE)
          console.log('📱 FRONTEND: Triggering admin SMS for analysis success:', id);
          supabase.functions.invoke('send-admin-alert', {
            body: {
              analysisId: id,
              userId: userId,
              status: 'success',
              patientName: normalizedData.demographics?.name || 'Unknown',
              timestamp: new Date().toISOString()
            }
          }).then(({ data, error: alertError }) => {
            if (alertError) {
              console.error('❌ FRONTEND SMS ALERT FAILED:', alertError);
            } else {
              console.log('✅ FRONTEND SMS ALERT SUCCESS:', data);
            }
          }).catch(err => {
            console.error('❌ FRONTEND SMS ERROR:', err);
          });
        } else if (analysis.status === 'failed') {
          console.error('❌ Analysis failed:', analysis.error_message);
          
          // Send admin SMS alert for analysis failure (NON-NEGOTIABLE)
          console.log('📱 FRONTEND: Triggering admin SMS for analysis FAILURE:', id);
          supabase.functions.invoke('send-admin-alert', {
            body: {
              analysisId: id,
              userId: userId,
              status: 'failed',
              error: analysis.error_message || 'Analysis failed without error message',
              timestamp: new Date().toISOString()
            }
          }).then(({ data, error: alertError }) => {
            if (alertError) {
              console.error('❌ FAILURE SMS ALERT FAILED:', alertError);
            } else {
              console.log('✅ FAILURE SMS ALERT SUCCESS:', data);
            }
          }).catch(err => {
            console.error('❌ FAILURE SMS ERROR:', err);
          });
          
          setError(analysis.error_message || 'Analysis failed');
          setIsAnalyzing(false);
          
          pollingActiveRef.current = false;
          currentPollingIdRef.current = null;
          
          // Clear localStorage after failure
          localStorage.removeItem('analysisId');
          localStorage.removeItem('currentUserId');  
          localStorage.removeItem('processingStatus');
          localStorage.removeItem('analysisTimestamp');
        } else {
          // Progressive polling intervals: start fast, then slow down
          let nextPollInterval;
          if (attempts <= 5) {
            nextPollInterval = 2000; // First 10 seconds: poll every 2s
          } else if (attempts <= 15) {
            nextPollInterval = 5000; // Next 50 seconds: poll every 5s  
          } else {
            nextPollInterval = 10000; // After 1 minute: poll every 10s
          }
          
          const elapsedSeconds = Math.floor(elapsedTime / 1000);
          setExtractedText(`Analysis in progress... (${elapsedSeconds}s elapsed)`);
          setTimeout(poll, nextPollInterval);
        }
      } catch (err) {
        console.error('❌ Polling error - Attempt', attempts, ':', err);
        console.error('❌ Error details:', JSON.stringify(err, null, 2));
        
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        const errorType = err instanceof TypeError ? 'NetworkError' : 'UnknownError';
        
        // Don't fail immediately on connection errors, give it more chances
        if (attempts < 12) { // Increased from 8 to 12 retries for better resilience
          // Use exponential backoff: 3s, 3s, 5s, 5s, 8s, 8s, 10s, 10s, 15s, 15s, 20s, 20s
          const backoffDelays = [3000, 3000, 5000, 5000, 8000, 8000, 10000, 10000, 15000, 15000, 20000, 20000];
          const delay = backoffDelays[attempts] || 20000;
          
          console.log(`⏳ Retrying in ${delay/1000}s... (attempt ${attempts + 1}/12)`);
          setTimeout(poll, delay);
        } else {
          // All retries exhausted - trigger admin alert and show error to user
          console.error('❌ CRITICAL: Polling failed after all retries');
          
          // Send admin SMS alert (don't wait - fire and forget)
          supabase.functions.invoke('send-admin-alert', {
            body: {
              analysisId: id,
              userId: userId,
              error: `Polling failed after 12 attempts: ${errorMessage}. Error type: ${errorType}`,
              timestamp: new Date().toISOString()
            }
          }).then(({ data, error: alertError }) => {
            if (alertError) {
              console.error('❌ Failed to send admin alert:', alertError);
            } else {
              console.log('📱 Admin alert sent successfully:', data);
            }
          }).catch(err => {
            console.error('❌ Admin alert exception:', err);
          });
          
          // Update database to mark analysis as failed (don't wait - fire and forget)
          supabase
            .from('pdf_analyses')
            .update({ 
              status: 'failed',
              error_message: `Polling timeout: ${errorMessage}`,
              error_timestamp: new Date().toISOString(),
              retry_count: 12,
              admin_alerted: true
            })
            .eq('id', id)
            .then(({ error: dbError }) => {
              if (dbError) {
                console.error('❌ Failed to update database:', dbError);
              } else {
                console.log('✅ Database updated - analysis marked as failed');
              }
            });
          
          setError('Analysis is taking longer than expected. Our team has been notified and will investigate. Please try again or contact support.');
          setIsAnalyzing(false);
          setProcessingStatus('failed');
          pollingActiveRef.current = false;
          currentPollingIdRef.current = null;
          localStorage.removeItem('analysisId');
          localStorage.removeItem('currentUserId');
          localStorage.removeItem('processingStatus');
          localStorage.removeItem('analysisTimestamp');
        }
      }
    };
    
    poll();
  }, []);

  // Simplified processing - client-side only

  // Process the PDF on the client-side: try text extraction first, fallback to images
  // Extract one report's payload locally — fast text path, or images for server OCR. No network.
  const extractReport = async (
    file: File,
    idx: number,
    total: number
  ): Promise<{ filename: string; text?: string; images?: string[] }> => {
    setCurrentStage('conversion');
    setExtractionStep(total > 1 ? `Reading report ${idx + 1} of ${total}: ${file.name}...` : 'Extracting text locally...');

    const textResult = await extractPdfText(file);
    if (textResult.success && textResult.isSelectableText && textResult.text && textResult.text.length > 1000) {
      setUsedTextExtraction(true);
      return { filename: file.name, text: textResult.text };
    }

    // Scanned/photo PDF → render pages to images for server-side OCR.
    const { convertPdfToImages } = await import('@/utils/pdfToImages');
    setProgressUpdate({ message: total > 1 ? `Scanning report ${idx + 1} of ${total}...` : 'Converting scanned pages to images...', percentage: 0 });
    const conversionResult = await convertPdfToImages(file, (update) => {
      if (update.message.toLowerCase().includes('compress') || update.message.toLowerCase().includes('optim')) {
        setCurrentStage('optimization');
      }
      setProgressUpdate(update);
    });
    if (!conversionResult.success) {
      throw new Error(conversionResult.error || 'Failed to convert PDF');
    }
    setWasCompressed(conversionResult.wasCompressed || false);
    setProgressUpdate(null);
    return { filename: file.name, images: conversionResult.images || [] };
  };

  // Send one or more extracted reports to the backend for a single combined analysis.
  const sendReportsForAnalysis = async (
    reports: Array<{ filename: string; text?: string; images?: string[] }>,
    userId: string
  ) => {
    setCurrentStage('analysis');
    const requestBody: any = { userId, reports, filename: reports[0]?.filename || 'report.pdf' };

    const invokeOnce = async () => {
      const { data, error } = await supabase.functions.invoke('analyze-medical-report', { body: requestBody });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to start analysis');
      return data;
    };

    try {
      const data = await invokeOnce();
      setProgressUpdate(null);
      return { analysisId: data.analysisId, status: data.status, message: data.message || 'Processing started successfully', userId: data.userId || userId };
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : '';
      if (msg && /load failed|network/i.test(msg)) {
        console.warn('⚠️ Transient network error, retrying once...');
        const data = await invokeOnce();
        setProgressUpdate(null);
        return { analysisId: data.analysisId, status: data.status, message: data.message || 'Processing started successfully', userId: data.userId || userId };
      }
      throw e;
    }
  };

  // Extract every selected report, then submit them together for combined analysis.
  const processMultipleReports = async (files: File[]) => {
    if (!user) {
      throw new Error('Authentication required. Please sign in to analyze reports.');
    }
    const userId = user.id;
    setCurrentUserId(userId);
    try {
      const reports: Array<{ filename: string; text?: string; images?: string[] }> = [];
      for (let i = 0; i < files.length; i++) {
        reports.push(await extractReport(files[i], i, files.length));
      }
      setExtractionStep(files.length > 1 ? `Analyzing ${files.length} reports together...` : 'Uploading for analysis...');
      return await sendReportsForAnalysis(reports, userId);
    } catch (error) {
      console.error('Client-side processing failed:', error);
      setProgressUpdate(null);
      throw new Error(`PDF processing failed. ${error instanceof Error ? error.message : 'Please ensure your PDFs are readable and try again.'}`);
    }
  };

  const processClientSide = (file: File) => processMultipleReports([file]);

  const handleFilesSelect = async (filesInput: File[]) => {
    const files = (filesInput || []).slice(0, 5); // cap at 5 reports
    if (files.length === 0) return;
    const primary = files[0];
    const label = files.length > 1 ? `${files.length} reports` : primary.name;
    console.log('📁 File(s) selected:', files.map((f) => f.name).join(', '));

    // CRITICAL: Clear all previous state and cancel any ongoing polling FIRST
    pollingActiveRef.current = false;
    currentPollingIdRef.current = null;
    localStorage.clear();

    setSelectedFile(primary);
    setSelectedFiles(files);
    setCapturedImages([]);
    setError(null);
    setIsAnalyzing(true);
    setExtractedText("");
    setExtractionStep("");
    setProgressUpdate(null);
    setShowResults(false);
    setAnalysisData(null);
    setClinicalAssessmentData(null);
    setShowPostChatSections(false);
    setProcessingStatus('starting');
    setCurrentStage('conversion');
    setWasCompressed(false);

    toast.info("Starting New Analysis", {
      description: files.length > 1
        ? `Reading and combining ${files.length} reports for a richer analysis...`
        : "Clearing previous data and processing your new report...",
    });

    // Auto-scroll to analysis section on mobile after a short delay
    if (isMobile && analysisRef.current) {
      setTimeout(() => {
        analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 800);
    }

    try {
      const response = await processMultipleReports(files);

      if (response.analysisId) {
        const returnedUserId = response.userId || currentUserId;

        setAnalysisId(response.analysisId);
        setCurrentUserId(returnedUserId);

        localStorage.setItem('analysisId', response.analysisId);
        localStorage.setItem('currentUserId', returnedUserId);
        localStorage.setItem('processingStatus', 'processing');
        localStorage.setItem('analysisTimestamp', Date.now().toString());

        if (usedTextExtraction) {
          setExtractedText(`Processing started for ${label}. Fast mode: typically completes in 30-60 seconds.`);
        } else {
          setExtractedText(`Processing started for ${label}. OCR mode: typically completes in 1-2 minutes.`);
        }
        setProcessingStatus('processing');
        setExtractionStep("Analysis in progress... Results will appear automatically.");

        pollForResults(response.analysisId, returnedUserId);
      } else {
        setExtractedText(`Analysis completed successfully for ${label}`);
        setAnalysisData(response);
        setCurrentStage('results');
        setShowResults(true);
        setIsAnalyzing(false);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      setIsAnalyzing(false);
      setExtractionStep("");
      setProgressUpdate(null);
    }
  };

  const handleFileSelect = (file: File) => handleFilesSelect([file]);

  // Handle camera-captured images
  const handleCameraImages = async (images: string[]) => {
    console.log(`📸 ${images.length} images captured from camera`);
    
    // CRITICAL: Clear all previous state and cancel any ongoing polling FIRST
    console.log('🧹 Clearing previous analysis state and cancelling active polling');
    pollingActiveRef.current = false;
    currentPollingIdRef.current = null;
    localStorage.clear();
    
    setSelectedFile(null);
    setCapturedImages(images);
    setError(null);
    setIsAnalyzing(true);
    setExtractedText("");
    setExtractionStep("");
    setProgressUpdate(null);
    setShowResults(false);
    setAnalysisData(null);
    setClinicalAssessmentData(null);
    setProcessingStatus('starting');
    setCurrentStage('analysis'); // Skip conversion for camera images
    setWasCompressed(false);
    
    toast.info("Starting New Analysis", {
      description: `Processing ${images.length} captured photos...`,
    });

    try {
      setExtractedText(`Processing ${images.length} images from camera...`);
      setCurrentStage('analysis');
      
      // CRITICAL: Authentication is MANDATORY - use authenticated user ID only
      if (!user) {
        throw new Error('Authentication required. Please sign in to analyze reports.');
      }
      
      const userId = user.id;
      setCurrentUserId(userId);
      
      console.log('👤 Using authenticated userId:', userId);
      
      const requestBody = {
        userId,
        filename: `camera-capture-${Date.now()}.jpg`,
        type: 'images',
        images: images
      };
      
      const { data, error } = await supabase.functions.invoke('process-pdf-report', {
        body: requestBody
      });
      
      if (error) {
        throw error;
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Processing failed');
      }
      
      if (data.analysisId) {
        const returnedUserId = data.userId || userId;
        
        setAnalysisId(data.analysisId);
        setCurrentUserId(returnedUserId);
        
        localStorage.setItem('analysisId', data.analysisId);
        localStorage.setItem('currentUserId', returnedUserId);
        localStorage.setItem('processingStatus', 'processing');
        localStorage.setItem('analysisTimestamp', Date.now().toString());
        
        setExtractedText(`Processing ${images.length} camera images. Typically completes in 1-2 minutes.`);
        setProcessingStatus('processing');
        
        pollForResults(data.analysisId, returnedUserId);
      }
      
    } catch (err) {
      console.error('Camera images analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      setIsAnalyzing(false);
      setExtractionStep("");
      setProgressUpdate(null);
    }
  };

  const handleDownloadReport = async () => {
    if (!analysisData) {
      console.error('No analysis data available for download');
      toast.error('No analysis data available for download');
      return;
    }
    
    console.log('🔄 Starting PDF download...');
    console.log('📊 Analysis data structure:', Object.keys(analysisData));
    
    try {
      // Import jsPDF properly
      const { jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 25;

      console.log('📄 PDF initialized, building content...');

      // Header with purple background
      pdf.setFillColor(147, 51, 234);
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      // Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('diagassist-health-ai - Analysis Report', pageWidth / 2, 15, { align: 'center' });
      
      yPosition = 35;

      // Patient Information
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Patient Information', 20, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      // Extract patient name from analysis data if available
      const patientNameFromData = analysisData?.patientName || analysisData?.summary?.match(/Patient:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i)?.[1];
      pdf.text(`Patient: ${patientNameFromData || 'Anonymous Patient'}`, 20, yPosition);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 60, yPosition);
      yPosition += 15;

      // Helper function to check if we need a new page
      const checkPageBreak = (requiredSpace: number = 20) => {
        if (yPosition > pageHeight - requiredSpace) {
          pdf.addPage();
          yPosition = 20;
        }
      };

      // Overall Status
      checkPageBreak(30);
      pdf.setTextColor(147, 51, 234);
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Overall Health Status', 20, yPosition);
      yPosition += 8;
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      
      if (analysisData.summary) {
        const summaryLines = pdf.splitTextToSize(analysisData.summary, pageWidth - 40);
        checkPageBreak(summaryLines.length * 5 + 10);
        pdf.text(summaryLines, 20, yPosition);
        yPosition += summaryLines.length * 5 + 10;
      }

      // Key Findings
      if (analysisData.keyFindings && analysisData.keyFindings.length > 0) {
        checkPageBreak(30);
        pdf.setTextColor(147, 51, 234);
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Key Findings', 20, yPosition);
        yPosition += 8;
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        
        analysisData.keyFindings.forEach((finding: string) => {
          const findingLines = pdf.splitTextToSize(`• ${finding}`, pageWidth - 40);
          checkPageBreak(findingLines.length * 5 + 5);
          pdf.text(findingLines, 20, yPosition);
          yPosition += findingLines.length * 5 + 2;
        });
        yPosition += 10;
      }

      // Lab Results
      if (analysisData.labs && analysisData.labs.length > 0) {
        checkPageBreak(30);
        pdf.setTextColor(147, 51, 234);
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Laboratory Results', 20, yPosition);
        yPosition += 8;
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'normal');
        
        analysisData.labs.forEach((lab: any) => {
          checkPageBreak(15);
          const labText = `${lab.name}: ${lab.value}${lab.unit ? ' ' + lab.unit : ''} (${lab.status})`;
          pdf.text(labText, 20, yPosition);
          yPosition += 5;
        });
        yPosition += 10;
      }

      // Diet Recommendations
      if (analysisData.diet) {
        checkPageBreak(30);
        pdf.setTextColor(147, 51, 234);
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Diet Recommendations', 20, yPosition);
        yPosition += 8;
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        
        if (analysisData.diet.increase && analysisData.diet.increase.length > 0) {
          checkPageBreak(15);
          pdf.text('Increase:', 20, yPosition);
          yPosition += 5;
          analysisData.diet.increase.forEach((item: string) => {
            checkPageBreak(10);
            pdf.text(`• ${item}`, 25, yPosition);
            yPosition += 5;
          });
        }
        
        if (analysisData.diet.avoid && analysisData.diet.avoid.length > 0) {
          yPosition += 5;
          checkPageBreak(15);
          pdf.text('Avoid:', 20, yPosition);
          yPosition += 5;
          analysisData.diet.avoid.forEach((item: string) => {
            checkPageBreak(10);
            pdf.text(`• ${item}`, 25, yPosition);
            yPosition += 5;
          });
        }
        yPosition += 10;
      }

      // Lifestyle Recommendations
      const lifestyleList = analysisData.lifestyle || [];
      if (lifestyleList.length > 0) {
        checkPageBreak(30);
        pdf.setTextColor(147, 51, 234);
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Lifestyle Recommendations', 20, yPosition);
        yPosition += 8;
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        
        lifestyleList.forEach((item: string) => {
          const itemLines = pdf.splitTextToSize(`• ${item}`, pageWidth - 40);
          checkPageBreak(itemLines.length * 5 + 5);
          pdf.text(itemLines, 20, yPosition);
          yPosition += itemLines.length * 5 + 2;
        });
      }


      console.log('💾 Generating PDF file...');
      
      // Generate and download PDF using the reliable pdf.save method
      const filename = `DAIG_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;
      
      console.log('✅ PDF generated successfully, initiating download:', filename);
      
      // Use the reliable pdf.save() method instead of manual blob creation
      pdf.save(filename);
      
      console.log('✅ PDF download initiated successfully');
      toast.success('Analysis report downloaded successfully!');
      
    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      toast.error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReset = async () => {
    console.log('🧹 Starting comprehensive cleanup...');
    
    // Cancel any active polling FIRST
    pollingActiveRef.current = false;
    currentPollingIdRef.current = null;
    
    // Clear all state
    setSelectedFile(null);
    setCapturedImages([]);
    setAnalysisData(null);
    setClinicalAssessmentData(null);
    setShowResults(false);
    setError(null);
    setExtractedText("");
    setExtractionStep("");
    setProgressUpdate(null);
    setAnalysisId(null);
    setProcessingStatus('idle');
    setIsAnalyzing(false);
    setShowExtraction(false);
    setCurrentUserId('');
    setCurrentStage('conversion');
    setWasCompressed(false);
    
    // Clear ALL localStorage keys
    localStorage.clear();
    console.log('✅ LocalStorage cleared');
    
    // Clear session storage as well
    sessionStorage.clear();
    console.log('✅ SessionStorage cleared');
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    toast.success('Ready for fresh analysis with latest AI');
  };

  // Handle refresh analysis - force re-analyze the same report
  const handleRefreshAnalysis = async () => {
    if (!selectedFile) {
      toast.error('No report selected to refresh');
      return;
    }
    
    console.log('🔄 Refreshing analysis with latest AI...');
    toast.info('Re-analyzing your report with improved AI...');
    
    // Clear old analysis data but keep the file
    setAnalysisData(null);
    setShowResults(false);
    setClinicalAssessmentData(null);
    setShowPostChatSections(false);
    
    // Clear localStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Trigger new analysis with the same file
    await handleFileSelect(selectedFile);
  };

  const getProcessingMessage = () => {
    if (usedTextExtraction) {
      return 'Making sense of your results.';
    }
    switch (processingStatus) {
      case 'starting':
        return "Initializing analysis...";
      case 'processing':
        return "Analysis in progress... Typically completes in 1-2 minutes.";
      case 'completed':
        return "Analysis completed successfully!";
      case 'failed':
        return "Analysis failed. Please try again.";
      default:
        return extractionStep || "Processing your report...";
    }
  };

  return (
    <div className="min-h-screen bg-transparent font-inter">
      <div className="site-marble" aria-hidden="true" ref={marbleRef}>
        <span className="marble-sheen" />
        <span className="marble-blob marble-blob--1" />
        <span className="marble-blob marble-blob--2" />
        <span className="marble-blob marble-blob--3" />
        <span className="marble-blob marble-blob--4" />
        <span className="marble-blob marble-blob--5" />
        <span className="orb orb--1" />
        <span className="orb orb--2" />
        <span className="orb orb--3" />
        <span className="orb orb--4" />
        <span className="orb orb--5" />
        <span className="orb orb--6" />
        <span className="orb orb--7" />
        <span className="orb orb--8" />
        <span className="orb orb--9" />
        <span className="orb orb--10" />
        <span className="orb orb--11" />
        <span className="orb orb--12" />
        <span className="orb orb--13" />
        <span className="orb orb--14" />
        <span className="orb orb--15" />
        <span className="orb orb--16" />
        <span className="orb orb--17" />
        <span className="orb orb--18" />
        <span className="orb orb--19" />
        <span className="orb orb--20" />
        <span className="orb orb--21" />
        <span className="orb orb--22" />
        <span className="orb orb--23" />
        <span className="orb orb--24" />
        <span className="orb orb--25" />
        <span className="orb orb--26" />
        <span className="orb orb--27" />
        <span className="orb orb--28" />
        <span className="orb orb--29" />
        <span className="orb orb--30" />
        <span className="orb orb--31" />
        <span className="orb orb--32" />
        <span className="orb orb--33" />
        <span className="orb orb--34" />
        <span className="orb orb--35" />
        <span className="orb orb--36" />
        <span className="orb orb--37" />
        <span className="orb orb--38" />
        <span className="orb orb--39" />
        <span className="orb orb--40" />
      </div>
      {/* Global Navigation */}
      <GlobalNav theme="dark" />

      <main className="w-full">
        {/* 2. HERO SECTION - Premium Futuristic with Video Background */}
        {!selectedFile && !showResults && !error && (
          <>
            <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden pt-16 pb-10 md:pt-24 md:pb-16">
              {/* Full-width Background Video with Parallax */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                
                
                {/* Lighter Semi-transparent Dark Gradient Overlay for better video visibility */}
                <div 
                  className="absolute inset-0 z-10"
                  style={{
                    background: 'transparent'
                  }}
                />
              </div>
              
              {/* Hero Content - Centered and Mobile Optimized */}
              <div className="relative z-20 container mx-auto px-4 sm:px-6">
                <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                <div className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left space-y-6 sm:space-y-8 md:space-y-10 animate-fade-up">
                  
                  {/* Headline - Mobile Optimized */}
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-poppins font-light text-foreground leading-tight tracking-tight px-2">
                    Understand your medical reports
                  </h1>
                  <p className="text-sm sm:text-base md:text-lg text-foreground font-inter max-w-2xl mx-auto leading-relaxed px-2 pt-4">
                    Upload a lab report and get an AI breakdown — health score, risk predictions, and a personalized 30-day plan.
                  </p>
                  
                  {/* Tagline - Mobile Optimized */}
                  
                  {/* CTA Buttons - Mobile Optimized */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-6 pt-6 sm:pt-8 md:pt-10 px-2">
                    {/* Primary CTA - Mobile Friendly */}
                    <button
                      onClick={() => {
                        const uploadSection = document.getElementById('upload-section');
                        uploadSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg font-poppins font-light text-sm sm:text-base text-foreground border border-foreground/30 bg-transparent transition-colors duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary w-full sm:w-auto"
                    >
                      <span className="flex items-center justify-center gap-2 relative z-10">
                        Start
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </button>
                  </div>
                  
                  {/* Sample Report Preview */}
                  <div className="flex justify-center pt-6">
                    <div className="flex flex-col items-center gap-2">
                      <SampleReportPreview />
                      <p className="text-xs text-foreground">See the full analysis you'll get</p>
                    </div>
                  </div>
                </div>
                <div className="relative mt-10 lg:mt-0">
                  <img src={heroOrganic} alt="" loading="eager" className="w-full aspect-[4/5] object-cover rounded-3xl border border-foreground/10" />
                </div>
                </div>
              </div>
              
              {/* Scroll indicator with glow */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 animate-bounce opacity-60">
                <div className="w-6 h-10 border border-foreground/30 rounded-full flex items-start justify-center p-2">
                  <div className="w-1 h-2 bg-foreground/50 rounded-full animate-pulse" />
                </div>
              </div>
            </section>

            {/* 3. HOW IT WORKS - Compact Flow */}
            <section id="how-it-works" className="py-12 sm:py-16 md:py-20 bg-transparent">
              <div className="container mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="reveal-on-scroll text-center mb-10 sm:mb-12 space-y-3">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-poppins font-light text-foreground">
                    How It Works
                  </h2>
                  <p className="text-foreground text-sm sm:text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
                    Your medical data deserves more than numbers — it deserves understanding.
                    Our intelligent system analyzes your reports, interprets results, and builds a personalized 30-day roadmap toward better health and lasting wellness.
                  </p>
                </div>
                
                {/* Compact Flow - Horizontal on Desktop, Vertical on Mobile */}
                <div className="max-w-5xl mx-auto">
                                    <div className="reveal-on-scroll grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border mb-16">
                    <div className="px-0 sm:px-6 md:px-8 py-6 sm:py-4">
                      <span className="block text-xs tracking-[0.25em] text-muted-foreground">01</span>
                      <h3 className="mt-3 text-lg font-poppins font-light text-foreground">Upload</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">Secure PDF or image upload.</p>
                    </div>
                    <div className="px-0 sm:px-6 md:px-8 py-6 sm:py-4">
                      <span className="block text-xs tracking-[0.25em] text-muted-foreground">02</span>
                      <h3 className="mt-3 text-lg font-poppins font-light text-foreground">AI Analysis</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">Real-time reading of every parameter.</p>
                    </div>
                    <div className="px-0 sm:px-6 md:px-8 py-6 sm:py-4">
                      <span className="block text-xs tracking-[0.25em] text-muted-foreground">03</span>
                      <h3 className="mt-3 text-lg font-poppins font-light text-foreground">Clinical Chat</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">Personalized questions and answers.</p>
                    </div>
                    <div className="px-0 sm:px-6 md:px-8 py-6 sm:py-4">
                      <span className="block text-xs tracking-[0.25em] text-muted-foreground">04</span>
                      <h3 className="mt-3 text-lg font-poppins font-light text-foreground">Results</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">Comprehensive, readable insights.</p>
                    </div>
                  </div>

                                  </div>
              </div>
            </section>

            {/* What you get — olive editorial anchor section */}
            <section data-nav-dark className="bg-primary text-primary-foreground py-20 sm:py-24 md:py-28">
              <div className="container mx-auto px-6 max-w-4xl">
                <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/55">What you get</p>
                <div className="mt-8 divide-y divide-primary-foreground/15">
                  <div className="py-6 grid md:grid-cols-2 gap-1 md:gap-10">
                    <h3 className="text-2xl md:text-3xl font-poppins font-light">Health Score</h3>
                    <p className="text-primary-foreground/70 leading-relaxed">A single 0-100 read on where you stand, benchmarked to your age group.</p>
                  </div>
                  <div className="py-6 grid md:grid-cols-2 gap-1 md:gap-10">
                    <h3 className="text-2xl md:text-3xl font-poppins font-light">Risk Predictions</h3>
                    <p className="text-primary-foreground/70 leading-relaxed">Cardiovascular and diabetes trajectories over the next ten years.</p>
                  </div>
                  <div className="py-6 grid md:grid-cols-2 gap-1 md:gap-10">
                    <h3 className="text-2xl md:text-3xl font-poppins font-light">30-Day Plan</h3>
                    <p className="text-primary-foreground/70 leading-relaxed">A personalized roadmap of diet, lifestyle and follow-up steps.</p>
                  </div>
                  <div className="py-6 grid md:grid-cols-2 gap-1 md:gap-10">
                    <h3 className="text-2xl md:text-3xl font-poppins font-light">Health Journey</h3>
                    <p className="text-primary-foreground/70 leading-relaxed">Track how your numbers move as you act on the plan.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. UPLOAD SECTION - With Video Background */}
            {/* Brand statement */}
            <section className="py-24 sm:py-32 md:py-40">
              <div className="container mx-auto px-6 max-w-3xl text-center">
                <p className="reveal-on-scroll text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">Your privacy</p>
                <p className="reveal-on-scroll text-3xl sm:text-4xl md:text-5xl font-poppins font-light tracking-tight text-foreground leading-tight">
                  Your health information stays yours.
                </p>
                <p className="reveal-on-scroll mt-6 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  Your report is used only to generate your analysis and is handled with privacy in mind.
                </p>
              </div>
            </section>

            <section id="upload-section" className="relative py-16 sm:py-20 md:py-28 overflow-hidden">
              {/* Full-width Background Video - Clear and Visible */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                
                {/* Darker overlay for better text readability */}
                <div className="absolute inset-0 bg-background" />
              </div>

              {/* Content over video - Enhanced text visibility */}
              <div className="container mx-auto px-4 sm:px-6 relative z-10">
                {/* Title - Enhanced text shadow */}
                <div className="reveal-on-scroll text-center mb-8 sm:mb-10 md:mb-12 space-y-2 sm:space-y-3">
                  <h2 
                    className="text-2xl sm:text-3xl md:text-4xl font-poppins font-light text-foreground"
                  >
                    Upload Your Test Report
                  </h2>
                  <p 
                    className="text-foreground text-sm sm:text-base md:text-lg"
                  >
                    Supported formats: PDF, JPG, PNG. Get instant AI-powered analysis.
                  </p>
                </div>
                

                {/* Upload zone - No box wrapper */}
                <div className="max-w-4xl mx-auto">
                  <UploadZone
                    onFileSelect={handleFileSelect}
                    onFilesSelect={handleFilesSelect}
                    onImagesCapture={handleCameraImages}
                  />
                </div>

                {/* Privacy Notice - Enhanced visibility */}
                <div className="max-w-4xl mx-auto mt-6 text-center">
                  <p 
                    className="text-sm text-foreground leading-relaxed"
                  >
                    <span className="font-semibold">Privacy Protected:</span> Your medical data is encrypted and automatically deleted after analysis. We never store your reports or personal health information permanently.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* DISCLAIMER - Bottom of Page */}
        <section className="py-8 bg-card backdrop-blur-xl border-t border-white/10">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h4 className="text-foreground font-poppins font-light text-sm sm:text-base mb-3">
                Important Disclaimer
              </h4>
              <p className="text-foreground text-xs sm:text-sm leading-relaxed">
                This report is generated using AI analysis and is intended for informational purposes only. It should not replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals for medical concerns.
              </p>
            </div>
          </div>
        </section>

        {/* 4. AI ANALYSIS SECTION */}
        {isAnalyzing && (
          <section ref={analysisRef} id="analysis-section" className="py-12 sm:py-16 md:py-24 bg-card min-h-screen flex items-center justify-center transition-all duration-500">
            <div className="container mx-auto px-4 sm:px-6 animate-fade-in">
              <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-poppins font-light text-foreground px-4">
                  AI Analysis in Progress
                </h2>
                
                {/* Status — editorial */}
                <div className="flex items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs uppercase tracking-[0.18em]">
                  <span className={selectedFile ? 'text-foreground' : 'text-muted-foreground/50'}>File received</span>
                  <span className="w-5 sm:w-8 h-px bg-border" />
                  <span className={processingStatus === 'processing' ? 'text-primary' : processingStatus === 'completed' ? 'text-foreground' : 'text-muted-foreground/50'}>Parsing</span>
                  <span className="w-5 sm:w-8 h-px bg-border" />
                  <span className={processingStatus === 'completed' ? 'text-foreground' : 'text-muted-foreground/50'}>Insights</span>
                </div>
                
                {/* Stage Progress Indicator */}
                <StageProgress 
                  currentStage={currentStage}
                  wasCompressed={wasCompressed}
                />
                
                {/* Animated Loader */}
                <div className="glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12">
                  {progressUpdate ? (
                    <div className="space-y-4">
                      <CompressionProgress 
                        message={progressUpdate.message}
                        percentage={progressUpdate.percentage}
                        estimatedSecondsRemaining={progressUpdate.estimatedSecondsRemaining}
                      />
                    </div>
                  ) : (
                    <AnimatedLoader 
                      message={getProcessingMessage()}
                      onCancel={processingStatus === 'processing' ? handleReset : undefined}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Error Section */}
        {error && (
          <section className="py-24 bg-card min-h-screen flex items-center justify-center">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-2xl mx-auto text-center space-y-8">
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Couldn&rsquo;t analyze</p>
                  <h3 className="text-2xl sm:text-3xl font-poppins font-light text-foreground">We couldn&rsquo;t read that report</h3>
                  <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">{error}</p>
                  <p className="text-sm text-muted-foreground/80 max-w-md mx-auto leading-relaxed">
                    Try another PDF or a clear photo of your report &mdash; this works best with reports that contain numeric lab values (blood counts, chemistry panels, glucose, lipids, and the like).
                  </p>
                </div>
                <div className="max-w-md mx-auto pt-2">
                  <UploadZone
                    onFileSelect={(f) => { setError(null); handleFileSelect(f); }}
                    onFilesSelect={(fs) => { setError(null); handleFilesSelect(fs); }}
                    onImagesCapture={(imgs) => { setError(null); handleCameraImages(imgs); }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 5. CLINICAL CHAT SECTION + 6. INTERPRETATION SECTION */}
        {showResults && !isAnalyzing && analysisData && (
          <>
            {/* Floating glassy report assistant — ask questions about your own report in plain words.
                Context includes the raw analysis plus the computed health score and risk levels so
                the assistant can answer questions like "explain my health score" accurately. */}
            <ReportChatWidget
              analysisContext={(() => {
                const base = createEnhancedAnalysisContext(analysisData);
                if (!enhancedData) return base;
                try {
                  const cc = parseClinicalContext(clinicalAssessmentData);
                  const score = calculateHealthScore(enhancedData, analysisData.demographics, cc);
                  const risks = calculateHealthRisks(enhancedData, analysisData.demographics, cc);
                  const systemLine = Object.entries(score.systemScores)
                    .map(([k, v]: [string, any]) => `${k}: ${v.score}/100`)
                    .join(', ');
                  const summary =
                    `\n\nComputed results (use these for questions about the score or risk):\n` +
                    `Overall health score: ${score.overallScore}/100 (${score.categoryLabel}).\n` +
                    `Body-system scores: ${systemLine}.\n` +
                    `10-year cardiovascular risk level: ${risks.cardiovascularRisk.level}. ` +
                    `10-year diabetes risk level: ${risks.diabetesRisk.level}.`;
                  return base + summary;
                } catch {
                  return base;
                }
              })()}
            />

            {/* Mobile Swipeable Results View */}
            {isMobile ? (
              <MobileResultsView
                analysisData={analysisData}
                enhancedData={enhancedData}
                clinicalAssessmentData={clinicalAssessmentData}
                onClinicalAssessmentComplete={handleClinicalAssessmentComplete}
                onDownloadReport={handleDownloadEssentialReport}
                onPreviewReport={handlePreviewReport}
                onDismiss={handleReset}
                analysisId={analysisId || undefined}
              />
            ) : (
              <>
                {/* Desktop View - Keep all existing functionality */}

                <section className="py-8 sm:py-12 md:py-16 bg-card">
              <div className="container mx-auto px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl sm:text-2xl font-poppins font-light text-foreground">Your Analysis Results</h3>
                      {analysisId && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm sm:text-base text-foreground truncate">Based on: {selectedFile?.name}</p>
                    {analysisTimestamp && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Analysis completed: {new Date(analysisTimestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                    {analysisId && (
                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (analysisId) {
                            console.log('[AUDIT] Manual refresh triggered');
                            await fetchFreshAnalysis(analysisId);
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Activity className="w-4 h-4" />
                        Refresh Data
                      </Button>
                    )}
                    <Button
                      onClick={handleRefreshAnalysis}
                      variant="default"
                      className="bg-primary hover:bg-primary/90 w-full sm:w-auto text-sm sm:text-base"
                      size="sm"
                    >
                      <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      Refresh
                    </Button>
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      className="text-foreground border-white/15 hover:bg-card w-full sm:w-auto text-sm sm:text-base"
                      size="sm"
                    >
                      New Report
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <ErrorBoundary>
              <div className="w-full">
                {/* Patient Details */}
                <section className="py-6 sm:py-8 bg-card">
                    <div className="container mx-auto px-4 sm:px-6">
                      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
                        <ReportHeader 
                          patientName={analysisData?.patientName}
                          demographics={analysisData?.demographics}
                          overallStatus={analysisData?.overallStatus}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Clinical Chat questioning step removed — the report is shown
                      directly after the scan. See the auto-complete effect above. */}

                  {/* New Sections (shown immediately after the scan) */}
                  {enhancedData && showPostChatSections && (
                    <>
                      {/* Quick-nav dashboard widgets — jump to any section */}
                      <section className="pt-4 pb-2 animate-fade-in">
                        <ResultsDashboard
                          enhancedData={enhancedData}
                          demographics={analysisData.demographics}
                          clinicalContext={parseClinicalContext(clinicalAssessmentData)}
                        />
                      </section>

                      {/* CONSOLIDATED COMPREHENSIVE HEALTH REPORT - ALL IN ONE SECTION */}
                      <section id="comprehensive-report-section" className="py-6 sm:py-8 bg-gradient-to-br from-slate-50 to-white/5 transition-all duration-500">
                        <div className="container mx-auto px-4 sm:px-6 animate-fade-in">
                          <div className="max-w-6xl mx-auto space-y-4">
                            <div className="text-center mb-6">
                              <h2 className="text-2xl sm:text-3xl font-poppins font-light text-foreground mb-2">
                                Your Comprehensive Health Report
                              </h2>
                              <p className="text-sm sm:text-base text-foreground">
                                Complete analysis of your lab results
                              </p>
                            </div>
                            
                            <ConsolidatedHealthReport 
                              analysisData={enhancedData}
                              clinicalAssessmentData={clinicalAssessmentData}
                            />
                          </div>
                        </div>
                      </section>

                      {/* Health Score Calculator */}
                      <section id="health-score-section" className="py-6 sm:py-8 bg-gradient-to-br from-white/5 to-white/5 transition-all duration-500">
                        <div className="container mx-auto px-4 sm:px-6 animate-fade-in">
                          <div className="max-w-4xl mx-auto animate-scale-in">
                            <HealthScoreCard 
                              breakdown={calculateHealthScore(
                                enhancedData,
                                analysisData.demographics,
                                parseClinicalContext(clinicalAssessmentData)
                              )}
                            />
                          </div>
                        </div>
                      </section>

                      {/* Medical Validation Disclaimer */}
                      <div className="container mx-auto px-4 sm:px-6 py-3">
                        <div className="max-w-4xl mx-auto">
                          <p className="text-xs sm:text-sm text-muted-foreground text-center leading-relaxed">
                            Comprehensive health score calculator with 6 body systems (Metabolic 25%, Cardiovascular 25%, Kidney 15%, Liver 15%, Blood Health 10%, Endocrine 10%), medically validated scoring based on ADA/AHA/KDIGO/WHO guidelines
                          </p>
                        </div>
                      </div>
                    </>
                  )}


                  {/* Risk Prediction & Analysis Tools */}
                  {showPostChatSections && enhancedData && (
                    <section id="risk-analysis-section" className="py-6 sm:py-10 md:py-16 bg-card">
                      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
                        <div className="max-w-full lg:max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
                          <div className="text-center px-2">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-poppins font-light text-foreground mb-3 sm:mb-4">
                              Risk Predictions & Interactive Analysis
                            </h2>
                            <p className="text-sm sm:text-base text-foreground">
                              Understand your long-term health risks and explore interactive risk calculators
                            </p>
                          </div>

                          {(() => {
                            const clinicalContext = parseClinicalContext(clinicalAssessmentData);
                            const healthRisks = calculateHealthRisks(
                              enhancedData,
                              analysisData.demographics,
                              clinicalContext
                            );

                            // Personalize: only surface a risk category that is actually
                            // relevant to THIS patient — they have a related abnormal
                            // finding, or a non-low computed risk in that category.
                            const abnormalNames = extractAbnormalPanels(enhancedData)
                              .flatMap((p: any) => (p.abnormalLabs || []).map((l: any) => (l.name || '').toLowerCase()))
                              .join(' | ');
                            const cardioTerms = /(ldl|hdl|cholesterol|triglyceride|vldl|non-hdl|apob|apo b|lipoprotein|lp\(a\)|homocysteine)/;
                            const diabetesTerms = /(glucose|hba1c|glycated|glycosylated|a1c|insulin|c-peptide|blood sugar|fasting sugar)/;
                            const levelOrder = ['low', 'moderate', 'high', 'very-high'];
                            const isElevated = (r: any) => levelOrder.indexOf(r?.level) >= 1;
                            const showCardiovascular = cardioTerms.test(abnormalNames) || isElevated(healthRisks.cardiovascularRisk);
                            const showDiabetes = diabetesTerms.test(abnormalNames) || isElevated(healthRisks.diabetesRisk);

                            return (
                              <div className="space-y-8 animate-fade-in">
                                {(showCardiovascular || showDiabetes) ? (
                                  <>
                                    <RiskPredictionTimeline
                                      cardiovascularRisk={healthRisks.cardiovascularRisk}
                                      diabetesRisk={healthRisks.diabetesRisk}
                                      clinicalContext={clinicalContext}
                                      showCardiovascular={showCardiovascular}
                                      showDiabetes={showDiabetes}
                                    />

                                    <InteractiveRiskCalculator
                                      cardiovascularRisk={healthRisks.cardiovascularRisk}
                                      diabetesRisk={healthRisks.diabetesRisk}
                                      clinicalContext={clinicalContext}
                                      showCardiovascular={showCardiovascular}
                                      showDiabetes={showDiabetes}
                                    />
                                  </>
                                ) : (
                                  <div className="bg-card border border-white/10 rounded-xl p-5 text-center">
                                    <p className="text-sm sm:text-base text-foreground">
                                      Good news — based on these results, no elevated long-term heart or diabetes risk was flagged. Explore any area of your health below to learn what keeps it that way.
                                    </p>
                                  </div>
                                )}

                                {/* Everyone gets to explore — pick any aspect and see how habits shape it */}
                                <div id="explore-health-section" className="scroll-mt-4">
                                  <ExploreAspects
                                    enhancedData={enhancedData}
                                    clinicalContext={clinicalContext}
                                  />
                                </div>
                              </div>
                            );
                          })()}

                          {/* Preview and Download Buttons */}
                          {clinicalAssessmentData && (
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center pt-4 sm:pt-6 lg:pt-8">
                              <Button 
                                onClick={handlePreviewReport}
                                size="lg"
                                variant="outline"
                                className="font-poppins font-light px-4 sm:px-5 lg:px-6 py-3 sm:py-4 lg:py-6 text-sm sm:text-base rounded-xl hover-scale-102 w-full sm:w-auto gap-2 min-h-[44px]"
                              >
                                <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                                Preview Report
                              </Button>
                              <Button 
                                onClick={handleDownloadComprehensiveReport}
                                size="lg"
                                className="bg-card text-foreground hover:bg-card font-poppins font-light px-4 sm:px-5 lg:px-6 py-3 sm:py-4 lg:py-6 text-sm sm:text-base rounded-xl hover-scale-102 shadow-premium w-full sm:w-auto gap-2 min-h-[44px]"
                              >
                                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                                Download Report
                              </Button>
                              <Button 
                                onClick={handleDownload30DayPlan}
                                size="lg"
                                variant="secondary"
                                className="font-poppins font-light px-4 sm:px-6 py-4 sm:py-6 text-sm sm:text-base rounded-xl hover-scale-102 w-full sm:w-auto gap-2"
                              >
                                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                                Download 30-Day Plan
                              </Button>
                              {analysisId && (
                                <ExportToDriveDialog 
                                  analysisId={analysisId}
                                  trigger={
                                    <Button
                                      size="lg"
                                      variant="outline"
                                      className="font-poppins font-light px-4 sm:px-6 py-4 sm:py-6 text-sm sm:text-base rounded-xl hover-scale-102 w-full sm:w-auto gap-2"
                                    >
                                      <CloudDownload className="w-4 h-4 sm:w-5 sm:h-5" />
                                      Export to Drive
                                    </Button>
                                  }
                                />
                              )}
                            </div>
                          )}

                          {/* Disclaimer */}
                          <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                            <p className="text-xs sm:text-sm text-center text-foreground leading-relaxed">
                              <span className="font-semibold text-foreground">Disclaimer:</span> This is informational support only — not a medical diagnosis.
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                </div>
              </ErrorBoundary>
              </>
            )}
          </>
        )}

        {/* 7. FAQ SECTION - Mobile Optimized */}
        {!showResults && (
        <section id="faq-section" className="py-10 sm:py-14 md:py-20 bg-transparent">
          <div className="container mx-auto px-3 sm:px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-poppins font-light text-foreground text-center mb-6 sm:mb-8 md:mb-10 px-2 sm:px-4">
                Frequently Asked Questions
              </h2>
              
              <div className="glass-card rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-5 md:p-7 space-y-2 sm:space-y-3">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-3 sm:py-4 font-inter font-medium text-foreground text-sm sm:text-base">
                    Is my medical data private?
                    <span className="transition group-open:rotate-180 flex-shrink-0 ml-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-3 sm:pb-4 text-foreground text-xs sm:text-sm leading-relaxed">
                    Your report is used to generate your analysis. We take care to protect your information, and uploaded files are removed after processing rather than kept indefinitely.
                  </p>
                </details>

                <Separator />

                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-3 sm:py-4 font-inter font-medium text-foreground text-sm sm:text-base">
                    What file formats are supported?
                    <span className="transition group-open:rotate-180 flex-shrink-0 ml-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-3 sm:pb-4 text-foreground text-xs sm:text-sm leading-relaxed">
                    We support PDF, JPG, and PNG file formats for your medical reports. Files are processed securely and deleted after analysis.
                  </p>
                </details>

                <Separator />

                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-3 sm:py-4 font-inter font-medium text-foreground text-sm sm:text-base">
                    How long does analysis take?
                    <span className="transition group-open:rotate-180 flex-shrink-0 ml-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-3 sm:pb-4 text-foreground text-xs sm:text-sm leading-relaxed">
                    Most analyses complete in 30-60 seconds. Complex reports may take slightly longer. You'll see real-time progress updates.
                  </p>
                </details>

                <Separator />

                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-3 sm:py-4 font-inter font-medium text-foreground text-sm sm:text-base">
                    Is my data secure?
                    <span className="transition group-open:rotate-180 flex-shrink-0 ml-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-3 sm:pb-4 text-foreground text-xs sm:text-sm leading-relaxed">
                    Yes. All data is encrypted during transmission and automatically deleted after your session. We comply with healthcare data protection standards.
                  </p>
                </details>

                <Separator />

                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-3 sm:py-4 font-inter font-medium text-foreground text-sm sm:text-base">
                    Can I save my results?
                    <span className="transition group-open:rotate-180 flex-shrink-0 ml-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-3 sm:pb-4 text-foreground text-xs sm:text-sm leading-relaxed">
                    Yes! After completing your clinical assessment, you can download a comprehensive PDF report with all findings and recommendations.
                  </p>
                </details>

                <Separator />

                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-4 font-inter font-medium text-foreground">
                    What if I don't understand something?
                    <span className="transition group-open:rotate-180">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-4 text-foreground text-sm">
                    Use our Clinical Chat feature to ask questions about your specific results. The AI will explain complex medical terms in simple language.
                  </p>
                </details>
              </div>
            </div>
          </div>
        </section>
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

      {/* Auth Prompt Dialog */}
      <AuthPrompt 
        open={showAuthPrompt} 
        onOpenChange={setShowAuthPrompt}
      />
    </div>
  );
};

export default Index;