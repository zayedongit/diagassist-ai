import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Activity, Heart, FileText, Download, RefreshCw, Brain, Eye, EyeOff, Lock, BarChart3, Stethoscope, LogOut, CloudDownload, Clock, Shield, FileSearch, TrendingUp } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { EnhancedAnalysisResult, extractAbnormalPanels } from "@/types/medicalAnalysis";

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

  // Utility function: Create enhanced analysis context for AI agent using medicalPanels data
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

  // Handle drive sync
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

  // Handle auth success from dialog
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
          console.error('❌ Max polling attempts reached');
          setError('Analysis is taking longer than expected. Please try again in a few minutes.');
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

  // Handle PDF analysis
  const handleFileSelect = async (file: File) => {
    // Generate a UUID for this analysis session
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const userId = generateUUID();
    setCurrentUserId(userId);
    
    console.log('🔄 Starting analysis for user:', userId);
    setSelectedFile(file);
    setIsAnalyzing(true);
    setError(null);
    setAnalysisData(null);
    setShowResults(false);
    setExtractedText("Uploading and extracting text from PDF...");
    setProcessingStatus('processing');
    
    // Store in localStorage for recovery
    const tempAnalysisId = generateUUID();
    setAnalysisId(tempAnalysisId);
    localStorage.setItem('analysisId', tempAnalysisId);
    localStorage.setItem('currentUserId', userId);
    localStorage.setItem('processingStatus', 'processing');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('userId', userId);

      console.log('📤 Uploading file:', file.name, 'Size:', file.size);

      // Call the process PDF report function
      const { data, error } = await supabase.functions.invoke('process-pdf-report', {
        body: formData
      });

      if (error) {
        console.error('❌ Processing error:', error);
        throw error;
      }

      console.log('✅ Upload successful, got analysis ID:', data.analysisId);
      
      // Update analysis ID and start polling
      setAnalysisId(data.analysisId);
      localStorage.setItem('analysisId', data.analysisId);
      setExtractedText("PDF uploaded successfully. Starting AI analysis...");
      
      // Start polling for results
      pollForResults(data.analysisId, userId);
      
    } catch (error: any) {
      console.error('❌ Analysis failed:', error);
      
      // Clear localStorage on error
      localStorage.removeItem('analysisId');
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('processingStatus');
      
      setError(error.message || 'Failed to analyze PDF. Please try again.');
      setIsAnalyzing(false);
      setProcessingStatus('failed');
      
      // More specific error messages based on error type
      if (error.message?.includes('timeout')) {
        toast.error('Request timed out. The PDF might be too large or complex. Please try with a smaller file.');
      } else if (error.message?.includes('file size')) {
        toast.error('File too large. Please use a PDF smaller than 10MB.');
      } else if (error.message?.includes('not a valid PDF')) {
        toast.error('Invalid PDF file. Please upload a valid PDF document.');
      } else {
        toast.error(`Analysis failed: ${error.message}`);
      }
    }
  };

  // Render results display logic if analysis is done and data is valid
  if (showResults && analysisData && !isNonMedicalReport(analysisData) && enhancedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <header className="fixed top-0 w-full z-50 bg-gradient-to-r from-primary via-purple-600 to-primary backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Brain className="w-8 h-8 text-white" />
                <h1 className="text-white text-xl font-bold">Shendet Medical analytics</h1>
              </div>
              {isAuthenticated && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={signOut}
                  className="text-white hover:bg-white/20"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="pt-20 container mx-auto px-4">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
              <CardDescription>Detailed insights from your medical report</CardDescription>
            </CardHeader>
            <CardContent>
              <SummaryCard 
                summary={enhancedData?.summary}
                overallStatus={enhancedData?.overallStatus}
                analysisData={enhancedData}
              />
              <Separator className="my-6" />
              <ClinicalAssessmentHighlights clinicalData={clinicalAssessmentData} />
              <Separator className="my-6" />
              <UnderstandingYourNumbers analysisData={enhancedData} />
              <Separator className="my-6" />
              <MedicalChatAgent 
                analysisContext={createEnhancedAnalysisContext(enhancedData)}
                demographics={enhancedData?.demographics}
                abnormalPanels={enhancedData?.medicalPanels}
              />
              <Separator className="my-6" />
              <Button onClick={handleDownloadComprehensiveReport} className="w-full max-w-xs mx-auto">
                <Download className="w-4 h-4 mr-2" />
                Download Comprehensive Report
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // NEW HOMEPAGE DESIGN WITH THREE SECTIONS
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-gradient-to-r from-primary via-purple-600 to-primary backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Brain className="w-8 h-8 text-white" />
              <h1 className="text-white text-xl font-bold">Shendet Medical analytics</h1>
            </div>
            {isAuthenticated && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="text-white hover:bg-white/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="h-screen relative flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center space-y-6 px-4 animate-fade-in">
          <div className="animate-pulse">
            <Brain className="w-16 h-16 text-white mx-auto mb-6" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Get Simple Insights
            </span>
            <br />
            from Your Reports
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            Transform complex medical data into easy-to-understand insights with AI-powered analysis
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="min-h-screen bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
              Why Choose Our Platform?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the future of medical report analysis with our AI-powered platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center space-y-4 animate-fade-in hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Data Analysis</h3>
              <p className="text-gray-600">Advanced AI algorithms analyze your medical data with precision and accuracy</p>
            </div>
            
            <div className="text-center space-y-4 animate-fade-in hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">AI Insights</h3>
              <p className="text-gray-600">Get instant insights and recommendations based on your medical reports</p>
            </div>
            
            <div className="text-center space-y-4 animate-fade-in hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                <FileSearch className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Clinical Assessment</h3>
              <p className="text-gray-600">Comprehensive clinical assessments to understand your health status</p>
            </div>
            
            <div className="text-center space-y-4 animate-fade-in hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Private & Secure</h3>
              <p className="text-gray-600">Your medical data is encrypted and processed with the highest security standards</p>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section className="min-h-screen relative flex items-center justify-center py-20 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-white/90 mb-12">
              Upload your medical report and get instant AI-powered insights
            </p>
            
            {isAnalyzing ? (
              <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-8">
                <AnimatedLoader />
                <div className="mt-6 space-y-2">
                  <p className="text-white text-lg font-medium">Analyzing your report...</p>
                  <p className="text-white/80">{extractedText}</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-500/20 backdrop-blur-sm rounded-2xl p-8">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-white text-lg">{error}</p>
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="mt-4"
                  onClick={() => {
                    setError(null);
                    setSelectedFile(null);
                  }}
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <UploadZone onFileSelect={handleFileSelect} />
            )}
          </div>
        </div>
      </section>

      {/* Dialogs */}
    </div>
  );
};

export default Index;
