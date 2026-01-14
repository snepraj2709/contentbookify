import os
from dotenv import load_dotenv
from pathlib import Path
from newspaper import Article
import logging
from openai import OpenAI
import requests
import base64
import html
import subprocess
import tempfile
from readability import Document
import html as htmlparser
import ftfy
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import hashlib
import shutil

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


# --- Book Builder Logic ---

BOOK_CSS = """
@page {
  size: A4;
  margin: 2cm;
}

body { font-family: "Georgia"; line-height: 1.55; }
h1 { page-break-before: always; font-size: 24pt; }
h2 { font-size: 16pt; margin-top: 1.5em; }
p  { margin: 0.8em 0; text-align: justify; }
figure { page-break-inside: avoid; }
"""

def fetch_clean(url):
    try:
        html_content = requests.get(url, timeout=20).text
    except Exception as e:
        logger.error(f"Failed to fetch {url}: {e}")
        return ""
        
    main = Document(html_content).summary(html_partial=True)

    return f"""
    <html>
    <head><meta charset="utf-8"></head>
    <body>{main}</body>
    </html>
    """

def localize_images(html_content, base_url, temp_dir):
    soup = BeautifulSoup(html_content, "html.parser")
    images_dir = os.path.join(temp_dir, "images")
    os.makedirs(images_dir, exist_ok=True)

    for img in soup.find_all("img"):
        src = img.get("src")
        if not src:
            continue

        abs_url = urljoin(base_url, src)
        try:
            # Create a safe filename hash
            name = hashlib.md5(abs_url.encode()).hexdigest() + os.path.splitext(src)[-1]
            if not os.path.splitext(src)[-1]:
                 name += ".jpg" # Default extension if missing
            
            path = os.path.join(images_dir, name)

            if not os.path.exists(path):
                response = requests.get(abs_url, timeout=10)
                if response.status_code == 200:
                    with open(path, "wb") as f:
                        f.write(response.content)
            
            # Update src to file path relative to the HTML file (which will be in temp_dir)
            # WeasyPrint handles local paths well
            img["src"] = f"images/{name}"
            
        except Exception as e:
            logger.warning(f"Failed to localize image {abs_url}: {e}")
            continue

    return str(soup)

def repair_unicode(html_content):
    return ftfy.fix_text(html_content)

def normalize_unicode(html_content):
    return htmlparser.unescape(html_content)

def normalize_to_book_html(html_content, title, temp_dir):
    # Create temp file in the provided temp_dir
    temp_file_path = os.path.join(temp_dir, f"{hashlib.md5(title.encode()).hexdigest()}.html")
    with open(temp_file_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    out_file_path = temp_file_path.replace(".html", "_norm.html")
    
    # Check for pandoc
    pandoc_cmd = "pandoc"
    if not shutil.which("pandoc"):
         # Try to find it if possible, or skip
         # Assuming globally installed as per user
         pass 

    try:
        subprocess.run([
            pandoc_cmd, temp_file_path,
            "--from=html",
            "--to=html5",
            "--standalone",
            "--metadata=charset:utf-8",
            "-o", out_file_path
        ], check=True)
        
        if os.path.exists(out_file_path):
             with open(out_file_path, 'r', encoding='utf-8') as f:
                normalized_content = f.read()
                return f"<h1>{title}</h1>\n" + normalized_content
    except Exception as e:
        logger.error(f"Pandoc normalization failed for {title}: {e}")
        # Fallback to original content wrapped
        return f"<h1>{title}</h1>\n<div>{html_content}</div>"

    return f"<h1>{title}</h1>\n<div>{html_content}</div>"

from weasyprint import HTML

def generate_book_pdf(book_data: dict) -> dict:
    """Generates a PDF for the book using the robust Fetch -> Clean -> Normalize pipeline."""
    try:
        logger.info(f"Generating PDF for book: {book_data.get('title')}")
        
        chapters_data = book_data.get('chapters', [])
        
        # Use a temporary directory for the entire process
        with tempfile.TemporaryDirectory() as temp_dir:
            processed_chapters = []
            
            for chapter in chapters_data:
                url = chapter.get('url')
                title = chapter.get('title', 'By Unknown')
                
                if not url:
                    # Fallback to content if URL is missing
                    if chapter.get('content'):
                         processed_chapters.append(f"<h1>{title}</h1>\n<div>{chapter.get('content')}</div>")
                    continue

                try:
                    clean = fetch_clean(url)
                    if clean:
                        clean = repair_unicode(clean)
                        clean = localize_images(clean, url, temp_dir)
                        normalized = normalize_to_book_html(clean, title, temp_dir)
                        processed_chapters.append(normalized)
                    else:
                        logger.warning(f"Empty content fetched for {url}")
                except Exception as e:
                    logger.error(f"Error processing chapter {title} ({url}): {e}")
                    processed_chapters.append(f"<h1>{title}</h1>\n<p>Error processing content from {url}</p>")

            
            # --- Cover Page Logic ---
            title_text = html.escape(book_data.get('title', 'Untitled'))
            subtitle = html.escape(book_data.get('subtitle', ''))
            author_text = html.escape(book_data.get('author', 'Unknown Author'))
            
            cover_image_url = None
            if book_data.get('coverImage'):
                cover_image_url = book_data['coverImage'].get('url')
            
            cover_options = book_data.get('coverOptions', {})
            layout = cover_options.get('layout', 'center')
            font_family_opt = cover_options.get('fontFamily', 'serif')
            
            font_map = {'sans': 'Arial, sans-serif','serif': 'Georgia, serif','display': 'Impact, sans-serif'}
            font_family = font_map.get(font_family_opt, 'Georgia, serif')
            
            text_align_map = {'left': 'left', 'right': 'right', 'center': 'center'}
            text_align = text_align_map.get(layout, 'center')
            
            align_items_map = {'left': 'flex-start', 'right': 'flex-end', 'center': 'center'}
            align_items = align_items_map.get(layout, 'center')
            
            title_color = cover_options.get('titleColor', '#2c3e50')
            subtitle_color = cover_options.get('subtitleColor', '#555555')
            author_color = cover_options.get('authorColor', '#7f8c8d')
            
            if cover_image_url:
                 # Ensure defaults visible on image
                 if not cover_options.get('titleColor'): title_color = 'white'
                 if not cover_options.get('subtitleColor'): subtitle_color = '#eee'
                 if not cover_options.get('authorColor'): author_color = '#ddd'

            cover_css = ""
            if cover_image_url:
                cover_css = f"""
                .title-page {{
                    background-image: url('{cover_image_url}');
                    background-size: cover;
                    background-position: center;
                    height: 100vh;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    align-items: {align_items};
                    text-align: {text_align};
                    margin: 0;
                    padding: 40px;
                    box-sizing: border-box;
                    page-break-after: always;
                }}
                .title-container {{ width: 100%; margin-bottom: 60px; }}
                """
            else:
                cover_css = """
                .title-page { text-align: center; margin-top: 150px; margin-bottom: 60px; page-break-after: always; }
                """

            cover_html = f"""
            <div class="title-page">
                <div class="title-container">
                    <div class="book-title" style="font-family: {font_family}; font-size: 48px; font-weight: bold; margin-bottom: 10px; color: {title_color}; { 'text-shadow: 2px 2px 10px rgba(0,0,0,0.5);' if cover_image_url else '' }">{title_text}</div>
                    { f'<div class="book-subtitle" style="font-family: {font_family}; font-size: 24px; font-weight: 500; margin-bottom: 40px; color: {subtitle_color}; { "text-shadow: 1px 1px 5px rgba(0,0,0,0.5);" if cover_image_url else "" }">{subtitle}</div>' if subtitle else '' }
                    <div class="book-author" style="font-size: 18px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; color: {author_color}; { 'text-shadow: 1px 1px 3px rgba(0,0,0,0.5);' if cover_image_url else '' }">{author_text}</div>
                </div>
            </div>
            """
            
            # Combine everything
            book_html = f"""
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    {BOOK_CSS}
                    {cover_css}
                    @page :first {{ margin: 0; }}
                </style>
            </head>
            <body>
            {cover_html}
            {''.join(processed_chapters)}
            </body></html>
            """
            
            book_html_path = os.path.join(temp_dir, "book.html")
            with open(book_html_path, "w", encoding="utf-8") as f:
                f.write(book_html)
            
            pdf_path = os.path.join(temp_dir, "book.pdf")
            
            # Generate PDF using WeasyPrint (Library direct call)
            HTML(book_html_path).write_pdf(pdf_path)
            
            # Read back
            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()
                
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
