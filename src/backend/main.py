from fastapi import FastAPI, HTTPException
from services import generate_book_cover
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
load_dotenv()
from services import fetch_article_content, generate_chapter_summary
from pydantic import BaseModel

class ArticleRequest(BaseModel):
    url: str

class SummaryRequest(BaseModel):
    title: str
    content: str

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

class CoverRequest(BaseModel):
    prompt: str

@app.post("/generate-cover/")
async def create_book_cover(request: CoverRequest):
    """API endpoint to generate book cover from prompt."""
    try:
        # Generate book cover
        cover_url = generate_book_cover(request.prompt)

        return {
            "message": "Book cover generated successfully",
            "cover_url": cover_url,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/fetch-article/")
async def api_fetch_article(request: ArticleRequest):
    result = fetch_article_content(request.url)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    return result

@app.post("/generate-summary/")
async def api_generate_summary(request: SummaryRequest):
    summary = generate_chapter_summary(request.title, request.content)
    if summary == "Summary generation failed." or summary == "Failed to generate summary.":
        return {"summary": summary}
    return {"summary": summary}

class Media(BaseModel):
    type: str
    url: str | None = None
    content: str | None = None
    alt: str | None = None

class Chapter(BaseModel):
    id: str
    title: str
    description: str
    url: str
    content: str | None = None
    media: list[Media] | None = None

class Book(BaseModel):
    title: str
    subtitle: str | None = None
    author: str
    chapters: list[Chapter]
    format: str

class GenerateBookRequest(BaseModel):
    book: Book

from services import generate_book_pdf

@app.post("/generate-book/")
async def api_generate_book(request: GenerateBookRequest):
    """API endpoint to generate book PDF."""
    try:
        if request.book.format != 'PDF':
             raise HTTPException(status_code=400, detail="Only PDF format is supported currently via this endpoint.")
             
        book_data = request.book.model_dump()
        result = generate_book_pdf(book_data)
        
        if not result.get("success"):
             raise HTTPException(status_code=500, detail=result.get("error"))
             
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
