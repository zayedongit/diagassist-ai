import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Activity, Heart, FileText, Download, RefreshCw, Brain, Eye, EyeOff, Lock, BarChart3, Stethoscope, LogOut, CloudDownload, Shield, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import { UploadZone } from "@/components/UploadZone";
import { AnimatedLoader } from "@/components/AnimatedLoader";
import { AuthDialog } from "@/components/AuthDialog";
import { MedicalChatAgent } from "@/components/MedicalChatAgent";
import { PaymentGate } from "@/components/PaymentGate";
import { generateMockPdf } from "@/components/MockPdfGenerator";
import { generateComprehensiveReportPdf } from "@/utils/generateComprehensiveReportPdf";
import { ComprehensiveReport } from "@/components/ComprehensiveReport";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ReportHeader } from "@/components/ReportHeader";
import { SummaryCard } from "@/components/SummaryCard";
import { ClinicalAssessmentHighlights } from "@/components/ClinicalAssessmentHighlights";
import { UnderstandingYourNumbers } from "@/components/UnderstandingYourNumbers";
import { useAuth } from "@/hooks/useAuth";
import { EnhancedAnalysisResult, extractAbnormalPanels } from "@/types/medicalAnalysis";
import heroBackground from "@/assets/hero-background.jpg";
import readyBackground from "@/assets/ready-background.jpg";


const Index = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut, isLoading: authLoading } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const enhancedData = analysisData && 'medicalPanels' in analysisData ? analysisData as EnhancedAnalysisResult : null;
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [extractionStep, setExtractionStep] = useState("");
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('idle');
  const [showExtraction, setShowExtraction] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [hasPaidPremium, setHasPaidPremium] = useState(false);
  const [showPaymentGate, setShowPaymentGate] = useState(false);
  const [clinicalAssessmentData, setClinicalAssessmentData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDriveSync, setIsDriveSync] = useState(false);

  // Check if user is admin - specifically for phone number +91 7993448425
  const [userProfile, setUserProfile] = useState<any>(null);
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        console.log('Fetching profile for user:', user.id);
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('phone_number')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Profile fetch error:', error);
        } else {
          console.log('Profile fetched:', profile);
          setUserProfile(profile);
        }
      } else {
        setUserProfile(null);
      }
    };
    
    fetchUserProfile();
  }, [user]);
  
  const isAdmin = userProfile?.phone_number?.replace('+', '') === '917993448425';

  // Handle single report processing
  const handleDriveSync = async () => {
    if (!isAdmin) {
      toast.error('Admin access only');
      return;
    }

    setIsDriveSync(true);
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


  // Handle auth success from dialog
  // Handle comprehensive report download
  const handleDownloadComprehensiveReport = async () => {
    if (!analysisData) {
      toast.error('No analysis data available for comprehensive report');
      return;
    }
    
    try {
      await generateComprehensiveReportPdf({
        patientName: analysisData?.patientName,
        bloodAnalysis: analysisData,
        clinicalAssessment: clinicalAssessmentData
      });
    } catch (error) {
      toast.error(`Failed to download comprehensive report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAuthSuccess = (user: any, session: any) => {
    toast.success('Welcome! You now have access to premium features.');
  };

  // Handle payment success
  const handlePaymentSuccess = () => {
    setHasPaidPremium(true);
    setShowPaymentGate(false);
    toast.success('Premium features unlocked! You can now access all recommendations and downloads.');
  };

  // Handle premium feature access
  const handlePremiumAccess = () => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
    } else if (!hasPaidPremium) {
      setShowPaymentGate(true);
    }
  };

  // Handle clinical assessment completion
  const handleClinicalAssessmentComplete = (reportData: any) => {
    setClinicalAssessmentData(reportData);
  };

  // Check if user has premium access
  const hasFullAccess = isAuthenticated && hasPaidPremium;

  // Helper function to detect non-medical reports
  const isNonMedicalReport = (data: any) => {
    if (!data) return false;
    
    const summary = data.summary || '';
    const detailedAnalysis = data.detailedAnalysis || [];
    
    // Check for common non-medical report indicators
    const nonMedicalIndicators = [
      'architectural blueprint',
      'not a medical report',
      'no medical analysis can be performed',
      'not a blood report',
      'technical drawing',
      'electrical drawing'
    ];
    
    const text = (summary + ' ' + detailedAnalysis.join(' ')).toLowerCase();
    return nonMedicalIndicators.some(indicator => text.includes(indicator));
  };

  // Initialize or restore analysis state from localStorage
  useEffect(() => {
    const storedAnalysisId = localStorage.getItem('analysisId');
    const storedUserId = localStorage.getItem('currentUserId');
    const storedStatus = localStorage.getItem('processingStatus');
    
    if (storedAnalysisId && storedUserId && storedStatus !== 'completed' && storedStatus !== 'failed') {
      setAnalysisId(storedAnalysisId);
      setCurrentUserId(storedUserId);
      setProcessingStatus(storedStatus || 'processing');
      setIsAnalyzing(true);
      setExtractedText("Resuming analysis...");
      
      // Resume polling
      pollForResults(storedAnalysisId, storedUserId);
    }
  }, []);
  
  // Poll for analysis results with progressive intervals for better UX
  const pollForResults = useCallback(async (id: string, userId: string) => {
    const maxPollingTime = 300000; // 5 minutes total timeout (increased for complex reports)
    const startTime = Date.now();
    let attempts = 0;
    
    const poll = async () => {
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
        localStorage.removeItem('analysisId');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('processingStatus');
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
          // CRITICAL: Delete analysis record from database after retrieval
          try {
            console.log('🗑️ Deleting analysis record from database...');
            const { error: deleteError } = await supabase
              .from('pdf_analyses')
              .delete()
              .eq('id', id)
              .eq('user_id', userId);
            
            if (deleteError) {
              console.error('Failed to delete analysis record:', deleteError);
            } else {
              console.log('✅ Analysis record deleted from database');
            }
          } catch (deleteErr) {
            console.error('Error deleting analysis record:', deleteErr);
          }
          
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
          setShowResults(true);
          setIsAnalyzing(false);
          setExtractedText(`Analysis completed successfully!`);
          toast.success('PDF analysis completed successfully!');
          
          // Clear localStorage after successful completion
          localStorage.removeItem('analysisId');
          localStorage.removeItem('currentUserId');
          localStorage.removeItem('processingStatus');
        } else if (analysis.status === 'failed') {
          console.error('❌ Analysis failed:', analysis.error_message);
          setError(analysis.error_message || 'Analysis failed');
          setIsAnalyzing(false);
          
          // Clear localStorage after failure
          localStorage.removeItem('analysisId');
          localStorage.removeItem('currentUserId');  
          localStorage.removeItem('processingStatus');
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
        
        // Don't fail immediately on connection errors, give it more chances
        if (attempts < 8) { // Increased retry attempts
          // Use shorter interval for connection errors
          setTimeout(poll, 3000);
        } else {
          setError('Connection error while checking analysis status. Please try again.');
          setIsAnalyzing(false);
          setProcessingStatus('failed');
          localStorage.removeItem('analysisId');
          localStorage.removeItem('currentUserId');
          localStorage.removeItem('processingStatus');
        }
      }
    };
    
    poll();
  }, []);

  // Simplified processing - client-side only

  const processClientSide = async (file: File) => {
    try {
      console.log('🔄 Starting PDF analysis process...');
      console.log('📄 File details:', { name: file.name, size: file.size, type: file.type });
      setExtractionStep("Converting PDF to images...");
      
      // Import PDF conversion utility
      const { convertPdfToImages } = await import('@/utils/pdfToImages');
      
      // Convert PDF to images on client side
      console.log('🖼️ Starting PDF to image conversion...');
      const conversionResult = await convertPdfToImages(file);
      
      if (!conversionResult.success) {
        console.error('❌ PDF conversion failed:', conversionResult.error);
        throw new Error(`PDF conversion failed: ${conversionResult.error}`);
      }
      
      console.log(`✅ Client-side conversion successful: ${conversionResult.images?.length} images`);
      console.log('📊 Image sizes:', conversionResult.images?.map(img => Math.round(img.length / 1024) + 'KB'));
      setExtractionStep(`Converted to ${conversionResult.images?.length} images, sending for analysis...`);
      
      // Send images and original PDF to server for analysis
      const formData = new FormData();
      
      // Use existing userId or create new one
      let userId = currentUserId;
      if (!userId) {
        userId = 'anonymous-' + Date.now();
        setCurrentUserId(userId);
      }
      
      console.log('👤 Using userId:', userId);
      formData.append('userId', userId);
      formData.append('images', JSON.stringify(conversionResult.images));
      formData.append('file', file); // Changed from 'pdfFile' to 'file' to match edge function

      console.log('🚀 Sending request to edge function...');
      const response = await fetch(`https://opvssqukuyemcxgoflzz.supabase.co/functions/v1/process-pdf-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wdnNzcXVrdXllbWN4Z29mbHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDcxNDQsImV4cCI6MjA3MjIyMzE0NH0.Cwj3Xynu8Yg1RkuoN7YjMgRZVDPONRKYD5JIStLn6KU`,
        },
        body: formData,
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Edge function error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Failed to process images' };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📋 Edge function response:', result);
      
      if (result.error) {
        console.error('❌ Edge function returned error:', result.error);
        throw new Error(result.error);
      }

      if (!result.success) {
        console.error('❌ Edge function returned failure:', result);
        throw new Error(result.error || 'Failed to process images');
      }

      console.log('✅ Client-side processing successful, analysis ID:', result.analysisId);
      return {
        analysisId: result.analysisId,
        status: result.status,
        message: result.message || 'Processing started successfully'
      };
    } catch (error) {
      console.error('Client-side processing failed:', error);
      throw new Error(`PDF processing failed. ${error instanceof Error ? error.message : 'Please ensure your PDF is readable and try again.'}`);
    }
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setIsAnalyzing(true);
    setExtractedText("");
    setExtractionStep("");
    setShowResults(false);
    setAnalysisData(null);
    setClinicalAssessmentData(null);
    setProcessingStatus('starting');

    try {
      // Process PDF on client side only
      const response = await processClientSide(file);
      
      if (response.analysisId) {
        // Background processing started successfully
        setAnalysisId(response.analysisId);
        
        // Store analysis state in localStorage for persistence
        localStorage.setItem('analysisId', response.analysisId);
        localStorage.setItem('currentUserId', currentUserId);
        localStorage.setItem('processingStatus', 'processing');
        
        setExtractedText(`Processing started for ${file.name}. Analysis typically completes in 30-60 seconds.`);
        setProcessingStatus('processing');
        setExtractionStep("Analysis in progress... Results will appear automatically.");
        
        // Start polling for results
        pollForResults(response.analysisId, currentUserId);
      } else {
        // Fallback for old response format (shouldn't happen with new implementation)
        setExtractedText(`Analysis completed successfully for ${file.name}`);
        setAnalysisData(response);
        setShowResults(true);
        setIsAnalyzing(false);
      }
      
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      setIsAnalyzing(false);
      setExtractionStep("");
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
      pdf.text('Medical Analytics - Analysis Report', pageWidth / 2, 15, { align: 'center' });
      
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

  const handleReset = () => {
    setSelectedFile(null);
    setAnalysisData(null);
    setClinicalAssessmentData(null);
    setShowResults(false);
    setError(null);
    setExtractedText("");
    setExtractionStep("");
    setAnalysisId(null);
    setProcessingStatus('idle');
    setIsAnalyzing(false);
    setShowExtraction(false);
    setCurrentUserId('');
    
    // Clear localStorage
    localStorage.removeItem('analysisId');
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('processingStatus');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getProcessingMessage = () => {
    switch (processingStatus) {
      case 'starting':
        return "Initializing analysis...";
      case 'processing':
        return "Analysis in progress... Typically completes in 30-60 seconds.";
      case 'completed':
        return "Analysis completed successfully!";
      case 'failed':
        return "Analysis failed. Please try again.";
      default:
        return extractionStep || "Processing your report...";
    }
  };

  return (
    <div className="min-h-screen bg-coolGray font-inter">
      {/* 1. Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-navy/90 backdrop-blur-lg border-b border-slate/20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/')}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-accentCyan to-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-poppins font-semibold text-white flex items-center">
                  Medical Analytics
                </h1>
                <p className="text-xs text-coolGray">AI-Powered Lab Analysis</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full">
        {/* 2. HERO SECTION - Parallax + Video */}
        {!selectedFile && !showResults && !error && (
          <>
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-navy">
              {/* Video Background */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={heroBackground}
                  alt="Medical Analysis Background"
                  className="w-full h-full object-cover opacity-20"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/60 to-navy/80" />
              </div>
              
              {/* Floating molecular shapes (mid layer) */}
              <div className="absolute inset-0 z-10 opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-accentCyan rounded-full animate-float" />
                <div className="absolute top-1/3 right-1/4 w-24 h-24 border border-accentCyan rounded-full animate-float" style={{ animationDelay: '1s' }} />
                <div className="absolute bottom-1/4 left-1/3 w-20 h-20 border border-accentCyan rounded-full animate-float" style={{ animationDelay: '2s' }} />
              </div>
              
              {/* Hero Content (foreground) */}
              <div className="relative z-20 container mx-auto px-4 sm:px-6 text-center">
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-poppins font-semibold text-white leading-tight">
                    AI-Powered Medical Report Analysis
                    <br />
                    <span className="text-accentCyan">Clear, Actionable Insights</span>
                  </h1>
                  
                  {/* Trust Strip */}
                  <div className="flex flex-wrap items-center justify-center gap-6 pt-8 text-sm text-coolGray">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-accentCyan" />
                      <span>NABL Accredited</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-accentCyan" />
                      <span>ISO-compliant workflow</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-accentCyan" />
                      <span>Encrypted data</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Scroll indicator */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 animate-bounce">
                <div className="w-6 h-10 border-2 border-accentCyan rounded-full flex items-start justify-center p-2">
                  <div className="w-1 h-2 bg-accentCyan rounded-full" />
                </div>
              </div>
            </section>

            {/* Process Flow Section */}
            <section className="py-24 bg-white relative z-10">
              <div className="container mx-auto px-4 sm:px-6">
                <div className="text-center mb-16">
                  <h2 className="text-3xl sm:text-4xl font-poppins font-semibold text-navy mb-4">
                    How It Works
                  </h2>
                  <p className="text-slate text-lg">
                    Simple, secure, and comprehensive medical report analysis in 5 easy steps
                  </p>
                </div>
                
                <div className="flex flex-col lg:flex-row items-center justify-center gap-4 max-w-6xl mx-auto">
                  {/* Step 1: Login */}
                  <div className="text-center space-y-4 animate-fade-up hover-lift p-6 rounded-2xl transition-all">
                    <div className="w-16 h-16 bg-gradient-to-br from-accentCyan to-primary rounded-full flex items-center justify-center mx-auto">
                      <LogOut className="w-8 h-8 text-white transform rotate-180" />
                    </div>
                    <h3 className="text-lg font-poppins font-semibold text-navy">Login</h3>
                    <p className="text-slate text-sm">
                      Secure authentication to protect your data
                    </p>
                  </div>

                  {/* Arrow 1 */}
                  <div className="hidden lg:block">
                    <ArrowRight className="w-8 h-8 text-accentCyan" />
                  </div>

                  {/* Step 2: Upload */}
                  <div className="text-center space-y-4 animate-fade-up hover-lift p-6 rounded-2xl transition-all" style={{ animationDelay: '0.1s' }}>
                    <div className="w-16 h-16 bg-gradient-to-br from-accentCyan to-primary rounded-full flex items-center justify-center mx-auto">
                      <CloudDownload className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-poppins font-semibold text-navy">Upload</h3>
                    <p className="text-slate text-sm">
                      Upload your medical report (PDF/JPG/PNG)
                    </p>
                  </div>

                  {/* Arrow 2 */}
                  <div className="hidden lg:block">
                    <ArrowRight className="w-8 h-8 text-accentCyan" />
                  </div>

                  {/* Step 3: Analysis */}
                  <div className="text-center space-y-4 animate-fade-up hover-lift p-6 rounded-2xl transition-all" style={{ animationDelay: '0.2s' }}>
                    <div className="w-16 h-16 bg-gradient-to-br from-accentCyan to-primary rounded-full flex items-center justify-center mx-auto">
                      <BarChart3 className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-poppins font-semibold text-navy">Analysis</h3>
                    <p className="text-slate text-sm">
                      AI analyzes your report parameters
                    </p>
                  </div>

                  {/* Arrow 3 */}
                  <div className="hidden lg:block">
                    <ArrowRight className="w-8 h-8 text-accentCyan" />
                  </div>

                  {/* Step 4: Interpretation */}
                  <div className="text-center space-y-4 animate-fade-up hover-lift p-6 rounded-2xl transition-all" style={{ animationDelay: '0.3s' }}>
                    <div className="w-16 h-16 bg-gradient-to-br from-accentCyan to-primary rounded-full flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-poppins font-semibold text-navy">Interpretation</h3>
                    <p className="text-slate text-sm">
                      Get comprehensive clinical interpretation
                    </p>
                  </div>

                  {/* Arrow 4 */}
                  <div className="hidden lg:block">
                    <ArrowRight className="w-8 h-8 text-accentCyan" />
                  </div>

                  {/* Step 5: Chat for Any further query */}
                  <div className="text-center space-y-4 animate-fade-up hover-lift p-6 rounded-2xl transition-all" style={{ animationDelay: '0.4s' }}>
                    <div className="w-16 h-16 bg-gradient-to-br from-accentCyan to-primary rounded-full flex items-center justify-center mx-auto">
                      <Brain className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-poppins font-semibold text-navy">Chat for Any further query</h3>
                    <p className="text-slate text-sm">
                      Ask questions about your results
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. UPLOAD SECTION */}
            <section id="upload-section" className="py-24 bg-coolGray relative">
              <div className="container mx-auto px-4 sm:px-6">
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="text-center space-y-4">
                    <h2 className="text-3xl sm:text-4xl font-poppins font-semibold text-navy">
                      Upload Your Test Report
                    </h2>
                    <p className="text-slate text-lg">
                      Supported formats: PDF, JPG, PNG. Get instant AI-powered analysis.
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-2xl shadow-premium p-8 sm:p-12">
                    <UploadZone onFileSelect={handleFileSelect} />
                  </div>
                  
                  {/* Privacy Notice */}
                  <div className="flex items-start gap-3 p-4 bg-white/50 rounded-xl border border-slate/20">
                    <Shield className="h-5 w-5 text-accentCyan shrink-0 mt-0.5" />
                    <p className="text-sm text-slate leading-relaxed">
                      <span className="font-semibold text-navy">Privacy Protected:</span> Your medical data is encrypted and automatically deleted after analysis. We never store your reports or personal health information permanently.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Disclaimer at bottom */}
              <div className="mt-16 border-t border-slate/20 pt-8">
                <div className="container mx-auto px-4 sm:px-6">
                  <div className="max-w-4xl mx-auto text-center">
                    <h4 className="text-navy font-poppins font-semibold text-sm mb-2">Important Disclaimer</h4>
                    <p className="text-slate text-xs leading-relaxed">
                      This report is generated using AI analysis and is intended for informational purposes only. It should not replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals for medical concerns.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* 4. AI ANALYSIS SECTION */}
        {isAnalyzing && (
          <section id="analysis-section" className="py-24 bg-white min-h-screen flex items-center justify-center">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-4xl mx-auto text-center space-y-8">
                <h2 className="text-3xl sm:text-4xl font-poppins font-semibold text-navy">
                  AI Analysis in Progress
                </h2>
                
                {/* Status Chips */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <div className={`px-6 py-3 rounded-xl border-2 ${selectedFile ? 'bg-green-50 border-green-500 text-green-800' : 'bg-slate/10 border-slate/30 text-slate'}`}>
                    <span className="font-inter font-medium">File received</span>
                  </div>
                  <div className={`px-6 py-3 rounded-xl border-2 ${processingStatus === 'processing' ? 'bg-yellow-50 border-yellow-500 text-yellow-900 animate-pulse' : processingStatus === 'completed' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-slate/10 border-slate/30 text-slate'}`}>
                    <span className="font-inter font-medium">Parsing & extraction</span>
                  </div>
                  <div className={`px-6 py-3 rounded-xl border-2 ${processingStatus === 'completed' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-slate/10 border-slate/30 text-slate'}`}>
                    <span className="font-inter font-medium">Insights generation</span>
                  </div>
                </div>
                
                {/* Animated Loader */}
                <div className="bg-coolGray rounded-2xl shadow-card p-12">
                  <AnimatedLoader 
                    message={getProcessingMessage()}
                    onCancel={processingStatus === 'processing' ? handleReset : undefined}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Error Section */}
        {error && (
          <section className="py-24 bg-white min-h-screen flex items-center justify-center">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-2xl mx-auto text-center space-y-8">
                <div className="flex justify-center">
                  <div className="bg-red-50 p-6 rounded-full">
                    <AlertCircle className="w-16 h-16 text-red-500" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-poppins font-semibold text-navy">Analysis Failed</h3>
                  <p className="text-slate max-w-md mx-auto">{error}</p>
                  <Button
                    onClick={handleReset}
                    className="bg-accentCyan text-navy hover:bg-accentCyan/90 font-inter font-medium px-8 py-6 rounded-xl hover-scale-102"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 5. CLINICAL CHAT SECTION + 6. INTERPRETATION SECTION */}
        {showResults && !isAnalyzing && analysisData && (
          <>
            <section className="py-16 bg-white">
              <div className="container mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-poppins font-semibold text-navy">Your Analysis Results</h3>
                    <p className="text-slate">Based on: {selectedFile?.name}</p>
                  </div>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="text-accentCyan border-accentCyan hover:bg-accentCyan/10"
                  >
                    Analyze New Report
                  </Button>
                </div>
              </div>
            </section>

            {showPaymentGate ? (
              <section className="py-16 bg-coolGray">
                <div className="container mx-auto px-4 sm:px-6">
                  <PaymentGate 
                    onPaymentSuccess={handlePaymentSuccess}
                    showMockPdf={generateMockPdf}
                  />
                </div>
              </section>
            ) : (
              <ErrorBoundary>
                <div className="w-full">
                  {/* Patient Details & Summary */}
                  <section className="py-8 bg-coolGray">
                    <div className="container mx-auto px-4 sm:px-6">
                      <div className="max-w-6xl mx-auto space-y-6">
                        <ReportHeader 
                          patientName={analysisData?.patientName}
                          demographics={analysisData?.demographics}
                          overallStatus={analysisData?.overallStatus}
                        />

                        <SummaryCard 
                          summary={analysisData?.summary}
                          overallStatus={analysisData?.overallStatus}
                          abnormalCount={enhancedData ? extractAbnormalPanels(enhancedData).reduce((acc, panel) => acc + (panel.abnormalLabs?.length || 0), 0) : 0}
                          analysisData={analysisData}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Clinical Chat */}
                  {!isNonMedicalReport(analysisData) && (
                    <section id="chat-section" className="py-16 bg-white">
                      <div className="container mx-auto px-4 sm:px-6">
                        <div className="max-w-4xl mx-auto space-y-6">
                          <div className="text-center space-y-3">
                            <h2 className="text-3xl font-poppins font-semibold text-navy">
                              Clinical Chat on Your Report
                            </h2>
                            <p className="text-sm text-slate">
                              This chat is strictly about your uploaded test report. It does not replace medical diagnosis.
                            </p>
                          </div>
                          
                          <div className="bg-coolGray rounded-2xl shadow-premium p-6">
                            <MedicalChatAgent
                              className="w-full"
                              analysisContext={createEnhancedAnalysisContext(analysisData)}
                              demographics={analysisData.demographics}
                              abnormalPanels={enhancedData ? extractAbnormalPanels(enhancedData) : []}
                              mode="clinical-triage"
                              onClinicalAssessmentComplete={handleClinicalAssessmentComplete}
                            />
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Final Interpretation */}
                  {!isNonMedicalReport(analysisData) && (
                    <section id="interpretation-section" className="py-16 bg-coolGray">
                      <div className="container mx-auto px-4 sm:px-6">
                        <div className="max-w-6xl mx-auto space-y-8">
                          <div className="text-center">
                            <h2 className="text-3xl font-poppins font-semibold text-navy mb-3">
                              Final Interpretation
                            </h2>
                          </div>

                          <div className="grid lg:grid-cols-3 gap-6">
                            {/* Left Column - Clinical Assessment */}
                            <div className="lg:col-span-2 space-y-6">
                              <ClinicalAssessmentHighlights clinicalData={clinicalAssessmentData} />
                            </div>

                            {/* Right Column - Charts */}
                            <div className="space-y-6">
                              <UnderstandingYourNumbers analysisData={analysisData} />
                            </div>
                          </div>

                          {/* Download Button */}
                          {clinicalAssessmentData && (
                            <div className="text-center pt-8">
                              <Button 
                                onClick={handleDownloadComprehensiveReport}
                                size="lg"
                                className="bg-accentCyan text-navy hover:bg-accentCyan/90 font-poppins font-semibold px-8 py-6 rounded-xl hover-scale-102 shadow-premium"
                              >
                                <Download className="w-5 h-5 mr-2" />
                                Download PDF
                              </Button>
                            </div>
                          )}

                          {/* Disclaimer */}
                          <div className="mt-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                            <p className="text-sm text-center text-slate leading-relaxed">
                              <span className="font-semibold text-navy">Disclaimer:</span> This is informational support only — not a medical diagnosis.
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Non-medical report prompt */}
                  {isNonMedicalReport(analysisData) && (
                    <section className="py-16 bg-white">
                      <div className="container mx-auto px-4 sm:px-6">
                        <Card className="max-w-2xl mx-auto border-2 border-dashed border-accentCyan/30 bg-coolGray">
                          <CardContent className="text-center py-12">
                            <div className="space-y-6">
                              <div className="w-20 h-20 mx-auto bg-accentCyan/10 rounded-full flex items-center justify-center">
                                <FileText className="w-10 h-10 text-accentCyan" />
                              </div>
                              <div>
                                <h3 className="text-xl font-poppins font-semibold text-navy mb-3">
                                  Please Upload a Blood Report
                                </h3>
                                <p className="text-slate mb-6">
                                  To get accurate health analysis and recommendations, please upload a valid blood test report.
                                </p>
                              </div>
                              <Button 
                                onClick={() => {
                                  setShowResults(false);
                                  setAnalysisData(null);
                                  setSelectedFile(null);
                                  if (fileInputRef.current) {
                                    fileInputRef.current.click();
                                  }
                                }}
                                className="bg-accentCyan text-navy hover:bg-accentCyan/90"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Upload Blood Report
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </section>
                  )}
                </div>
              </ErrorBoundary>
            )}
          </>
        )}

        {/* 7. FAQ SECTION */}
        <section id="faq-section" className="py-24 bg-white">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-poppins font-semibold text-navy text-center mb-12">
                Frequently Asked Questions
              </h2>
              
              <div className="bg-coolGray rounded-2xl shadow-card p-8 space-y-4">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-4 font-inter font-medium text-navy">
                    What file formats are supported?
                    <span className="transition group-open:rotate-180">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-4 text-slate text-sm">
                    We support PDF, JPG, and PNG file formats for your medical reports. Files are processed securely and deleted after analysis.
                  </p>
                </details>

                <Separator />

                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-4 font-inter font-medium text-navy">
                    How long does analysis take?
                    <span className="transition group-open:rotate-180">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-4 text-slate text-sm">
                    Most analyses complete in 30-60 seconds. Complex reports may take slightly longer. You'll see real-time progress updates.
                  </p>
                </details>

                <Separator />

                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-4 font-inter font-medium text-navy">
                    Is my data secure?
                    <span className="transition group-open:rotate-180">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-4 text-slate text-sm">
                    Yes. All data is encrypted during transmission and automatically deleted after your session. We comply with healthcare data protection standards.
                  </p>
                </details>

                <Separator />

                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-4 font-inter font-medium text-navy">
                    Can I save my results?
                    <span className="transition group-open:rotate-180">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-4 text-slate text-sm">
                    Yes! After completing your clinical assessment, you can download a comprehensive PDF report with all findings and recommendations.
                  </p>
                </details>

                <Separator />

                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-4 font-inter font-medium text-navy">
                    What if I don't understand something?
                    <span className="transition group-open:rotate-180">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-4 text-slate text-sm">
                    Use our Clinical Chat feature to ask questions about your specific results. The AI will explain complex medical terms in simple language.
                  </p>
                </details>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Privacy & Compliance */}
        <section className="py-16 bg-coolGray">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <div className="flex items-center justify-center gap-8 flex-wrap">
                <div className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-accentCyan" />
                  <span className="text-sm font-inter text-slate">NABL Accredited</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-6 h-6 text-accentCyan" />
                  <span className="text-sm font-inter text-slate">ISO Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-accentCyan" />
                  <span className="text-sm font-inter text-slate">End-to-End Encrypted</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 9. FOOTER */}
      <footer className="bg-navy py-8 border-t border-slate/20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-coolGray text-sm font-inter">
              © 2025 Medical Analytics. All rights reserved.
            </p>
            
            <div className="flex items-center gap-6">
              <a href="#upload-section" className="text-coolGray hover:text-accentCyan text-sm transition-colors">Upload</a>
              <a href="#analysis-section" className="text-coolGray hover:text-accentCyan text-sm transition-colors">Analysis</a>
              <a href="#chat-section" className="text-coolGray hover:text-accentCyan text-sm transition-colors">Chat</a>
              <a href="#faq-section" className="text-coolGray hover:text-accentCyan text-sm transition-colors">FAQ</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Dialog */}
      <AuthDialog 
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default Index;