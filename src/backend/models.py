from supabase import create_client
import os
from dotenv import load_dotenv
from pathlib import Path
load_dotenv()

# Load the .env file two folders behind
dotenv_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path)

# Access the key
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_KEY")

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Function to insert cover details into the DB
def save_book_cover(prompt: str, cover_url: str):
    data = {
        "prompt": prompt,
        "cover_url": cover_url
    }
    
    response = supabase.table("book_covers").insert(data).execute()
    return response
