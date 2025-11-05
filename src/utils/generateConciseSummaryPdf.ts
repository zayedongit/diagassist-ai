import jsPDF from 'jspdf';
import { EnhancedAnalysisResult, LabValue } from '@/types/medicalAnalysis';
import { compareWithPopulation } from '@/utils/populationData';
import { getParameterContext } from './parameterContextDatabase';

function parseNumericValue(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

interface TrendComparison {
  parameter: string;
  previous: string;
  current: string;
  change: number;
  direction: 'up' | 'down' | 'stable';
}

function calculateTrends(
  currentLabs: LabValue[],
  previousLabs: LabValue[]
): TrendComparison[] {
  const trends: TrendComparison[] = [];
  
  currentLabs.forEach(current => {
    const previous = previousLabs.find(
      prev => prev.name.toLowerCase() === current.name.toLowerCase()
    );
    
    if (previous) {
      const prevNum = parseNumericValue(previous.value);
      const currNum = parseNumericValue(current.value);
      
      if (prevNum !== null && currNum !== null) {
        const change = ((currNum - prevNum) / prevNum) * 100;
        const direction = Math.abs(change) < 5 ? 'stable' : change > 0 ? 'up' : 'down';
        
        trends.push({
          parameter: current.name,
          previous: previous.value,
          current: current.value,
          change,
          direction
        });
      }
    }
  });
  
  return trends;
}

export async function generateConciseSummaryPdf(
  currentAnalysis: EnhancedAnalysisResult,
  previousAnalysis?: EnhancedAnalysisResult
): Promise<void> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;
  
  // Header
  pdf.setFillColor(41, 98, 255);
  pdf.rect(0, 0, pageWidth, 35, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DAIG ASSIST - Medical Summary', margin, 15);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Patient: ${currentAnalysis.patientName || 'N/A'}`, margin, 23);
  pdf.text(`Test Date: ${currentAnalysis.testDate ? new Date(currentAnalysis.testDate).toLocaleDateString('en-IN') : 'N/A'}`, margin, 28);
  
  yPos = 45;
  
  // Overall Status
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  
  const statusColors = {
    good: [34, 197, 94],
    moderate: [251, 191, 36],
    concerning: [239, 68, 68]
  };
  
  const statusColor = statusColors[currentAnalysis.overallStatus];
  pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  pdf.rect(margin, yPos, 50, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text(currentAnalysis.overallStatus.toUpperCase(), margin + 25, yPos + 5.5, { align: 'center' });
  
  yPos += 12;
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  const summaryLines = pdf.splitTextToSize(currentAnalysis.summary, pageWidth - (2 * margin));
  pdf.text(summaryLines, margin, yPos);
  yPos += (summaryLines.length * 5) + 8;
  
  // Key Abnormal Findings
  const currentLabs = currentAnalysis.medicalPanels?.flatMap(p => p.abnormalLabs) || currentAnalysis.labs || [];
  const topAbnormal = currentLabs
    .filter(lab => lab.status !== 'normal')
    .slice(0, 5);
  
  if (topAbnormal.length > 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('KEY ABNORMAL FINDINGS', margin, yPos);
    yPos += 8;
    
    // Table header
    pdf.setFillColor(230, 230, 230);
    pdf.rect(margin, yPos, pageWidth - (2 * margin), 7, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Parameter', margin + 2, yPos + 5);
    pdf.text('Your Value', margin + 55, yPos + 5);
    pdf.text('Normal Range', margin + 90, yPos + 5);
    pdf.text('Population Comparison', margin + 130, yPos + 5);
    yPos += 7;
    
    // Table rows
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    topAbnormal.forEach((lab, index) => {
      // Alternating row colors
      if (index % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(margin, yPos, pageWidth - (2 * margin), 10, 'F');
      }
      
      // Status indicator
      const statusColor = lab.status === 'critical' ? [239, 68, 68] :
                         lab.status === 'high' || lab.status === 'low' ? [251, 191, 36] :
                         [34, 197, 94];
      pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.circle(margin + 1, yPos + 5, 1.5, 'F');
      
      pdf.setTextColor(0, 0, 0);
      const paramName = lab.name.length > 18 ? lab.name.substring(0, 15) + '...' : lab.name;
      pdf.text(paramName, margin + 5, yPos + 5);
      pdf.text(lab.value + (lab.unit ? ` ${lab.unit}` : ''), margin + 55, yPos + 5);
      
      const range = lab.referenceRange || 'N/A';
      const rangeText = range.length > 15 ? range.substring(0, 12) + '...' : range;
      pdf.text(rangeText, margin + 90, yPos + 5);
      
      // Population comparison
      if (currentAnalysis.demographics?.age && currentAnalysis.demographics?.gender) {
        const numValue = parseNumericValue(lab.value);
        if (numValue !== null) {
          const popComp = compareWithPopulation(
            numValue,
            lab.name,
            currentAnalysis.demographics.age,
            currentAnalysis.demographics.gender
          );
          
          if (popComp) {
            const sign = popComp.percentageDifference >= 0 ? '+' : '';
            const compText = `${sign}${popComp.percentageDifference.toFixed(0)}% vs avg`;
            pdf.text(compText, margin + 130, yPos + 5);
          } else {
            pdf.text('N/A', margin + 130, yPos + 5);
          }
        }
      } else {
        pdf.text('N/A', margin + 130, yPos + 5);
      }
      
      yPos += 10;
    });
    
    yPos += 8;
  }
  
  // PARAMETER-SPECIFIC INSIGHTS
  if (topAbnormal.length > 0 && yPos < pageHeight - 50) {
    const topThree = topAbnormal.slice(0, 3);
    
    topThree.forEach((lab) => {
      if (yPos > pageHeight - 45) return;
      
      const context = getParameterContext(lab);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(41, 98, 255);
      pdf.text(`${lab.name} (${lab.value} ${lab.unit})`, margin, yPos);
      yPos += 6;
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Body Impact:', margin + 2, yPos);
      yPos += 4;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      const bodyLines = pdf.splitTextToSize(context.bodyConnection, pageWidth - 2 * margin - 4);
      pdf.text(bodyLines.slice(0, 3), margin + 2, yPos);
      yPos += Math.min(bodyLines.length, 3) * 4 + 2;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Key Factors:', margin + 2, yPos);
      yPos += 4;
      
      pdf.setFont('helvetica', 'normal');
      const topCauses = context.possibleCauses.slice(0, 3);
      topCauses.forEach(cause => {
        const causeLines = pdf.splitTextToSize(`• ${cause}`, pageWidth - 2 * margin - 6);
        pdf.text(causeLines, margin + 4, yPos);
        yPos += causeLines.length * 4;
      });
      
      yPos += 4;
    });
  }
  
  // Trend Comparison (if previous analysis exists)
  if (previousAnalysis) {
    const previousLabs = previousAnalysis.medicalPanels?.flatMap(p => p.abnormalLabs) || previousAnalysis.labs || [];
    const trends = calculateTrends(currentLabs, previousLabs);
    
    if (trends.length > 0 && yPos < pageHeight - 60) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TREND COMPARISON (vs Previous Test)', margin, yPos);
      yPos += 8;
      
      // Table header
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, yPos, pageWidth - (2 * margin), 7, 'F');
      
      pdf.setFontSize(9);
      pdf.text('Parameter', margin + 2, yPos + 5);
      pdf.text('Previous', margin + 55, yPos + 5);
      pdf.text('Current', margin + 90, yPos + 5);
      pdf.text('Trend', margin + 125, yPos + 5);
      pdf.text('Change', margin + 155, yPos + 5);
      yPos += 7;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      
      const trendCount = Math.min(trends.length, 5);
      
      for (let i = 0; i < trendCount && yPos < pageHeight - 25; i++) {
        const trend = trends[i];
        
        if (i % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, yPos, pageWidth - (2 * margin), 9, 'F');
        }
        
        const paramName = trend.parameter.length > 18 ? trend.parameter.substring(0, 15) + '...' : trend.parameter;
        pdf.text(paramName, margin + 2, yPos + 5);
        pdf.text(trend.previous, margin + 55, yPos + 5);
        pdf.text(trend.current, margin + 90, yPos + 5);
        
        // Trend arrow and status
        const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';
        const trendText = trend.direction === 'stable' ? 'Stable' :
                         Math.abs(trend.change) > 30 ? (trend.direction === 'up' ? 'Critical ↑' : 'Improved ↓') :
                         Math.abs(trend.change) > 15 ? (trend.direction === 'up' ? 'Worsening' : 'Improving') :
                         (trend.direction === 'up' ? 'Higher' : 'Lower');
        
        const trendColor = trend.direction === 'stable' ? [59, 130, 246] :
                          Math.abs(trend.change) > 30 ? (trend.direction === 'up' ? [239, 68, 68] : [34, 197, 94]) :
                          Math.abs(trend.change) > 15 ? (trend.direction === 'up' ? [251, 191, 36] : [34, 197, 94]) :
                          [156, 163, 175];
        
        pdf.setTextColor(trendColor[0], trendColor[1], trendColor[2]);
        pdf.text(`${arrow} ${trendText}`, margin + 125, yPos + 5);
        
        pdf.setTextColor(0, 0, 0);
        pdf.text(`${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}%`, margin + 155, yPos + 5);
        
        yPos += 9;
      }
      
      pdf.setTextColor(0, 0, 0);
      yPos += 6;
    }
  }
  
  // Top 3 Action Items
  if (yPos < pageHeight - 40) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOP 3 ACTION ITEMS', margin, yPos);
    yPos += 7;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    const actions = currentAnalysis.nextSteps?.slice(0, 3) || [];
    actions.forEach((action, index) => {
      pdf.setFillColor(41, 98, 255);
      pdf.circle(margin + 2, yPos + 2, 1.5, 'F');
      
      const actionLines = pdf.splitTextToSize(action, pageWidth - margin - 25);
      pdf.text(actionLines, margin + 6, yPos + 3);
      yPos += (actionLines.length * 4) + 3;
    });
  }
  
  // Footer
  const footerY = pageHeight - 15;
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  pdf.text('DISCLAIMER: This report is for educational purposes only and should not replace professional medical advice.', margin, footerY);
  pdf.text('Consult a qualified healthcare provider for proper diagnosis and treatment.', margin, footerY + 3);
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN')} | Powered by DAIG ASSIST`, margin, footerY + 6);
  
  // Save PDF
  const filename = `DAIG_Summary_${currentAnalysis.patientName?.replace(/\s+/g, '_') || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}
