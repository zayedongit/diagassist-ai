import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface TextExtractionResult {
  success: boolean;
  text?: string;
  isSelectableText: boolean;
  pagesAnalyzed: number;
  error?: string;
  avgCharsPerPage?: number;
}

/**
 * Extracts text from PDF using PDF.js
 * Fast path for PDFs with selectable text (non-scanned)
 */
export async function extractPdfText(file: File): Promise<TextExtractionResult> {
  try {
    console.log('🔍 Starting fast text extraction from PDF...');
    
    const arrayBuffer = await file.arrayBuffer();
    
    let pdf;
    try {
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: false,
      });
      pdf = await loadingTask.promise;
    } catch (workerError) {
      console.warn('Worker failed, trying without worker:', workerError);
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      const fallbackTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: false,
      });
      pdf = await fallbackTask.promise;
    }
    
    const totalPages = pdf.numPages;
    console.log(`📄 PDF has ${totalPages} pages`);
    
    const textPages: string[] = [];
    let totalChars = 0;
    
    // Process pages with concurrency of 3-4 for speed
    const concurrency = 3;
    for (let i = 0; i < totalPages; i += concurrency) {
      const pagePromises = [];
      
      for (let j = 0; j < concurrency && (i + j) < totalPages; j++) {
        const pageNum = i + j + 1;
        pagePromises.push(
          (async () => {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Extract text items and join them
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            
            page.cleanup();
            
            return { pageNum, pageText };
          })()
        );
      }
      
      const results = await Promise.all(pagePromises);
      
      // Add results in correct order
      for (const result of results.sort((a, b) => a.pageNum - b.pageNum)) {
        textPages.push(result.pageText);
        totalChars += result.pageText.length;
      }
      
      console.log(`📝 Extracted text from pages ${i + 1}-${Math.min(i + concurrency, totalPages)}`);
    }
    
    const fullText = textPages.join('\n\n--- Page Break ---\n\n');
    const avgCharsPerPage = totalChars / totalPages;
    
    // Determine if this is selectable text or scanned
    // Medical reports typically have >200 chars per page if text is selectable
    const isSelectableText = avgCharsPerPage > 200 && totalChars > 1000;
    
    console.log(`✅ Text extraction complete:`);
    console.log(`   Total characters: ${totalChars}`);
    console.log(`   Avg chars/page: ${Math.round(avgCharsPerPage)}`);
    console.log(`   Selectable text: ${isSelectableText ? 'YES' : 'NO (likely scanned)'}`);
    
    return {
      success: true,
      text: fullText,
      isSelectableText,
      pagesAnalyzed: totalPages,
      avgCharsPerPage
    };
    
  } catch (error) {
    console.error('Text extraction error:', error);
    return {
      success: false,
      isSelectableText: false,
      pagesAnalyzed: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
