import { Activity, User, UserCheck, AlertTriangle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { calculateLabPosition } from "@/utils/calculateLabPosition";

interface LabRangeBarProps {
  labName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  status: 'normal' | 'low' | 'high' | 'critical';
}

export const LabRangeBar = ({ labName, value, unit, referenceRange, status }: LabRangeBarProps) => {
  // Calculate dynamic position based on actual lab values
  const { position: calculatedPosition, category } = calculateLabPosition(value, referenceRange, status);
  const getStatusColor = (category: string) => {
    switch (category) {
      case 'normal':
        return 'border-success text-success bg-success/10';
      case 'low':
      case 'high':
        return 'border-warning text-warning bg-warning/10';
      case 'critical':
        return 'border-destructive text-destructive bg-destructive/10';
      default:
        return 'border-persian-blue text-persian-blue bg-muted/10';
    }
  };

  const getBarGradient = (category: string) => {
    switch (category) {
      case 'normal':
        return 'bg-gradient-to-r from-destructive/20 via-success/40 to-destructive/20';
      case 'low':
        return 'bg-gradient-to-r from-destructive/40 via-warning/30 to-success/20';
      case 'high':
        return 'bg-gradient-to-r from-success/20 via-warning/30 to-destructive/40';
      case 'critical':
        return 'bg-gradient-to-r from-destructive/50 via-destructive/30 to-destructive/50';
      default:
        return 'bg-gradient-to-r from-muted via-success/20 to-muted';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'normal':
        return 'Within healthy range';
      case 'low':
        return 'Below optimal level';
      case 'high':
        return 'Above optimal level';
      case 'critical':
        return 'Requires immediate attention';
      default:
        return 'Assessment needed';
    }
  };

  const getDynamicIcon = (category: string) => {
    switch (category) {
      case 'normal':
        return <UserCheck className="w-5 h-5" />;
      case 'low':
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'critical':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  const getIconColor = (category: string) => {
    switch (category) {
      case 'normal':
        return 'text-success';
      case 'low':
      case 'high':
        return 'text-warning';
      case 'critical':
        return 'text-destructive';
      default:
        return 'text-primary';
    }
  };

  const barGradient = getBarGradient(category);
  const statusColorClass = getStatusColor(category);
  const clampedPosition = Math.max(5, Math.min(95, calculatedPosition));
  
  return (
    <div className="space-y-4 p-5 bg-card rounded-xl border-2 border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
      {/* Lab Name and Value Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 p-1.5 rounded-full">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-persian-blue text-base">{labName}</span>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline" className={`${statusColorClass} font-medium px-2 py-1 text-xs border-2`}>
                {status.toUpperCase()}
              </Badge>
              <span className="text-xs text-persian-blue italic">{getStatusDescription()}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="font-bold text-persian-blue text-lg">
            {value}
          </span>
          {unit && <span className="text-persian-blue text-sm ml-1">{unit}</span>}
        </div>
      </div>

      {/* Reference Range */}
      {referenceRange && (
        <div className="bg-muted/20 rounded-lg p-3 border border-border/30">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-sm font-medium text-persian-blue">
              Normal Range: <span className="font-semibold text-persian-blue">{referenceRange}</span>
            </span>
          </div>
        </div>
      )}

      {/* Enhanced Visual Range Bar with Dynamic Positioning */}
      <div className="relative">
        <div className="relative">
          <div className={`h-10 rounded-full relative overflow-hidden shadow-inner border border-border/20 ${barGradient}`}>
            {/* Normal Range Zone Indicator (25-75%) */}
            <div 
              className="absolute top-0 h-full bg-success/30 border-x border-success/50"
              style={{ left: '25%', width: '50%' }}
            />
            
            {/* Patient Position Marker with Dynamic Human Icon */}
            <div 
              className="absolute top-0 h-full flex items-center justify-center transform -translate-x-1/2 z-20"
              style={{ left: `${clampedPosition}%` }}
            >
              <div className={`bg-card rounded-full p-2 shadow-xl border-3 ${category === 'critical' ? 'border-destructive animate-pulse' : category === 'normal' ? 'border-success animate-bounce' : 'border-warning animate-bounce'}`}>
                <div className={getIconColor(category)}>
                  {getDynamicIcon(category)}
                </div>
              </div>
              {/* Position Label */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-persian-blue bg-card px-2 py-1 rounded border shadow-sm whitespace-nowrap">
                You are here
              </div>
            </div>
            
            {/* Zone boundary markers */}
            <div className="absolute top-1 left-1/4 w-px h-8 bg-border opacity-60"></div>
            <div className="absolute top-1 left-3/4 w-px h-8 bg-border opacity-60"></div>
          </div>
          
          {/* Enhanced Zone Labels */}
          <div className="flex justify-between text-xs font-medium mt-3">
            <span className="text-persian-blue">Risk Zone</span>
            <span className="text-persian-blue font-bold">Optimal Range</span>
            <span className="text-persian-blue">Risk Zone</span>
          </div>
          
          {/* Reference Range Display */}
          {referenceRange && (
            <div className="mt-2 text-center">
              <span className="text-xs text-persian-blue">
                Normal Range: <span className="font-semibold text-success">{referenceRange}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};