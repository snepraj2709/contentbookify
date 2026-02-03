# ContentBookify

ContentBookify is an AI-powered web app that turns blog posts into a clean, printable PDF book. You paste article URLs, organize them into chapters, add a custom or AI-generated cover, and export a single PDF.

## Live Links

- Frontend (Vercel): https://contentbookify.vercel.app
- Backend (Railway): https://contentbookify-backend-production.up.railway.app

## Big Picture (How It Works)

1. The frontend collects article URLs, chapter order, and cover options.
2. The backend fetches and cleans article content.
3. Summaries and cover art are generated via OpenAI.
4. A single HTML document is composed with book CSS + localized images.
5. WeasyPrint renders the HTML into a PDF, which is returned as base64 to the client.

Key API endpoints:
- `POST /fetch-article/` — fetches and cleans article content
- `POST /generate-summary/` — summarizes a chapter
- `POST /generate-cover/` — generates cover art
- `POST /generate-book/` — renders the final PDF

## Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | Vite, React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Uvicorn, Python 3.11 |
| AI | OpenAI (GPT-4o for summaries, DALL-E 3 for covers) |
| HTML → PDF | WeasyPrint + system libraries (Cairo, Pango, GDK-Pixbuf, HarfBuzz, Fontconfig, Freetype, GLib/GObject) |
| Hosting | Vercel (FE), Railway (BE) |

## HTML → PDF Stack (Detailed)

The PDF pipeline is fully server-side:

- **HTML construction**: chapters are normalized into semantic HTML and combined with book-level CSS.
- **Content cleanup**: `readability-lxml`, `BeautifulSoup`, and `ftfy` repair and normalize extracted text.
- **Image localization**: images are downloaded into a temp directory so WeasyPrint can embed them reliably.
- **Rendering engine**: **WeasyPrint** converts the final HTML + CSS into a PDF using Cairo/Pango.
- **System deps** (required by WeasyPrint):
  - `cairo`, `pango`, `gdk-pixbuf`, `glib`, `gobject-introspection`, `harfbuzz`, `fontconfig`, `freetype`, `libffi`

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- WeasyPrint system libraries

**macOS (Homebrew):**
```bash
brew install cairo pango gdk-pixbuf libffi harfbuzz fontconfig freetype
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y \
  libcairo2 libpango-1.0-0 libgdk-pixbuf-2.0-0 \
  libglib2.0-0 libffi-dev libharfbuzz0b libfontconfig1 \
  libfreetype6 gobject-introspection
```

### Environment Variables

Frontend:
- `VITE_BACKEND_BASE_URL=http://localhost:8000`

Backend:
- `VITE_OPENAI_API_KEY=your_openai_key`

### Run Backend (FastAPI)

```bash
cd src/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export VITE_OPENAI_API_KEY=your_openai_key
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Run Frontend (Vite)

```bash
cd ../../
npm install
export VITE_BACKEND_BASE_URL=http://localhost:8000
npm run dev
```

If you use a different frontend port, update CORS in `src/backend/main.py`.

## Deployment Notes

- Backend uses Railway with Nixpacks and WeasyPrint system dependencies.
- Frontend is deployed to Vercel and reads `VITE_BACKEND_BASE_URL` at build time.
