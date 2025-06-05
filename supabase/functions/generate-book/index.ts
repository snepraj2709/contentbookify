
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
  // Create a simple HTML-to-PDF conversion for better text handling
  let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${book.title}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px;
            color: #333;
        }
        .title-page {
            text-align: center;
            margin-bottom: 60px;
            page-break-after: always;
        }
        .book-title { 
            font-size: 36px; 
            font-weight: bold; 
            margin-bottom: 20px;
            color: #2c3e50;
        }
        .book-author { 
            font-size: 24px; 
            color: #7f8c8d; 
            margin-bottom: 10px;
        }
        .book-info { 
            font-size: 16px; 
            color: #95a5a6; 
        }
        .chapter {
            page-break-before: always;
            margin-bottom: 40px;
        }
        .chapter-title {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 30px;
            padding-bottom: 10px;
            border-bottom: 3px solid #3498db;
        }
        .chapter-content {
            font-size: 14px;
            line-height: 1.8;
            text-align: justify;
            margin-top: 20px;
        }
        .chapter-content p {
            margin-bottom: 15px;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 25px;
            margin-bottom: 15px;
        }
        @page {
            margin: 1in;
        }
    </style>
</head>
<body>
    <div class="title-page">
        <div class="book-title">${escapeHtml(book.title)}</div>
        <div class="book-author">by ${escapeHtml(book.author)}</div>
        <div class="book-info">Generated Book - ${book.chapters.length} Chapters</div>
    </div>
`;

  // Add each chapter
  book.chapters.forEach((chapter: any, index: number) => {
    const chapterNum = index + 1;
    const cleanContent = cleanHtmlContent(chapter.content);
    
    htmlContent += `
    <div class="chapter">
        <div class="chapter-title">Chapter ${chapterNum}: ${escapeHtml(chapter.title)}</div>
        <div class="chapter-content">
            ${cleanContent}
        </div>
    </div>
`;
  });

  htmlContent += `
</body>
</html>`;

  return htmlContent;
}

function generateEPUBContent(book: any): string {
  // Generate EPUB with proper HTML content structure
  let tocEntries = '';
  let manifestEntries = '';
  let spineEntries = '';
  let chaptersHtml = '';

  book.chapters.forEach((chapter: any, index: number) => {
    const chapterNum = index + 1;
    tocEntries += `      <li><a href="chapter${chapterNum}.xhtml">Chapter ${chapterNum}: ${escapeHtml(chapter.title)}</a></li>\n`;
    manifestEntries += `    <item id="chapter${chapterNum}" href="chapter${chapterNum}.xhtml" media-type="application/xhtml+xml"/>\n`;
    spineEntries += `    <itemref idref="chapter${chapterNum}"/>\n`;
    
    // Create chapter HTML with proper formatting
    chaptersHtml += `
<!-- Chapter ${chapterNum} -->
<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Chapter ${chapterNum}: ${escapeHtml(chapter.title)}</title>
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
  <h1>${escapeHtml(chapter.title)}</h1>
  
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
    <dc:title>${escapeHtml(book.title)}</dc:title>
    <dc:creator>${escapeHtml(book.author)}</dc:creator>
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
  <title>${escapeHtml(book.title)} - Table of Contents</title>
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
  <h1>${escapeHtml(book.title)}</h1>
  <h2>by ${escapeHtml(book.author)}</h2>
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
  return cleanHtmlContent(content);
}

function cleanHtmlContent(content: string): string {
  // Clean and sanitize HTML content
  return content
    .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove scripts
    .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove inline styles
    .replace(/style="[^"]*"/gi, '') // Remove style attributes
    .replace(/<(div|span)([^>]*)>/gi, '<p$2>') // Convert divs/spans to paragraphs
    .replace(/<\/(div|span)>/gi, '</p>') // Close paragraph tags
    .replace(/<p[^>]*>\s*<\/p>/gi, '') // Remove empty paragraphs
    .replace(/\n\s*\n/g, '</p>\n<p>') // Convert double line breaks to paragraph breaks
    .replace(/&nbsp;/g, ' ') // Replace HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
