interface AnimatedLoaderProps {
  message?: string;
  onCancel?: () => void;
}

// A quiet, fluid "orb" loader — three olive-toned blobs morph and drift behind a
// breathing core, with a slow rotating arc. On-brand (olive/ivory), no glow, no cyan.
export const AnimatedLoader = ({ message, onCancel }: AnimatedLoaderProps) => {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-8 sm:py-10 text-center">
      <div className="dg-orb-wrap mb-9 sm:mb-11" aria-hidden="true">
        <span className="dg-blob dg-blob--a" />
        <span className="dg-blob dg-blob--b" />
        <span className="dg-blob dg-blob--c" />
        <span className="dg-arc" />
        <span className="dg-core" />
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

      <style>{`
        .dg-orb-wrap {
          position: relative;
          width: 116px;
          height: 116px;
          border-radius: 9999px;
        }
        @media (min-width: 640px) {
          .dg-orb-wrap { width: 132px; height: 132px; }
        }
        /* soft morphing blobs */
        .dg-blob {
          position: absolute;
          inset: 8%;
          border-radius: 9999px;
          filter: blur(10px);
          opacity: 0.85;
          mix-blend-mode: multiply;
          will-change: transform;
        }
        .dg-blob--a {
          background: radial-gradient(circle at 35% 35%, hsl(95 30% 34%), hsl(95 32% 22%) 70%);
          animation: dg-morph-a 4.2s ease-in-out infinite;
        }
        .dg-blob--b {
          background: radial-gradient(circle at 60% 40%, hsl(78 34% 46%), hsl(88 30% 30%) 72%);
          animation: dg-morph-b 5.1s ease-in-out infinite;
        }
        .dg-blob--c {
          background: radial-gradient(circle at 50% 60%, hsl(44 46% 74%), hsl(52 34% 60%) 74%);
          animation: dg-morph-c 3.6s ease-in-out infinite;
        }
        /* thin rotating arc */
        .dg-arc {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: conic-gradient(from 0deg, transparent 0deg, transparent 300deg, hsl(95 28% 24%) 355deg, transparent 360deg);
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
                  mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
          animation: dg-spin 2.4s linear infinite;
          opacity: 0.7;
        }
        /* breathing center */
        .dg-core {
          position: absolute;
          inset: 34%;
          border-radius: 9999px;
          background: radial-gradient(circle at 50% 42%, hsl(48 44% 90%), hsl(44 30% 78%));
          box-shadow: 0 0 0 1px hsl(44 20% 82% / 0.6);
          animation: dg-breathe 2.8s ease-in-out infinite;
        }
        @keyframes dg-morph-a {
          0%,100% { transform: translate(-6%, -4%) scale(1); }
          50%     { transform: translate(6%, 5%) scale(1.12); }
        }
        @keyframes dg-morph-b {
          0%,100% { transform: translate(5%, -5%) scale(1.05); }
          50%     { transform: translate(-6%, 6%) scale(0.9); }
        }
        @keyframes dg-morph-c {
          0%,100% { transform: translate(3%, 6%) scale(0.95); }
          50%     { transform: translate(-4%, -6%) scale(1.15); }
        }
        @keyframes dg-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes dg-breathe {
          0%,100% { transform: scale(0.92); opacity: 0.85; }
          50%     { transform: scale(1.06); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dg-blob, .dg-arc, .dg-core { animation-duration: 6s; }
        }
      `}</style>
    </div>
  );
};
