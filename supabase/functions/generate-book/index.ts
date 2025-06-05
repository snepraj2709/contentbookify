
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { book } = await req.json();
    
    if (!book) {
      throw new Error('Book data is required');
    }

    console.log('Generating book:', book.title, 'Format:', book.format);

    // Create book content based on format
    let bookContent = '';
    let mimeType = '';
    let fileExtension = '';

    if (book.format === 'PDF') {
      // Generate PDF-like content (in a real implementation, you'd use a PDF library)
      bookContent = generatePDFContent(book);
      mimeType = 'application/pdf';
      fileExtension = 'pdf';
    } else if (book.format === 'EPUB') {
      // Generate EPUB-like content (in a real implementation, you'd use an EPUB library)
      bookContent = generateEPUBContent(book);
      mimeType = 'application/epub+zip';
      fileExtension = 'epub';
    }

    // Convert content to base64 for download
    const encoder = new TextEncoder();
    const data = encoder.encode(bookContent);
    const base64Content = btoa(String.fromCharCode(...data));

    return new Response(
      JSON.stringify({
        success: true,
        fileName: `${book.title.replace(/\s+/g, '-').toLowerCase()}.${fileExtension}`,
        content: base64Content,
        mimeType: mimeType
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating book:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generatePDFContent(book: any): string {
  // This is a simplified text representation of what would be PDF content
  // In a real implementation, you'd use libraries like jsPDF or Puppeteer
  return `%PDF-1.4
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
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length ${book.title.length + book.author.length + 100}
>>
stream
BT
/F1 24 Tf
100 700 Td
(${book.title}) Tj
0 -30 Td
/F1 16 Tf
(by ${book.author}) Tj
0 -50 Td
/F1 12 Tf
${book.chapters.map((chapter: any, index: number) => 
  `0 -20 Td (${index + 1}. ${chapter.title}) Tj`
).join('\n')}
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${500 + book.chapters.length * 50}
%%EOF`;
}

function generateEPUBContent(book: any): string {
  // This is a simplified text representation of what would be EPUB content
  // In a real implementation, you'd create a proper EPUB structure with ZIP
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${book.title}</dc:title>
    <dc:creator>${book.author}</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="uid">${Date.now()}</dc:identifier>
  </metadata>
  
  <manifest>
    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    ${book.chapters.map((chapter: any, index: number) => 
      `<item id="chapter${index + 1}" href="chapter${index + 1}.xhtml" media-type="application/xhtml+xml"/>`
    ).join('\n    ')}
  </manifest>
  
  <spine>
    ${book.chapters.map((chapter: any, index: number) => 
      `<itemref idref="chapter${index + 1}"/>`
    ).join('\n    ')}
  </spine>
</package>

<!-- Table of Contents -->
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${book.title}</title>
</head>
<body>
  <h1>${book.title}</h1>
  <h2>by ${book.author}</h2>
  <nav>
    <ol>
      ${book.chapters.map((chapter: any, index: number) => 
        `<li><a href="chapter${index + 1}.xhtml">${chapter.title}</a></li>`
      ).join('\n      ')}
    </ol>
  </nav>
</body>
</html>

<!-- Chapters -->
${book.chapters.map((chapter: any, index: number) => `
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${chapter.title}</title>
</head>
<body>
  <h1>${chapter.title}</h1>
  <p>${chapter.description}</p>
  ${chapter.content ? `<div>${chapter.content}</div>` : ''}
</body>
</html>
`).join('\n')}`;
}
