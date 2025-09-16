// Utility functions for dynamic lab marker positioning

export interface PopulationData {
  normal: number;
  borderline: number;
  highRisk: number;
  title: string;
}

export interface MarkerResult {
  category: 'Normal' | 'Borderline' | 'High Risk' | 'Unknown';
  position: number; // 1-99 for positioning within the bar
}

// Extract numeric value from string, handling various formats
export const extractNumber = (value: string): number => {
  if (!value) return NaN;
  
  // Remove common non-numeric characters and extract the first number
  const cleaned = value.replace(/[^\d.-]/g, '');
  const match = cleaned.match(/-?\d+\.?\d*/);
  return match ? parseFloat(match[0]) : NaN;
};

// Parse reference range string into min/max values
export const parseReferenceRange = (range: string) => {
  if (!range) return null;
  const match = range.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (match) {
    return { min: parseFloat(match[1]), max: parseFloat(match[2]) };
  }
  return null;
};

// Normalize population segments to ensure they add up to 100%
export const normalizeSegments = (populationData: PopulationData): PopulationData => {
  const total = populationData.normal + populationData.borderline + populationData.highRisk;
  if (total === 100) return populationData;
  
  // Proportionally adjust to ensure total is 100%
  const factor = 100 / total;
  return {
    ...populationData,
    normal: Math.round(populationData.normal * factor),
    borderline: Math.round(populationData.borderline * factor),
    highRisk: Math.round(populationData.highRisk * factor)
  };
};

// Calculate dynamic marker position and category based on lab value and population data
export const getMarkerPositionAndCategory = (
  lab: {
    name: string;
    value: string;
    referenceRange?: string;
    status?: 'normal' | 'low' | 'high' | 'critical';
  },
  populationData: PopulationData
): MarkerResult => {
  const value = extractNumber(lab.value);
  if (isNaN(value)) {
    return { category: 'Unknown', position: 50 };
  }

  const normalizedData = normalizeSegments(populationData);
  const lowerName = lab.name.toLowerCase();

  // Parse reference range for calculations
  const refRange = parseReferenceRange(lab.referenceRange || '');
  
  let category: MarkerResult['category'] = 'Normal';
  let position = 50; // Default to middle

  // Determine category based on lab status or value analysis
  if (lab.status === 'critical') {
    category = 'High Risk';
  } else if (lab.status === 'high' || lab.status === 'low') {
    category = 'Borderline';
  } else if (lab.status === 'normal') {
    category = 'Normal';
  } else {
    // Advanced categorization based on parameter type and reference ranges
    if (refRange) {
      const midpoint = (refRange.min + refRange.max) / 2;
      const range = refRange.max - refRange.min;
      
      if (value > refRange.max * 1.2 || value < refRange.min * 0.8) {
        category = 'High Risk';
      } else if (value > refRange.max || value < refRange.min) {
        category = 'Borderline';
      } else {
        category = 'Normal';
      }
    } else {
      // Parameter-specific thresholds when no reference range is available
      if (lowerName.includes('hba1c')) {
        if (value >= 6.5) category = 'High Risk';
        else if (value >= 5.7) category = 'Borderline';
        else category = 'Normal';
      } else if (lowerName.includes('ldl')) {
        if (value >= 160) category = 'High Risk';
        else if (value >= 130) category = 'Borderline';
        else category = 'Normal';
      } else if (lowerName.includes('hdl')) {
        if (value < 40) category = 'High Risk';
        else if (value < 50) category = 'Borderline';
        else category = 'Normal';
      } else if (lowerName.includes('glucose') || lowerName.includes('fbs')) {
        if (value >= 126) category = 'High Risk';
        else if (value >= 100) category = 'Borderline';
        else category = 'Normal';
      } else if (lowerName.includes('triglyceride')) {
        if (value >= 200) category = 'High Risk';
        else if (value >= 150) category = 'Borderline';
        else category = 'Normal';
      }
    }
  }

  // Calculate precise position within the determined category segment
  const normalSegment = normalizedData.normal;
  const borderlineSegment = normalizedData.borderline;
  const highRiskSegment = normalizedData.highRisk;

  if (category === 'Normal') {
    // Position within normal segment (0% to normalSegment%)
    if (refRange) {
      const normalizedPosition = (value - refRange.min) / (refRange.max - refRange.min);
      position = Math.max(5, Math.min(normalSegment - 5, normalizedPosition * normalSegment));
    } else {
      // Default position within normal range
      position = normalSegment * 0.4; // 40% through the normal segment
    }
  } else if (category === 'Borderline') {
    // Position within borderline segment
    if (refRange) {
      // Calculate how far into the borderline range the value is
      const borderlineStart = refRange.max;
      const borderlineEnd = refRange.max * 1.2;
      const normalizedPosition = Math.min(1, Math.max(0, (value - borderlineStart) / (borderlineEnd - borderlineStart)));
      position = normalSegment + (normalizedPosition * borderlineSegment);
    } else {
      // Default position within borderline range
      position = normalSegment + (borderlineSegment * 0.5); // Middle of borderline segment
    }
  } else if (category === 'High Risk') {
    // Position within high risk segment
    if (refRange) {
      const highRiskStart = refRange.max * 1.2;
      const highRiskEnd = refRange.max * 2; // Assume double the max as extreme
      const normalizedPosition = Math.min(1, Math.max(0, (value - highRiskStart) / (highRiskEnd - highRiskStart)));
      position = normalSegment + borderlineSegment + (normalizedPosition * highRiskSegment);
    } else {
      // Default position within high risk range
      position = normalSegment + borderlineSegment + (highRiskSegment * 0.6); // 60% through high risk segment
    }
  }

  // Ensure position is within valid bounds (1-99 to avoid edge clipping)
  position = Math.max(1, Math.min(99, position));

  return { category, position };
};