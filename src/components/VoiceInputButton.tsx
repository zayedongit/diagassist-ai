import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceInputButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onClick: () => void;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const VoiceInputButton = ({
  isListening,
  isSupported,
  onClick,
  className,
  size = 'icon',
}: VoiceInputButtonProps) => {
  if (!isSupported) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={isListening ? 'default' : 'outline'}
      size={size}
      onClick={onClick}
      className={cn(
        'relative transition-all duration-300',
        isListening && 'animate-pulse bg-red-500 hover:bg-red-600 border-red-500',
        className
      )}
      title={isListening ? 'Stop recording' : 'Start voice input'}
    >
      {isListening ? (
        <>
          <MicOff className="w-4 h-4" />
          {/* Animated recording indicator */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </>
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  );
};