import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessedFile {
  drive_file_id: string;
  filename: string;
  status: string;
  analysis_id?: string;
  error_message?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Google Drive Ingest function called');

    // Get Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get Google API credentials
    const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const serviceAccountPrivateKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');

    if (!serviceAccountEmail || !serviceAccountPrivateKey) {
      throw new Error('Missing Google service account credentials');
    }

    console.log('📧 Service account email configured:', serviceAccountEmail);

    // Parse the request body to get folder IDs
    const { sourceFolderId, destinationFolderId } = await req.json();

    if (!sourceFolderId || !destinationFolderId) {
      return new Response(
        JSON.stringify({ error: 'Source and destination folder IDs are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📁 Processing files from folder:', sourceFolderId);
    console.log('📁 Destination folder:', destinationFolderId);

    // Create JWT for Google API authentication
    const jwt = await createGoogleJWT(serviceAccountEmail, serviceAccountPrivateKey);
    console.log('🔐 Google JWT created successfully');

    // Get access token
    const accessToken = await getGoogleAccessToken(jwt);
    console.log('🎫 Google access token obtained');

    // Get list of PDF files from source folder
    const files = await listPDFFiles(accessToken, sourceFolderId);
    console.log(`📄 Found ${files.length} PDF files in source folder`);

    const results: ProcessedFile[] = [];

    // Process each file
    for (const file of files) {
      console.log(`📋 Processing file: ${file.name} (ID: ${file.id})`);

      try {
        // Check if already processed
        const { data: existingRecord } = await supabase
          .from('google_drive_processed_files')
          .select('*')
          .eq('drive_file_id', file.id)
          .single();

        if (existingRecord) {
          console.log(`⏭️ File ${file.name} already processed, skipping`);
          results.push({
            drive_file_id: file.id,
            filename: file.name,
            status: 'already_processed'
          });
          continue;
        }

        // Create tracking record
        const { data: trackingRecord, error: trackingError } = await supabase
          .from('google_drive_processed_files')
          .insert({
            drive_file_id: file.id,
            filename: file.name,
            status: 'processing'
          })
          .select()
          .single();

        if (trackingError) {
          throw new Error(`Failed to create tracking record: ${trackingError.message}`);
        }

        console.log(`📝 Created tracking record for ${file.name}`);

        // Download PDF file
        const pdfContent = await downloadFile(accessToken, file.id);
        const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfContent)));

        console.log(`⬇️ Downloaded ${file.name}, size: ${pdfContent.byteLength} bytes`);

        // Process PDF through existing analysis function
        const analysisResult = await supabase.functions.invoke('process-pdf-report', {
          body: {
            pdfBase64,
            filename: file.name
          }
        });

        if (analysisResult.error) {
          throw new Error(`PDF analysis failed: ${analysisResult.error.message}`);
        }

        console.log(`🧪 Analysis completed for ${file.name}`);

        // Generate summary document and upload to destination folder
        let destinationFileId = null;
        try {
          const summary = generateAnalysisSummary(analysisResult.data.result);
          
          // Create Google Doc with summary
          const docId = await createGoogleDoc(accessToken, `Analysis_${file.name.replace('.pdf', '')}`, summary);
          console.log(`📝 Created Google Doc: ${docId}`);
          
          // Export as PDF and upload to destination folder
          destinationFileId = await exportDocAsPdfToFolder(accessToken, docId, destinationFolderId, `Analysis_${file.name}`);
          console.log(`📄 Uploaded analysis PDF to destination: ${destinationFileId}`);
          
          // Clean up the temporary doc
          await deleteGoogleDoc(accessToken, docId);
          
        } catch (summaryError) {
          console.warn(`⚠️ Failed to create summary document: ${summaryError.message}`);
          // Continue with basic tracking - don't fail the whole process
        }

        // Update tracking record with analysis ID and destination file
        await supabase
          .from('google_drive_processed_files')
          .update({
            status: 'completed',
            analysis_id: analysisResult.data.analysisId,
            destination_file_id: destinationFileId
          })
          .eq('id', trackingRecord.id);
        
        results.push({
          drive_file_id: file.id,
          filename: file.name,
          status: 'completed',
          analysis_id: analysisResult.data.analysisId
        });

        console.log(`✅ Successfully processed ${file.name}`);

      } catch (error) {
        console.error(`❌ Error processing ${file.name}:`, error);

        // Update tracking record with error
        await supabase
          .from('google_drive_processed_files')
          .update({
            status: 'error',
            error_message: error.message
          })
          .eq('drive_file_id', file.id);

        results.push({
          drive_file_id: file.id,
          filename: file.name,
          status: 'error',
          error_message: error.message
        });
      }
    }

    console.log(`🎉 Batch processing complete. Processed ${results.length} files`);

    return new Response(
      JSON.stringify({
        message: 'Google Drive ingest completed',
        results,
        summary: {
          total: results.length,
          completed: results.filter(r => r.status === 'completed').length,
          errors: results.filter(r => r.status === 'error').length,
          skipped: results.filter(r => r.status === 'already_processed').length
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Google Drive Ingest error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper functions for Google API authentication and operations
async function createGoogleJWT(email: string, privateKey: string): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  // Clean up the private key
  const cleanPrivateKey = privateKey
    .replace(/\\n/g, '\n')
    .replace(/^"/, '')
    .replace(/"$/, '');

  const key = await crypto.subtle.importKey(
    'pkcs8',
    new TextEncoder().encode(cleanPrivateKey),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${signatureInput}.${encodedSignature}`;
}

async function getGoogleAccessToken(jwt: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function listPDFFiles(accessToken: string, folderId: string) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/pdf'&fields=files(id,name,mimeType)`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list files: ${error}`);
  }

  const data = await response.json();
  return data.files || [];
}

async function downloadFile(accessToken: string, fileId: string): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to download file: ${error}`);
  }

  return response.arrayBuffer();
}

// Generate analysis summary text
function generateAnalysisSummary(analysisResult: any): string {
  if (!analysisResult) return 'No analysis data available.';
  
  let summary = `# Medical Report Analysis Summary\n\n`;
  
  // Demographics
  if (analysisResult.demographics) {
    const demo = analysisResult.demographics;
    summary += `## Patient Information\n`;
    if (demo.name) summary += `- **Name:** ${demo.name}\n`;
    if (demo.age) summary += `- **Age:** ${demo.age}\n`;
    if (demo.gender) summary += `- **Gender:** ${demo.gender}\n`;
    if (demo.reportDate) summary += `- **Report Date:** ${demo.reportDate}\n\n`;
  }
  
  // Key findings
  if (analysisResult.medicalPanels && analysisResult.medicalPanels.length > 0) {
    summary += `## Laboratory Results\n\n`;
    
    analysisResult.medicalPanels.forEach((panel: any) => {
      if (panel.name) {
        summary += `### ${panel.name}\n`;
        
        if (panel.labValues && panel.labValues.length > 0) {
          panel.labValues.forEach((lab: any) => {
            const status = lab.status || 'Normal';
            const statusIcon = status === 'High' ? '⬆️' : status === 'Low' ? '⬇️' : '✅';
            
            summary += `- **${lab.parameter}:** ${lab.value} ${lab.unit || ''} ${statusIcon} ${status}\n`;
            if (lab.referenceRange) {
              summary += `  - *Reference Range: ${lab.referenceRange}*\n`;
            }
          });
        }
        summary += `\n`;
      }
    });
  }
  
  // Health insights
  if (analysisResult.healthInsights && analysisResult.healthInsights.length > 0) {
    summary += `## Health Insights\n\n`;
    analysisResult.healthInsights.forEach((insight: string, index: number) => {
      summary += `${index + 1}. ${insight}\n`;
    });
    summary += `\n`;
  }
  
  // Recommendations
  if (analysisResult.recommendations && analysisResult.recommendations.length > 0) {
    summary += `## Recommendations\n\n`;
    analysisResult.recommendations.forEach((rec: string, index: number) => {
      summary += `${index + 1}. ${rec}\n`;
    });
    summary += `\n`;
  }
  
  // Lifestyle recommendations
  if (analysisResult.lifestyle && analysisResult.lifestyle.length > 0) {
    summary += `## Lifestyle Recommendations\n\n`;
    analysisResult.lifestyle.forEach((lifestyle: string, index: number) => {
      summary += `${index + 1}. ${lifestyle}\n`;
    });
    summary += `\n`;
  }
  
  summary += `\n---\n*Analysis generated by PREDLABS Medical Analytics AI on ${new Date().toISOString().split('T')[0]}*\n`;
  
  return summary;
}

// Create Google Doc with content
async function createGoogleDoc(accessToken: string, title: string, content: string): Promise<string> {
  // Create a new document
  const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: title
    })
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create document: ${error}`);
  }

  const doc = await createResponse.json();
  const documentId = doc.documentId;

  // Add content to the document
  const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [{
        insertText: {
          location: { index: 1 },
          text: content
        }
      }]
    })
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`Failed to update document content: ${error}`);
  }

  return documentId;
}

// Export Google Doc as PDF and upload to destination folder
async function exportDocAsPdfToFolder(accessToken: string, docId: string, folderId: string, filename: string): Promise<string> {
  // Export document as PDF
  const exportResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:export?mimeType=application/pdf`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!exportResponse.ok) {
    const error = await exportResponse.text();
    throw new Error(`Failed to export document as PDF: ${error}`);
  }

  const pdfBuffer = await exportResponse.arrayBuffer();
  
  // Upload PDF to destination folder
  const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'multipart/related; boundary="boundary123"'
    },
    body: [
      '--boundary123',
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify({
        name: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
        parents: [folderId],
        mimeType: 'application/pdf'
      }),
      '--boundary123',
      'Content-Type: application/pdf',
      '',
      String.fromCharCode(...new Uint8Array(pdfBuffer)),
      '--boundary123--'
    ].join('\r\n')
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Failed to upload PDF: ${error}`);
  }

  const uploadResult = await uploadResponse.json();
  return uploadResult.id;
}

// Clean up temporary Google Doc
async function deleteGoogleDoc(accessToken: string, docId: string): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.text();
    console.warn(`Failed to delete temporary document: ${error}`);
    // Don't throw - this is cleanup, not critical
  }
}