import os
from dotenv import load_dotenv
from pathlib import Path
from newspaper import Article
import logging
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Load the .env file two folders behind
dotenv_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path)

# Access the key
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
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
