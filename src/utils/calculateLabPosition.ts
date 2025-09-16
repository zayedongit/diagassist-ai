/**
 * Calculate the exact position of a lab value on the visual range bar
 * Returns position as percentage (0-100) where the human icon should appear
 */

export interface LabPosition {
  position: number; // 0-100 percentage
  category: 'low' | 'normal' | 'high' | 'critical';
}

// Extract numeric value from lab result string
export const extractNumericValue = (valueStr: string): number | null => {
  if (!valueStr || typeof valueStr !== 'string') return null;
  
  // Remove non-numeric characters except decimal point and minus
  const cleaned = valueStr.replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? null : num;
};

// Parse reference range string (e.g., "4.0-5.7" or "10.0 - 20.0")
export const parseReferenceRange = (range: string): { min: number; max: number } | null => {
  if (!range || typeof range !== 'string') return null;
  
  // Match patterns like "4.0-5.7", "4.0 - 5.7", "< 5.7", "> 4.0"
  const rangeMatch = range.match(/(\d+\.?\d*)\s*[-–—]\s*(\d+\.?\d*)/);
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2])
    };
  }
  
  // Handle single boundary cases like "< 5.7"
  const lessThanMatch = range.match(/[<≤]\s*(\d+\.?\d*)/);
  if (lessThanMatch) {
    const max = parseFloat(lessThanMatch[1]);
    return { min: 0, max };
  }
  
  const greaterThanMatch = range.match(/[>≥]\s*(\d+\.?\d*)/);
  if (greaterThanMatch) {
    const min = parseFloat(greaterThanMatch[1]);
    return { min, max: min * 2 }; // Estimate upper bound
  }
  
  return null;
};

// Special logic for parameters where lower/higher values have different implications
export const getParameterType = (labName: string): 'higher-better' | 'lower-better' | 'middle-best' => {
  const name = labName.toLowerCase();
  
  // Higher is better
  if (name.includes('hdl') || name.includes('vitamin d') || name.includes('hemoglobin') || 
      name.includes('protein') || name.includes('albumin')) {
    return 'higher-better';
  }
  
  // Lower is better  
  if (name.includes('ldl') || name.includes('glucose') || name.includes('triglyceride') || 
      name.includes('cholesterol') && !name.includes('hdl') || name.includes('creatinine') ||
      name.includes('bilirubin') || name.includes('alt') || name.includes('ast')) {
    return 'lower-better';
  }
  
  // Middle range is best (most parameters)
  return 'middle-best';
};

// Calculate position based on lab value and reference range
export const calculateLabPosition = (
  labValue: string,
  referenceRange?: string,
  status?: 'normal' | 'low' | 'high' | 'critical'
): LabPosition => {
  const numValue = extractNumericValue(labValue);
  
  // If we can't parse the value, use status-based positioning
  if (numValue === null) {
    switch (status?.toLowerCase()) {
      case 'low':
        return { position: 15, category: 'low' };
      case 'high':
        return { position: 85, category: 'high' };
      case 'critical':
        return { position: status === 'low' ? 5 : 95, category: 'critical' };
      default:
        return { position: 50, category: 'normal' };
    }
  }
  
  // Parse reference range
  const range = parseReferenceRange(referenceRange || '');
  
  if (!range) {
    // No reference range available, use status-based positioning
    switch (status?.toLowerCase()) {
      case 'low':
        return { position: 20, category: 'low' };
      case 'high':
        return { position: 80, category: 'high' };
      case 'critical':
        return { position: status === 'low' ? 10 : 90, category: 'critical' };
      default:
        return { position: 50, category: 'normal' };
    }
  }
  
  const { min, max } = range;
  const rangeWidth = max - min;
  
  // Calculate base position within reference range (0-100%)
  let position: number;
  
  if (numValue < min) {
    // Below normal range - position in lower 25% of bar
    const deviation = (min - numValue) / (rangeWidth * 0.5); // How far below normal
    position = Math.max(5, 25 - (deviation * 20)); // 5-25% range
  } else if (numValue > max) {
    // Above normal range - position in upper 25% of bar  
    const deviation = (numValue - max) / (rangeWidth * 0.5); // How far above normal
    position = Math.min(95, 75 + (deviation * 20)); // 75-95% range
  } else {
    // Within normal range - position in middle 50% of bar (25-75%)
    const normalizedPosition = (numValue - min) / rangeWidth;
    position = 25 + (normalizedPosition * 50); // 25-75% range
  }
  
  // Determine category based on position and reference range
  let category: 'low' | 'normal' | 'high' | 'critical';
  
  if (numValue < min) {
    const deviationPercent = Math.abs(numValue - min) / rangeWidth;
    category = deviationPercent > 0.5 ? 'critical' : 'low';
  } else if (numValue > max) {
    const deviationPercent = Math.abs(numValue - max) / rangeWidth;
    category = deviationPercent > 0.5 ? 'critical' : 'high';
  } else {
    category = 'normal';
  }
  
  // Override with provided status if it indicates critical
  if (status?.toLowerCase() === 'critical') {
    category = 'critical';
  }
  
  return {
    position: Math.round(Math.max(5, Math.min(95, position))),
    category
  };
};