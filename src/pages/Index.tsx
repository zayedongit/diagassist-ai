import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Activity, Heart, FileText, Download, RefreshCw, Brain, Eye, EyeOff, Lock, BarChart3, Stethoscope, CloudDownload, Shield, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import { UploadZone } from "@/components/UploadZone";
import { AnimatedLoader } from "@/components/AnimatedLoader";
import { MedicalChatAgent } from "@/components/MedicalChatAgent";
import { generateMockPdf } from "@/components/MockPdfGenerator";
import { generateComprehensiveReportPdf } from "@/utils/generateComprehensiveReportPdf";
import { ComprehensiveReport } from "@/components/ComprehensiveReport";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ReportHeader } from "@/components/ReportHeader";
import { SummaryCard } from "@/components/SummaryCard";
import { ClinicalAssessmentHighlights } from "@/components/ClinicalAssessmentHighlights";
import { UnderstandingYourNumbers } from "@/components/UnderstandingYourNumbers";
import { HealthRiskDashboardWithTimeline } from "@/components/HealthRiskDashboard";
import { EnhancedAnalysisResult, extractAbnormalPanels } from "@/types/medicalAnalysis";
import { parseClinicalContext } from "@/utils/parseClinicalContext";
import heroBackground from "@/assets/hero-background.jpg";
import readyBackground from "@/assets/ready-background.jpg";


const Index = () => {
  const navigate = useNavigate();
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
  const [clinicalAssessmentData, setClinicalAssessmentData] = useState<any>(null);
  const [showPostChatSections, setShowPostChatSections] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDriveSync, setIsDriveSync] = useState(false);

  // Handle single report processing
  const handleDriveSync = async () => {

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

  // Handle clinical assessment completion
  const handleClinicalAssessmentComplete = (reportData: any) => {
    setClinicalAssessmentData(reportData);
    setShowPostChatSections(true); // Enable detailed analysis sections
    toast.success('Clinical assessment complete! Loading personalized analysis...');
  };

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
              .from('pdf_analyses' as any)
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
      
      // Server now returns immediately, so no timeout needed
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-medical-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
      pdf.text('MomentumhealthAi - Analysis Report', pageWidth / 2, 15, { align: 'center' });
      
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
    
    // Clear all state
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
    
    // Clear localStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Trigger new analysis with the same file
    await handleFileSelect(selectedFile);
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
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div 
              className="flex items-center space-x-2 sm:space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-accentCyan to-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-poppins font-semibold text-white">
                  MomentumhealthAi
                </h1>
                <p className="text-[10px] sm:text-xs text-coolGray">AI-Powered Lab Analysis</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full">
        {/* 2. HERO SECTION - Premium PredLabs Style */}
        {!selectedFile && !showResults && !error && (
          <>
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: 'radial-gradient(ellipse at top, hsl(210, 60%, 10%) 0%, hsl(210, 60%, 8%) 50%, hsl(210, 60%, 6%) 100%)' }}>
              {/* Subtle animated gradient background */}
              <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-navy/90 via-navy to-[#0a1f3d]/90" />
                <div className="absolute top-0 left-0 w-full h-full opacity-30">
                  <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-breathe" />
                  <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#44FFE8]/10 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '1.5s' }} />
                </div>
              </div>
              
              {/* Floating orb particles */}
              <div className="absolute inset-0 z-10 opacity-20 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-primary/40 rounded-full animate-float glow-border" />
                <div className="absolute top-1/3 right-1/4 w-24 h-24 border border-[#44FFE8]/30 rounded-full animate-float glow-border" style={{ animationDelay: '1s', animationDuration: '8s' }} />
                <div className="absolute bottom-1/4 left-1/3 w-20 h-20 border border-[#7CFFCB]/30 rounded-full animate-float glow-border" style={{ animationDelay: '2s', animationDuration: '7s' }} />
                <div className="absolute top-1/2 right-1/3 w-16 h-16 border border-primary/30 rounded-full animate-float glow-border" style={{ animationDelay: '1.5s', animationDuration: '9s' }} />
              </div>
              
              {/* Hero Content */}
              <div className="relative z-20 container mx-auto px-4 sm:px-6 text-center">
                <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12 animate-fade-up">
                  {/* Main Headline */}
                  <div className="space-y-4 sm:space-y-6">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-poppins font-bold text-white leading-tight px-4">
                      AI-Powered Medical <br className="hidden sm:block" />
                      Report Analysis
                    </h1>
                    <p className="text-lg sm:text-xl md:text-2xl gradient-text font-medium">
                      Personalized, Clear & Clinically Relevant Insights
                    </p>
                  </div>
                  
                  {/* Primary CTAs with Premium Styling */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-6 sm:pt-8">
                    <button
                      onClick={() => {
                        const uploadSection = document.getElementById('upload-section');
                        uploadSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="group px-10 py-5 rounded-full font-poppins font-semibold text-base sm:text-lg text-white transition-all duration-400 hover:scale-105 active:scale-95 w-full sm:w-auto shadow-elegant hover:shadow-glow"
                      style={{ background: 'linear-gradient(135deg, #00C6FF 0%, #44FFE8 50%, #7CFFCB 100%)' }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        Upload Your Report
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </button>
                    
                    <button
                      onClick={() => {
                        const howItWorks = document.getElementById('how-it-works');
                        howItWorks?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-10 py-5 rounded-full font-poppins font-semibold text-base sm:text-lg glass-dark text-white border border-primary/30 transition-all duration-400 hover:shadow-glow hover:border-primary/60 hover:scale-105 active:scale-95 w-full sm:w-auto backdrop-blur-md"
                    >
                      How It Works
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Scroll indicator with glow */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 animate-bounce opacity-60">
                <div className="w-6 h-10 border-2 border-primary/60 rounded-full flex items-start justify-center p-2 glow-border">
                  <div className="w-1 h-2 bg-primary rounded-full animate-pulse" />
                </div>
              </div>
            </section>

            {/* Process Flow Section - Premium Spacing */}
            <section id="how-it-works" className="py-20 sm:py-28 md:py-32 bg-white relative z-10">
              <div className="container mx-auto px-4 sm:px-6">
                <div className="text-center mb-12 sm:mb-16 md:mb-20 space-y-4">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-poppins font-bold text-navy">
                    How It Works
                  </h2>
                  <p className="text-slate text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed px-4">
                    Simple, secure, and comprehensive medical report analysis in 5 easy steps
                  </p>
                </div>
                
                <div className="flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 max-w-6xl mx-auto mb-16 sm:mb-20">
                  {/* Step 1: Upload */}
                  <div className="text-center space-y-4 sm:space-y-6 glass-card p-8 sm:p-10 rounded-3xl transition-all hover:shadow-float hover:-translate-y-2 duration-400 w-full lg:flex-1">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl flex items-center justify-center glow-ring" style={{ background: 'linear-gradient(135deg, #00C6FF 0%, #44FFE8 100%)' }}>
                      <CloudDownload className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-poppins font-bold text-navy">Upload</h3>
                    <p className="text-slate text-sm sm:text-base leading-relaxed">
                      Upload your medical report securely (PDF/JPG/PNG)
                    </p>
                  </div>

                  {/* Arrow 1 */}
                  <div className="hidden lg:block">
                    <ArrowRight className="w-8 h-8 text-primary/40" />
                  </div>

                  {/* Step 2: Analysis */}
                  <div className="text-center space-y-4 sm:space-y-6 glass-card p-8 sm:p-10 rounded-3xl transition-all hover:shadow-float hover:-translate-y-2 duration-400 w-full lg:flex-1">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl flex items-center justify-center glow-ring" style={{ background: 'linear-gradient(135deg, #00C6FF 0%, #44FFE8 100%)' }}>
                      <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-poppins font-bold text-navy">AI Analysis</h3>
                    <p className="text-slate text-sm sm:text-base leading-relaxed">
                      AI analyzes your report parameters in real-time
                    </p>
                  </div>

                  {/* Arrow 2 */}
                  <div className="hidden lg:block">
                    <ArrowRight className="w-8 h-8 text-primary/40" />
                  </div>

                  {/* Step 3: Interpretation */}
                  <div className="text-center space-y-4 sm:space-y-6 glass-card p-8 sm:p-10 rounded-3xl transition-all hover:shadow-float hover:-translate-y-2 duration-400 w-full lg:flex-1">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl flex items-center justify-center glow-ring" style={{ background: 'linear-gradient(135deg, #00C6FF 0%, #44FFE8 100%)' }}>
                      <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-poppins font-bold text-navy">Interpretation</h3>
                    <p className="text-slate text-sm sm:text-base leading-relaxed">
                      Get clear, personalized health insights
                    </p>
                  </div>

                  {/* Arrow 3 */}
                  <div className="hidden lg:block">
                    <ArrowRight className="w-8 h-8 text-primary/40" />
                  </div>

                  {/* Step 4: Chat */}
                  <div className="text-center space-y-4 sm:space-y-6 glass-card p-8 sm:p-10 rounded-3xl transition-all hover:shadow-float hover:-translate-y-2 duration-400 w-full lg:flex-1">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl flex items-center justify-center glow-ring" style={{ background: 'linear-gradient(135deg, #00C6FF 0%, #44FFE8 100%)' }}>
                      <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-poppins font-bold text-navy">Chat</h3>
                    <p className="text-slate text-sm sm:text-base leading-relaxed">
                      Ask questions about your results
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. UPLOAD SECTION */}
            <section id="upload-section" className="py-12 sm:py-16 md:py-24 bg-coolGray relative">
              <div className="container mx-auto px-4 sm:px-6">
                <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
                  <div className="text-center space-y-3 sm:space-y-4">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-poppins font-semibold text-navy px-4">
                      Upload Your Test Report
                    </h2>
                    <p className="text-slate text-sm sm:text-base md:text-lg px-4">
                      Supported formats: PDF, JPG, PNG. Get instant AI-powered analysis.
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-xl sm:rounded-2xl shadow-premium p-4 sm:p-8 md:p-12">
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
          <section id="analysis-section" className="py-12 sm:py-16 md:py-24 bg-white min-h-screen flex items-center justify-center">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-poppins font-semibold text-navy px-4">
                  AI Analysis in Progress
                </h2>
                
                {/* Status Chips */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4 px-4">
                  <div className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl border-2 ${selectedFile ? 'bg-green-50 border-green-500 text-green-800' : 'bg-slate/10 border-slate/30 text-slate'}`}>
                    <span className="font-inter font-medium text-xs sm:text-sm">File received</span>
                  </div>
                  <div className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl border-2 ${processingStatus === 'processing' ? 'bg-yellow-50 border-yellow-500 text-yellow-900 animate-pulse' : processingStatus === 'completed' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-slate/10 border-slate/30 text-slate'}`}>
                    <span className="font-inter font-medium text-xs sm:text-sm">Parsing</span>
                  </div>
                  <div className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl border-2 ${processingStatus === 'completed' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-slate/10 border-slate/30 text-slate'}`}>
                    <span className="font-inter font-medium text-xs sm:text-sm">Insights</span>
                  </div>
                </div>
                
                {/* Animated Loader */}
                <div className="bg-coolGray rounded-xl sm:rounded-2xl shadow-card p-6 sm:p-8 md:p-12">
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
            <section className="py-8 sm:py-12 md:py-16 bg-white">
              <div className="container mx-auto px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-poppins font-semibold text-navy mb-1">Your Analysis Results</h3>
                    <p className="text-sm sm:text-base text-slate truncate">Based on: {selectedFile?.name}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
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
                      className="text-accentCyan border-accentCyan hover:bg-accentCyan/10 w-full sm:w-auto text-sm sm:text-base"
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
                {/* Patient Details & Summary */}
                <section className="py-6 sm:py-8 bg-coolGray">
                    <div className="container mx-auto px-4 sm:px-6">
                      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
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

                  {/* Clinical Chat - Moved before detailed analysis */}
                  {!isNonMedicalReport(analysisData) && (
                    <section id="chat-section" className="py-8 sm:py-12 md:py-16 bg-white">
                      <div className="container mx-auto px-4 sm:px-6">
                        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                          <div className="text-center space-y-2 sm:space-y-3 px-4">
                            <h2 className="text-2xl sm:text-3xl font-poppins font-semibold text-navy">
                              Clinical Chat on Your Report
                            </h2>
                            <p className="text-xs sm:text-sm text-slate">
                              This chat is strictly about your uploaded test report. It does not replace medical diagnosis.
                            </p>
                          </div>
                          
                          <div className="bg-coolGray rounded-xl sm:rounded-2xl shadow-premium p-4 sm:p-6">
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

                  {/* Health Risk Calculator with Prediction Timeline - After Clinical Chat */}
                  {!isNonMedicalReport(analysisData) && enhancedData && showPostChatSections && (
                    <section className="py-6 sm:py-8 bg-white">
                      <div className="container mx-auto px-4 sm:px-6">
                        <div className="max-w-6xl mx-auto">
                          <HealthRiskDashboardWithTimeline 
                            analysisData={enhancedData}
                            demographics={analysisData?.demographics}
                            clinicalContext={parseClinicalContext(clinicalAssessmentData)}
                          />
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Placeholder when clinical chat not complete */}
                  {!isNonMedicalReport(analysisData) && enhancedData && !showPostChatSections && (
                    <section className="py-6 sm:py-8 bg-coolGray">
                      <div className="container mx-auto px-4 sm:px-6">
                        <div className="max-w-4xl mx-auto">
                          <Alert className="bg-blue-50 border-blue-200">
                            <AlertCircle className="h-5 w-5 text-blue-600" />
                            <AlertTitle className="text-blue-900 font-semibold">Complete Clinical Assessment Above</AlertTitle>
                            <AlertDescription className="text-blue-800">
                              Complete the clinical chat assessment above to unlock personalized health risk predictions, 
                              10-year risk projections, and tailored recommendations based on both your lab values and clinical context.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Final Interpretation */}
                  {!isNonMedicalReport(analysisData) && showPostChatSections && (
                    <section id="interpretation-section" className="py-8 sm:py-12 md:py-16 bg-coolGray">
                      <div className="container mx-auto px-4 sm:px-6">
                        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
                          <div className="text-center px-4">
                            <h2 className="text-2xl sm:text-3xl font-poppins font-semibold text-navy mb-2 sm:mb-3">
                              Final Interpretation
                            </h2>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
                            <div className="text-center pt-6 sm:pt-8">
                              <Button 
                                onClick={handleDownloadComprehensiveReport}
                                size="lg"
                                className="bg-accentCyan text-navy hover:bg-accentCyan/90 font-poppins font-semibold px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base rounded-xl hover-scale-102 shadow-premium w-full sm:w-auto"
                              >
                                <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                Download PDF
                              </Button>
                            </div>
                          )}

                          {/* Disclaimer */}
                          <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                            <p className="text-xs sm:text-sm text-center text-slate leading-relaxed">
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
          </>
        )}

        {/* 7. FAQ SECTION */}
        <section id="faq-section" className="py-12 sm:py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-poppins font-semibold text-navy text-center mb-8 sm:mb-12 px-4">
                Frequently Asked Questions
              </h2>
              
              <div className="bg-coolGray rounded-xl sm:rounded-2xl shadow-card p-4 sm:p-6 md:p-8 space-y-3 sm:space-y-4">
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

      </main>
    </div>
  );
};

export default Index;