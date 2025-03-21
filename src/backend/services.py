import google.generativeai as genai
import os
from dotenv import load_dotenv
from pathlib import Path
load_dotenv()

# Load the .env file two folders behind
dotenv_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path)

# Access the key
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
GEMINI_API_KEY = os.getenv("VITE_GEMINI_API_KEY")

# Initialize Gemini AI
genai.configure(api_key=GEMINI_API_KEY)

def generate_book_cover(prompt: str) -> str:
    """Generates a book cover image from Gemini AI based on the prompt."""
    model = genai.GenerativeModel("gemini-pro-vision")

    # Define the image prompt
    response = model.generate_content(prompt)

    if response.candidates:
        image_url = response.candidates[0].content.parts[0].inline_data
        return image_url
    else:
        raise Exception("Failed to generate image.")
