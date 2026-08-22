interface AnimatedLoaderProps {
  message?: string;
  onCancel?: () => void;
}

// A calm "growing sapling" loader: a stem rises from the soil, two leaves unfurl,
// a small bud opens, and the plant gently sways — then softly fades and regrows.
// On-brand olive/green over ivory, no emojis.
export const AnimatedLoader = ({ message, onCancel }: AnimatedLoaderProps) => {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-8 sm:py-10 text-center">
      <div className="mb-8 sm:mb-10 h-24 w-24 sm:h-28 sm:w-28" aria-hidden="true">
        <svg viewBox="0 0 100 120" className="h-full w-full" style={{ overflow: 'visible' }}>
          {/* soil */}
          <ellipse cx="50" cy="110" rx="30" ry="7" fill="hsl(30 24% 40%)" opacity="0.9" />
          <path d="M22 110 Q50 99 78 110 Z" fill="hsl(30 26% 34%)" />

          {/* the plant (fades + sways as a whole, then regrows) */}
          <g className="dg-plant">
            <path
              className="dg-stem"
              d="M50 110 C 50 92, 49 76, 50 54"
              fill="none"
              stroke="hsl(95 32% 30%)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <g className="dg-leaf dg-leaf-l">
              <path d="M50 76 C 40 74, 30 68, 26 57 C 38 57, 47 63, 50 76 Z" fill="hsl(90 38% 38%)" />
            </g>
            <g className="dg-leaf dg-leaf-r">
              <path d="M50 68 C 60 66, 70 60, 74 49 C 62 49, 53 55, 50 68 Z" fill="hsl(82 44% 46%)" />
            </g>
            <circle className="dg-bud" cx="50" cy="53" r="3.6" fill="hsl(84 46% 50%)" />
          </g>
        </svg>
      </div>

      <h3 className="text-2xl sm:text-3xl font-poppins font-light text-foreground">
        {message || 'Making sense of your results.'}
      </h3>
      <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
        We&rsquo;re reading through your report and putting together a clear picture of your health.
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

      <style>{`
        .dg-plant {
          transform-box: fill-box;
          transform-origin: 50% 100%;
          animation: dg-sway 3.6s ease-in-out infinite;
        }
        .dg-stem {
          transform-box: fill-box;
          transform-origin: 50% 100%;
          animation: dg-grow 3.6s ease-in-out infinite;
        }
        .dg-leaf { transform-box: fill-box; }
        .dg-leaf-l {
          transform-origin: 100% 100%;
          animation: dg-leaf-l 3.6s ease-in-out infinite;
        }
        .dg-leaf-r {
          transform-origin: 0% 100%;
          animation: dg-leaf-r 3.6s ease-in-out infinite;
        }
        .dg-bud {
          transform-box: fill-box;
          transform-origin: 50% 100%;
          animation: dg-bud 3.6s ease-in-out infinite;
        }
        @keyframes dg-sway {
          0%   { opacity: 0; transform: rotate(0deg); }
          12%  { opacity: 1; }
          55%  { transform: rotate(-2.5deg); }
          75%  { transform: rotate(2.5deg); }
          84%  { opacity: 1; transform: rotate(0deg); }
          100% { opacity: 0; transform: rotate(0deg); }
        }
        @keyframes dg-grow {
          0%   { transform: scaleY(0); }
          42%  { transform: scaleY(1); }
          100% { transform: scaleY(1); }
        }
        @keyframes dg-leaf-l {
          0%, 22% { transform: scale(0); }
          50%     { transform: scale(1.06); }
          58%     { transform: scale(1); }
          100%    { transform: scale(1); }
        }
        @keyframes dg-leaf-r {
          0%, 32% { transform: scale(0); }
          60%     { transform: scale(1.06); }
          68%     { transform: scale(1); }
          100%    { transform: scale(1); }
        }
        @keyframes dg-bud {
          0%, 15% { transform: scale(0); }
          40%     { transform: scale(1); }
          100%    { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dg-plant, .dg-stem, .dg-leaf-l, .dg-leaf-r, .dg-bud { animation: none; }
          .dg-plant { opacity: 1; }
          .dg-stem { transform: scaleY(1); }
          .dg-leaf-l, .dg-leaf-r, .dg-bud { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
