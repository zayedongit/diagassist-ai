import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Calendar, 
  TrendingUp, 
  Download, 
  ChevronRight,
  Clock,
  Activity,
  ArrowLeft,
  Loader2,
  Award
} from "lucide-react";
import { HealthScoreTimeline } from "@/components/HealthScoreTimeline";
import { HealthPlanCalendar } from "@/components/HealthPlanCalendar";
import { ShareReportDialog } from "@/components/ShareReportDialog";
import { useHealthJourney } from "@/hooks/useHealthJourney";
import { generate30DayPlan } from "@/utils/generate30DayPlan";
import { calculateHealthScore } from "@/utils/healthScoreCalculator";
import { parseClinicalContext } from "@/utils/parseClinicalContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { GlobalNav } from '@/components/GlobalNav';

interface AnalysisRecord {
  id: string;
  created_at: string;
  result: any;
  status: string;
}

// Calendar component with integrated plan
const CalendarWithPlan = ({ analysis }: { analysis: AnalysisRecord }) => {
  const [planStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  const healthScoreBreakdown = calculateHealthScore(
    analysis.result,
    analysis.result.demographics,
    parseClinicalContext(analysis.result.clinicalContext || {})
  );

  const plan = generate30DayPlan(healthScoreBreakdown);

  const {
    completions,
    loading,
    toggleActivity,
    addNote,
    getCompletionStats,
  } = useHealthJourney(plan, planStartDate);

  const stats = getCompletionStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your 30-day plan...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            <span className="text-xs sm:text-sm text-muted-foreground">Day</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold">
            {stats.currentDay} / 30
          </div>
        </Card>

        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
            <span className="text-xs sm:text-sm text-muted-foreground">Done</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold">
            {stats.completionRate.toFixed(0)}%
          </div>
        </Card>

        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
            <span className="text-xs sm:text-sm text-muted-foreground">Streak</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold">
            {stats.currentStreak} days
          </div>
        </Card>

        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
            <span className="text-xs sm:text-sm text-muted-foreground">Left</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold">
            {stats.daysRemaining}
          </div>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Your 30-Day Health Plan</CardTitle>
          <CardDescription>{plan.overallGoal}</CardDescription>
        </CardHeader>
        <CardContent>
          <HealthPlanCalendar
            plan={plan}
            planStartDate={planStartDate}
            completions={completions}
            onToggleActivity={toggleActivity}
            onAddNote={addNote}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default function MyReports() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisRecord | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
      return;
    }

    if (user) {
      fetchAnalyses();
    }
  }, [user, authLoading, navigate]);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pdf_analyses")
        .select("*")
        .eq("user_id", user?.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnalyses(data || []);
      
      if (data && data.length > 0) {
        setSelectedAnalysis(data[0]);
      }
    } catch (error) {
      console.error("Error fetching analyses:", error);
      toast.error("Failed to load your reports");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (analysis: AnalysisRecord) => {
    try {
      const doc = new jsPDF();
      const analysisData = analysis.result;
      
      // Simple report with analysis data
      doc.setFontSize(16);
      doc.text('Health Report', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Patient: ${analysisData?.demographics?.name || 'N/A'}`, 20, 35);
      doc.text(`Date: ${format(new Date(analysis.created_at), 'MMM dd, yyyy')}`, 20, 45);
      
      if (analysisData?.summary) {
        doc.setFontSize(14);
        doc.text('Summary:', 20, 60);
        doc.setFontSize(10);
        const splitSummary = doc.splitTextToSize(analysisData.summary, 170);
        doc.text(splitSummary, 20, 70);
      }
      
      doc.save(`health-report-${format(new Date(analysis.created_at), 'yyyy-MM-dd')}.pdf`);
      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download report");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <GlobalNav theme="light" />
      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h1 className="text-2xl font-bold text-navy">My Health Reports</h1>
            </div>
            <Badge variant="default" className="text-sm">
              {analyses.length} {analyses.length === 1 ? "Report" : "Reports"}
            </Badge>
          </div>
        </header>

        {analyses.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-12 pb-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Reports Yet</h3>
              <p className="text-muted-foreground mb-6">
                Upload your first medical report to start tracking your health journey
              </p>
              <Button onClick={() => navigate("/")}>
                Upload Report
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reports Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Your Reports
                  </CardTitle>
                  <CardDescription>
                    Click to view details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analyses.map((analysis) => (
                    <button
                      key={analysis.id}
                      onClick={() => setSelectedAnalysis(analysis)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        selectedAnalysis?.id === analysis.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant={selectedAnalysis?.id === analysis.id ? "default" : "secondary"}>
                          {analysis.result?.demographics?.name || "Unknown"}
                        </Badge>
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(analysis.created_at), "MMM dd, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(analysis.created_at), "h:mm a")}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Button
                onClick={() => navigate("/")}
                className="w-full mt-4"
                variant="outline"
              >
                Upload New Report
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    30-Day Plan
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  {selectedAnalysis && (
                    <>
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>Report Summary</CardTitle>
                              <CardDescription>
                                {format(new Date(selectedAnalysis.created_at), "MMMM dd, yyyy 'at' h:mm a")}
                              </CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <ShareReportDialog reportId={selectedAnalysis.id} />
                              <Button
                                onClick={() => handleDownloadReport(selectedAnalysis)}
                                variant="outline"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download PDF
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">Patient Information</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Name</p>
                                  <p className="font-medium">{selectedAnalysis.result?.demographics?.name}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Age</p>
                                  <p className="font-medium">{selectedAnalysis.result?.demographics?.age} years</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Gender</p>
                                  <p className="font-medium">{selectedAnalysis.result?.demographics?.gender}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Test Date</p>
                                  <p className="font-medium">{selectedAnalysis.result?.demographics?.testDate}</p>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            <div>
                              <h4 className="font-semibold mb-2">Overall Status</h4>
                              <Badge
                                variant={
                                  selectedAnalysis.result?.overallStatus?.toLowerCase().includes("urgent")
                                    ? "destructive"
                                    : selectedAnalysis.result?.overallStatus?.toLowerCase().includes("attention")
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {selectedAnalysis.result?.overallStatus}
                              </Badge>
                            </div>

                            <Separator />

                            <div>
                              <h4 className="font-semibold mb-2">Summary</h4>
                              <p className="text-sm text-slate leading-relaxed">
                                {selectedAnalysis.result?.summary}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="timeline">
                  <Card>
                    <CardHeader>
                      <CardTitle>Health Score Timeline</CardTitle>
                      <CardDescription>
                        Track your health score progression over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedAnalysis && (
                        <HealthScoreTimeline 
                          currentScore={selectedAnalysis.result?.healthScore || 0} 
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="calendar">
                  {selectedAnalysis && selectedAnalysis.result?.healthScore ? (
                    <CalendarWithPlan analysis={selectedAnalysis} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>30-Day Improvement Plan</CardTitle>
                        <CardDescription>
                          Your personalized health improvement calendar
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p>30-day plan feature coming soon</p>
                          <p className="text-sm mt-2">Complete your health assessment with health score to generate a personalized improvement plan</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
