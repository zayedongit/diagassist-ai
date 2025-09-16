import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, FileText } from "lucide-react";

interface ReportHeaderProps {
  patientName?: string;
  demographics?: {
    age?: number;
    gender?: string;
  };
  testDate?: string;
  overallStatus?: string;
}

const getStatusInfo = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'good':
    case 'normal':
      return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', text: 'Normal Range' };
    case 'moderate':
    case 'attention':
      return { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'Needs Attention' };
    case 'concerning':
    case 'critical':
      return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', text: 'Requires Action' };
    default:
      return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', text: 'Review Required' };
  }
};

export const ReportHeader = ({ patientName, demographics, testDate, overallStatus }: ReportHeaderProps) => {
  const statusInfo = getStatusInfo(overallStatus || 'review');
  
  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Medical Panel Analysis</h1>
              <p className="text-sm text-muted-foreground">Comprehensive Blood Report Review</p>
            </div>
          </div>
          <Badge className={`${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border`}>
            {statusInfo.text}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Patient Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Patient Name</p>
              <p className="text-sm font-medium text-foreground">
                {patientName || 'Anonymous Patient'}
              </p>
            </div>
          </div>
          
          {demographics?.age && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Age</p>
                <p className="text-sm font-medium text-foreground">
                  {demographics.age} years
                </p>
              </div>
            </div>
          )}
          
          {demographics?.gender && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Gender</p>
                <p className="text-sm font-medium text-foreground capitalize">
                  {demographics.gender}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};