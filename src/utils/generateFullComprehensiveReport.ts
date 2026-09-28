import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { HealthScoreBreakdown } from './healthScoreCalculator';

// Brief, plain-language PDF that mirrors the on-screen report: verdict, "in short"
// summary, health score, the values needing attention, and next steps.

interface PatientInfo {
  name?: string;
  age?: number;
  gender?: string;
  testDate?: string;
}

interface ReportLab {
  name: string;
  value: number | string;
  unit?: string;
  referenceRange?: string;
  status?: string;
  significance?: string;
}

interface ReportPanel {
  name: string;
  interpretation?: string;
  abnormalLabs: ReportLab[];
}

interface ComprehensiveReportData {
  patientInfo?: PatientInfo;
  overallStatus?: string;
  summary?: string;
  healthScoreBreakdown: HealthScoreBreakdown;
  panels: ReportPanel[];
  nextSteps?: {
    consultation?: string[];
    investigation?: string[];
    lifestyle?: string[];
    flat?: string[];
  };
}

// jsPDF's built-in fonts only cover Latin-1; map common medical symbols so they
// don't print as garbage.
const clean = (value: unknown): string =>
  String(value ?? '')
    .replace(/[μµ]/g, 'u')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/×/g, 'x')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')
    .trim();

const STATUS: Record<string, { label: string; color: [number, number, number] }> = {
  good: { label: 'Looking good', color: [22, 163, 74] },
  moderate: { label: 'Needs attention', color: [202, 138, 4] },
  concerning: { label: 'See your doctor', color: [220, 38, 38] },
};

const scoreColor = (score: number): [number, number, number] => {
  if (score >= 75) return [22, 163, 74];
  if (score >= 60) return [202, 138, 4];
  if (score >= 40) return [234, 88, 12];
  return [220, 38, 38];
};

const SYSTEM_LABELS: Record<string, string> = {
  metabolic: 'Sugar & metabolism',
  cardiovascular: 'Heart',
  kidney: 'Kidney',
  liver: 'Liver',
  hematologic: 'Blood',
  endocrine: 'Hormones',
};

export async function generateFullComprehensiveReport(data: ComprehensiveReportData) {
  try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    const bottom = pageHeight - 18;
    let y = margin;

    const ensure = (space: number) => {
      if (y + space > bottom) {
        pdf.addPage();
        y = margin;
      }
    };

    const paragraph = (text: string, size = 10, indent = 0, lineHeight = 5) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(clean(text), contentWidth - indent);
      lines.forEach((line: string) => {
        ensure(lineHeight);
        pdf.text(line, margin + indent, y);
        y += lineHeight;
      });
    };

    const heading = (text: string) => {
      ensure(30); // keep the heading with at least a few lines of its section
      y += 3;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(30, 41, 59);
      pdf.text(text, margin, y);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, y + 2, margin + contentWidth, y + 2);
      pdf.setTextColor(0, 0, 0);
      y += 8;
    };

    const bullets = (items: string[], numbered = false) => {
      items.forEach((item, i) => {
        const prefix = numbered ? `${i + 1}.` : '-';
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(clean(item), contentWidth - 7);
        ensure(lines.length * 5);
        pdf.text(prefix, margin + 1, y);
        lines.forEach((line: string) => {
          pdf.text(line, margin + 7, y);
          y += 5;
        });
        y += 1;
      });
    };

    // ---- Header band ----
    pdf.setFillColor(30, 41, 59);
    pdf.rect(0, 0, pageWidth, 24, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('Your Health Report', margin, 12);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Diagassist - your lab results in plain words', margin, 18);
    pdf.setTextColor(0, 0, 0);
    y = 32;

    // ---- Patient line ----
    const p = data.patientInfo || {};
    const who = [
      p.name && p.name !== 'Not Available' ? p.name : null,
      p.age ? `${p.age} years` : null,
      p.gender ? p.gender[0].toUpperCase() + p.gender.slice(1) : null,
      p.testDate && p.testDate !== 'Not Available' ? `Test date: ${p.testDate}` : null,
    ].filter(Boolean).join('  |  ');
    if (who) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text(clean(who), margin, y);
      pdf.setTextColor(0, 0, 0);
      y += 8;
    }

    // ---- Verdict + score ----
    const status = STATUS[(data.overallStatus || '').toLowerCase()];
    const score = data.healthScoreBreakdown?.overallScore;
    const abnormalCount = data.panels.reduce((n, panel) => n + panel.abnormalLabs.length, 0);

    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');
    if (status) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(...status.color);
      pdf.text(status.label, margin + 5, y + 10);
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      abnormalCount === 0 ? 'All tested values are in the normal range' : `${abnormalCount} value${abnormalCount === 1 ? '' : 's'} outside the normal range`,
      margin + 5,
      y + 18,
    );
    if (typeof score === 'number') {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(...scoreColor(score));
      pdf.text(String(score), margin + contentWidth - 30, y + 13, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text('/100', margin + contentWidth - 29, y + 13);
      pdf.text('Health score', margin + contentWidth - 5, y + 19, { align: 'right' });
    }
    pdf.setTextColor(0, 0, 0);
    y += 30;

    // ---- In short ----
    if (data.summary) {
      heading('In short');
      paragraph(data.summary, 10.5, 0, 5.5);
    }

    // ---- Values needing attention ----
    if (abnormalCount > 0) {
      heading('Values needing attention');
      data.panels.forEach((panel) => {
        if (!panel.abnormalLabs.length) return;
        ensure(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        pdf.setTextColor(51, 65, 85);
        pdf.text(clean(panel.name), margin, y);
        pdf.setTextColor(0, 0, 0);
        y += 6;

        panel.abnormalLabs.forEach((lab) => {
          const isLow = (lab.status || '').toLowerCase() === 'low';
          const tag = isLow ? 'LOW' : 'HIGH';
          const tagColor: [number, number, number] = isLow ? [234, 88, 12] : [220, 38, 38];
          const valueText = clean(`${lab.value} ${lab.unit || ''}`);
          const rangeText = lab.referenceRange ? clean(`Normal: ${lab.referenceRange}`) : '';

          pdf.setFontSize(9);
          const rangeLines = rangeText ? pdf.splitTextToSize(rangeText, contentWidth - 10) : [];
          const sigLines = lab.significance ? pdf.splitTextToSize(clean(lab.significance), contentWidth - 10) : [];
          const blockHeight = 7 + rangeLines.length * 4.2 + sigLines.length * 4.6 + 3;
          ensure(blockHeight);

          pdf.setFillColor(...tagColor);
          pdf.rect(margin, y - 4, 1.2, blockHeight - 2, 'F');

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.text(clean(lab.name), margin + 4, y);
          pdf.setTextColor(...tagColor);
          pdf.text(`${valueText}  ${tag}`, margin + contentWidth, y, { align: 'right' });
          pdf.setTextColor(0, 0, 0);
          y += 5;

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(100, 116, 139);
          rangeLines.forEach((line: string) => {
            pdf.text(line, margin + 4, y);
            y += 4.2;
          });
          pdf.setTextColor(30, 41, 59);
          sigLines.forEach((line: string) => {
            pdf.text(line, margin + 4, y);
            y += 4.6;
          });
          pdf.setTextColor(0, 0, 0);
          y += 3;
        });

        if (panel.interpretation) {
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(9.5);
          const lines = pdf.splitTextToSize(clean(panel.interpretation), contentWidth - 4);
          lines.forEach((line: string) => {
            ensure(5);
            pdf.text(line, margin + 4, y);
            y += 4.8;
          });
          y += 3;
        }
      });
    }

    // ---- Body systems (one compact line each) ----
    const systems = Object.entries(data.healthScoreBreakdown?.systemScores || {}) as [string, any][];
    if (systems.length) {
      heading('How each body system looks');
      const barX = margin + 45;
      const barW = contentWidth - 60;
      systems.forEach(([key, sys]) => {
        ensure(7);
        const s = Math.max(0, Math.min(100, Number(sys?.score) || 0));
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.text(SYSTEM_LABELS[key] || key, margin, y);
        pdf.setFillColor(226, 232, 240);
        pdf.roundedRect(barX, y - 3, barW, 3.5, 1, 1, 'F');
        pdf.setFillColor(...scoreColor(s));
        pdf.roundedRect(barX, y - 3, (barW * s) / 100, 3.5, 1, 1, 'F');
        pdf.text(`${s}`, margin + contentWidth, y, { align: 'right' });
        y += 7;
      });
    }

    // ---- Next steps ----
    const ns = data.nextSteps || {};
    const groups: [string, string[] | undefined][] = [
      ['See a doctor', ns.consultation],
      ['Tests to get', ns.investigation],
      ['Daily habits', ns.lifestyle],
    ];
    const hasGroups = groups.some(([, items]) => items && items.length);
    if (hasGroups || (ns.flat && ns.flat.length)) {
      heading('What to do next');
      if (hasGroups) {
        groups.forEach(([label, items]) => {
          if (!items || !items.length) return;
          ensure(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.text(label, margin, y);
          y += 5.5;
          bullets(items);
          y += 1;
        });
      } else {
        bullets(ns.flat || [], true);
      }
    }

    // ---- Footer on every page ----
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        'For information only - not a diagnosis. Please discuss your results with a doctor.',
        margin,
        pageHeight - 8,
      );
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    const safeName = (p.name && p.name !== 'Not Available' ? p.name : 'Patient').replace(/[\\/:*?"<>|]+/g, '').trim() || 'Patient';
    const fileName = `${safeName}.Diagassist.Report.pdf`;
    pdf.save(fileName);
    const pdfBase64 = pdf.output('datauristring').split(',')[1];

    toast.success('Report downloaded');
    return { success: true, pdfBase64, fileName };
  } catch (error) {
    console.error('Error generating report PDF:', error);
    toast.error('Failed to generate the report PDF');
    return { success: false, pdfBase64: null, fileName: null };
  }
}
