import { cn } from '@/lib/utils';

interface AudioLevelVisualizerProps {
  audioLevel: number;
  isAboveThreshold: boolean;
  isActive: boolean;
  className?: string;
}

export const AudioLevelVisualizer = ({
  audioLevel,
  isAboveThreshold,
  isActive,
  className
}: AudioLevelVisualizerProps) => {
  if (!isActive) return null;

  // Generate 20 bars for visualization
  const numBars = 20;
  const bars = Array.from({ length: numBars }, (_, i) => {
    const barHeight = Math.max(0.1, audioLevel * (1 + Math.sin(i * 0.5) * 0.3));
    const isActivated = i < numBars * audioLevel;
    return { height: barHeight, isActivated };
  });

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Audio Level Bars */}
      <div className="flex items-center gap-0.5 h-8">
        {bars.map((bar, i) => (
          <div
            key={i}
            className={cn(
              "w-1 rounded-full transition-all duration-100",
              bar.isActivated
                ? isAboveThreshold
                  ? "bg-green-500"
                  : "bg-gray-400"
                : "bg-gray-200"
            )}
            style={{
              height: `${bar.height * 100}%`,
              minHeight: '4px'
            }}
          />
        ))}
      </div>

      {/* Speech Detection Indicator */}
      {isAboveThreshold && (
        <div className="flex items-center gap-1.5 animate-pulse">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
          <span className="text-xs font-medium text-green-600">
            Detecting speech
          </span>
        </div>
      )}
    </div>
  );
};
