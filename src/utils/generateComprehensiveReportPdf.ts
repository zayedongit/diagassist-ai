import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface BloodAnalysisData {
  overallStatus?: 'good' | 'moderate' | 'concerning';
  summary?: string;
  detailedAnalysis?: string[];
  labs?: Array<{
    name: string;
    value: string;
    unit?: string;
    status: string;
    referenceRange?: string;
  }>;
  diet?: {
    avoid?: string[];
    increase?: string[];
  };
  lifestyle?: string[];
}

interface ClinicalReportData {
  redFlags?: string[];
  possibleConditions?: Array<{
    name: string;
    probability: string;
    rationale: string;
  }>;
  investigations?: Array<{
    test: string;
    reason: string;
    urgency: string;
  }>;
  management?: {
    generalRx?: string[];
  };
  referrals?: Array<{
    specialty: string;
    reason: string;
    timeframe: string;
  }>;
  disclaimer?: string;
}

interface GenerateComprehensiveReportPdfParams {
  patientName?: string;
  bloodAnalysis?: BloodAnalysisData;
  clinicalAssessment?: ClinicalReportData;
}

// Helper functions for dietary and lifestyle recommendations
const expandFoodCategories = (items: string[] | undefined): string[] => {
  // Ensure items is an array
  if (!Array.isArray(items)) {
    return [];
  }
  
  const expansionMap: { [key: string]: string[] } = {
    'processed foods': ['processed snacks', 'packaged meals', 'instant noodles', 'frozen processed items'],
    'sugar': ['white sugar', 'brown sugar', 'honey', 'artificial sweeteners', 'high fructose corn syrup'],
    'refined carbs': ['white bread', 'white rice', 'pasta', 'pastries', 'cookies'],
    'leafy greens': ['spinach', 'kale', 'arugula', 'lettuce', 'collard greens'],
    'fruits': ['apples', 'berries', 'oranges', 'bananas', 'grapes'],
    'whole grains': ['quinoa', 'brown rice', 'oats', 'barley', 'whole wheat']
  };

  return items.flatMap(item => {
    const lowerItem = item.toLowerCase();
    for (const [key, expansions] of Object.entries(expansionMap)) {
      if (lowerItem.includes(key)) {
        return expansions;
      }
    }
    return [item];
  });
};

const getCombinedDietaryRecommendations = (
  bloodAnalysis?: BloodAnalysisData, 
  clinicalAssessment?: ClinicalReportData
): { avoid: string[]; increase: string[]; additional: string[] } => {
  // Ensure arrays exist before spreading
  const avoidItems = Array.isArray(bloodAnalysis?.diet?.avoid) ? bloodAnalysis.diet.avoid : [];
  const increaseItems = Array.isArray(bloodAnalysis?.diet?.increase) ? bloodAnalysis.diet.increase : [];
  
  const avoid = [...avoidItems];
  const increase = [...increaseItems];
  
  return {
    avoid: expandFoodCategories(avoid),
    increase: expandFoodCategories(increase),
    additional: []
  };
};

const getCombinedLifestyleRecommendations = (
  bloodAnalysis?: BloodAnalysisData,
  clinicalAssessment?: ClinicalReportData
): string[] => {
  // Ensure lifestyle is an array before spreading
  const lifestyleItems = Array.isArray(bloodAnalysis?.lifestyle) ? bloodAnalysis.lifestyle : [];
  return [...lifestyleItems];
};

export const generateComprehensiveReportPdf = async ({ 
  patientName, 
  bloodAnalysis, 
  clinicalAssessment 
}: GenerateComprehensiveReportPdfParams): Promise<void> => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 25;

    // Configuration constants for dynamic layout
    const SHOW_SECTION_OUTLINES = true; // Set to false to remove all section boxes
    const LINE_HEIGHT = 4;
    const SECTION_PADDING = 10;
    const BOX_MARGIN = 5;
    const TEXT_MARGIN = 25;
    const MAX_TEXT_WIDTH = pageWidth - 50;

    // Helper function to clean text and remove non-comprehensible symbols
    const cleanText = (text: string): string => {
      return text.replace(/[^\w\s\-\.,;:()/\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    // Helper function to calculate accurate text height
    const calculateTextHeight = (text: string, fontSize: number = 10, maxWidth: number = MAX_TEXT_WIDTH): number => {
      pdf.setFontSize(fontSize);
      const cleanedText = cleanText(text);
      const lines = pdf.splitTextToSize(cleanedText, maxWidth);
      return lines.length * LINE_HEIGHT;
    };

    // Helper function to calculate height for array of items
    const calculateListHeight = (items: string[], fontSize: number = 10, prefix: string = '• '): number => {
      let totalHeight = 0;
      items.forEach(item => {
        const cleanedItem = cleanText(`${prefix}${item}`);
        const lines = pdf.splitTextToSize(cleanedItem, MAX_TEXT_WIDTH);
        totalHeight += lines.length * LINE_HEIGHT + 2;
      });
      return totalHeight;
    };

    // Set clean white background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Professional blue gradient header
    pdf.setFillColor(25, 118, 210); // Professional blue
    pdf.rect(0, 0, pageWidth, 30, 'F');
    
    // Add subtle gradient effect with lighter blue
    pdf.setFillColor(33, 150, 243); // Lighter blue
    pdf.rect(0, 0, pageWidth, 15, 'F');
    
    pdf.setTextColor(255, 255, 255); // White text on blue
    pdf.setFontSize(20);
    pdf.setFont(undefined, 'bold');
    pdf.text('COMPREHENSIVE HEALTH REPORT', pageWidth / 2, 18, { align: 'center' });
    
    yPosition = 40;

    // Helper function for page breaks
    const checkPageBreak = (requiredSpace: number = 20) => {
      if (yPosition > pageHeight - requiredSpace) {
        pdf.addPage();
        // Re-paint clean white background on new page
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        yPosition = 25;
      }
    };

    // Helper function to draw elegant section box with subtle background and professional border
    const drawSectionBox = (x: number, y: number, width: number, height: number, isHeader = false) => {
      if (SHOW_SECTION_OUTLINES) {
        // Subtle background fill for better organization
        if (isHeader) {
          pdf.setFillColor(240, 248, 255); // Very light blue background for headers
        } else {
          pdf.setFillColor(249, 251, 253); // Subtle grey-blue background
        }
        pdf.roundedRect(x, y, width, height, 4, 4, 'F');
        
        // Professional border
        pdf.setDrawColor(25, 118, 210); // Professional blue border
        pdf.setLineWidth(0.8);
        pdf.roundedRect(x, y, width, height, 4, 4, 'D');
      }
    };

    // Helper function to render wrapped text safely
    const renderWrappedText = (text: string, x: number, y: number, fontSize: number = 10, maxWidth: number = MAX_TEXT_WIDTH): number => {
      pdf.setFontSize(fontSize);
      const cleanedText = cleanText(text);
      const lines = pdf.splitTextToSize(cleanedText, maxWidth);
      pdf.text(lines, x, y);
      return lines.length * LINE_HEIGHT;
    };

    // Status and Patient Information
    checkPageBreak(35);
    const statusText = bloodAnalysis?.overallStatus === 'good' ? 'Good Health' : 
                     bloodAnalysis?.overallStatus === 'moderate' ? 'Moderate Issues' :
                     bloodAnalysis?.overallStatus === 'concerning' ? 'Needs Attention' : 'Analysis Complete';
    const statusDescription = bloodAnalysis?.overallStatus === 'good' ? 'Your results look good overall' : 
                             bloodAnalysis?.overallStatus === 'moderate' ? 'Some values need attention' :
                             bloodAnalysis?.overallStatus === 'concerning' ? 'Please consult a healthcare provider' : 'Complete health analysis';

    // Calculate dynamic height for status box
    let statusBoxHeight = SECTION_PADDING + 15; // Base height for header and spacing
    statusBoxHeight += calculateTextHeight(statusText, 14);
    if (patientName) {
      statusBoxHeight += calculateTextHeight(`Hi ${patientName}`, 12);
    }
    statusBoxHeight += calculateTextHeight(statusDescription, 10);
    if (patientName) {
      statusBoxHeight += calculateTextHeight('Here are your report results', 10);
    }
    statusBoxHeight += BOX_MARGIN;
    
    drawSectionBox(15, yPosition - BOX_MARGIN, pageWidth - 30, statusBoxHeight, true);
    
    pdf.setTextColor(13, 71, 161); // Deep blue for headers
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text(cleanText(statusText), 25, yPosition + 2);
    
    if (patientName) {
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text(cleanText(`Hi ${patientName}`), 25, yPosition + 10);
    }
    
    pdf.setTextColor(55, 71, 79); // Professional dark grey for body text
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text(cleanText(statusDescription), 25, yPosition + 16);
    if (patientName) {
      pdf.text('Here are your report results', 25, yPosition + 22);
    }
    
    pdf.setTextColor(96, 125, 139); // Subtle grey for meta info
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 70, yPosition + 10);
    pdf.text(`Time: ${new Date().toLocaleTimeString()}`, pageWidth - 70, yPosition + 16);
    yPosition += statusBoxHeight + SECTION_PADDING;

    // Blood Analysis Summary Section (matching AnalysisResult.tsx format)
    if (bloodAnalysis) {
      checkPageBreak(40);
      
      // Calculate dynamic height for blood analysis summary box
      let summaryBoxHeight = SECTION_PADDING + 15; // Base height
      if (bloodAnalysis.detailedAnalysis && bloodAnalysis.detailedAnalysis.length > 0) {
        summaryBoxHeight += calculateTextHeight('Complete Analysis Report', 12) + 8;
        summaryBoxHeight += calculateListHeight(bloodAnalysis.detailedAnalysis, 10);
      }
      if (bloodAnalysis.summary) {
        summaryBoxHeight += calculateTextHeight('Analysis Summary', 12) + 8;
        summaryBoxHeight += calculateTextHeight(bloodAnalysis.summary, 10);
      }
      
      drawSectionBox(15, yPosition - BOX_MARGIN, pageWidth - 30, summaryBoxHeight);
      
      pdf.setTextColor(13, 71, 161); // Deep blue for section headers
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text('BLOOD ANALYSIS SUMMARY', 25, yPosition + 5);
      yPosition += 15;

      // Complete Analysis Report (detailedAnalysis from web format)
      if (Array.isArray(bloodAnalysis.detailedAnalysis) && bloodAnalysis.detailedAnalysis.length > 0) {
        pdf.setTextColor(76, 175, 80); // Professional green for subsection headers
        pdf.setFontSize(13);
        pdf.setFont(undefined, 'bold');
        pdf.text('Complete Analysis Report', 25, yPosition);
        yPosition += 10;
        
        pdf.setTextColor(55, 71, 79); // Dark grey for content
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        bloodAnalysis.detailedAnalysis.forEach((analysis) => {
          checkPageBreak(8);
          yPosition += renderWrappedText(`● ${analysis}`, 35, yPosition) + 3;
        });
        yPosition += SECTION_PADDING;
      }

      // Analysis Summary
      if (bloodAnalysis.summary) {
        pdf.setTextColor(76, 175, 80); // Professional green for subsection headers
        pdf.setFontSize(13);
        pdf.setFont(undefined, 'bold');
        pdf.text('Analysis Summary', 25, yPosition);
        yPosition += 10;
        
        pdf.setTextColor(55, 71, 79); // Dark grey for content
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        yPosition += renderWrappedText(bloodAnalysis.summary, 35, yPosition) + SECTION_PADDING;
      }
      yPosition += SECTION_PADDING;

      // Key Abnormal Parameters (matching web format)
      if (Array.isArray(bloodAnalysis.labs) && bloodAnalysis.labs.length > 0) {
        const abnormalLabs = bloodAnalysis.labs.filter(lab => lab.status !== 'normal');
        
        if (abnormalLabs.length > 0) {
          checkPageBreak(40);
          
          checkPageBreak(40);
          
          pdf.setTextColor(211, 47, 47); // Red for attention-needed items
          pdf.setFontSize(13);
          pdf.setFont(undefined, 'bold');
          pdf.text('⚠ Key Laboratory Results Requiring Attention', 25, yPosition + 2);
          yPosition += 12;
          
          abnormalLabs.forEach((lab) => {
            const statusColor: [number, number, number] = lab.status === 'critical' ? [220, 38, 127] : 
                              lab.status === 'high' ? [245, 101, 101] :
                              lab.status === 'low' ? [251, 191, 36] : [34, 197, 94];
            
            pdf.setTextColor(13, 71, 161); // Deep blue for lab names
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            yPosition += renderWrappedText(lab.name, 35, yPosition);
            
            pdf.setTextColor(...statusColor);
            pdf.setFont(undefined, 'bold');
            pdf.text(`${lab.status.toUpperCase()}`, pageWidth - 50, yPosition - 4);
            
            pdf.setTextColor(55, 71, 79); // Dark grey for values
            pdf.setFont(undefined, 'normal');
            yPosition += renderWrappedText(`Value: ${lab.value}${lab.unit ? ' ' + lab.unit : ''}`, 35, yPosition);
            
            if (lab.referenceRange) {
              yPosition += renderWrappedText(`Normal: ${lab.referenceRange}`, 35, yPosition);
            }
            yPosition += 6;
          });
          yPosition += SECTION_PADDING;
        }
        
        // Normal Parameters (matching web format)
        const normalLabs = bloodAnalysis.labs.filter(lab => lab.status === 'normal');
        if (normalLabs.length > 0) {
          checkPageBreak(25);
          
          const normalNames = normalLabs.map(lab => cleanText(lab.name)).join(', ');
          
          pdf.setTextColor(76, 175, 80); // Professional green for success
          pdf.setFontSize(13);
          pdf.setFont(undefined, 'bold');
          pdf.text(`✓ Normal Parameters (${normalLabs.length})`, 25, yPosition + 2);
          yPosition += 12;
          
          pdf.setTextColor(55, 71, 79); // Dark grey for content
          pdf.setFontSize(9);
          pdf.setFont(undefined, 'normal');
          
          yPosition += renderWrappedText(normalNames, 35, yPosition, 9) + SECTION_PADDING;
        }
      }
    }

    // Clinical Assessment Section (matching ClinicalReport.tsx format)
    if (clinicalAssessment) {
      checkPageBreak(40);
      drawSectionBox(15, yPosition - 5, pageWidth - 30, 25, true);
      
      pdf.setTextColor(13, 71, 161); // Deep blue for main headers
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text('CLINICAL ASSESSMENT REPORT', 25, yPosition + 5);
      yPosition += 30;

      // Red Flags - Prominent Display (matching web format)
      if (Array.isArray(clinicalAssessment.redFlags) && clinicalAssessment.redFlags.length > 0) {
        checkPageBreak(30);
        
        checkPageBreak(30);
        
        pdf.setTextColor(183, 28, 28); // Strong red for red flags
        pdf.setFontSize(13);
        pdf.setFont(undefined, 'bold');
        pdf.text('🚨 RED FLAGS - Seek Immediate Medical Attention', 25, yPosition + 2);
        yPosition += 14;
        
        pdf.setTextColor(211, 47, 47); // Red for flag content
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        clinicalAssessment.redFlags.forEach(flag => {
          checkPageBreak(15);
          yPosition += renderWrappedText(`● ${flag}`, 35, yPosition) + 3;
        });
        yPosition += SECTION_PADDING;
      }

      // Possible Conditions (matching web format)
      if (Array.isArray(clinicalAssessment.possibleConditions) && clinicalAssessment.possibleConditions.length > 0) {
        checkPageBreak(30);
        
        checkPageBreak(30);
        
        pdf.setTextColor(76, 175, 80); // Professional green for conditions
        pdf.setFontSize(13);
        pdf.setFont(undefined, 'bold');
        pdf.text('Possible Conditions', 25, yPosition + 2);
        yPosition += 14;
        
        clinicalAssessment.possibleConditions.forEach(condition => {
          checkPageBreak(20);
          pdf.setTextColor(13, 71, 161); // Deep blue for condition names
          pdf.setFontSize(11);
          pdf.setFont(undefined, 'bold');
          
          yPosition += renderWrappedText(`● ${condition.name}`, 35, yPosition);
          
          pdf.setTextColor(96, 125, 139); // Grey for probability
          pdf.setFont(undefined, 'normal');
          pdf.text(`${condition.probability} probability`, pageWidth - 80, yPosition - 4);
          
          pdf.setTextColor(55, 71, 79); // Dark grey for rationale
          yPosition += renderWrappedText(condition.rationale, 45, yPosition) + 6;
        });
        yPosition += SECTION_PADDING;
      }

      // Investigations (matching web format)
      if (Array.isArray(clinicalAssessment.investigations) && clinicalAssessment.investigations.length > 0) {
        checkPageBreak(30);
        
        checkPageBreak(30);
        
        pdf.setTextColor(76, 175, 80); // Professional green
        pdf.setFontSize(13);
        pdf.setFont(undefined, 'bold');
        pdf.text('Recommended Investigations', 25, yPosition + 2);
        yPosition += 14;
        
        clinicalAssessment.investigations.forEach(investigation => {
          checkPageBreak(18);
          pdf.setTextColor(13, 71, 161); // Deep blue for test names
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'bold');
          yPosition += renderWrappedText(`● ${investigation.test}`, 35, yPosition);
          
          const urgencyColor: [number, number, number] = investigation.urgency.toLowerCase() === 'urgent' ? [183, 28, 28] : [76, 175, 80];
          pdf.setTextColor(...urgencyColor);
          pdf.text(investigation.urgency, pageWidth - 60, yPosition - 4);
          
          pdf.setTextColor(55, 71, 79); // Dark grey for reason
          pdf.setFont(undefined, 'normal');
          yPosition += renderWrappedText(investigation.reason, 45, yPosition) + 6;
        });
        yPosition += SECTION_PADDING;
      }

      // Management Recommendations (matching web format)
      if (clinicalAssessment.management?.generalRx && clinicalAssessment.management.generalRx.length > 0) {
        checkPageBreak(30);
        
        const managementHeight = SECTION_PADDING + 25 + calculateListHeight(clinicalAssessment.management.generalRx, 10);
        drawSectionBox(15, yPosition - BOX_MARGIN, pageWidth - 30, managementHeight);
        
        pdf.setTextColor(76, 175, 80); // Professional green
        pdf.setFontSize(13);
        pdf.setFont(undefined, 'bold');
        pdf.text('Management Recommendations', 25, yPosition + 2);
        yPosition += 14;
        
        pdf.setTextColor(13, 71, 161); // Deep blue for subsection
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text('General Recommendations', 35, yPosition);
        yPosition += 10;
        
        pdf.setTextColor(55, 71, 79); // Dark grey for content
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        clinicalAssessment.management.generalRx.forEach(rec => {
          checkPageBreak(6);
          yPosition += renderWrappedText(`● ${rec}`, 45, yPosition) + 3;
        });
        yPosition += SECTION_PADDING;
      }

      // Specialist Referrals (matching web format)
      if (clinicalAssessment.referrals && clinicalAssessment.referrals.length > 0) {
        checkPageBreak(30);
        
        checkPageBreak(30);
        
        pdf.setTextColor(29, 99, 255);
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Specialist Referrals', 20, yPosition + 2);
        yPosition += 12;
        
        clinicalAssessment.referrals.forEach(referral => {
          checkPageBreak(16);
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'bold');
          yPosition += renderWrappedText(referral.specialty, TEXT_MARGIN, yPosition);
          
          const urgencyColor: [number, number, number] = referral.timeframe.toLowerCase().includes('urgent') || referral.timeframe.toLowerCase().includes('immediate') ? [220, 38, 127] : [29, 99, 255];
          pdf.setTextColor(...urgencyColor);
          pdf.text(referral.timeframe, pageWidth - 60, yPosition - 4);
          
          pdf.setTextColor(29, 99, 255);
          pdf.setFont(undefined, 'normal');
          yPosition += renderWrappedText(referral.reason, TEXT_MARGIN, yPosition) + 4;
        });
        yPosition += SECTION_PADDING;
      }
    }

    // Dietary and Lifestyle Recommendations (matching ComprehensiveReport.tsx format)
    checkPageBreak(40);
    drawSectionBox(15, yPosition - 5, pageWidth - 30, 25);
    pdf.setTextColor(29, 99, 255);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('DIETARY AND LIFESTYLE RECOMMENDATIONS', 20, yPosition + 2);
    yPosition += 35;

    // Dietary Recommendations Section
    const dietRecommendations = getCombinedDietaryRecommendations(bloodAnalysis, clinicalAssessment);
    
    // Foods to Avoid or Limit
    if (dietRecommendations.avoid.length > 0) {
      checkPageBreak(30);
      checkPageBreak(30);
      
      pdf.setTextColor(220, 38, 127);
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Foods to Avoid or Limit', 20, yPosition + 2);
      yPosition += 12;
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      dietRecommendations.avoid.forEach(item => {
        checkPageBreak(6);
        yPosition += renderWrappedText(`• ${item}`, TEXT_MARGIN, yPosition) + 2;
      });
      yPosition += SECTION_PADDING;
    }
    
    // Foods to Include More
    if (dietRecommendations.increase.length > 0) {
      checkPageBreak(30);
      checkPageBreak(30);
      
      pdf.setTextColor(34, 197, 94);
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Foods to Include More', 20, yPosition + 2);
      yPosition += 12;
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      dietRecommendations.increase.forEach(item => {
        checkPageBreak(6);
        yPosition += renderWrappedText(`• ${item}`, TEXT_MARGIN, yPosition) + 2;
      });
      yPosition += SECTION_PADDING;
    }
    
    // Additional Dietary Advice
    if (dietRecommendations.additional.length > 0) {
      checkPageBreak(30);
      checkPageBreak(30);
      
      pdf.setTextColor(29, 99, 255);
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Additional Dietary Advice', 20, yPosition + 2);
      yPosition += 12;
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      dietRecommendations.additional.forEach(item => {
        checkPageBreak(6);
        yPosition += renderWrappedText(`• ${item}`, TEXT_MARGIN, yPosition) + 2;
      });
      yPosition += SECTION_PADDING;
    }

    // Enhanced Actionable Lifestyle Modifications (matching ComprehensiveReport.tsx format)
    checkPageBreak(40);
    drawSectionBox(15, yPosition - BOX_MARGIN, pageWidth - 30, 25);
    pdf.setTextColor(29, 99, 255);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('ENHANCED ACTIONABLE LIFESTYLE MODIFICATIONS', 20, yPosition + 2);
    yPosition += 35;

    // All lifestyle blocks with dynamic heights
    const lifestyleSections = [
      {
        title: 'Physical Activity',
        color: [29, 99, 255] as [number, number, number],
        items: [
          'Engage in regular cardiovascular exercise like walking or cycling',
          'Aim for 150 minutes of moderate-intensity exercise per week',
          'Include strength training exercises twice per week',
          'Take regular breaks from prolonged sitting'
        ]
      },
      {
        title: 'Sleep & Stress Management',
        color: [29, 99, 255] as [number, number, number],
        items: [
          'Maintain 7-9 hours of quality sleep per night',
          'Establish a consistent sleep schedule',
          'Practice stress reduction techniques (meditation, deep breathing)',
          'Limit screen time before bedtime'
        ]
      },
      {
        title: 'Health Monitoring',
        color: [29, 99, 255] as [number, number, number],
        items: [
          'Monitor cholesterol levels regularly',
          'Track blood pressure weekly if elevated',
          'Maintain a healthy weight within BMI range',
          'Schedule regular health check-ups with your doctor'
        ]
      },
      {
        title: 'Emergency Protocols',
        color: [220, 38, 127] as [number, number, number],
        items: [
          'Seek immediate medical attention for chest pain or shortness of breath',
          'Contact emergency services (911) for severe symptoms',
          'Keep emergency contact numbers readily available',
          'Know the location of nearest emergency room'
        ]
      }
    ];

    lifestyleSections.forEach(section => {
      checkPageBreak(35);
      checkPageBreak(35);
      
      pdf.setTextColor(...section.color);
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text(section.title, 20, yPosition + 2);
      yPosition += 10;
      
      pdf.setTextColor(29, 99, 255);
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      section.items.forEach(item => {
        checkPageBreak(6);
        yPosition += renderWrappedText(`• ${item}`, TEXT_MARGIN, yPosition) + 2;
      });
      yPosition += SECTION_PADDING;
    });

    // Personalized Tips Based on Results Block
    const lifestyleRecommendations = getCombinedLifestyleRecommendations(bloodAnalysis, clinicalAssessment);
    if (lifestyleRecommendations.length > 0) {
      checkPageBreak(25);
      checkPageBreak(25);
      pdf.setTextColor(34, 197, 94); // Green color for personalized tips
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Personalized Tips Based on Your Results', 20, yPosition + 2);
      yPosition += 10;
      pdf.setTextColor(29, 99, 255);
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      lifestyleRecommendations.forEach(tip => {
        checkPageBreak(6);
        yPosition += renderWrappedText(`• ${tip}`, TEXT_MARGIN, yPosition) + 2;
      });
      yPosition += SECTION_PADDING;
    }

    // Important Disclaimer (matching ComprehensiveReport.tsx format)
    checkPageBreak(40);
    const disclaimerText = clinicalAssessment?.disclaimer ||
      "This report is generated using AI analysis and is intended for informational purposes only. It should not replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals for medical concerns. The AI analysis is based on available data and may not account for all individual factors. In case of medical emergencies, seek immediate professional medical attention.";
    
    pdf.setTextColor(29, 99, 255);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('Important Disclaimer', 20, yPosition + 2);
    yPosition += 12;
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    yPosition += renderWrappedText(disclaimerText, 20, yPosition, 9, pageWidth - 40);

    pdf.save(`comprehensive-health-report-${patientName || 'patient'}-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast.success('Comprehensive report downloaded successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    toast.error('Failed to generate PDF. Please try again.');
    throw error;
  }
};