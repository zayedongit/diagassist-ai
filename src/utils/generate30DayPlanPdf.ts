import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { HealthImprovementPlan } from './generate30DayPlan';

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

export async function generate30DayPlanPdf(plan: HealthImprovementPlan, patientName?: string) {
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

    const addPageIfNeeded = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - 20) {
        pdf.addPage();
        yPosition = margin + 10;
        return true;
      }
      return false;
    };

    // ====== COVER PAGE ======
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(28);
    pdf.setFont(undefined, 'bold');
    pdf.text('30-Day Health', pageWidth / 2, 80, { align: 'center' });
    pdf.text('Improvement Plan', pageWidth / 2, 92, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'normal');
    pdf.text('Personalized Action Plan for Better Health', pageWidth / 2, 105, { align: 'center' });
    
    if (patientName) {
      pdf.setFontSize(12);
      pdf.text(`Prepared for: ${patientName}`, pageWidth / 2, 120, { align: 'center' });
    }
    
    pdf.setFontSize(10);
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, 130, { align: 'center' });
    
    // Target systems box
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(margin + 20, 150, contentWidth - 40, 30, 3, 3, 'F');
    pdf.setTextColor(59, 130, 246);
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.text('Focus Areas:', pageWidth / 2, 158, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    const systemsText = plan.targetSystems.map(s => getSystemLabel(s)).join(', ');
    const systemLines = pdf.splitTextToSize(systemsText, contentWidth - 50);
    systemLines.forEach((line: string, idx: number) => {
      pdf.text(line, pageWidth / 2, 166 + (idx * 5), { align: 'center' });
    });

    // ====== PAGE 2: OVERVIEW ======
    pdf.addPage();
    pdf.setTextColor(0, 0, 0);
    yPosition = margin;
    
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 15, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Plan Overview', pageWidth / 2, 10, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    
    yPosition = 25;

    // Overall Goal
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.text('Your Health Goal', margin, yPosition);
    yPosition += 6;
    
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    const goalLines = pdf.splitTextToSize(plan.overallGoal, contentWidth);
    goalLines.forEach((line: string) => {
      pdf.text(line, margin, yPosition);
      yPosition += 4;
    });
    yPosition += 5;

    // Key Activities Summary
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.text('Daily Activities Overview', margin, yPosition);
    yPosition += 6;
    
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    plan.dailyActivities.slice(0, 5).forEach(activity => {
      addPageIfNeeded(8);
      pdf.text(`• ${activity.activity}`, margin + 2, yPosition);
      yPosition += 4;
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`   Frequency: ${activity.frequency}`, margin + 2, yPosition);
      yPosition += 4;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
    });
    yPosition += 3;

    // ====== TESTS REQUIRED ======
    addPageIfNeeded(40);
    pdf.setFillColor(254, 226, 226);
    pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(185, 28, 28);
    pdf.text('TESTS REQUIRED', margin + 2, yPosition + 4);
    pdf.setTextColor(0, 0, 0);
    yPosition += 9;

    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    
    const urgentTests = plan.testsRequired.filter(t => t.urgency === 'urgent' || t.urgency === 'important');
    const routineTests = plan.testsRequired.filter(t => t.urgency === 'routine');
    
    if (urgentTests.length > 0) {
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(220, 38, 38);
      pdf.text('High Priority:', margin + 2, yPosition);
      yPosition += 5;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      
      urgentTests.forEach(test => {
        addPageIfNeeded(12);
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.text(`• ${test.testName}`, margin + 4, yPosition);
        yPosition += 4;
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(8);
        pdf.text(`  Timing: ${test.timing}`, margin + 6, yPosition);
        yPosition += 3.5;
        const reasonLines = pdf.splitTextToSize(`  Reason: ${test.reason}`, contentWidth - 10);
        reasonLines.forEach((line: string) => {
          pdf.text(line, margin + 6, yPosition);
          yPosition += 3.5;
        });
        yPosition += 1;
      });
      yPosition += 2;
    }
    
    if (routineTests.length > 0) {
      addPageIfNeeded(15);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(107, 114, 128);
      pdf.text('Routine Tests:', margin + 2, yPosition);
      yPosition += 5;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      
      routineTests.forEach(test => {
        addPageIfNeeded(10);
        pdf.setFontSize(9);
        pdf.text(`• ${test.testName} (${test.timing})`, margin + 4, yPosition);
        yPosition += 4;
      });
    }
    yPosition += 5;

    // ====== SPECIALIST REFERRALS ======
    if (plan.specialistReferrals.length > 0) {
      addPageIfNeeded(30);
      pdf.setFillColor(255, 237, 213);
      pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(194, 65, 12);
      pdf.text('SPECIALIST REFERRALS', margin + 2, yPosition + 4);
      pdf.setTextColor(0, 0, 0);
      yPosition += 9;

      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      
      plan.specialistReferrals.forEach(referral => {
        addPageIfNeeded(15);
        pdf.setFont(undefined, 'bold');
        pdf.text(`• ${referral.specialty}`, margin + 2, yPosition);
        yPosition += 4;
        
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(8);
        pdf.text(`  Priority: ${referral.priority.toUpperCase()} | Timeframe: ${referral.timeframe}`, margin + 4, yPosition);
        yPosition += 3.5;
        
        const reasonLines = pdf.splitTextToSize(`  Reason: ${referral.reason}`, contentWidth - 8);
        reasonLines.forEach((line: string) => {
          pdf.text(line, margin + 4, yPosition);
          yPosition += 3.5;
        });
        yPosition += 2;
      });
      yPosition += 3;
    }

    // ====== WEEKLY BREAKDOWN ======
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 15, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('4-Week Action Plan', pageWidth / 2, 10, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    
    yPosition = 25;

    plan.weeklyBreakdown.forEach((week, weekIdx) => {
      if (weekIdx > 0) addPageIfNeeded(60);
      
      // Week header
      pdf.setFillColor(224, 242, 254);
      pdf.roundedRect(margin, yPosition, contentWidth, 8, 2, 2, 'F');
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(30, 64, 175);
      pdf.text(`Week ${week.week}: ${week.focus}`, margin + 3, yPosition + 5.5);
      pdf.setTextColor(0, 0, 0);
      yPosition += 11;

      // Goals
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.text('Goals:', margin + 2, yPosition);
      yPosition += 4;
      
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);
      week.goals.forEach(goal => {
        pdf.text(`• ${goal}`, margin + 4, yPosition);
        yPosition += 3.5;
      });
      yPosition += 3;

      // Daily activities (simplified)
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.text('Daily Schedule:', margin + 2, yPosition);
      yPosition += 4;
      
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(7.5);
      week.activities.forEach(day => {
        addPageIfNeeded(8);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${day.day}:`, margin + 4, yPosition);
        yPosition += 3;
        pdf.setFont(undefined, 'normal');
        pdf.text(`  Morning: ${day.morning}`, margin + 6, yPosition);
        yPosition += 3;
        pdf.text(`  Afternoon: ${day.afternoon}`, margin + 6, yPosition);
        yPosition += 3;
        pdf.text(`  Evening: ${day.evening}`, margin + 6, yPosition);
        yPosition += 4;
      });
      yPosition += 4;
    });

    // ====== DIETARY PLAN ======
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 15, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Dietary Plan', pageWidth / 2, 10, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    
    yPosition = 25;

    // Foods to Add
    pdf.setFillColor(220, 252, 231);
    pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(21, 128, 61);
    pdf.text('FOODS TO ADD', margin + 2, yPosition + 4);
    pdf.setTextColor(0, 0, 0);
    yPosition += 9;

    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    plan.dietaryPlan.foodsToAdd.forEach(food => {
      addPageIfNeeded(5);
      pdf.text(`• ${food}`, margin + 2, yPosition);
      yPosition += 3.5;
    });
    yPosition += 4;

    // Foods to Limit
    pdf.setFillColor(254, 226, 226);
    pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(185, 28, 28);
    pdf.text('FOODS TO LIMIT', margin + 2, yPosition + 4);
    pdf.setTextColor(0, 0, 0);
    yPosition += 9;

    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    plan.dietaryPlan.foodsToLimit.forEach(food => {
      addPageIfNeeded(5);
      pdf.text(`• ${food}`, margin + 2, yPosition);
      yPosition += 3.5;
    });
    yPosition += 4;

    // Sample Weekly Meals
    addPageIfNeeded(40);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    pdf.text('SAMPLE WEEKLY MEAL PLAN', margin, yPosition);
    yPosition += 6;

    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    
    const mealTypes = [
      { name: 'Breakfast', items: plan.dietaryPlan.weeklyMealPlan.breakfast },
      { name: 'Lunch', items: plan.dietaryPlan.weeklyMealPlan.lunch },
      { name: 'Dinner', items: plan.dietaryPlan.weeklyMealPlan.dinner },
      { name: 'Snacks', items: plan.dietaryPlan.weeklyMealPlan.snacks }
    ];

    mealTypes.forEach(mealType => {
      addPageIfNeeded(20);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${mealType.name} Options:`, margin + 2, yPosition);
      yPosition += 4;
      
      pdf.setFont(undefined, 'normal');
      mealType.items.slice(0, 5).forEach(item => {
        pdf.text(`  • ${item}`, margin + 4, yPosition);
        yPosition += 3.5;
      });
      yPosition += 2;
    });

    // Hydration & Supplements
    addPageIfNeeded(20);
    yPosition += 2;
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(9);
    pdf.text('Hydration Goals:', margin, yPosition);
    yPosition += 4;
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8);
    const hydrationLines = pdf.splitTextToSize(plan.dietaryPlan.hydrationGoals, contentWidth);
    hydrationLines.forEach((line: string) => {
      pdf.text(line, margin + 2, yPosition);
      yPosition += 3.5;
    });

    if (plan.dietaryPlan.supplementsIfNeeded.length > 0) {
      yPosition += 3;
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(9);
      pdf.text('Recommended Supplements:', margin, yPosition);
      yPosition += 4;
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);
      plan.dietaryPlan.supplementsIfNeeded.forEach(supplement => {
        pdf.text(`• ${supplement}`, margin + 2, yPosition);
        yPosition += 3.5;
      });
    }

    // ====== TRACKING METRICS ======
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 15, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Progress Tracking', pageWidth / 2, 10, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    
    yPosition = 25;

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    pdf.text('DAILY/WEEKLY METRICS TO TRACK', margin, yPosition);
    yPosition += 6;

    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    plan.trackingMetrics.forEach(metric => {
      addPageIfNeeded(6);
      pdf.text(`□ ${metric}`, margin + 2, yPosition);
      yPosition += 5;
    });

    // Final disclaimer
    const currentPage = pdf.internal.pages.length - 1;
    pdf.setPage(currentPage);
    yPosition = pageHeight - 20;
    pdf.setFillColor(243, 244, 246);
    pdf.rect(0, yPosition, pageWidth, 20, 'F');
    pdf.setFontSize(7);
    pdf.setFont(undefined, 'italic');
    pdf.setTextColor(107, 114, 128);
    const disclaimer = 'Disclaimer: This 30-day improvement plan is for informational and educational purposes only. It does not replace professional medical advice, diagnosis, or treatment. Always consult your healthcare provider before making significant changes to your diet, exercise routine, or medication regimen.';
    const disclaimerLines = pdf.splitTextToSize(disclaimer, contentWidth);
    disclaimerLines.forEach((line: string, index: number) => {
      pdf.text(line, margin, yPosition + 4 + (index * 3));
    });

    // Save PDF
    const fileName = `30-Day-Health-Plan-${patientName || 'Patient'}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    // Return PDF as base64 for backend storage
    const pdfBase64 = pdf.output('datauristring').split(',')[1];

    toast.success('30-Day Improvement Plan downloaded successfully!');
    return { success: true, pdfBase64, fileName };
  } catch (error) {
    console.error('Error generating 30-day plan PDF:', error);
    toast.error('Failed to generate improvement plan PDF');
    return { success: false, pdfBase64: null, fileName: null };
  }
}
