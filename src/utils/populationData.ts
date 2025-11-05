// Indian population data for lab parameters based on ICMR-INDIAB studies and Indian reference ranges
export interface PopulationNorm {
  parameter: string;
  ageGroups: {
    '20-30': { male: number; female: number };
    '31-40': { male: number; female: number };
    '41-50': { male: number; female: number };
    '51-60': { male: number; female: number };
    '60+': { male: number; female: number };
  };
  unit: string;
  normalRange: string;
}

// Indian population norms based on ICMR-INDIAB studies
const indianPopulationNorms: Record<string, PopulationNorm> = {
  'hba1c': {
    parameter: 'HbA1c',
    ageGroups: {
      '20-30': { male: 5.2, female: 5.1 },
      '31-40': { male: 5.4, female: 5.3 },
      '41-50': { male: 5.6, female: 5.5 },
      '51-60': { male: 5.8, female: 5.7 },
      '60+': { male: 6.0, female: 5.9 }
    },
    unit: '%',
    normalRange: '<5.7%'
  },
  'glucose': {
    parameter: 'Glucose (Fasting)',
    ageGroups: {
      '20-30': { male: 88, female: 85 },
      '31-40': { male: 90, female: 87 },
      '41-50': { male: 92, female: 89 },
      '51-60': { male: 95, female: 92 },
      '60+': { male: 98, female: 95 }
    },
    unit: 'mg/dL',
    normalRange: '70-100 mg/dL'
  },
  'cholesterol': {
    parameter: 'Total Cholesterol',
    ageGroups: {
      '20-30': { male: 175, female: 170 },
      '31-40': { male: 185, female: 180 },
      '41-50': { male: 195, female: 190 },
      '51-60': { male: 200, female: 195 },
      '60+': { male: 205, female: 200 }
    },
    unit: 'mg/dL',
    normalRange: '<200 mg/dL'
  },
  'ldl': {
    parameter: 'LDL Cholesterol',
    ageGroups: {
      '20-30': { male: 105, female: 100 },
      '31-40': { male: 110, female: 105 },
      '41-50': { male: 115, female: 110 },
      '51-60': { male: 120, female: 115 },
      '60+': { male: 125, female: 120 }
    },
    unit: 'mg/dL',
    normalRange: '<100 mg/dL'
  },
  'hdl': {
    parameter: 'HDL Cholesterol',
    ageGroups: {
      '20-30': { male: 40, female: 45 },
      '31-40': { male: 39, female: 44 },
      '41-50': { male: 38, female: 43 },
      '51-60': { male: 38, female: 44 },
      '60+': { male: 39, female: 45 }
    },
    unit: 'mg/dL',
    normalRange: '>40 mg/dL (M), >50 mg/dL (F)'
  },
  'triglycerides': {
    parameter: 'Triglycerides',
    ageGroups: {
      '20-30': { male: 120, female: 110 },
      '31-40': { male: 140, female: 125 },
      '41-50': { male: 160, female: 140 },
      '51-60': { male: 170, female: 150 },
      '60+': { male: 175, female: 155 }
    },
    unit: 'mg/dL',
    normalRange: '<150 mg/dL'
  },
  'alt': {
    parameter: 'ALT',
    ageGroups: {
      '20-30': { male: 26, female: 22 },
      '31-40': { male: 28, female: 23 },
      '41-50': { male: 30, female: 24 },
      '51-60': { male: 32, female: 25 },
      '60+': { male: 30, female: 24 }
    },
    unit: 'U/L',
    normalRange: '7-56 U/L'
  },
  'ast': {
    parameter: 'AST',
    ageGroups: {
      '20-30': { male: 24, female: 20 },
      '31-40': { male: 26, female: 21 },
      '41-50': { male: 28, female: 22 },
      '51-60': { male: 30, female: 23 },
      '60+': { male: 28, female: 22 }
    },
    unit: 'U/L',
    normalRange: '10-40 U/L'
  },
  'hemoglobin': {
    parameter: 'Hemoglobin',
    ageGroups: {
      '20-30': { male: 14.5, female: 12.5 },
      '31-40': { male: 14.5, female: 12.5 },
      '41-50': { male: 14.3, female: 12.3 },
      '51-60': { male: 14.0, female: 12.0 },
      '60+': { male: 13.5, female: 11.8 }
    },
    unit: 'g/dL',
    normalRange: '13-17 g/dL (M), 12-15 g/dL (F)'
  },
  'creatinine': {
    parameter: 'Creatinine',
    ageGroups: {
      '20-30': { male: 0.9, female: 0.7 },
      '31-40': { male: 0.9, female: 0.7 },
      '41-50': { male: 0.95, female: 0.75 },
      '51-60': { male: 1.0, female: 0.8 },
      '60+': { male: 1.1, female: 0.85 }
    },
    unit: 'mg/dL',
    normalRange: '0.7-1.3 mg/dL (M), 0.6-1.1 mg/dL (F)'
  },
  'vitamin d': {
    parameter: 'Vitamin D',
    ageGroups: {
      '20-30': { male: 18, female: 17 },
      '31-40': { male: 19, female: 18 },
      '41-50': { male: 20, female: 19 },
      '51-60': { male: 21, female: 20 },
      '60+': { male: 22, female: 21 }
    },
    unit: 'ng/mL',
    normalRange: '30-100 ng/mL'
  },
  'tsh': {
    parameter: 'TSH',
    ageGroups: {
      '20-30': { male: 2.0, female: 2.2 },
      '31-40': { male: 2.1, female: 2.3 },
      '41-50': { male: 2.3, female: 2.5 },
      '51-60': { male: 2.5, female: 2.7 },
      '60+': { male: 2.8, female: 3.0 }
    },
    unit: 'mIU/L',
    normalRange: '0.5-4.5 mIU/L'
  }
};

function getAgeGroup(age: number): keyof PopulationNorm['ageGroups'] {
  if (age <= 30) return '20-30';
  if (age <= 40) return '31-40';
  if (age <= 50) return '41-50';
  if (age <= 60) return '51-60';
  return '60+';
}

function normalizeParameterName(name: string): string {
  const normalized = name.toLowerCase().trim();
  
  // Map common variations to our standard names
  const mappings: Record<string, string> = {
    'hemoglobin a1c': 'hba1c',
    'glycosylated hemoglobin': 'hba1c',
    'fasting glucose': 'glucose',
    'blood glucose': 'glucose',
    'total cholesterol': 'cholesterol',
    'ldl cholesterol': 'ldl',
    'hdl cholesterol': 'hdl',
    'sgpt': 'alt',
    'sgot': 'ast',
    'hb': 'hemoglobin',
    '25-oh vitamin d': 'vitamin d',
    'vitamin d3': 'vitamin d'
  };
  
  // Check direct mappings first
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  // Check if normalized name is directly in our data
  if (indianPopulationNorms[normalized]) {
    return normalized;
  }
  
  // Check partial matches
  for (const key of Object.keys(indianPopulationNorms)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return key;
    }
  }
  
  return normalized;
}

export function getPopulationNorm(
  parameterName: string,
  age?: number,
  gender?: 'male' | 'female' | 'other'
): number | null {
  if (!age || !gender || gender === 'other') return null;
  
  const normalizedParam = normalizeParameterName(parameterName);
  const norm = indianPopulationNorms[normalizedParam];
  
  if (!norm) return null;
  
  const ageGroup = getAgeGroup(age);
  return norm.ageGroups[ageGroup][gender];
}

export interface PopulationComparison {
  populationAverage: number;
  percentageDifference: number;
  comparison: 'below' | 'at' | 'above';
  severity: 'significantly' | 'moderately' | 'slightly' | 'normal';
  description: string;
}

export function compareWithPopulation(
  userValue: number,
  parameterName: string,
  age?: number,
  gender?: 'male' | 'female' | 'other'
): PopulationComparison | null {
  const populationAvg = getPopulationNorm(parameterName, age, gender);
  
  if (!populationAvg || !age || !gender || gender === 'other') return null;
  
  const percentageDiff = ((userValue - populationAvg) / populationAvg) * 100;
  const absDiff = Math.abs(percentageDiff);
  
  let comparison: 'below' | 'at' | 'above';
  let severity: 'significantly' | 'moderately' | 'slightly' | 'normal';
  
  if (absDiff < 5) {
    comparison = 'at';
    severity = 'normal';
  } else if (percentageDiff > 0) {
    comparison = 'above';
    severity = absDiff > 50 ? 'significantly' : absDiff > 20 ? 'moderately' : 'slightly';
  } else {
    comparison = 'below';
    severity = absDiff > 50 ? 'significantly' : absDiff > 20 ? 'moderately' : 'slightly';
  }
  
  const ageGroup = getAgeGroup(age);
  const genderText = gender === 'male' ? 'males' : 'females';
  const direction = comparison === 'above' ? 'higher' : comparison === 'below' ? 'lower' : 'similar to';
  
  const description = `${severity !== 'normal' ? severity + ' ' : ''}${direction} Indian ${genderText} aged ${ageGroup}`;
  
  return {
    populationAverage: populationAvg,
    percentageDifference: percentageDiff,
    comparison,
    severity,
    description
  };
}

// Legacy function for backward compatibility
export const getPopulationData = (parameterName: string) => {
  const lowerName = parameterName.toLowerCase();
  
  const defaultData = {
    normal: 70,
    borderline: 20,
    highRisk: 10,
    title: "General Population"
  };

  if (lowerName.includes('cholesterol') || lowerName.includes('ldl')) {
    return {
      normal: 60,
      borderline: 25,
      highRisk: 15,
      title: "Indian Adults - Cholesterol"
    };
  }
  
  if (lowerName.includes('hba1c') || lowerName.includes('glucose')) {
    return {
      normal: 65,
      borderline: 20,
      highRisk: 15,
      title: "Indian Adults - Diabetes Risk"
    };
  }
  
  if (lowerName.includes('triglyceride')) {
    return {
      normal: 55,
      borderline: 30,
      highRisk: 15,
      title: "Indian Adults - Triglycerides"
    };
  }
  
  if (lowerName.includes('vitamin d')) {
    return {
      normal: 25,
      borderline: 45,
      highRisk: 30,
      title: "Indian Adults - Vitamin D"
    };
  }

  return defaultData;
};
