import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

export const generateMockPdf = async () => {
  try {
    console.log('🔄 Generating comprehensive sample PDF...');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 25;

    // Professional Color Scheme - Blue and Green
    const colors = {
      primaryBlue: [41, 98, 255] as [number, number, number],
      lightBlue: [240, 247, 255] as [number, number, number],
      mediumBlue: [59, 130, 246] as [number, number, number],
      darkBlue: [30, 64, 175] as [number, number, number],
      successGreen: [34, 197, 94] as [number, number, number],
      lightGreen: [240, 253, 244] as [number, number, number],
      darkGreen: [22, 101, 52] as [number, number, number],
      textDark: [55, 65, 81] as [number, number, number],
      textMedium: [75, 85, 99] as [number, number, number],
      textLight: [107, 114, 128] as [number, number, number],
      warning: [245, 158, 11] as [number, number, number],
      danger: [239, 68, 68] as [number, number, number]
    };

    // Configuration constants
    const LINE_HEIGHT = 5;
    const SECTION_PADDING = 15;
    const BOX_MARGIN = 10;
    const TEXT_MARGIN = 25;
    const MAX_TEXT_WIDTH = pageWidth - 50;

    // Helper function to clean text
    const cleanText = (text: string): string => {
      return text.replace(/[^\w\s\-\.,;:()/\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    // Helper function for page breaks - ensures sections stay together
    const checkPageBreak = (requiredSpace: number = 30) => {
      if (yPosition > pageHeight - requiredSpace) {
        pdf.addPage();
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        yPosition = 25;
      }
    };

    // Helper function to render wrapped text
    const renderWrappedText = (text: string, x: number, y: number, fontSize: number = 10, maxWidth: number = MAX_TEXT_WIDTH): number => {
      pdf.setFontSize(fontSize);
      const cleanedText = cleanText(text);
      const lines = pdf.splitTextToSize(cleanedText, maxWidth);
      pdf.text(lines, x, y);
      return lines.length * LINE_HEIGHT;
    };

    // Helper function to render wrapped text with bullet points
    const renderBulletText = (text: string, x: number, y: number, fontSize: number = 10): number => {
      pdf.setFontSize(fontSize);
      const cleanedText = cleanText(text);
      const maxWidth = pageWidth - x - 15;
      const lines = pdf.splitTextToSize(cleanedText, maxWidth);
      
      // Render bullet point
      pdf.text('•', x - 8, y);
      
      // Render text
      pdf.text(lines, x, y);
      return lines.length * LINE_HEIGHT;
    };

    // Helper function to create professional section boxes
    const createSectionBox = (title: string, bgColor: [number, number, number], borderColor: [number, number, number], titleColor: [number, number, number], height: number = 30) => {
      checkPageBreak(height + 10);
      
      // Background
      pdf.setFillColor(...bgColor);
      pdf.roundedRect(15, yPosition - 5, pageWidth - 30, height, 3, 3, 'F');
      
      // Border
      pdf.setDrawColor(...borderColor);
      pdf.setLineWidth(1);
      pdf.roundedRect(15, yPosition - 5, pageWidth - 30, height, 3, 3, 'D');
      
      // Title
      pdf.setTextColor(...titleColor);
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text(title, 25, yPosition + 8);
      
      yPosition += height;
    };

    // Set clean white background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Elegant header with gradient effect
    pdf.setFillColor(...colors.primaryBlue);
    pdf.rect(0, 0, pageWidth, 35, 'F');
    
    pdf.setFillColor(...colors.mediumBlue);
    pdf.rect(0, 0, pageWidth, 20, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text('COMPREHENSIVE HEALTH ANALYSIS REPORT', pageWidth / 2, 15, { align: 'center' });
    
    yPosition = 50;

    // Patient Information Section
    createSectionBox('PATIENT INFORMATION', colors.lightBlue, colors.mediumBlue, colors.darkBlue, 40);
    
    const maskedPatientName = 'Ms. [REDACTED]';
    const statusText = 'Health Status: Needs Attention';
    const statusDescription = 'Some laboratory values require medical attention';
    
    pdf.setTextColor(...colors.textDark);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    yPosition += renderWrappedText(`Patient: ${maskedPatientName}`, 25, yPosition - 25);
    
    pdf.setTextColor(...colors.danger);
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    yPosition += renderWrappedText(statusText, 25, yPosition - 20) + 3;
    
    pdf.setTextColor(...colors.textMedium);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    yPosition += renderWrappedText(statusDescription, 25, yPosition - 18);
    
    pdf.setTextColor(...colors.textLight);
    pdf.setFontSize(9);
    yPosition += renderWrappedText(`Report Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}`, 25, yPosition - 15);
    
    yPosition += SECTION_PADDING;

    // Blood Analysis Summary Section
    checkPageBreak(80);
    createSectionBox('BLOOD ANALYSIS SUMMARY', colors.lightBlue, colors.mediumBlue, colors.darkBlue, 25);
    
    pdf.setTextColor(...colors.successGreen);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    yPosition += renderWrappedText('Complete Laboratory Analysis Report', 25, yPosition - 15) + 5;
    
    pdf.setTextColor(...colors.textDark);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    
    const analysisPoints = [
      'Multiple kidney function markers showing abnormal values requiring immediate attention',
      'Elevated creatinine levels suggesting potential kidney dysfunction', 
      'Proteinuria detected indicating possible kidney damage',
      'Blood pressure markers suggest hypertensive patterns',
      'Comprehensive metabolic panel reveals electrolyte imbalances'
    ];
    
    analysisPoints.forEach((analysis) => {
      checkPageBreak(8);
      yPosition += renderBulletText(analysis, 35, yPosition) + 3;
    });
    yPosition += SECTION_PADDING;

    // Key Abnormal Parameters Section
    checkPageBreak(120);
    createSectionBox('KEY LABORATORY RESULTS', colors.lightGreen, colors.successGreen, colors.darkGreen, 25);
    
    pdf.setTextColor(...colors.danger);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    yPosition += renderWrappedText('Results Requiring Medical Attention', 25, yPosition - 15) + 8;
    
    const abnormalLabs = [
      { name: 'Serum Creatinine', value: '2.8 mg/dL', status: 'HIGH', normal: '0.6-1.3 mg/dL', statusColor: colors.danger },
      { name: 'Blood Urea Nitrogen (BUN)', value: '45 mg/dL', status: 'HIGH', normal: '7-25 mg/dL', statusColor: colors.danger },
      { name: 'Protein in Urine', value: '3+', status: 'CRITICAL', normal: 'Negative', statusColor: colors.danger },
      { name: 'Estimated GFR', value: '28 mL/min', status: 'LOW', normal: '>60 mL/min', statusColor: colors.warning },
      { name: 'Microalbumin', value: '180 μg/mg', status: 'HIGH', normal: '<30 μg/mg', statusColor: colors.danger }
    ];
    
    abnormalLabs.forEach((lab) => {
      checkPageBreak(25);
      
      // Lab name in blue box
      pdf.setFillColor(...colors.lightBlue);
      pdf.roundedRect(25, yPosition - 3, pageWidth - 50, 18, 2, 2, 'F');
      pdf.setDrawColor(...colors.mediumBlue);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(25, yPosition - 3, pageWidth - 50, 18, 2, 2, 'D');
      
      pdf.setTextColor(...colors.darkBlue);
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text(lab.name, 30, yPosition + 2);
      
      // Status badge
      pdf.setTextColor(...lab.statusColor);
      pdf.setFont(undefined, 'bold');
      pdf.text(lab.status, pageWidth - 50, yPosition + 2);
      
      // Values
      pdf.setTextColor(...colors.textDark);
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      yPosition += renderBulletText(`Current Value: ${lab.value}`, 35, yPosition + 8) + 2;
      yPosition += renderBulletText(`Normal Range: ${lab.normal}`, 35, yPosition) + 8;
    });
    yPosition += SECTION_PADDING;

    // Clinical Assessment Section
    checkPageBreak(100);
    createSectionBox('CLINICAL ASSESSMENT REPORT', colors.lightBlue, colors.mediumBlue, colors.darkBlue, 25);

    // Red Flags
    pdf.setTextColor(...colors.danger);
    pdf.setFontSize(13);
    pdf.setFont(undefined, 'bold');
    yPosition += renderWrappedText('🚨 RED FLAGS - Seek Immediate Medical Attention', 25, yPosition - 15) + 8;
    
    pdf.setTextColor(...colors.textDark);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    const redFlags = [
      'Signs of severe dehydration, persistent vomiting, or significant changes in urination patterns requiring immediate medical attention',
      'Elevated kidney function markers suggest acute kidney injury requiring urgent evaluation',
      'Protein levels indicate possible kidney damage needing immediate intervention'
    ];
    
    redFlags.forEach(flag => {
      checkPageBreak(12);
      yPosition += renderBulletText(flag, 35, yPosition) + 5;
    });
    yPosition += SECTION_PADDING;

    // Possible Conditions Section
    checkPageBreak(120);
    createSectionBox('POSSIBLE CONDITIONS', colors.lightGreen, colors.successGreen, colors.darkGreen, 25);
    
    const conditions = [
      {
        name: 'Acute Kidney Injury',
        probability: 'High Probability',
        rationale: 'The patient presents with increased frequency of urination, cloudy urine, and intermittent swelling in the legs, which are indicative of potential kidney dysfunction. The presence of foamy urine may also suggest proteinuria, commonly associated with acute kidney injury.'
      },
      {
        name: 'Chronic Kidney Disease',
        probability: 'Medium Probability', 
        rationale: 'The symptoms of increased urination frequency, cloudy urine, and swelling could also indicate chronic kidney disease, especially if the symptoms have been progressive over time.'
      },
      {
        name: 'Diabetic Nephropathy',
        probability: 'Medium Probability',
        rationale: 'Given the kidney function abnormalities and metabolic markers, diabetic kidney disease should be considered as a potential underlying cause.'
      }
    ];
    
    conditions.forEach(condition => {
      checkPageBreak(35);
      
      // Condition box
      pdf.setFillColor(...colors.lightGreen);
      pdf.roundedRect(25, yPosition - 5, pageWidth - 50, 25, 2, 2, 'F');
      pdf.setDrawColor(...colors.successGreen);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(25, yPosition - 5, pageWidth - 50, 25, 2, 2, 'D');
      
      pdf.setTextColor(...colors.darkGreen);
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      yPosition += renderBulletText(condition.name, 35, yPosition);
      
      // Probability badge
      pdf.setTextColor(...colors.warning);
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.text(condition.probability, pageWidth - 80, yPosition - 5);
      
      pdf.setTextColor(...colors.textDark);
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      yPosition += renderWrappedText(condition.rationale, 35, yPosition + 3, 9, pageWidth - 70) + 10;
    });
    yPosition += SECTION_PADDING;

    // Management Recommendations Section
    checkPageBreak(100);
    createSectionBox('MANAGEMENT RECOMMENDATIONS', colors.lightBlue, colors.mediumBlue, colors.darkBlue, 25);

    // General Recommendations subsection
    pdf.setTextColor(...colors.darkBlue);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    yPosition += renderWrappedText('General Recommendations', 25, yPosition - 15) + 8;
    
    pdf.setTextColor(...colors.textDark);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    
    const generalRecommendations = [
      'Monitor liver function tests periodically to assess changes in liver enzymes',
      'Maintain adequate hydration with 8-10 glasses of water daily',
      'Monitor blood pressure regularly and maintain optimal levels',
      'Consider discussing potential vitamin supplementation if dietary intake is insufficient'
    ];
    
    generalRecommendations.forEach(item => {
      checkPageBreak(8);
      yPosition += renderBulletText(item, 35, yPosition) + 3;
    });
    yPosition += 10;

    // Specialist Referrals subsection
    pdf.setTextColor(...colors.darkBlue);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    yPosition += renderWrappedText('Specialist Referrals', 25, yPosition) + 8;
    
    pdf.setTextColor(...colors.textDark);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    
    // Create referral box
    checkPageBreak(25);
    pdf.setFillColor(...colors.lightBlue);
    pdf.roundedRect(25, yPosition - 3, pageWidth - 50, 20, 2, 2, 'F');
    pdf.setDrawColor(...colors.mediumBlue);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(25, yPosition - 3, pageWidth - 50, 20, 2, 2, 'D');
    
    pdf.setTextColor(...colors.darkBlue);
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.text('Hepatology', 30, yPosition + 2);
    
    pdf.setTextColor(...colors.danger);
    pdf.setFont(undefined, 'bold');
    pdf.text('Within 1-2 weeks', pageWidth - 80, yPosition + 2);
    
    pdf.setTextColor(...colors.textDark);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    yPosition += renderWrappedText('Specialist evaluation is needed to further investigate the cause of elevated liver enzymes and to determine appropriate management.', 30, yPosition + 10, 10, pageWidth - 70) + 15;
    
    yPosition += SECTION_PADDING;

    // Dietary Recommendations Section - Side by Side Layout
    checkPageBreak(90);
    createSectionBox('DIETARY RECOMMENDATIONS', colors.lightGreen, colors.successGreen, colors.darkGreen, 25);

    // Calculate column widths for side-by-side layout
    const columnWidth = (pageWidth - 60) / 2; // 30px margin on each side, 15px gap between columns
    const leftColumnX = 25;
    const rightColumnX = 25 + columnWidth + 10;

    // Left Column - Foods to Avoid or Limit
    pdf.setTextColor(...colors.danger);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('Foods To Avoid Or Limit', leftColumnX, yPosition - 15);
    
    const avoidYStart = yPosition - 8;
    let avoidYPosition = avoidYStart;
    
    pdf.setTextColor(...colors.textDark);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    
    const avoidFoods = [
      'Alcohol',
      'Fried foods', 
      'High-sodium foods'
    ];
    
    avoidFoods.forEach(item => {
      pdf.text('•', leftColumnX, avoidYPosition);
      pdf.text(item, leftColumnX + 8, avoidYPosition);
      avoidYPosition += 6;
    });

    // Right Column - Foods to Include More
    pdf.setTextColor(...colors.successGreen);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('Foods To Include More', rightColumnX, yPosition - 15);
    
    let includeYPosition = avoidYStart;
    
    pdf.setTextColor(...colors.textDark);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    
    const includeFoods = [
      'Spinach', 'Kale', 'Arugula', 'Lettuce', 'Collard greens',
      'Quinoa', 'Brown rice', 'Oats', 'Barley', 'Whole wheat',
      'Apples', 'Berries', 'Oranges', 'Bananas', 'Grapes'
    ];
    
    includeFoods.forEach(item => {
      pdf.text('•', rightColumnX, includeYPosition);
      pdf.text(item, rightColumnX + 8, includeYPosition);
      includeYPosition += 6;
    });

    // Update yPosition to the maximum of both columns
    yPosition = Math.max(avoidYPosition, includeYPosition) + SECTION_PADDING;

    // Important Disclaimer Section
    createSectionBox('IMPORTANT DISCLAIMER', colors.lightBlue, colors.mediumBlue, colors.darkBlue, 25);
    
    const disclaimerText = "This is a comprehensive sample report demonstrating advanced AI analysis capabilities using anonymized patient data. This report is generated using artificial intelligence and is intended for informational and demonstration purposes only. It should not replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals for medical concerns. Patient identity has been masked for privacy protection. This sample showcases the depth and quality of analysis provided by our AI system.";
    
    pdf.setTextColor(...colors.textMedium);
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    yPosition += renderWrappedText(disclaimerText, 25, yPosition - 15, 9, pageWidth - 50);

    console.log('✅ Comprehensive sample PDF generated successfully');
    
    // Save the PDF
    pdf.save('DAIG_ASSIST_Comprehensive_Sample_Report.pdf');
    toast.success('Sample comprehensive report downloaded successfully!');
    
  } catch (error) {
    console.error('Sample PDF generation failed:', error);
    toast.error('Failed to generate sample report. Please try again.');
  }
};