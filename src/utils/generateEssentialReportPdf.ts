import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface PatientInfo {
  name?: string;
  age?: number;
  gender?: string;
  testDate?: string;
}

interface LabParameter {
  parameter: string;
  value: number | string;
  unit: string;
  normalRange: string;
  status: 'high' | 'low' | 'normal';
}

interface ReportData {
  patientInfo?: PatientInfo;
  overallStatus?: string;
  summary?: string;
  abnormalLabs?: LabParameter[];
  actionItems?: string[];
  dietaryRecommendations?: {
    toAdd?: string[];
    toLimitOrAvoid?: string[];
  };
  lifestyleModifications?: string[];
  followUpGuidance?: string;
}

export async function generateEssentialReportPdf(data: ReportData) {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Helper: Add text with wrapping
    const addText = (text: string, size: number, isBold = false, maxWidth = contentWidth) => {
      pdf.setFontSize(size);
      pdf.setFont(undefined, isBold ? 'bold' : 'normal');
      const lines = pdf.splitTextToSize(text, maxWidth);
      
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 15) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin, yPosition);
        yPosition += size * 0.5;
      });
    };

    const addSpace = (space: number) => {
      yPosition += space;
    };

    // ====== PAGE 1: PATIENT OVERVIEW & KEY FINDINGS ======

    // Header with brand name
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text('diagassist-health-ai', pageWidth / 2, 12, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text('Essential Health Report', pageWidth / 2, 18, { align: 'center' });

    yPosition = 32;
    pdf.setTextColor(0, 0, 0);

    // Patient Details Box
    if (data.patientInfo) {
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(margin, yPosition, contentWidth, 18, 2, 2, 'F');
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.text('Patient Information', margin + 3, yPosition + 5);
      
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);
      const info = `${data.patientInfo.name || 'N/A'} | ${data.patientInfo.age || 'N/A'}y | ${data.patientInfo.gender || 'N/A'} | Test Date: ${data.patientInfo.testDate || 'N/A'}`;
      pdf.text(info, margin + 3, yPosition + 12);
      
      yPosition += 22;
    }

    // Overall Status Badge
    if (data.overallStatus) {
      const statusColors: { [key: string]: [number, number, number] } = {
        'normal': [34, 197, 94],
        'concerning': [234, 179, 8],
        'critical': [239, 68, 68]
      };
      const statusColor = statusColors[data.overallStatus.toLowerCase()] || [156, 163, 175];
      
      pdf.setFillColor(...statusColor);
      pdf.roundedRect(margin, yPosition, 40, 8, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.text(data.overallStatus.toUpperCase(), margin + 20, yPosition + 5.5, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      
      yPosition += 12;
    }

    // Executive Summary
    if (data.summary) {
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(11);
      pdf.text('SUMMARY', margin, yPosition);
      yPosition += 5;
      
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);
      const summaryLines = pdf.splitTextToSize(data.summary, contentWidth);
      const maxSummaryLines = 4; // Limit to 4 lines
      summaryLines.slice(0, maxSummaryLines).forEach((line: string) => {
        pdf.text(line, margin, yPosition);
        yPosition += 4;
      });
      yPosition += 3;
    }

    // Abnormal Labs Table
    if (data.abnormalLabs && data.abnormalLabs.length > 0) {
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(11);
      pdf.text('KEY LAB RESULTS (ABNORMAL)', margin, yPosition);
      yPosition += 6;

      // Table header
      pdf.setFillColor(59, 130, 246);
      pdf.rect(margin, yPosition, contentWidth, 6, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'bold');
      pdf.text('Parameter', margin + 2, yPosition + 4);
      pdf.text('Value', margin + 70, yPosition + 4);
      pdf.text('Normal Range', margin + 105, yPosition + 4);
      pdf.text('Status', margin + 155, yPosition + 4);
      yPosition += 6;
      pdf.setTextColor(0, 0, 0);

      // Table rows (max 8 to fit on page)
      const maxLabs = 8;
      data.abnormalLabs.slice(0, maxLabs).forEach((lab, index) => {
        if (index % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(margin, yPosition, contentWidth, 6, 'F');
        }
        
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(7.5);
        pdf.text(lab.parameter.substring(0, 35), margin + 2, yPosition + 4);
        pdf.text(`${lab.value} ${lab.unit}`, margin + 70, yPosition + 4);
        pdf.text(lab.normalRange, margin + 105, yPosition + 4);
        
        // Status with color
        const statusColor: [number, number, number] = lab.status === 'high' ? [239, 68, 68] : lab.status === 'low' ? [234, 179, 8] : [156, 163, 175];
        pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        pdf.setFont(undefined, 'bold');
        pdf.text(lab.status.toUpperCase(), margin + 155, yPosition + 4);
        pdf.setTextColor(0, 0, 0);
        
        yPosition += 6;
      });
      
      yPosition += 3;
    }

    // What This Means Section
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(10);
    pdf.text('WHAT THIS MEANS', margin, yPosition);
    yPosition += 5;
    
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8.5);
    const meaningPoints = [
      'Your lab results show values outside normal ranges that need attention.',
      'The recommendations below are designed to help improve these markers.',
      'Consult a healthcare provider for personalized medical advice.'
    ];
    meaningPoints.forEach(point => {
      const lines = pdf.splitTextToSize(`• ${point}`, contentWidth - 4);
      lines.forEach((line: string) => {
        pdf.text(line, margin + 2, yPosition);
        yPosition += 4;
      });
    });

    // ====== PAGE 2: ACTION PLAN & RECOMMENDATIONS ======
    pdf.addPage();
    yPosition = margin;

    // Page Header
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 12, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('Action Plan & Recommendations', pageWidth / 2, 8, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    
    yPosition = 20;

    // Immediate Action Items
    if (data.actionItems && data.actionItems.length > 0) {
      pdf.setFillColor(254, 226, 226);
      pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(185, 28, 28);
      pdf.text('IMMEDIATE ACTION ITEMS', margin + 2, yPosition + 4);
      pdf.setTextColor(0, 0, 0);
      yPosition += 8;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8.5);
      const maxActions = 5;
      data.actionItems.slice(0, maxActions).forEach((item, index) => {
        const lines = pdf.splitTextToSize(`${index + 1}. ${item}`, contentWidth - 4);
        lines.forEach((line: string) => {
          pdf.text(line, margin + 2, yPosition);
          yPosition += 4;
        });
        yPosition += 1;
      });
      yPosition += 2;
    }

    // Dietary Recommendations
    if (data.dietaryRecommendations) {
      pdf.setFillColor(220, 252, 231);
      pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(21, 128, 61);
      pdf.text('DIETARY CHANGES', margin + 2, yPosition + 4);
      pdf.setTextColor(0, 0, 0);
      yPosition += 8;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8.5);

      if (data.dietaryRecommendations.toAdd && data.dietaryRecommendations.toAdd.length > 0) {
        pdf.setFont(undefined, 'bold');
        pdf.text('Add to Diet:', margin + 2, yPosition);
        yPosition += 4;
        pdf.setFont(undefined, 'normal');
        
        data.dietaryRecommendations.toAdd.slice(0, 3).forEach(item => {
          const lines = pdf.splitTextToSize(`• ${item}`, contentWidth - 6);
          lines.forEach((line: string) => {
            pdf.text(line, margin + 4, yPosition);
            yPosition += 3.5;
          });
        });
        yPosition += 1;
      }

      if (data.dietaryRecommendations.toLimitOrAvoid && data.dietaryRecommendations.toLimitOrAvoid.length > 0) {
        pdf.setFont(undefined, 'bold');
        pdf.text('Limit or Avoid:', margin + 2, yPosition);
        yPosition += 4;
        pdf.setFont(undefined, 'normal');
        
        data.dietaryRecommendations.toLimitOrAvoid.slice(0, 3).forEach(item => {
          const lines = pdf.splitTextToSize(`• ${item}`, contentWidth - 6);
          lines.forEach((line: string) => {
            pdf.text(line, margin + 4, yPosition);
            yPosition += 3.5;
          });
        });
      }
      yPosition += 2;
    }

    // Lifestyle Modifications
    if (data.lifestyleModifications && data.lifestyleModifications.length > 0) {
      pdf.setFillColor(224, 242, 254);
      pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(30, 64, 175);
      pdf.text('LIFESTYLE MODIFICATIONS', margin + 2, yPosition + 4);
      pdf.setTextColor(0, 0, 0);
      yPosition += 8;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8.5);
      const maxLifestyle = 4;
      data.lifestyleModifications.slice(0, maxLifestyle).forEach(item => {
        const lines = pdf.splitTextToSize(`• ${item}`, contentWidth - 4);
        lines.forEach((line: string) => {
          pdf.text(line, margin + 2, yPosition);
          yPosition += 3.5;
        });
      });
      yPosition += 2;
    }

    // Follow-up Guidance
    pdf.setFillColor(254, 249, 195);
    pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(161, 98, 7);
    pdf.text('FOLLOW-UP', margin + 2, yPosition + 4);
    pdf.setTextColor(0, 0, 0);
    yPosition += 8;

    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8.5);
    const followUpText = data.followUpGuidance || 'Retest recommended in 3-6 months. Consult your healthcare provider if symptoms worsen.';
    const followUpLines = pdf.splitTextToSize(followUpText, contentWidth - 4);
    followUpLines.forEach((line: string) => {
      pdf.text(line, margin + 2, yPosition);
      yPosition += 3.5;
    });

    // Footer Disclaimer
    yPosition = pageHeight - 20;
    pdf.setFillColor(243, 244, 246);
    pdf.rect(0, yPosition, pageWidth, 20, 'F');
    pdf.setFontSize(7);
    pdf.setFont(undefined, 'italic');
    pdf.setTextColor(107, 114, 128);
    const disclaimer = 'Disclaimer: This report is for informational purposes only and does not constitute medical advice. Always consult with a qualified healthcare professional for medical diagnosis and treatment.';
    const disclaimerLines = pdf.splitTextToSize(disclaimer, contentWidth);
    disclaimerLines.forEach((line: string, index: number) => {
      pdf.text(line, margin, yPosition + 5 + (index * 3));
    });

    // Save PDF — named "<PatientName>.Diagassist.Report.pdf"
    const safeName = (data.patientInfo?.name || 'Patient').replace(/[\\/:*?"<>|]+/g, '').trim() || 'Patient';
    const fileName = `${safeName}.Diagassist.Report.pdf`;
    pdf.save(fileName);

    toast.success('Essential report downloaded successfully!');
    return true;
  } catch (error) {
    console.error('Error generating essential PDF:', error);
    toast.error('Failed to generate PDF report');
    return false;
  }
}
