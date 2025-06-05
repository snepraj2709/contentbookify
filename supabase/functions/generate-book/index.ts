
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch content for each chapter
    const chaptersWithContent = await Promise.all(
      book.chapters.map(async (chapter: any) => {
        try {
          console.log(`Fetching content for chapter: ${chapter.title}`);
          
          // Call the fetch-article function to get the content
          const { data, error } = await supabase.functions.invoke('fetch-article', {
            body: { url: chapter.url }
          });
          
          if (error) {
            console.error(`Error fetching content for ${chapter.url}:`, error);
            return {
              ...chapter,
              content: `<p>Content could not be fetched for this chapter. URL: ${chapter.url}</p>`
            };
          }
          
          if (!data.success) {
            console.error(`Failed to fetch content for ${chapter.url}:`, data.error);
            return {
              ...chapter,
              content: `<p>Content could not be fetched for this chapter. URL: ${chapter.url}</p>`
            };
          }
          
          return {
            ...chapter,
            content: data.content || '<p>No content available</p>',
            media: data.media || []
          };
          
        } catch (fetchError) {
          console.error(`Exception fetching content for ${chapter.url}:`, fetchError);
          return {
            ...chapter,
            content: `<p>Content could not be fetched for this chapter. URL: ${chapter.url}</p>`
          };
        }
      })
    );

    // Create book content based on format
    let bookContent = '';
    let mimeType = '';
    let fileExtension = '';

    if (book.format === 'PDF') {
      bookContent = generatePDFContent({ ...book, chapters: chaptersWithContent });
      mimeType = 'application/pdf';
      fileExtension = 'pdf';
    } else if (book.format === 'EPUB') {
      bookContent = generateEPUBContent({ ...book, chapters: chaptersWithContent });
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
  // Calculate total content length for proper PDF structure
  let totalContentLength = 0;
  let processedChapters = '';
  
  book.chapters.forEach((chapter: any, index: number) => {
    const chapterNum = index + 1;
    
    // Convert HTML content to plain text for PDF
    const plainTextContent = chapter.content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/&nbsp;/g, ' ') // Replace HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    
    // Calculate lines needed for content (approximately 80 characters per line)
    const contentLines = Math.ceil(plainTextContent.length / 80);
    const linesPerPage = 35; // Approximate lines per page
    const pagesNeeded = Math.ceil((contentLines + 5) / linesPerPage); // +5 for title and spacing
    
    totalContentLength += plainTextContent.length + 500; // Add space for formatting
    
    // Format chapter content with proper spacing
    processedChapters += `
    % Chapter ${chapterNum} - New Page
    q
    1 0 0 1 50 ${750 - (pagesNeeded > 1 ? 0 : 0)} cm
    BT
    /F1 20 Tf
    0 0 0 rg
    (Chapter ${chapterNum}: ${chapter.title.replace(/[()\\]/g, '\\$&')}) Tj
    0 -40 Td
    /F1 12 Tf
    0.2 0.2 0.2 rg
`;
    
    // Split content into manageable chunks for proper PDF formatting
    const contentChunks = plainTextContent.match(/.{1,80}/g) || [];
    let currentY = -60;
    let currentPage = 1;
    
    contentChunks.forEach((chunk: string, chunkIndex: number) => {
      // Check if we need a new page (approximately 35 lines per page)
      if (currentY <= -650 && chunkIndex < contentChunks.length - 1) {
        processedChapters += `
        ET
        Q
        showpage
        % New page for continuing content
        q
        1 0 0 1 50 750 cm
        BT
        /F1 12 Tf
        0.2 0.2 0.2 rg
`;
        currentY = -20;
        currentPage++;
      }
      
      processedChapters += `    0 ${currentY} Td (${chunk.replace(/[()\\]/g, '\\$&')}) Tj\n`;
      currentY -= 15;
    });
    
    processedChapters += `
    ET
    Q
    showpage
`;
  });

  // Create proper PDF structure with multiple pages
  const pdfHeader = `%PDF-1.4
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
/Resources <<
  /Font <<
    /F1 5 0 R
  >>
>>
>>
endobj

4 0 obj
<<
/Length ${totalContentLength + 2000}
>>
stream
q
1 0 0 1 50 750 cm
BT
/F1 28 Tf
0 0 0 rg
(${book.title.replace(/[()\\]/g, '\\$&')}) Tj
0 -50 Td
/F1 18 Tf
0.3 0.3 0.3 rg
(by ${book.author.replace(/[()\\]/g, '\\$&')}) Tj
0 -80 Td
/F1 14 Tf
0.5 0.5 0.5 rg
(Generated Book - ${book.chapters.length} Chapters) Tj
ET
Q
showpage

${processedChapters}

endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000300 00000 n 
0000${String(totalContentLength + 2500).padStart(10, '0')} 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${totalContentLength + 2600}
%%EOF`;

  return pdfHeader;
}

function generateEPUBContent(book: any): string {
  // Generate EPUB with proper HTML content structure
  let tocEntries = '';
  let manifestEntries = '';
  let spineEntries = '';
  let chaptersHtml = '';

  book.chapters.forEach((chapter: any, index: number) => {
    const chapterNum = index + 1;
    tocEntries += `      <li><a href="chapter${chapterNum}.xhtml">Chapter ${chapterNum}: ${chapter.title}</a></li>\n`;
    manifestEntries += `    <item id="chapter${chapterNum}" href="chapter${chapterNum}.xhtml" media-type="application/xhtml+xml"/>\n`;
    spineEntries += `    <itemref idref="chapter${chapterNum}"/>\n`;
    
    // Create chapter HTML with proper formatting
    chaptersHtml += `
<!-- Chapter ${chapterNum} -->
<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Chapter ${chapterNum}: ${chapter.title}</title>
  <style>
    body { 
      font-family: serif; 
      line-height: 1.6; 
      margin: 2em;
      page-break-before: always;
    }
    h1 { 
      color: #333; 
      border-bottom: 2px solid #333; 
      padding-bottom: 0.5em;
      page-break-after: avoid;
      margin-bottom: 1.5em;
    }
    p { 
      margin: 1em 0; 
      text-align: justify;
    }
    .chapter-number {
      font-size: 0.8em;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 0.5em;
    }
  </style>
</head>
<body>
  <div class="chapter-number">Chapter ${chapterNum}</div>
  <h1>${chapter.title}</h1>
  
  <div class="chapter-content">
    ${formatContentForEPUB(chapter.content)}
  </div>
  
  ${chapter.media && chapter.media.length > 0 ? `
  <div class="chapter-media">
    <h3>Media</h3>
    ${chapter.media.map((media: any) => {
      if (media.type === 'image') {
        return `<img src="${media.url}" alt="${media.alt || ''}" style="max-width: 100%; height: auto; margin: 1em 0;" />`;
      }
      return '';
    }).join('')}
  </div>
  ` : ''}
</body>
</html>
`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${book.title}</dc:title>
    <dc:creator>${book.author}</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="uid">${Date.now()}</dc:identifier>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
  </metadata>
  
  <manifest>
    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
${manifestEntries}  </manifest>
  
  <spine>
${spineEntries}  </spine>
</package>

<!-- Table of Contents -->
<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${book.title} - Table of Contents</title>
  <style>
    body { 
      font-family: serif; 
      margin: 2em;
    }
    h1 { 
      color: #333; 
      text-align: center;
    }
    h2 {
      color: #666;
      text-align: center;
      font-style: italic;
    }
    nav ol { 
      list-style: none; 
      padding: 0;
    }
    nav li { 
      margin: 1em 0; 
      padding: 0.5em;
      border-bottom: 1px dotted #ccc;
    }
    nav a { 
      text-decoration: none; 
      color: #333;
    }
    nav a:hover { 
      color: #666; 
    }
  </style>
</head>
<body>
  <h1>${book.title}</h1>
  <h2>by ${book.author}</h2>
  <nav epub:type="toc">
    <ol>
${tocEntries}    </ol>
  </nav>
</body>
</html>

${chaptersHtml}`;
}

function formatContentForEPUB(content: string): string {
  // Clean and format HTML content for EPUB
  return content
    .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove scripts
    .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove inline styles
    .replace(/style="[^"]*"/gi, '') // Remove style attributes
    .replace(/<(div|span)([^>]*)>/gi, '<p$2>') // Convert divs/spans to paragraphs
    .replace(/<\/(div|span)>/gi, '</p>') // Close paragraph tags
    .replace(/<p[^>]*>\s*<\/p>/gi, '') // Remove empty paragraphs
    .replace(/\n\s*\n/g, '</p>\n<p>') // Convert double line breaks to paragraph breaks
    .replace(/^/, '<p>') // Add opening paragraph
    .replace(/$/, '</p>') // Add closing paragraph
    .trim();
}
