interface AnimatedLoaderProps {
  message?: string;
  onCancel?: () => void;
}

export const AnimatedLoader = ({ message, onCancel }: AnimatedLoaderProps) => {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-8 sm:py-10 text-center">
      {/* Minimal olive indicator — quiet motion, no glow, no cyan */}
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 mb-8 sm:mb-10">
        <svg
          viewBox="0 0 64 64"
          className="w-full h-full animate-spin"
          style={{ animationDuration: '1.6s' }}
        >
          <circle cx="32" cy="32" r="27" fill="none" stroke="hsl(44 20% 82%)" strokeWidth="2" />
          <circle
            cx="32" cy="32" r="27" fill="none"
            stroke="hsl(95 24% 20%)" strokeWidth="2" strokeLinecap="round"
            strokeDasharray="42 128"
          />
        </svg>
      </div>

      <h3 className="text-2xl sm:text-3xl font-poppins font-light text-foreground">
        {message || 'Making sense of your results.'}
      </h3>
      <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
        We&rsquo;re reviewing your report and preparing a clearer picture of your health.
      </p>

      <p className="mt-10 text-xs text-muted-foreground/80 max-w-sm leading-relaxed">
        Your report is being handled with care — used only for your analysis and removed after processing.
      </p>

      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-8 px-6 py-2.5 rounded-lg border border-foreground/25 text-foreground text-sm transition-colors duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary"
        >
          Cancel
        </button>
      )}
    </div>
  );
};
