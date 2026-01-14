import os
from dotenv import load_dotenv
from pathlib import Path
from newspaper import Article
import logging
from openai import OpenAI
import requests
import base64
import html

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Load the .env file two folders behind
dotenv_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path)

# Access the key
OPENAI_API_KEY = os.getenv("VITE_OPENAI_API_KEY")

# Initialize OpenAI Client
client = None
if OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)
else:
    logger.warning("VITE_OPENAI_API_KEY not found in environment variables.")

def generate_book_cover(prompt: str) -> str:
    """Generates a book cover image using OpenAI DALL-E 3 based on the prompt."""
    if not client:
        raise Exception("OpenAI client not initialized. check VITE_OPENAI_API_KEY.")
        
    try:
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )

        image_url = response.data[0].url
        return image_url
    except Exception as e:
        logger.error(f"Error generating book cover: {e}")
        # Fallback to placeholder if generation fails (e.g., content policy violation)
        return "https://placehold.co/600x400?text=Cover+Generation+Failed"

def fetch_article_content(url: str) -> dict:
    """Fetches article content using newspaper3k."""
    try:
        logger.info(f"Fetching article from: {url}")
        article = Article(url)
        article.download()
        article.parse()
        
        # Optional: Perform NLP to get keywords/summary if needed
        # article.nlp() 

        media = []
        if article.top_image:
            media.append({"type": "image", "url": article.top_image})
        
        for img_url in article.images:
             if img_url != article.top_image:
                 media.append({"type": "image", "url": img_url})

        return {
            "title": article.title,
            "content": article.text,
            "media": media,
            "success": True
        }
    except Exception as e:
        logger.error(f"Error fetching article: {e}")
        return {"error": str(e), "success": False}

def generate_chapter_summary(title: str, content: str) -> str:
    """Generates a summary of the chapter using OpenAI GPT-4o."""
    if not client:
        return "OpenAI client not initialized."

    try:
        prompt = f"Summarize the following article titled '{title}' in a concise paragraph suitable for a book chapter summary:\n\n{content[:5000]}" # Truncate to avoid token limits
        
        completion = client.chat.completions.create(
            model="gpt-4o", 
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes articles for book chapters."},
                {"role": "user", "content": prompt}
            ]
        )
        
        summary = completion.choices[0].message.content
        return summary if summary else "Summary generation failed."

    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        return "Failed to generate summary."

from weasyprint import HTML

def generate_book_pdf(book_data: dict) -> dict:
    """Generates a PDF for the book using WeasyPrint (local generation)."""
    try:
        logger.info(f"Generating PDF for book: {book_data.get('title')}")
        
        html_content = generate_html_content(book_data)
        
        # Generate PDF using WeasyPrint
        pdf_bytes = HTML(string=html_content).write_pdf()
        
        # Return base64 encoded content
        base64_content = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return {
            "success": True,
            "fileName": f"{book_data.get('title', 'book').replace(' ', '-').lower()}.pdf",
            "content": base64_content,
            "mimeType": "application/pdf"
        }
        
    except Exception as e:
        logger.error(f"Error generating PDF: {e}")
        return {"error": str(e), "success": False}

def generate_html_content(book: dict) -> str:
    """Generates HTML content for the book."""
    
    title = html.escape(book.get('title', 'Untitled'))
    author = html.escape(book.get('author', 'Unknown Author'))
    chapters = book.get('chapters', [])
    
    html_template = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        body {{ 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px;
            color: #333;
        }}
        .title-page {{
            text-align: center;
            margin-bottom: 60px;
            page-break-after: always;
        }}
        .book-title {{ 
            font-size: 36px; 
            font-weight: bold; 
            margin-bottom: 20px;
            color: #2c3e50;
        }}
        .book-author {{ 
            font-size: 24px; 
            color: #7f8c8d; 
            margin-bottom: 10px;
        }}
        .book-info {{ 
            font-size: 16px; 
            color: #95a5a6; 
        }}
        .chapter {{
            page-break-before: always;
            margin-bottom: 40px;
        }}
        .chapter-title {{
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 30px;
            padding-bottom: 10px;
            border-bottom: 3px solid #3498db;
        }}
        .chapter-content {{
            font-size: 14px;
            line-height: 1.8;
            text-align: justify;
            margin-top: 20px;
        }}
        .chapter-content p {{
            margin-bottom: 15px;
        }}
        h1, h2, h3, h4, h5, h6 {{
            color: #2c3e50;
            margin-top: 25px;
            margin-bottom: 15px;
        }}
        @page {{
            margin: 1in;
        }}
    </style>
</head>
<body>
    <div class="title-page">
        <div class="book-title">{title}</div>
        <div class="book-author">by {author}</div>
        <div class="book-info">Generated Book - {len(chapters)} Chapters</div>
    </div>
"""
    
    for i, chapter in enumerate(chapters):
        chapter_num = i + 1
        chapter_title = html.escape(chapter.get('title', 'Untitled Chapter'))
        chapter_content = clean_html_content(chapter.get('content', ''))
        
        html_template += f"""
    <div class="chapter">
        <div class="chapter-title">Chapter {chapter_num}: {chapter_title}</div>
        <div class="chapter-content">
            {chapter_content}
        </div>
    </div>
"""

    html_template += """
</body>
</html>"""

    return html_template

def clean_html_content(content: str) -> str:
    """Basic HTML cleaning to ensure it renders well in PDF."""
    if not content:
        return ""
        
    # Python's re might be needed for more complex regex, importing it inside or at top
    import re
    
    # Remove scripts
    content = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.DOTALL | re.IGNORECASE)
    # Remove styles
    content = re.sub(r'<style[^>]*>.*?</style>', '', content, flags=re.DOTALL | re.IGNORECASE)
    # Remove style attributes
    content = re.sub(r'style="[^"]*"', '', content, flags=re.IGNORECASE)
    
    # Convert divs/spans to paragraphs is harder with simple regex, skipping for now as it might be brittle
    # But let's try to match the TS logic as closely as safely possible
    
    # Simple replacements
    content = content.replace('&nbsp;', ' ')
    
    return content
