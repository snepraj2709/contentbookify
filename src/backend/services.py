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
    """Localize images with parallel downloads for speed."""
    soup = BeautifulSoup(html_content, "html.parser")
    images_dir = os.path.join(temp_dir, "images")
    os.makedirs(images_dir, exist_ok=True)

    # Collect all images to download
    img_tasks = []
    for img in soup.find_all("img"):
        src = img.get("src")
        if not src:
            continue
        abs_url = urljoin(base_url, src)
        ext = os.path.splitext(src)[-1] or ".jpg"
        if '?' in ext:
            ext = ext.split('?')[0]
        name = hashlib.md5(abs_url.encode()).hexdigest() + ext
        path = os.path.join(images_dir, name)
        img_tasks.append((img, abs_url, path, name))

    # Parallel download (max 5 concurrent)
    def download_and_save(task):
        img, abs_url, path, name = task
        if not os.path.exists(path):
            content = download_image_fast(abs_url)
            if content:
                with open(path, "wb") as f:
                    f.write(content)
        return (img, name, os.path.exists(path))

    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(download_and_save, img_tasks))

    # Update img sources
    for img, name, success in results:
        if success:
            img["src"] = f"images/{name}"

    return str(soup)

def repair_unicode(html_content):
    return ftfy.fix_text(html_content)

def normalize_unicode(html_content):
    return htmlparser.unescape(html_content)

def normalize_to_book_html(html_content, title, temp_dir):
    """Normalize HTML content - skip pandoc for speed, use direct processing."""
    # Extract just the body content if full HTML
    soup = BeautifulSoup(html_content, "html.parser")
    body = soup.find('body')
    content = str(body) if body else html_content

    # Clean up common issues
    content = ftfy.fix_text(content)

    return f"<h1>{html.escape(title)}</h1>\n<div>{content}</div>"

from weasyprint import HTML, CSS
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO

# Reusable session for connection pooling
_session = None
def get_session():
    global _session
    if _session is None:
        _session = requests.Session()
        adapter = requests.adapters.HTTPAdapter(pool_connections=10, pool_maxsize=10)
        _session.mount('http://', adapter)
        _session.mount('https://', adapter)
    return _session

def download_image_fast(url, timeout=10):
    """Fast image download with connection pooling."""
    try:
        resp = get_session().get(url, timeout=timeout)
        if resp.status_code == 200:
            return resp.content
    except Exception as e:
        logger.warning(f"Failed to download {url}: {e}")
    return None

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
            title_text = html.escape(book_data.get('title') or 'Untitled')
            subtitle = html.escape(book_data.get('subtitle') or '')
            author_text = html.escape(book_data.get('author') or 'Unknown Author')
            
            cover_image_url = None
            if book_data.get('coverImage'):
                cover_image_url = book_data['coverImage'].get('url')

            if cover_image_url:
                try:
                    images_dir = os.path.join(temp_dir, "images")
                    os.makedirs(images_dir, exist_ok=True)

                    # Hash filename
                    ext = os.path.splitext(cover_image_url)[-1] or ".jpg"
                    if '?' in ext:
                        ext = ext.split('?')[0]
                    name = hashlib.md5(cover_image_url.encode()).hexdigest() + ext
                    path = os.path.join(images_dir, name)

                    # Check if it's a local file path
                    if os.path.isfile(cover_image_url):
                        # Copy local file to temp images dir
                        shutil.copy2(cover_image_url, path)
                        cover_image_url = f"images/{name}"
                    elif cover_image_url.startswith('file://'):
                        # Handle file:// URLs
                        local_path = cover_image_url[7:]
                        if os.path.isfile(local_path):
                            shutil.copy2(local_path, path)
                            cover_image_url = f"images/{name}"
                    elif not os.path.exists(path):
                        # Download from URL (using fast session)
                        content = download_image_fast(cover_image_url)
                        if content:
                            with open(path, "wb") as f:
                                f.write(content)
                            cover_image_url = f"images/{name}"
                        else:
                            logger.warning(f"Failed to download cover image")
                    else:
                         cover_image_url = f"images/{name}"

                except Exception as e:
                    logger.error(f"Error localizing cover image: {e}")
            
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

            final_pdf_path = os.path.join(temp_dir, "book.pdf")

            # Combined HTML with cover as first page, then content
            # Using @page for cover, named page for content
            combined_css = f"""
            @page cover {{
                size: A4;
                margin: 0;
            }}
            @page content {{
                size: A4;
                margin: 2cm;
            }}
            .cover-wrapper {{
                page: cover;
                position: relative;
                width: 210mm;
                height: 297mm;
                overflow: hidden;
                page-break-after: always;
            }}
            .cover-image {{
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
            }}
            .dark-overlay {{
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: rgba(0, 0, 0, 0.2);
            }}
            .title-page {{
                position: absolute;
                bottom: 0; left: 0; right: 0;
                padding: 32px;
                box-sizing: border-box;
            }}
            .content-section {{
                page: content;
            }}
            {BOOK_CSS}
            """

            # Build cover section
            cover_section = ""
            if cover_image_url:
                cover_section = f"""
                <div class="cover-wrapper">
                    <img class="cover-image" src="{cover_image_url}" alt="Cover" />
                    <div class="dark-overlay"></div>
                    <div class="title-page" style="text-align: {text_align};">
                        <div class="title-container">
                            <div style="font-family: {font_family}; font-size: 36px; font-weight: bold; line-height: 1.1; margin-bottom: 8px; color: {title_color};">{title_text}</div>
                            {f'<div style="font-family: {font_family}; font-size: 18px; font-weight: 500; opacity: 0.9; margin-bottom: 8px; color: {subtitle_color};">{subtitle}</div>' if subtitle else ''}
                            <div style="padding-top: 32px; padding-bottom: 16px;">
                                <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; color: {author_color};">{author_text}</div>
                            </div>
                        </div>
                    </div>
                </div>
                """
            else:
                cover_section = f"""
                <div class="cover-wrapper" style="background: white; display: flex; align-items: center; justify-content: center;">
                    <div style="text-align: center;">
                        <div style="font-size: 48px; font-weight: bold; margin-bottom: 10px; color: {title_color};">{title_text}</div>
                        {f'<div style="font-size: 24px; margin-bottom: 40px; color: {subtitle_color};">{subtitle}</div>' if subtitle else ''}
                        <div style="font-size: 18px; text-transform: uppercase; color: {author_color};">{author_text}</div>
                    </div>
                </div>
                """

            # Combined HTML document
            combined_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>{combined_css}</style>
            </head>
            <body>
                {cover_section}
                <div class="content-section">
                    {''.join(processed_chapters)}
                </div>
            </body>
            </html>
            """

            # Single PDF render (faster than render + merge)
            HTML(string=combined_html, base_url=temp_dir).write_pdf(
                final_pdf_path,
                presentational_hints=True
            )

            # Read back
            with open(final_pdf_path, "rb") as f:
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
