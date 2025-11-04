const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

interface ProcessReportRequest {
  reportUrl: string;
  filename?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Processing single report');

    // Get Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse the request body
    const { reportUrl, filename = 'test-report.pdf' }: ProcessReportRequest = await req.json();

    console.log('📄 Processing report:', filename);
    
    // Add timeout for the request  
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    let pdfBase64: string;

    if (reportUrl && reportUrl !== 'https://example.com/sample-report.pdf') {
      // Try to download the PDF from the URL if it's a real URL
      console.log('⬇️ Downloading PDF from URL:', reportUrl);
      const pdfResponse = await fetch(reportUrl);
      
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();
      pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
      console.log(`✅ Downloaded PDF, size: ${pdfBuffer.byteLength} bytes`);
    } else {
      // Generate a test PDF with sample medical data
      console.log('📝 Generating test medical report PDF...');
      pdfBase64 = await generateTestMedicalPDF();
      console.log('✅ Generated test PDF successfully');
    }

    // Process PDF through direct API call
    console.log('🧪 Starting analysis...');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/process-pdf-report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'x-client-info': 'supabase-js-web/2.56.1'
      },
      body: JSON.stringify({
        pdfBase64,
        filename
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      throw new Error(`PDF analysis failed: ${analysisResponse.status} - ${errorText}`);
    }

    const analysisResult = await analysisResponse.json();

    console.log('✅ Analysis completed successfully');

    // Return the analysis result
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Report processed successfully',
        analysisId: analysisResult.analysisId,
        result: analysisResult.result,
        filename
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Process single report error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process report';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Generate a test medical PDF with sample data
async function generateTestMedicalPDF(): Promise<string> {
  // Create a simple PDF with medical report data
  const testPDFContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 800
>>
stream
BT
/F1 12 Tf
50 750 Td
(MEDICAL LABORATORY REPORT) Tj
0 -30 Td
(Patient: John Doe) Tj
0 -20 Td
(Age: 45 Years) Tj
0 -20 Td
(Date: 2024-01-15) Tj
0 -40 Td
(COMPLETE BLOOD COUNT:) Tj
0 -20 Td
(Hemoglobin: 14.2 g/dL (Normal: 13.5-17.5)) Tj
0 -15 Td
(RBC Count: 4.8 million/uL (Normal: 4.5-5.5)) Tj
0 -15 Td
(WBC Count: 7200 /uL (Normal: 4500-11000)) Tj
0 -15 Td
(Platelet Count: 250000 /uL (Normal: 150000-450000)) Tj
0 -30 Td
(LIPID PROFILE:) Tj
0 -20 Td
(Total Cholesterol: 220 mg/dL (Normal: <200)) Tj
0 -15 Td
(HDL Cholesterol: 45 mg/dL (Normal: >40)) Tj
0 -15 Td
(LDL Cholesterol: 140 mg/dL (Normal: <100)) Tj
0 -15 Td
(Triglycerides: 180 mg/dL (Normal: <150)) Tj
0 -30 Td
(LIVER FUNCTION:) Tj
0 -20 Td
(ALT: 35 U/L (Normal: 7-56)) Tj
0 -15 Td
(AST: 28 U/L (Normal: 10-40)) Tj
0 -15 Td
(Bilirubin Total: 1.0 mg/dL (Normal: 0.2-1.2)) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000245 00000 n 
0000000312 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
1165
%%EOF`;

  // Convert to base64
  const encoder = new TextEncoder();
  const pdfBytes = encoder.encode(testPDFContent);
  return btoa(String.fromCharCode(...pdfBytes));
}