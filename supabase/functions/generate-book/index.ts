
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
  // This is a simplified text representation of what would be PDF content
  // In a real implementation, you'd use libraries like jsPDF or Puppeteer
  let content = `%PDF-1.4
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
/Length ${calculateContentLength(book)}
>>
stream
BT
/F1 24 Tf
50 750 Td
(${book.title}) Tj
0 -30 Td
/F1 16 Tf
(by ${book.author}) Tj
0 -60 Td
`;

  // Add chapters with content
  book.chapters.forEach((chapter: any, index: number) => {
    content += `
0 -40 Td
/F1 18 Tf
(Chapter ${index + 1}: ${chapter.title}) Tj
0 -30 Td
/F1 12 Tf
`;
    
    // Convert HTML content to plain text for PDF (simplified)
    const plainTextContent = chapter.content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 2000); // Limit content length for PDF
    
    // Split content into lines for PDF formatting
    const lines = plainTextContent.match(/.{1,80}/g) || [];
    lines.forEach((line: string) => {
      content += `0 -15 Td (${line.replace(/[()\\]/g, '\\$&')}) Tj\n`;
    });
    
    // Add page break between chapters (simplified)
    if (index < book.chapters.length - 1) {
      content += `0 -100 Td (--- New Page ---) Tj\n`;
    }
  });

  content += `
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
${1000 + book.chapters.length * 100}
%%EOF`;

  return content;
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

function calculateContentLength(book: any): number {
  // Calculate approximate content length for PDF
  let length = book.title.length + book.author.length + 200;
  book.chapters.forEach((chapter: any) => {
    length += chapter.title.length + (chapter.content?.length || 0) + 100;
  });
  return length;
}
