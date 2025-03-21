import google.generativeai as genai
import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

# Load the .env file two folders behind
dotenv_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path)

# Access the key
GEMINI_API_KEY = os.getenv("VITE_GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Choose the model
model = genai.GenerativeModel("gemini-2.0-flash-exp-image-generation")

# Define the prompt
prompt = "A photo of a cat wearing a hat on a sunny beach"

# Generate the image
response = model.generate_content(prompt)

# Access the image data
image_data = response.text # This contain image data in a format like a URL or a base64 string.