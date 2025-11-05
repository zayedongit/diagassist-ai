import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface CompressionProgressProps {
  message: string;
  percentage?: number;
  estimatedSecondsRemaining?: number;
}

export const CompressionProgress = ({ 
  message, 
  percentage, 
  estimatedSecondsRemaining 
}: CompressionProgressProps) => {
  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="w-full space-y-3 py-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {message}
          </p>
          {estimatedSecondsRemaining !== undefined && estimatedSecondsRemaining > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Est. {formatTime(estimatedSecondsRemaining)} remaining
            </p>
          )}
        </div>
        {percentage !== undefined && (
          <div className="text-sm font-semibold text-primary tabular-nums">
            {percentage}%
          </div>
        )}
      </div>
      
      <div className="space-y-1.5">
        <Progress 
          value={percentage} 
          className={`h-2 ${percentage === undefined ? 'animate-pulse' : ''}`}
        />
        {percentage !== undefined && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Optimizing for upload</span>
            <span>{percentage < 100 ? 'Processing...' : 'Complete'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
