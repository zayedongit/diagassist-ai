import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { HealthScoreBreakdown } from './healthScoreCalculator';
import { generateRiskTimeline } from './riskProjection';
import { RiskScore } from './healthRiskCalculator';

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

interface MedicalPanel {
  panelName: string;
  abnormalLabs?: LabParameter[];
}

interface Recommendations {
  immediate?: string[];
  dietary?: {
    toAdd?: string[];
    toLimitOrAvoid?: string[];
  };
  lifestyle?: string[];
  followUp?: string;
}

interface ComprehensiveReportData {
  patientInfo?: PatientInfo;
  summary?: string;
  overallStatus?: string;
  healthScoreBreakdown: HealthScoreBreakdown;
  abnormalPanels?: MedicalPanel[];
  valuesNeedingAttention?: LabParameter[];
  clinicalAssessment?: any;
  recommendations?: Recommendations;
}

const getScoreColor = (score: number): [number, number, number] => {
  if (score >= 90) return [22, 163, 74]; // green-600
  if (score >= 75) return [34, 197, 94]; // green-500
  if (score >= 60) return [234, 179, 8]; // yellow-500
  if (score >= 40) return [249, 115, 22]; // orange-500
  return [220, 38, 38]; // red-600
};

const getSystemLabel = (systemName: string): string => {
  const labels: Record<string, string> = {
    metabolic: 'Metabolic',
    cardiovascular: 'Cardiovascular',
    kidney: 'Kidney',
    liver: 'Liver',
    hematologic: 'Blood Health',
    endocrine: 'Endocrine'
  };
  return labels[systemName] || systemName;
};

export async function generateFullComprehensiveReport(data: ComprehensiveReportData) {
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

    // Helper functions
    const addPageIfNeeded = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - 20) {
        pdf.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    const addHeader = (title: string, subtitle?: string) => {
      pdf.setFillColor(59, 130, 246);
      pdf.rect(0, 0, pageWidth, subtitle ? 18 : 12, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text(title, pageWidth / 2, 8, { align: 'center' });
      
      if (subtitle) {
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'normal');
        pdf.text(subtitle, pageWidth / 2, 13, { align: 'center' });
      }
      
      pdf.setTextColor(0, 0, 0);
      yPosition = subtitle ? 25 : 18;
    };

    // ====== PAGE 1: OVERVIEW & SUMMARY ======
    addHeader('Comprehensive Health Report', 'AI-Powered Lab Analysis');

    // Patient Info Box
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

    // Overall Status
    if (data.overallStatus) {
      const statusColors: { [key: string]: [number, number, number] } = {
        'normal': [34, 197, 94],
        'good': [34, 197, 94],
        'concerning': [234, 179, 8],
        'moderate': [234, 179, 8],
        'critical': [239, 68, 68]
      };
      const statusColor = statusColors[data.overallStatus.toLowerCase()] || [156, 163, 175];
      
      pdf.setFillColor(...statusColor);
      pdf.roundedRect(margin, yPosition, 45, 8, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.text(data.overallStatus.toUpperCase(), margin + 22.5, yPosition + 5.5, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      
      yPosition += 12;
    }

    // Executive Summary
    if (data.summary) {
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(11);
      pdf.text('EXECUTIVE SUMMARY', margin, yPosition);
      yPosition += 5;
      
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);
      const summaryLines = pdf.splitTextToSize(data.summary, contentWidth);
      summaryLines.forEach((line: string) => {
        addPageIfNeeded(5);
        pdf.text(line, margin, yPosition);
        yPosition += 4;
      });
      yPosition += 3;
    }

    // ====== HEALTH SCORE SECTION ======
    addPageIfNeeded(60);
    
    pdf.setFillColor(239, 246, 255);
    pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(30, 64, 175);
    pdf.text('OVERALL HEALTH SCORE', margin + 2, yPosition + 4.5);
    pdf.setTextColor(0, 0, 0);
    yPosition += 10;

    // Large Score Display
    const score = data.healthScoreBreakdown.overallScore;
    const scoreColor = getScoreColor(score);
    
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(48);
    pdf.setTextColor(...scoreColor);
    pdf.text(score.toString(), margin + contentWidth / 2, yPosition + 15, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setTextColor(107, 114, 128);
    pdf.text('out of 100', margin + contentWidth / 2, yPosition + 22, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    
    // Category Badge
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(...scoreColor);
    pdf.text(data.healthScoreBreakdown.categoryLabel, margin + contentWidth / 2, yPosition + 30, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    
    yPosition += 38;

    // Population Comparison
    if (data.healthScoreBreakdown.comparisonToPopulation) {
      pdf.setFillColor(219, 234, 254);
      pdf.roundedRect(margin + 10, yPosition, contentWidth - 20, 12, 2, 2, 'F');
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      const compLines = pdf.splitTextToSize(data.healthScoreBreakdown.comparisonToPopulation, contentWidth - 30);
      compLines.forEach((line: string, idx: number) => {
        pdf.text(line, margin + 15, yPosition + 4 + (idx * 3.5));
      });
      yPosition += 16;
    }

    // ====== PAGE 2: SYSTEM BREAKDOWN ======
    pdf.addPage();
    addHeader('Health Score Breakdown', 'Body Systems Analysis');

    pdf.setFontSize(9);
    pdf.setFont(undefined, 'italic');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Score based on ADA/AHA/KDIGO/WHO medical guidelines', margin, yPosition);
    pdf.setTextColor(0, 0, 0);
    yPosition += 8;

    // System Scores
    Object.entries(data.healthScoreBreakdown.systemScores).forEach(([systemName, systemData]: [string, any]) => {
      addPageIfNeeded(25);
      
      // System header
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(margin, yPosition, contentWidth, 8, 1, 1, 'F');
      
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10);
      pdf.text(getSystemLabel(systemName), margin + 2, yPosition + 5);
      
      const sysScoreColor = getScoreColor(systemData.score);
      pdf.setTextColor(...sysScoreColor);
      pdf.text(`${systemData.score}/100`, margin + contentWidth - 2, yPosition + 5, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
      
      yPosition += 10;

      // Progress bar
      pdf.setFillColor(229, 231, 235);
      pdf.roundedRect(margin + 2, yPosition, contentWidth - 4, 4, 1, 1, 'F');
      
      pdf.setFillColor(...sysScoreColor);
      const barWidth = ((contentWidth - 4) * systemData.score) / 100;
      pdf.roundedRect(margin + 2, yPosition, barWidth, 4, 1, 1, 'F');
      
      yPosition += 6;

      // Weight
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Weight: ${systemData.weight}%`, margin + 2, yPosition);
      pdf.setTextColor(0, 0, 0);
      yPosition += 4;

      // Parameters evaluated
      if (systemData.evaluatedParameters && systemData.evaluatedParameters.length > 0) {
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Parameters: ${systemData.evaluatedParameters.join(', ')}`, margin + 2, yPosition);
        yPosition += 4;
      }

      // Key issues
      if (systemData.keyIssues && systemData.keyIssues.length > 0) {
        pdf.setTextColor(249, 115, 22);
        pdf.setFontSize(8);
        systemData.keyIssues.slice(0, 2).forEach((issue: string) => {
          const issueLines = pdf.splitTextToSize(`⚠ ${issue}`, contentWidth - 6);
          issueLines.forEach((line: string) => {
            pdf.text(line, margin + 4, yPosition);
            yPosition += 3.5;
          });
        });
        pdf.setTextColor(0, 0, 0);
      }

      yPosition += 3;
    });

    // Risk Modifiers
    if (data.healthScoreBreakdown.modifiers && data.healthScoreBreakdown.modifiers.length > 0) {
      addPageIfNeeded(30);
      
      pdf.setFillColor(254, 243, 199);
      pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(161, 98, 7);
      pdf.text('RISK FACTORS CONSIDERED', margin + 2, yPosition + 4);
      pdf.setTextColor(0, 0, 0);
      yPosition += 9;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);
      data.healthScoreBreakdown.modifiers.forEach((modifier: any) => {
        pdf.text(`• ${modifier.factor}: ${modifier.impact} points`, margin + 2, yPosition);
        yPosition += 4;
      });
      yPosition += 2;
    }

    // ====== RISK PREDICTION TIMELINE ======
    if (data.clinicalAssessment?.riskFactors) {
      const cvRisk = data.clinicalAssessment.riskFactors.cardiovascular;
      const diabetesRisk = data.clinicalAssessment.riskFactors.diabetes;

      if (cvRisk && diabetesRisk) {
        addPageIfNeeded(70);

        pdf.setFillColor(239, 246, 255);
        pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(30, 64, 175);
        pdf.text('10-YEAR HEALTH RISK PROJECTION', margin + 2, yPosition + 4.5);
        pdf.setTextColor(0, 0, 0);
        yPosition += 10;

        const timeline = generateRiskTimeline(cvRisk, diabetesRisk);

        // Cardiovascular Risk
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(10);
        pdf.text('Cardiovascular Disease Risk', margin, yPosition);
        yPosition += 5;

        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(8);
        timeline.cardiovascular.forEach((projection) => {
          pdf.setFont(undefined, 'bold');
          pdf.text(`${projection.year}:`, margin + 2, yPosition);
          pdf.setFont(undefined, 'normal');
          pdf.text(`Current Habits: ${projection.noChangesRisk.toFixed(1)}% | Lifestyle Changes: ${projection.withInterventionRisk.toFixed(1)}%`, margin + 20, yPosition);
          yPosition += 4;
        });
        yPosition += 3;

        // Diabetes Risk
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(10);
        pdf.text('Type 2 Diabetes Risk', margin, yPosition);
        yPosition += 5;

        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(8);
        timeline.diabetes.forEach((projection) => {
          pdf.setFont(undefined, 'bold');
          pdf.text(`${projection.year}:`, margin + 2, yPosition);
          pdf.setFont(undefined, 'normal');
          pdf.text(`Current Habits: ${projection.noChangesRisk.toFixed(1)}% | Lifestyle Changes: ${projection.withInterventionRisk.toFixed(1)}%`, margin + 20, yPosition);
          yPosition += 4;
        });
        yPosition += 3;

        // Potential Benefits
        if (timeline.potentialBenefits && timeline.potentialBenefits.length > 0) {
          pdf.setFillColor(220, 252, 231);
          pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
          pdf.setFont(undefined, 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(22, 101, 52);
          pdf.text('POTENTIAL BENEFITS OF TAKING ACTION', margin + 2, yPosition + 4);
          pdf.setTextColor(0, 0, 0);
          yPosition += 9;

          pdf.setFont(undefined, 'normal');
          pdf.setFontSize(8);
          timeline.potentialBenefits.forEach((benefit) => {
            const benefitLines = pdf.splitTextToSize(`• ${benefit}`, contentWidth - 4);
            benefitLines.forEach((line: string) => {
              addPageIfNeeded(4);
              pdf.text(line, margin + 2, yPosition);
              yPosition += 3.5;
            });
          });
          yPosition += 3;
        }
      }
    }

    // ====== PAGE 3: ABNORMAL FINDINGS ======
    pdf.addPage();
    addHeader('Detailed Lab Findings');

    // Abnormal Panels
    if (data.abnormalPanels && data.abnormalPanels.length > 0) {
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(11);
      pdf.text('ABNORMAL PANELS DETECTED', margin, yPosition);
      yPosition += 6;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);
      data.abnormalPanels.forEach((panel) => {
        pdf.text(`• ${panel.panelName}`, margin + 2, yPosition);
        yPosition += 5;
      });
      yPosition += 4;
    }

    // Values Needing Attention Table
    if (data.valuesNeedingAttention && data.valuesNeedingAttention.length > 0) {
      addPageIfNeeded(40);
      
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(11);
      pdf.text('VALUES NEEDING ATTENTION', margin, yPosition);
      yPosition += 6;

      // Table header
      pdf.setFillColor(220, 38, 38);
      pdf.rect(margin, yPosition, contentWidth, 6, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'bold');
      pdf.text('Parameter', margin + 2, yPosition + 4);
      pdf.text('Value', margin + 70, yPosition + 4);
      pdf.text('Normal', margin + 105, yPosition + 4);
      pdf.text('Status', margin + 150, yPosition + 4);
      yPosition += 6;
      pdf.setTextColor(0, 0, 0);

      // Table rows
      data.valuesNeedingAttention.forEach((lab, index) => {
        addPageIfNeeded(8);
        
        if (index % 2 === 0) {
          pdf.setFillColor(254, 226, 226);
          pdf.rect(margin, yPosition, contentWidth, 6, 'F');
        }
        
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(7.5);
        pdf.text(lab.parameter.substring(0, 35), margin + 2, yPosition + 4);
        pdf.text(`${lab.value} ${lab.unit}`, margin + 70, yPosition + 4);
        pdf.text(lab.normalRange, margin + 105, yPosition + 4);
        
        const statusColor: [number, number, number] = lab.status === 'high' ? [220, 38, 38] : lab.status === 'low' ? [234, 179, 8] : [156, 163, 175];
        pdf.setTextColor(...statusColor);
        pdf.setFont(undefined, 'bold');
        pdf.text(lab.status.toUpperCase(), margin + 150, yPosition + 4);
        pdf.setTextColor(0, 0, 0);
        
        yPosition += 6;
      });
      
      yPosition += 4;
    }

    // ====== PAGE 4+: RECOMMENDATIONS ======
    pdf.addPage();
    addHeader('Personalized Recommendations');

    // Immediate Actions
    if (data.recommendations?.immediate && data.recommendations.immediate.length > 0) {
      pdf.setFillColor(254, 226, 226);
      pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(185, 28, 28);
      pdf.text('IMMEDIATE ACTION ITEMS', margin + 2, yPosition + 4);
      pdf.setTextColor(0, 0, 0);
      yPosition += 9;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8.5);
      data.recommendations.immediate.forEach((item, index) => {
        addPageIfNeeded(10);
        const lines = pdf.splitTextToSize(`${index + 1}. ${item}`, contentWidth - 4);
        lines.forEach((line: string) => {
          pdf.text(line, margin + 2, yPosition);
          yPosition += 4;
        });
        yPosition += 1;
      });
      yPosition += 3;
    }

    // Dietary Recommendations
    if (data.recommendations?.dietary) {
      addPageIfNeeded(30);
      
      pdf.setFillColor(220, 252, 231);
      pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(21, 128, 61);
      pdf.text('DIETARY CHANGES', margin + 2, yPosition + 4);
      pdf.setTextColor(0, 0, 0);
      yPosition += 9;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8.5);

      if (data.recommendations.dietary.toAdd && data.recommendations.dietary.toAdd.length > 0) {
        pdf.setFont(undefined, 'bold');
        pdf.text('Add to Diet:', margin + 2, yPosition);
        yPosition += 4;
        pdf.setFont(undefined, 'normal');
        
        data.recommendations.dietary.toAdd.forEach(item => {
          addPageIfNeeded(8);
          const lines = pdf.splitTextToSize(`• ${item}`, contentWidth - 6);
          lines.forEach((line: string) => {
            pdf.text(line, margin + 4, yPosition);
            yPosition += 3.5;
          });
        });
        yPosition += 2;
      }

      if (data.recommendations.dietary.toLimitOrAvoid && data.recommendations.dietary.toLimitOrAvoid.length > 0) {
        addPageIfNeeded(10);
        pdf.setFont(undefined, 'bold');
        pdf.text('Limit or Avoid:', margin + 2, yPosition);
        yPosition += 4;
        pdf.setFont(undefined, 'normal');
        
        data.recommendations.dietary.toLimitOrAvoid.forEach(item => {
          addPageIfNeeded(8);
          const lines = pdf.splitTextToSize(`• ${item}`, contentWidth - 6);
          lines.forEach((line: string) => {
            pdf.text(line, margin + 4, yPosition);
            yPosition += 3.5;
          });
        });
      }
      yPosition += 3;
    }

    // Lifestyle Modifications
    if (data.recommendations?.lifestyle && data.recommendations.lifestyle.length > 0) {
      addPageIfNeeded(25);
      
      pdf.setFillColor(224, 242, 254);
      pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(30, 64, 175);
      pdf.text('LIFESTYLE MODIFICATIONS', margin + 2, yPosition + 4);
      pdf.setTextColor(0, 0, 0);
      yPosition += 9;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8.5);
      data.recommendations.lifestyle.forEach(item => {
        addPageIfNeeded(8);
        const lines = pdf.splitTextToSize(`• ${item}`, contentWidth - 4);
        lines.forEach((line: string) => {
          pdf.text(line, margin + 2, yPosition);
          yPosition += 3.5;
        });
      });
      yPosition += 3;
    }

    // Follow-up Guidance
    addPageIfNeeded(20);
    pdf.setFillColor(254, 249, 195);
    pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(161, 98, 7);
    pdf.text('FOLLOW-UP GUIDANCE', margin + 2, yPosition + 4);
    pdf.setTextColor(0, 0, 0);
    yPosition += 9;

    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8.5);
    const followUpText = data.recommendations?.followUp || 'Retest recommended in 3-6 months. Consult your healthcare provider if symptoms worsen.';
    const followUpLines = pdf.splitTextToSize(followUpText, contentWidth - 4);
    followUpLines.forEach((line: string) => {
      addPageIfNeeded(5);
      pdf.text(line, margin + 2, yPosition);
      yPosition += 3.5;
    });

    // Footer on last page
    const currentPage = pdf.internal.pages.length - 1;
    pdf.setPage(currentPage);
    yPosition = pageHeight - 18;
    pdf.setFillColor(243, 244, 246);
    pdf.rect(0, yPosition, pageWidth, 18, 'F');
    pdf.setFontSize(7);
    pdf.setFont(undefined, 'italic');
    pdf.setTextColor(107, 114, 128);
    const disclaimer = 'Disclaimer: This report is for informational purposes only and does not constitute medical advice. Always consult with a qualified healthcare professional for medical diagnosis and treatment.';
    const disclaimerLines = pdf.splitTextToSize(disclaimer, contentWidth);
    disclaimerLines.forEach((line: string, index: number) => {
      pdf.text(line, margin, yPosition + 4 + (index * 3));
    });

    // Save PDF
    const fileName = `Comprehensive-Health-Report-${data.patientInfo?.name || 'Patient'}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    toast.success('Comprehensive report downloaded successfully!');
    return true;
  } catch (error) {
    console.error('Error generating comprehensive PDF:', error);
    toast.error('Failed to generate comprehensive report');
    return false;
  }
}
