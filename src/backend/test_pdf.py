import os
import sys

# Ensure we can import from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services import generate_book_pdf

def test_generate_pdf():
    print("Starting PDF generation test...")
    
    # Dummy book data
    book_data = {
        "title": "Test Book: The Dummy Chronicles",
        "subtitle": "A Journey Into Automated PDF Generation",
        "author": "Antigravity Agent",
        "format": "PDF",
        "coverOptions": {
            "titleColor": "#FFFFFF",
            "subtitleColor": "#FFD700",
            "authorColor": "#CCCCCC",
            "fontFamily": "serif",
            "layout": "right" 
        },
        "coverImage": {
        "url": "https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        "name": "Nature Cover"
    },
    "chapters": [
            {
                "title": "Chapter 1: The Beginning",
                "content": "<h1>Welcome</h1><p>This is the first chapter of our <strong>dummy</strong> book. It has some <em>HTML</em> content.</p>"
            },
            {
                "title": "Chapter 2: The Middle",
                "content": "<p>This is the second chapter. It's quite short.</p><ul><li>Point 1</li><li>Point 2</li></ul>"
            }
        ]
    }

    try:
        result = generate_book_pdf(book_data)
        
        if result.get("success"):
            print("PDF Generation Successful!")
            print(f"File Name: {result.get('fileName')}")
            print(f"Mime Type: {result.get('mimeType')}")
            print(f"Content Length (Base64): {len(result.get('content', ''))}")
            
            # Optionally save to file to check
            with open("test_output.pdf", "wb") as f:
                import base64
                f.write(base64.b64decode(result.get("content")))
            print("Saved generated PDF to 'test_output.pdf'")
        else:
            print("PDF Generation Failed!")
            print(f"Error: {result.get('error')}")

    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    test_generate_pdf()
