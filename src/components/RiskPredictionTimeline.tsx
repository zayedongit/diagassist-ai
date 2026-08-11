import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingDown, TrendingUp, Calendar, Heart, Activity, CheckCircle2, AlertCircle, Lightbulb } from "lucide-react";
import { RiskScore } from "@/utils/healthRiskCalculator";
import { generateRiskTimeline, TimelineProjections } from "@/utils/riskProjection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClinicalContext } from "@/utils/parseClinicalContext";

interface RiskPredictionTimelineProps {
  cardiovascularRisk: RiskScore;
  diabetesRisk: RiskScore;
  clinicalContext?: ClinicalContext;
}

export const RiskPredictionTimeline = ({ cardiovascularRisk, diabetesRisk, clinicalContext }: RiskPredictionTimelineProps) => {
  const timeline: TimelineProjections = generateRiskTimeline(cardiovascularRisk, diabetesRisk, clinicalContext);
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 border border-white/10 rounded-lg shadow-lg">
          <p className="font-semibold text-foreground mb-2">
            {label === 0 ? 'Today' : `Year ${label}`}
          </p>
          <p className="text-sm text-red-600">
            Relative risk index (without changes): {Math.round(payload[0].value)}/100
          </p>
          <p className="text-sm text-green-600">
            With lifestyle changes: {Math.round(payload[1].value)}/100
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-white/5">
      <CardHeader className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg lg:text-xl text-primary flex items-center gap-2">
              Risk Prediction Timeline
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              How your risk factors may trend over 10 years — a relative index, not a probability
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 pt-0">
        {/* Comparison Alert */}
        <Alert className="bg-gradient-to-r from-green-50 to-white/5 border-2 border-green-200 p-3 sm:p-4">
          <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
          <AlertTitle className="text-green-900 font-semibold text-sm sm:text-base">Take Action Now</AlertTitle>
          <AlertDescription className="text-foreground text-xs sm:text-sm">
            The charts below compare two scenarios: continuing current habits vs making recommended lifestyle changes. 
            Small changes today can significantly reduce your health risks over time.
          </AlertDescription>
        </Alert>
        
        {/* Timeline Charts */}
        <Tabs defaultValue="cardiovascular" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="cardiovascular" className="flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm min-h-[44px]">
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Cardiovascular</span>
              <span className="xs:hidden">Cardio</span>
            </TabsTrigger>
            <TabsTrigger value="diabetes" className="flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm min-h-[44px]">
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Diabetes
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="cardiovascular" className="space-y-3 sm:space-y-4">
            <div className="bg-card rounded-lg p-3 sm:p-4 border border-primary/20">
              <h3 className="font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                Cardiovascular Disease Risk Trajectory
              </h3>
              
              <div className="h-64 sm:h-72 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline.cardiovascular}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="year" 
                      label={{ value: 'Years from now', position: 'insideBottom', offset: -5 }}
                      tick={{ fill: '#374151' }}
                      tickFormatter={(value) => value === 0 ? 'Today' : `${value}y`}
                    />
                    <YAxis 
                      label={{ value: 'Relative risk index', angle: -90, position: 'insideLeft' }}
                      tick={{ fill: '#374151' }}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="noChangesRisk" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      name="Without lifestyle changes"
                      dot={{ fill: '#ef4444', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="withInterventionRisk" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      name="With lifestyle changes"
                      dot={{ fill: '#10b981', r: 5 }}
                      activeDot={{ r: 7 }}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* 10-Year Impact Summary */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <p className="text-xs text-foreground mb-1">Without Changes (10y)</p>
                  <p className="text-2xl font-bold text-red-600">
                    {Math.round(timeline.cardiovascular[3].noChangesRisk)}<span className="text-sm font-normal align-top"> /100</span>
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-red-600" />
                    <span className="text-xs text-red-600">Risk increases</span>
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-xs text-foreground mb-1">With Changes (10y)</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(timeline.cardiovascular[3].withInterventionRisk)}<span className="text-sm font-normal align-top"> /100</span>
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingDown className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-600">Risk decreases</span>
                  </div>
                </div>
                <div className="bg-card p-3 rounded border border-white/10">
                  <p className="text-xs text-foreground mb-1">Potential Reduction</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(timeline.cardiovascular[3].noChangesRisk - timeline.cardiovascular[3].withInterventionRisk)}<span className="text-sm font-normal align-top"> pts</span>
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3 text-foreground" />
                    <span className="text-xs text-foreground">With intervention</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="diabetes" className="space-y-4">
            <div className="bg-card rounded-lg p-4 border border-primary/20">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-500" />
                Type 2 Diabetes Risk Trajectory
              </h3>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline.diabetes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="year" 
                      label={{ value: 'Years from now', position: 'insideBottom', offset: -5 }}
                      tick={{ fill: '#374151' }}
                      tickFormatter={(value) => value === 0 ? 'Today' : `${value}y`}
                    />
                    <YAxis 
                      label={{ value: 'Relative risk index', angle: -90, position: 'insideLeft' }}
                      tick={{ fill: '#374151' }}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="noChangesRisk" 
                      stroke="#f97316" 
                      strokeWidth={3}
                      name="Without lifestyle changes"
                      dot={{ fill: '#f97316', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="withInterventionRisk" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      name="With lifestyle changes"
                      dot={{ fill: '#10b981', r: 5 }}
                      activeDot={{ r: 7 }}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* 10-Year Impact Summary */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                  <p className="text-xs text-foreground mb-1">Without Changes (10y)</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {Math.round(timeline.diabetes[3].noChangesRisk)}<span className="text-sm font-normal align-top"> /100</span>
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-orange-600" />
                    <span className="text-xs text-orange-600">Risk increases</span>
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-xs text-foreground mb-1">With Changes (10y)</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(timeline.diabetes[3].withInterventionRisk)}<span className="text-sm font-normal align-top"> /100</span>
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingDown className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-600">Risk decreases</span>
                  </div>
                </div>
                <div className="bg-card p-3 rounded border border-white/10">
                  <p className="text-xs text-foreground mb-1">Potential Reduction</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(timeline.diabetes[3].noChangesRisk - timeline.diabetes[3].withInterventionRisk)}<span className="text-sm font-normal align-top"> pts</span>
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3 text-foreground" />
                    <span className="text-xs text-foreground">With intervention</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Potential Benefits */}
        <div className="bg-card rounded-lg p-4 border border-primary/20">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Potential Benefits of Taking Action
          </h3>
          <div className="space-y-2">
            {timeline.potentialBenefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Recommendations */}
        <div className="bg-gradient-to-r from-white/5 to-white/5 rounded-lg p-4 border-2 border-white/10">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-foreground" />
            Evidence-Based Recommendations
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Lifestyle */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Badge variant="outline" className="bg-card text-blue-800 border-blue-300">
                  Lifestyle
                </Badge>
              </h4>
              <ul className="space-y-1.5">
                {timeline.recommendations.lifestyle.map((rec, index) => (
                  <li key={index} className="text-xs text-foreground flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-card mt-1.5 flex-shrink-0"></span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Dietary */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  Dietary
                </Badge>
              </h4>
              <ul className="space-y-1.5">
                {timeline.recommendations.dietary.map((rec, index) => (
                  <li key={index} className="text-xs text-foreground flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Medical */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                  Medical
                </Badge>
              </h4>
              <ul className="space-y-1.5">
                {timeline.recommendations.medical.map((rec, index) => (
                  <li key={index} className="text-xs text-foreground flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-card mt-1.5 flex-shrink-0"></span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        {/* Important Note */}
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-sm font-semibold text-yellow-900">Clinical Note</AlertTitle>
          <AlertDescription className="text-xs text-yellow-800">
            This timeline is a <strong>relative risk index (0–100)</strong> that combines your current risk factors to
            illustrate direction and the potential impact of lifestyle change. It is <strong>not</strong> a validated
            probability of developing disease, and it is not a diagnosis. Real individual risk depends on blood pressure,
            genetics, family history, and much more. For a personal risk estimate, please consult your healthcare provider.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
