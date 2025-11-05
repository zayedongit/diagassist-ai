interface Recommendation {
  text: string;
  source: 'clinical' | 'risk' | 'parameter';
  priority: number;
}

/**
 * Merge and deduplicate recommendations from multiple sources
 * Priority: Clinical chat > Risk predictions > Parameter insights
 */
export function deduplicateRecommendations(
  clinicalRecommendations: {
    lifestyle?: string[];
    dietary?: string[];
    medical?: string[];
  },
  riskRecommendations: {
    lifestyle: string[];
    dietary: string[];
    medical: string[];
  },
  parameterRecommendations?: string[]
): {
  lifestyle: string[];
  dietary: string[];
  medical: string[];
} {
  // Helper function to normalize recommendation text for comparison
  const normalize = (text: string): string => {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Helper function to check if two recommendations are similar
  const areSimilar = (rec1: string, rec2: string): boolean => {
    const norm1 = normalize(rec1);
    const norm2 = normalize(rec2);
    
    // Exact match
    if (norm1 === norm2) return true;
    
    // Check if one contains the other (substring match)
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
    
    // Check for key phrase overlap
    const words1 = norm1.split(' ').filter(w => w.length > 3);
    const words2 = norm2.split(' ').filter(w => w.length > 3);
    const commonWords = words1.filter(w => words2.includes(w));
    
    // If more than 50% of words overlap, consider similar
    return commonWords.length > Math.min(words1.length, words2.length) * 0.5;
  };

  // Merge recommendations with priority
  const mergeCategory = (
    clinical: string[] = [],
    risk: string[] = [],
    category: 'lifestyle' | 'dietary' | 'medical'
  ): string[] => {
    const merged: Recommendation[] = [];
    
    // Add clinical recommendations (highest priority)
    clinical.forEach(text => {
      merged.push({ text, source: 'clinical', priority: 3 });
    });
    
    // Add risk recommendations if not already covered
    risk.forEach(text => {
      const isDuplicate = merged.some(m => areSimilar(m.text, text));
      if (!isDuplicate) {
        merged.push({ text, source: 'risk', priority: 2 });
      }
    });
    
    // Sort by priority and return text only
    return merged
      .sort((a, b) => b.priority - a.priority)
      .map(r => r.text);
  };

  return {
    lifestyle: mergeCategory(
      clinicalRecommendations.lifestyle,
      riskRecommendations.lifestyle,
      'lifestyle'
    ),
    dietary: mergeCategory(
      clinicalRecommendations.dietary,
      riskRecommendations.dietary,
      'dietary'
    ),
    medical: mergeCategory(
      clinicalRecommendations.medical,
      riskRecommendations.medical,
      'medical'
    )
  };
}

/**
 * Enhance recommendations with specificity from clinical context
 */
export function enhanceRecommendationsWithContext(
  recommendations: {
    lifestyle: string[];
    dietary: string[];
    medical: string[];
  },
  clinicalContext?: any
): {
  lifestyle: string[];
  dietary: string[];
  medical: string[];
} {
  if (!clinicalContext) return recommendations;

  const enhanced = { ...recommendations };

  // Add smoking cessation as #1 priority if smoker
  if (clinicalContext.lifestyle?.smoking) {
    enhanced.lifestyle = [
      'Smoking cessation - Most important intervention (reduces CV risk by 50% within 1 year)',
      ...enhanced.lifestyle.filter(r => !r.toLowerCase().includes('smok'))
    ];
  }

  // Make exercise recommendation specific based on current level
  if (clinicalContext.lifestyle?.exercise === 'sedentary') {
    enhanced.lifestyle = enhanced.lifestyle.map(r => {
      if (r.toLowerCase().includes('exercise') || r.toLowerCase().includes('physical activity')) {
        return 'Start with 10-15 min daily walks, gradually increase to 150 min/week moderate exercise';
      }
      return r;
    });
  }

  // Make dietary recommendations specific based on conditions
  if (clinicalContext.conditions && Array.isArray(clinicalContext.conditions)) {
    const hasCardiacIssue = clinicalContext.conditions.some((c: any) => 
      c.name.toLowerCase().includes('heart') || c.name.toLowerCase().includes('cardiac')
    );
    
    if (hasCardiacIssue) {
      enhanced.dietary = [
        'DASH diet: Rich in fruits, vegetables, whole grains, lean proteins',
        ...enhanced.dietary.filter(r => !r.toLowerCase().includes('dash'))
      ];
    }
  }

  return enhanced;
}
