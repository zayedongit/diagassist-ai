interface AnimatedLoaderProps {
  message?: string;
  onCancel?: () => void;
}

export const AnimatedLoader = ({ message, onCancel }: AnimatedLoaderProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 sm:p-8">
      {/* Circular glowing ring animation - PredLabs style */}
      <div className="relative w-40 h-40 sm:w-48 sm:h-48 mb-8 sm:mb-10">
        {/* Outer glowing ring */}
        <div className="absolute inset-0 rounded-full border-[3px] border-primary/40 animate-spin" style={{ animationDuration: '3s' }}>
          <div className="absolute top-0 left-1/2 w-4 h-4 -ml-2 -mt-2 rounded-full bg-primary shadow-[0_0_20px_rgba(0,198,255,0.8)]" />
        </div>
        
        {/* Middle aqua ring */}
        <div className="absolute inset-4 rounded-full border-[3px] border-[#44FFE8]/30 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}>
          <div className="absolute top-0 right-1/2 w-3 h-3 -mr-1.5 -mt-1.5 rounded-full bg-[#44FFE8] shadow-[0_0_15px_rgba(68,255,232,0.7)]" />
        </div>
        
        {/* Inner mint ring */}
        <div className="absolute inset-8 rounded-full border-[2px] border-[#7CFFCB]/30 animate-spin" style={{ animationDuration: '5s' }}>
          <div className="absolute bottom-0 left-1/2 w-2.5 h-2.5 -ml-1.25 -mb-1.25 rounded-full bg-[#7CFFCB] shadow-[0_0_12px_rgba(124,255,203,0.6)]" />
        </div>
        
        {/* Central gradient core */}
        <div className="absolute inset-12 rounded-full bg-gradient-to-br from-primary via-[#44FFE8] to-[#7CFFCB] opacity-30 animate-pulse blur-sm" style={{ animationDuration: '2s' }} />
        
        {/* Soft outer glow */}
        <div className="absolute inset-[-30px] rounded-full bg-gradient-to-br from-primary/20 via-transparent to-[#7CFFCB]/10 blur-2xl animate-breathe" style={{ animationDuration: '3s' }} />
      </div>
      
      {/* Loading message */}
      <div className="text-center max-w-md px-4">
        <h3 className="text-xl sm:text-2xl font-semibold text-navy mb-3 sm:mb-4">
          {message || "Analyzing Your Report"}
        </h3>
        
        {/* Animated dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-[#44FFE8] animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-[#7CFFCB] animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
        
        <p className="text-sm sm:text-base text-slate mt-4 sm:mt-6 leading-relaxed">
          Our AI is carefully analyzing your medical data to provide personalized insights
        </p>
      </div>
      
      {/* Cancel button if provided */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-8 sm:mt-10 px-8 py-3.5 glass-dark text-white rounded-full border border-primary/30 transition-all duration-300 hover:shadow-glow hover:border-primary/50 hover:scale-105 active:scale-95 backdrop-blur-md"
        >
          Cancel Analysis
        </button>
      )}
    </div>
  );
};
