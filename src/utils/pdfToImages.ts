import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ConversionResult {
  success: boolean;
  images?: string[];
  error?: string;
  wasCompressed?: boolean;
  originalSizeMB?: number;
  finalSizeMB?: number;
}

export async function convertPdfToImages(
  file: File, 
  onProgress?: (message: string) => void
): Promise<ConversionResult> {
  try {
    console.log('Starting PDF to image conversion...');
    console.log('Worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    
    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    let pdf;
    try {
      // Load PDF document with worker
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: false,
      });
      
      pdf = await loadingTask.promise;
    } catch (workerError) {
      console.warn('Worker failed, trying without worker:', workerError);
      
      // Fallback: disable worker entirely
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      
      const fallbackTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: false,
      });
      
      pdf = await fallbackTask.promise;
      console.log('No-worker fallback successful');
    }
    
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    const images: string[] = [];
    const totalPages = pdf.numPages;
    
    // Adaptive scaling and compression based on page count for optimal performance
    let scale: number;
    let quality: number;
    let maxWidth: number = 1200;
    
    if (totalPages <= 10) {
      scale = 1.25;
      quality = 0.65;
    } else if (totalPages <= 25) {
      scale = 1.1;  
      quality = 0.55;
    } else {
      scale = 0.95;
      quality = 0.5;
    }
    
    console.log(`Converting all ${totalPages} pages with scale=${scale}, quality=${quality}`);
    
    // Process pages with concurrency of 2 to keep UI responsive
    const concurrency = 2;
    for (let i = 0; i < totalPages; i += concurrency) {
      const pagePromises = [];
      
      for (let j = 0; j < concurrency && (i + j) < totalPages; j++) {
        const pageNum = i + j + 1;
        pagePromises.push(
          (async () => {
            console.log(`Converting page ${pageNum}/${totalPages}`);
            
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            
            // Create canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (!context) {
              throw new Error('Could not get canvas context');
            }
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Render page to canvas
            const renderContext = {
              canvasContext: context,
              viewport: viewport,
              canvas: canvas,
            };
            
            await page.render(renderContext).promise;
            
            // Downscale canvas if needed to keep image size manageable
            let finalCanvas = canvas;
            if (canvas.width > maxWidth) {
              const aspectRatio = canvas.height / canvas.width;
              const newHeight = maxWidth * aspectRatio;
              
              finalCanvas = document.createElement('canvas');
              const finalContext = finalCanvas.getContext('2d');
              if (!finalContext) {
                throw new Error('Could not get final canvas context');
              }
              
              finalCanvas.width = maxWidth;
              finalCanvas.height = newHeight;
              finalContext.drawImage(canvas, 0, 0, maxWidth, newHeight);
            }
            
            // Convert to base64 with adaptive compression
            const imageData = finalCanvas.toDataURL('image/jpeg', quality);
            
            console.log(`Page ${pageNum} converted successfully (${Math.round(imageData.length / 1024)}KB)`);
            
            // Clean up
            page.cleanup();
            
            return { pageNum, imageData };
          })()
        );
      }
      
      // Wait for current batch to complete
      const results = await Promise.all(pagePromises);
      
      // Add results in correct order
      for (const result of results.sort((a, b) => a.pageNum - b.pageNum)) {
        images.push(result.imageData);
      }
    }
    
    console.log(`PDF conversion completed: ${images.length} images`);
    
    // Calculate total payload size
    const totalSizeBytes = images.reduce((sum, img) => sum + img.length, 0);
    const totalSizeMB = totalSizeBytes / (1024 * 1024);
    console.log(`📊 Total payload size: ${totalSizeMB.toFixed(2)}MB`);
    
    // If payload exceeds 7MB, recompress images
    const MAX_PAYLOAD_MB = 7;
    let wasCompressed = false;
    let finalImages = images;
    
    if (totalSizeMB > MAX_PAYLOAD_MB) {
      console.log(`⚠️ Payload too large (${totalSizeMB.toFixed(2)}MB), recompressing...`);
      onProgress?.(`Compressing images (${totalSizeMB.toFixed(1)}MB → target: ${MAX_PAYLOAD_MB}MB)...`);
      
      // Calculate target quality to achieve desired size
      const targetQuality = Math.max(0.3, (MAX_PAYLOAD_MB / totalSizeMB) * quality * 0.9);
      console.log(`🔄 Recompressing with quality ${targetQuality.toFixed(2)}`);
      
      finalImages = [];
      for (let i = 0; i < images.length; i++) {
        // Create image from base64
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = images[i];
        });
        
        // Redraw with lower quality
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const compressed = canvas.toDataURL('image/jpeg', targetQuality);
        finalImages.push(compressed);
        
        if ((i + 1) % 5 === 0 || i === images.length - 1) {
          const currentSize = finalImages.reduce((sum, img) => sum + img.length, 0) / (1024 * 1024);
          onProgress?.(`Compressing images... ${i + 1}/${images.length} (${currentSize.toFixed(1)}MB)`);
        }
      }
      
      wasCompressed = true;
      const finalSizeBytes = finalImages.reduce((sum, img) => sum + img.length, 0);
      const finalSizeMB = finalSizeBytes / (1024 * 1024);
      console.log(`✅ Compression complete: ${totalSizeMB.toFixed(2)}MB → ${finalSizeMB.toFixed(2)}MB`);
      
      return { 
        success: true, 
        images: finalImages,
        wasCompressed,
        originalSizeMB: totalSizeMB,
        finalSizeMB
      };
    }
    
    return { 
      success: true, 
      images: finalImages,
      originalSizeMB: totalSizeMB,
      finalSizeMB: totalSizeMB
    };
    
  } catch (error) {
    console.error('PDF conversion error:', error);
    let errorMessage = 'Failed to convert PDF to images';
    
    if (error instanceof Error) {
      if (error.message.includes('worker')) {
        errorMessage = 'PDF worker failed to load. Please try again or use a different PDF.';
      } else if (error.message.includes('Invalid PDF')) {
        errorMessage = 'The uploaded file is not a valid PDF or may be corrupted.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}