
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts";

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
    const { url } = await req.json();
    
    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Fetching article from:', url);

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // Parse the HTML
    const document = new DOMParser().parseFromString(html, 'text/html');
    
    if (!document) {
      throw new Error('Failed to parse HTML');
    }

    // Extract content using various selectors
    let content = '';
    let title = '';
    
    // Try to extract title
    const titleElement = document.querySelector('title') || 
                        document.querySelector('h1') || 
                        document.querySelector('[class*="title"]') ||
                        document.querySelector('[id*="title"]');
    
    if (titleElement) {
      title = titleElement.textContent?.trim() || '';
    }

    // Try to extract main content using common article selectors
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.post-content',
      '.article-content',
      '.content',
      '.entry-content',
      '.post-body',
      '.article-body',
      'main p',
      '.story-body'
    ];

    let extractedContent = '';
    
    for (const selector of contentSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        for (const element of elements) {
          const text = element.textContent?.trim();
          if (text && text.length > extractedContent.length) {
            extractedContent = text;
          }
        }
        if (extractedContent.length > 200) break; // If we have substantial content, use it
      }
    }

    // Fallback: extract all paragraph text
    if (extractedContent.length < 200) {
      const paragraphs = document.querySelectorAll('p');
      extractedContent = Array.from(paragraphs)
        .map(p => p.textContent?.trim())
        .filter(text => text && text.length > 20)
        .join('\n\n');
    }

    // Clean up the content
    content = extractedContent
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n') // Clean up line breaks
      .trim();

    // Extract images
    const images = document.querySelectorAll('img');
    const media = Array.from(images)
      .map(img => {
        const src = img.getAttribute('src');
        const alt = img.getAttribute('alt') || '';
        
        if (src) {
          // Convert relative URLs to absolute
          let imageUrl = src;
          if (src.startsWith('/')) {
            const urlObj = new URL(url);
            imageUrl = `${urlObj.protocol}//${urlObj.host}${src}`;
          } else if (src.startsWith('./') || !src.includes('://')) {
            imageUrl = new URL(src, url).href;
          }
          
          return {
            type: 'image',
            url: imageUrl,
            alt: alt
          };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 5); // Limit to 5 images

    if (!content || content.length < 100) {
      throw new Error('Could not extract meaningful content from the article');
    }

    console.log(`Successfully extracted ${content.length} characters from ${url}`);

    return new Response(
      JSON.stringify({
        success: true,
        title: title || 'Untitled Article',
        content: content,
        media: media || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error fetching article:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
