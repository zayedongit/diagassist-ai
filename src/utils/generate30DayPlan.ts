import { HealthScoreBreakdown, SystemScore } from './healthScoreCalculator';

export interface TestRecommendation {
  testName: string;
  timing: string;
  reason: string;
  urgency: 'routine' | 'important' | 'urgent';
}

export interface SpecialistReferral {
  specialty: string;
  reason: string;
  systemRelated: string;
  timeframe: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ActivityRecommendation {
  type: 'exercise' | 'diet' | 'lifestyle' | 'monitoring';
  activity: string;
  frequency: string;
  duration: string;
  benefitsSystem: string[];
}

export interface DailyActivity {
  day: string;
  morning: string;
  afternoon: string;
  evening: string;
}

export interface WeeklyPlan {
  week: number;
  focus: string;
  goals: string[];
  activities: DailyActivity[];
}

export interface DietaryPlan {
  weeklyMealPlan: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
    snacks: string[];
  };
  foodsToAdd: string[];
  foodsToLimit: string[];
  hydrationGoals: string;
  supplementsIfNeeded: string[];
}

export interface HealthImprovementPlan {
  targetSystems: string[];
  overallGoal: string;
  weeklyBreakdown: WeeklyPlan[];
  testsRequired: TestRecommendation[];
  specialistReferrals: SpecialistReferral[];
  dailyActivities: ActivityRecommendation[];
  dietaryPlan: DietaryPlan;
  trackingMetrics: string[];
}

const getSystemLabel = (systemName: string): string => {
  const labels: Record<string, string> = {
    metabolic: 'Metabolic Health',
    cardiovascular: 'Cardiovascular Health',
    kidney: 'Kidney Function',
    liver: 'Liver Function',
    hematologic: 'Blood Health',
    endocrine: 'Endocrine Health'
  };
  return labels[systemName] || systemName;
};

export function generate30DayPlan(breakdown: HealthScoreBreakdown): HealthImprovementPlan {
  // Identify systems needing improvement (score < 70)
  const targetSystems: string[] = [];
  const systemScores = breakdown.systemScores;
  
  Object.entries(systemScores).forEach(([systemName, systemData]: [string, SystemScore]) => {
    if (systemData.score < 70) {
      targetSystems.push(systemName);
    }
  });

  // If no systems need major improvement, target the lowest scoring ones
  if (targetSystems.length === 0) {
    const sortedSystems = Object.entries(systemScores)
      .sort(([, a], [, b]) => a.score - b.score)
      .slice(0, 2)
      .map(([name]) => name);
    targetSystems.push(...sortedSystems);
  }

  // Generate overall goal
  const overallGoal = targetSystems.length > 0 
    ? `Improve ${targetSystems.map(s => getSystemLabel(s)).join(' and ')} through targeted lifestyle modifications, dietary changes, and medical monitoring over the next 30 days.`
    : 'Maintain optimal health through consistent healthy habits and regular monitoring.';

  // Generate tests required
  const testsRequired: TestRecommendation[] = [];
  targetSystems.forEach(system => {
    switch (system) {
      case 'metabolic':
        testsRequired.push(
          { testName: 'HbA1c', timing: 'Week 4', reason: 'Monitor glucose control', urgency: 'important' },
          { testName: 'Fasting Blood Sugar', timing: 'Week 2', reason: 'Baseline glucose assessment', urgency: 'important' },
          { testName: 'Fasting Insulin', timing: 'Week 4', reason: 'Assess insulin resistance', urgency: 'routine' }
        );
        break;
      case 'cardiovascular':
        testsRequired.push(
          { testName: 'Lipid Panel', timing: 'Week 4', reason: 'Monitor cholesterol levels', urgency: 'important' },
          { testName: 'Blood Pressure Monitoring', timing: 'Daily', reason: 'Track cardiovascular health', urgency: 'important' },
          { testName: 'ECG', timing: 'Week 2', reason: 'Baseline heart function', urgency: 'routine' }
        );
        break;
      case 'kidney':
        testsRequired.push(
          { testName: 'Serum Creatinine & eGFR', timing: 'Week 4', reason: 'Monitor kidney function', urgency: 'important' },
          { testName: 'Urine Microalbumin', timing: 'Week 3', reason: 'Check for early kidney damage', urgency: 'important' },
          { testName: 'Electrolytes', timing: 'Week 2', reason: 'Assess mineral balance', urgency: 'routine' }
        );
        break;
      case 'liver':
        testsRequired.push(
          { testName: 'Liver Function Tests', timing: 'Week 4', reason: 'Monitor liver enzymes', urgency: 'important' },
          { testName: 'Liver Ultrasound', timing: 'Week 3', reason: 'Assess liver structure', urgency: 'routine' },
          { testName: 'Hepatitis Screening', timing: 'Week 2', reason: 'Rule out viral hepatitis', urgency: 'routine' }
        );
        break;
      case 'hematologic':
        testsRequired.push(
          { testName: 'Complete Blood Count', timing: 'Week 4', reason: 'Monitor blood cell counts', urgency: 'important' },
          { testName: 'Iron Studies', timing: 'Week 2', reason: 'Check iron levels', urgency: 'important' },
          { testName: 'Vitamin B12 & Folate', timing: 'Week 3', reason: 'Assess vitamin levels', urgency: 'routine' }
        );
        break;
      case 'endocrine':
        testsRequired.push(
          { testName: 'TSH & Free T4', timing: 'Week 4', reason: 'Monitor thyroid function', urgency: 'important' },
          { testName: 'Vitamin D', timing: 'Week 2', reason: 'Check vitamin D levels', urgency: 'important' },
          { testName: 'Morning Cortisol', timing: 'Week 3', reason: 'Assess adrenal function', urgency: 'routine' }
        );
        break;
    }
  });

  // Generate specialist referrals
  const specialistReferrals: SpecialistReferral[] = [];
  targetSystems.forEach(system => {
    switch (system) {
      case 'metabolic':
        if (systemScores[system].score < 50) {
          specialistReferrals.push({
            specialty: 'Endocrinologist',
            reason: 'Significant metabolic abnormalities requiring specialist evaluation',
            systemRelated: getSystemLabel(system),
            timeframe: 'Within 1 week',
            priority: 'high'
          });
        } else {
          specialistReferrals.push({
            specialty: 'Dietitian / Nutritionist',
            reason: 'Personalized meal planning for metabolic health',
            systemRelated: getSystemLabel(system),
            timeframe: 'Within 2 weeks',
            priority: 'medium'
          });
        }
        break;
      case 'cardiovascular':
        if (systemScores[system].score < 50) {
          specialistReferrals.push({
            specialty: 'Cardiologist',
            reason: 'Multiple cardiovascular risk factors requiring specialist care',
            systemRelated: getSystemLabel(system),
            timeframe: 'Within 1 week',
            priority: 'high'
          });
        }
        break;
      case 'kidney':
        specialistReferrals.push({
          specialty: 'Nephrologist',
          reason: 'Kidney function assessment and management',
          systemRelated: getSystemLabel(system),
          timeframe: 'Within 2 weeks',
          priority: systemScores[system].score < 50 ? 'high' : 'medium'
        });
        break;
      case 'liver':
        specialistReferrals.push({
          specialty: 'Hepatologist / Gastroenterologist',
          reason: 'Liver function evaluation and treatment planning',
          systemRelated: getSystemLabel(system),
          timeframe: 'Within 2 weeks',
          priority: systemScores[system].score < 50 ? 'high' : 'medium'
        });
        break;
      case 'hematologic':
        if (systemScores[system].score < 60) {
          specialistReferrals.push({
            specialty: 'Hematologist',
            reason: 'Blood disorder evaluation and management',
            systemRelated: getSystemLabel(system),
            timeframe: 'Within 2 weeks',
            priority: 'medium'
          });
        }
        break;
      case 'endocrine':
        specialistReferrals.push({
          specialty: 'Endocrinologist',
          reason: 'Hormonal imbalance assessment and treatment',
          systemRelated: getSystemLabel(system),
          timeframe: 'Within 2 weeks',
          priority: systemScores[system].score < 50 ? 'high' : 'medium'
        });
        break;
    }
  });

  // Generate daily activities
  const dailyActivities: ActivityRecommendation[] = [
    {
      type: 'exercise',
      activity: '30-minute brisk walk',
      frequency: 'Daily',
      duration: '30 minutes',
      benefitsSystem: ['cardiovascular', 'metabolic']
    },
    {
      type: 'monitoring',
      activity: 'Blood pressure check',
      frequency: 'Twice daily (morning & evening)',
      duration: '5 minutes',
      benefitsSystem: ['cardiovascular', 'kidney']
    },
    {
      type: 'diet',
      activity: 'Drink water before each meal',
      frequency: '3 times daily',
      duration: 'Ongoing',
      benefitsSystem: ['kidney', 'metabolic', 'liver']
    },
    {
      type: 'lifestyle',
      activity: '7-8 hours quality sleep',
      frequency: 'Daily',
      duration: 'Nightly',
      benefitsSystem: ['endocrine', 'cardiovascular', 'metabolic']
    },
    {
      type: 'lifestyle',
      activity: 'Stress reduction (meditation/yoga)',
      frequency: 'Daily',
      duration: '15 minutes',
      benefitsSystem: ['endocrine', 'cardiovascular']
    }
  ];

  // Add system-specific activities
  if (targetSystems.includes('metabolic')) {
    dailyActivities.push({
      type: 'monitoring',
      activity: 'Blood glucose monitoring',
      frequency: 'Fasting & 2 hours after meals',
      duration: '5 minutes',
      benefitsSystem: ['metabolic']
    });
  }

  // Generate dietary plan
  const dietaryPlan: DietaryPlan = {
    weeklyMealPlan: {
      breakfast: [
        'Oatmeal with nuts and berries',
        'Greek yogurt with seeds and fruit',
        'Whole grain toast with avocado',
        'Vegetable omelet with spinach',
        'Smoothie with greens and protein',
        'Quinoa porridge with almonds',
        'Whole grain cereal with low-fat milk'
      ],
      lunch: [
        'Grilled chicken salad with olive oil',
        'Lentil soup with whole grain bread',
        'Brown rice with mixed vegetables',
        'Tuna sandwich on whole wheat',
        'Quinoa bowl with roasted vegetables',
        'Chickpea curry with brown rice',
        'Turkey wrap with hummus and veggies'
      ],
      dinner: [
        'Baked fish with steamed vegetables',
        'Grilled chicken with sweet potato',
        'Vegetable stir-fry with tofu',
        'Lean beef with roasted Brussels sprouts',
        'Salmon with quinoa and asparagus',
        'Chicken curry with cauliflower rice',
        'Bean chili with mixed greens'
      ],
      snacks: [
        'Handful of almonds or walnuts',
        'Apple slices with peanut butter',
        'Carrot sticks with hummus',
        'Greek yogurt',
        'Mixed berries',
        'Cucumber with tzatziki'
      ]
    },
    foodsToAdd: [
      'Leafy green vegetables (spinach, kale)',
      'Fatty fish (salmon, mackerel) - 2x per week',
      'Nuts and seeds (almonds, walnuts, chia)',
      'Whole grains (oats, quinoa, brown rice)',
      'Legumes (lentils, chickpeas, beans)',
      'Berries and citrus fruits',
      'Olive oil and avocados',
      'Garlic and turmeric for anti-inflammatory benefits'
    ],
    foodsToLimit: [
      'Refined sugars and sweetened beverages',
      'Processed meats (bacon, sausage)',
      'White bread and refined grains',
      'Fried and fast foods',
      'High-sodium packaged foods',
      'Alcohol (limit to occasional)',
      'Trans fats and hydrogenated oils',
      'Excessive red meat consumption'
    ],
    hydrationGoals: 'Drink 8-10 glasses (2-2.5 liters) of water daily. Increase intake if exercising or in hot weather.',
    supplementsIfNeeded: []
  };

  // Add system-specific supplements
  if (targetSystems.includes('cardiovascular')) {
    dietaryPlan.supplementsIfNeeded.push('Omega-3 fatty acids (after consulting physician)');
  }
  if (targetSystems.includes('hematologic')) {
    dietaryPlan.supplementsIfNeeded.push('Iron supplement if deficient (as prescribed)');
    dietaryPlan.supplementsIfNeeded.push('Vitamin B12 if low (as prescribed)');
  }
  if (targetSystems.includes('endocrine')) {
    dietaryPlan.supplementsIfNeeded.push('Vitamin D (if levels are low)');
  }

  // Generate weekly breakdown
  const weeklyBreakdown: WeeklyPlan[] = [
    {
      week: 1,
      focus: 'Assessment & Foundation',
      goals: [
        'Get baseline tests done',
        'Start daily activity routine',
        'Begin dietary changes',
        'Establish monitoring habits'
      ],
      activities: [
        { day: 'Monday', morning: '30-min walk, blood pressure check', afternoon: 'Schedule baseline tests', evening: 'Prepare healthy meals for week' },
        { day: 'Tuesday', morning: '30-min walk, BP check', afternoon: 'Baseline blood tests', evening: 'Track food intake, 8 hours sleep' },
        { day: 'Wednesday', morning: '30-min walk, BP check', afternoon: 'Hydration focus', evening: '15-min meditation' },
        { day: 'Thursday', morning: '30-min walk, BP check', afternoon: 'Review test results with doctor', evening: 'Meal prep' },
        { day: 'Friday', morning: '30-min walk, BP check', afternoon: 'Start recommended supplements', evening: 'Relaxation time' },
        { day: 'Saturday', morning: '45-min walk', afternoon: 'Grocery shopping for healthy foods', evening: 'Meal planning for next week' },
        { day: 'Sunday', morning: 'Light exercise/yoga', afternoon: 'Rest and recovery', evening: 'Weekly progress review' }
      ]
    },
    {
      week: 2,
      focus: 'Implementation & Consistency',
      goals: [
        'Maintain daily exercise routine',
        'Full dietary compliance',
        'Establish sleep schedule',
        'Monitor key metrics daily'
      ],
      activities: [
        { day: 'Monday', morning: '30-min brisk walk, BP check', afternoon: 'Follow meal plan strictly', evening: 'Track all meals and exercise' },
        { day: 'Tuesday', morning: '35-min walk, BP check', afternoon: 'Hydration check (8 glasses)', evening: 'Meditation 15 min' },
        { day: 'Wednesday', morning: '30-min walk, BP check', afternoon: 'Mid-week specialist appointment', evening: 'Review medications' },
        { day: 'Thursday', morning: '40-min walk, BP check', afternoon: 'Meal prep', evening: 'Early bedtime (10 PM)' },
        { day: 'Friday', morning: '30-min walk, BP check', afternoon: 'Week 2 blood tests', evening: 'Relaxation activities' },
        { day: 'Saturday', morning: '45-min walk or light jog', afternoon: 'Active lifestyle (swimming/cycling)', evening: 'Social activities (healthy)' },
        { day: 'Sunday', morning: 'Yoga/stretching 30 min', afternoon: 'Meal prep for week 3', evening: 'Progress assessment' }
      ]
    },
    {
      week: 3,
      focus: 'Optimization & Intensification',
      goals: [
        'Increase exercise intensity',
        'Refine dietary choices',
        'Optimize supplement timing',
        'Advanced monitoring'
      ],
      activities: [
        { day: 'Monday', morning: '40-min brisk walk, BP check', afternoon: 'Increase vegetable intake', evening: 'Track improvements' },
        { day: 'Tuesday', morning: '35-min walk + 10 min exercises', afternoon: 'Hydration + herbal teas', evening: 'Meditation & journaling' },
        { day: 'Wednesday', morning: '40-min walk, BP check', afternoon: 'Week 3 tests (if scheduled)', evening: 'Review progress with family' },
        { day: 'Thursday', morning: '30-min walk + strength training', afternoon: 'Optimize meal timing', evening: 'Sleep by 9:30 PM' },
        { day: 'Friday', morning: '40-min walk, BP check', afternoon: 'Prepare for week 4 tests', evening: 'Relaxation time' },
        { day: 'Saturday', morning: '50-min active exercise', afternoon: 'Outdoor activities', evening: 'Healthy social gathering' },
        { day: 'Sunday', morning: 'Yoga 40 min', afternoon: 'Rest and reflection', evening: 'Plan week 4 goals' }
      ]
    },
    {
      week: 4,
      focus: 'Evaluation & Future Planning',
      goals: [
        'Complete all follow-up tests',
        'Review progress with doctor',
        'Establish long-term habits',
        'Plan next 90 days'
      ],
      activities: [
        { day: 'Monday', morning: '40-min walk, BP check', afternoon: 'Fasting for morning tests', evening: 'Hydration focus' },
        { day: 'Tuesday', morning: 'Week 4 comprehensive tests', afternoon: 'Post-test healthy meal', evening: 'Celebrate small wins' },
        { day: 'Wednesday', morning: '40-min walk, BP check', afternoon: 'Wait for test results', evening: 'Meditation & gratitude' },
        { day: 'Thursday', morning: '40-min walk, BP check', afternoon: 'Doctor appointment - results review', evening: 'Plan adjustments' },
        { day: 'Friday', morning: '40-min walk, BP check', afternoon: 'Implement new recommendations', evening: 'Weekly progress review' },
        { day: 'Saturday', morning: '50-min exercise', afternoon: 'Active lifestyle activity', evening: 'Social + healthy dinner' },
        { day: 'Sunday', morning: 'Yoga 45 min', afternoon: '30-day review & 90-day planning', evening: 'Commitment to continue' }
      ]
    }
  ];

  // Generate tracking metrics
  const trackingMetrics = [
    'Daily blood pressure (morning & evening)',
    'Weekly weight measurement',
    'Daily water intake (aim 8-10 glasses)',
    'Daily exercise minutes',
    'Sleep hours (aim 7-8 hours)',
    'Meal adherence (% of healthy meals)',
    'Stress levels (1-10 scale)',
    'Energy levels (1-10 scale)'
  ];

  // Add system-specific metrics
  if (targetSystems.includes('metabolic')) {
    trackingMetrics.push('Fasting blood glucose (if diabetic/prediabetic)');
  }
  if (targetSystems.includes('hematologic')) {
    trackingMetrics.push('Iron-rich food intake frequency');
  }

  return {
    targetSystems,
    overallGoal,
    weeklyBreakdown,
    testsRequired,
    specialistReferrals,
    dailyActivities,
    dietaryPlan,
    trackingMetrics
  };
}
