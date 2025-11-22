interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  onRetry: () => {},
};

/**
 * Utility function to retry async operations with exponential backoff
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise with the result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      const shouldNotRetry = 
        error?.status === 400 || // Bad request (validation errors)
        error?.status === 401 || // Unauthorized
        error?.status === 403 || // Forbidden
        error?.status === 402 || // Payment required (credits exhausted)
        error?.status === 404;   // Not found
      
      if (shouldNotRetry) {
        console.error(`[RETRY] Non-retryable error (status ${error?.status}):`, error);
        throw error;
      }
      
      // Check if this is a retryable status
      const isRetryable = 
        !error?.status || 
        config.retryableStatuses.includes(error.status);
      
      // If we've exhausted retries or error is not retryable, throw
      if (attempt === config.maxRetries || !isRetryable) {
        console.error(`[RETRY] Max retries (${config.maxRetries}) reached or non-retryable error:`, error);
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(
        config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );
      
      // Add jitter (randomness) to prevent thundering herd
      const jitter = Math.random() * 0.3 * exponentialDelay; // ±30% jitter
      const delay = exponentialDelay + jitter;
      
      console.warn(
        `[RETRY] Attempt ${attempt + 1}/${config.maxRetries} failed. ` +
        `Retrying in ${Math.round(delay)}ms...`,
        error
      );
      
      config.onRetry(attempt + 1, error);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Wrapper specifically for Supabase function invocations with retry logic
 */
export async function invokeWithRetry<T = any>(
  supabase: any,
  functionName: string,
  options: {
    body?: any;
    retryOptions?: RetryOptions;
  } = {}
): Promise<{ data: T | null; error: any }> {
  const { body, retryOptions } = options;
  
  try {
    const result = await retryWithBackoff(
      async () => {
        const response = await supabase.functions.invoke(functionName, { body });
        
        // Supabase functions return { data, error }
        if (response.error) {
          // Extract status code if available
          const error = new Error(response.error.message || 'Function invocation failed');
          (error as any).status = response.error.status;
          (error as any).originalError = response.error;
          throw error;
        }
        
        return response;
      },
      {
        ...retryOptions,
        onRetry: (attempt, error) => {
          console.log(
            `[RETRY] Retrying ${functionName} (attempt ${attempt}):`,
            error.message
          );
          retryOptions?.onRetry?.(attempt, error);
        }
      }
    );
    
    return result;
  } catch (error: any) {
    console.error(`[RETRY] Failed to invoke ${functionName} after retries:`, error);
    
    // Return in Supabase format
    return {
      data: null,
      error: error.originalError || {
        message: error.message || 'Unknown error',
        status: error.status
      }
    };
  }
}
