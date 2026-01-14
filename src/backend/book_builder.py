import requests, subprocess, tempfile, os, trafilatura
from readability import Document
import html as htmlparser
import ftfy
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import hashlib

def localize_images(html, base_url):
    soup = BeautifulSoup(html, "html.parser")
    os.makedirs("images", exist_ok=True)

    for img in soup.find_all("img"):
        src = img.get("src")
        if not src:
            continue

        abs_url = urljoin(base_url, src)
        name = hashlib.md5(abs_url.encode()).hexdigest() + os.path.splitext(src)[-1]

        path = os.path.join("images", name)

        if not os.path.exists(path):
            try:
                open(path,"wb").write(requests.get(abs_url).content)
            except:
                continue

        img["src"] = path.replace("\\","/")
    return str(soup)

def repair_unicode(html):
    return ftfy.fix_text(html)


def normalize_unicode(html):
    return htmlparser.unescape(html)


ARTICLES = [
    ("My Workflow for a Deeper Life",
     "https://www.ssp.sh/blog/obsidian-note-taking-workflow/"),
    ("Will AI Replace Humans?",
     "https://www.ssp.sh/brain/will-ai-replace-humans/")
]

BOOK_CSS = """
@page {
  size: A5;
  margin: 2cm;
}

body { font-family: "Georgia"; line-height: 1.55; }
h1 { page-break-before: always; font-size: 24pt; }
h2 { font-size: 16pt; margin-top: 1.5em; }
p  { margin: 0.8em 0; text-align: justify; }
figure { page-break-inside: avoid; }
"""

def fetch_clean(url):
    html = requests.get(url, timeout=20).text
    main = Document(html).summary(html_partial=True)

    return f"""
    <html>
    <head><meta charset="utf-8"></head>
    <body>{main}</body>
    </html>
    """


def normalize_to_book_html(html, title):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".html") as f:
        f.write(html.encode())
        temp = f.name

    out = temp.replace(".html","_norm.html")
    subprocess.run([
    "pandoc", temp,
    "--from=html",
    "--to=html5",
    "--standalone",
    "--metadata=charset:utf-8",
    "-o", out
])

    os.unlink(temp)

    return f"<h1>{title}</h1>\n" + open(out, encoding="utf-8").read()


def main():
    chapters = []
    for title,url in ARTICLES:
        clean = fetch_clean(url)
        clean = repair_unicode(clean)
        clean = localize_images(clean, url)
        chapters.append(normalize_to_book_html(clean, title))

    book_html = f"""
    <html>
    <head><meta charset="utf-8"><style>{BOOK_CSS}</style></head>
    <body>
    <h1>SSP Knowledge Book</h1>
    {''.join(chapters)}
    </body></html>
    """

    open("book.html","w",encoding="utf-8").write(book_html)
    print("Generated book.html")
    subprocess.run(["weasyprint","--allowed-protocols=file,http,https","book.html","ssp_book.pdf"])

    print("Generated ssp_book.pdf")

if __name__ == "__main__":
    main()
