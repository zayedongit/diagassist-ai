interface AnimatedLoaderProps {
  message?: string;
  onCancel?: () => void;
}

export const AnimatedLoader = ({ message, onCancel }: AnimatedLoaderProps) => {
  return (
    <div className="text-center space-y-8">
      {/* Animated Sphere */}
      <div className="flex justify-center">
        <div className="relative">
          {/* Main animated sphere */}
          <div 
            className="w-32 h-32 rounded-full animate-pulse"
            style={{
              background: `linear-gradient(135deg, #FFCE32 0%, hsl(var(--primary)) 100%)`,
              boxShadow: '0 0 40px rgba(255, 206, 50, 0.4), 0 0 80px rgba(29, 99, 255, 0.3)'
            }}
          >
            {/* Inner animated ring */}
            <div 
              className="absolute inset-4 rounded-full animate-spin"
              style={{
                background: `linear-gradient(45deg, transparent 40%, rgba(255, 206, 50, 0.6) 50%, transparent 60%)`,
                animation: 'spin 3s linear infinite'
              }}
            />
            
            {/* Central orb */}
            <div 
              className="absolute inset-8 rounded-full animate-bounce"
              style={{
                background: `radial-gradient(circle, #FFCE32 0%, hsl(var(--primary)) 70%)`,
                animation: 'bounce 2s ease-in-out infinite'
              }}
            />
          </div>
          
          {/* Floating particles */}
          <div 
            className="absolute -top-2 -right-2 w-4 h-4 rounded-full animate-ping"
            style={{ backgroundColor: '#FFCE32' }}
          />
          <div 
            className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full animate-ping"
            style={{ 
              backgroundColor: 'hsl(var(--primary))',
              animationDelay: '1s'
            }}
          />
          <div 
            className="absolute top-1/2 -left-4 w-2 h-2 rounded-full animate-ping"
            style={{ 
              backgroundColor: '#FFCE32',
              animationDelay: '2s'
            }}
          />
        </div>
      </div>
      
      {/* Loading Message */}
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold text-gray-900">
          Analyzing Your Report
        </h3>
        <p className="text-gray-700 max-w-lg mx-auto">
          {message || "Analysis in progress... Typically completes in 30-60 seconds."}
        </p>
        
        
        {/* Animated Progress Dots */}
        <div className="flex justify-center">
          <div className="flex space-x-2">
            <div 
              className="w-3 h-3 rounded-full animate-bounce"
              style={{ backgroundColor: '#FFCE32' }}
            />
            <div 
              className="w-3 h-3 rounded-full animate-bounce"
              style={{ 
                backgroundColor: 'hsl(var(--primary))',
                animationDelay: '0.1s'
              }}
            />
            <div 
              className="w-3 h-3 rounded-full animate-bounce"
              style={{ 
                backgroundColor: '#FFCE32',
                animationDelay: '0.2s'
              }}
            />
          </div>
        </div>

        {/* Cancel Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Cancel & Try Again
          </button>
        )}
      </div>
    </div>
  );
};