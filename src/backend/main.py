from fastapi import FastAPI, HTTPException
from models import save_book_cover
from services import generate_book_cover
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
load_dotenv()

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Book Cover Generator Backend is running!"}

@app.post("/generate-cover/")
async def create_book_cover(prompt: str):
    """API endpoint to generate book cover from prompt."""
    try:
        # Generate book cover
        cover_url = generate_book_cover(prompt)

        # Save cover to Supabase
        response = save_book_cover(prompt, cover_url)

        return {
            "message": "Book cover generated successfully",
            "cover_url": cover_url,
            "db_response": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
