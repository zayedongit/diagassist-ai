import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Stage = 'conversion' | 'optimization' | 'analysis' | 'results';

interface StageProgressProps {
  currentStage: Stage;
  wasCompressed?: boolean;
}

export const StageProgress = ({ currentStage, wasCompressed = false }: StageProgressProps) => {
  const stages = [
    { id: 'conversion' as Stage, label: 'PDF Conversion', show: true },
    { id: 'optimization' as Stage, label: 'Image Optimization', show: wasCompressed },
    { id: 'analysis' as Stage, label: 'AI Analysis', show: true },
    { id: 'results' as Stage, label: 'Results', show: true },
  ].filter(stage => stage.show);

  const getCurrentStageIndex = () => {
    return stages.findIndex(s => s.id === currentStage);
  };

  const currentIndex = getCurrentStageIndex();

  return (
    <div className="w-full max-w-2xl mx-auto py-6">
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-secondary">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ 
              width: `${(currentIndex / (stages.length - 1)) * 100}%` 
            }}
          />
        </div>

        {/* Stages */}
        <div className="relative flex justify-between">
          {stages.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;

            return (
              <div key={stage.id} className="flex flex-col items-center gap-2">
                {/* Circle */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    "relative z-10",
                    isCompleted && "bg-primary border-primary",
                    isCurrent && "bg-background border-primary",
                    isPending && "bg-background border-muted"
                  )}
                >
                  {isCompleted && (
                    <Check className="w-5 h-5 text-primary-foreground" />
                  )}
                  {isCurrent && (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  )}
                  {isPending && (
                    <div className="w-2 h-2 rounded-full bg-muted" />
                  )}
                </div>

                {/* Label */}
                <p
                  className={cn(
                    "text-xs font-medium text-center transition-colors duration-300",
                    "max-w-[80px] sm:max-w-none",
                    (isCompleted || isCurrent) && "text-foreground",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
