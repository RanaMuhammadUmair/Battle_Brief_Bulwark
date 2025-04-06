from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
import tempfile
from PyPDF2 import PdfReader
from docx import Document
import openai
from transformers import BartForConditionalGeneration, BartTokenizer

# Load the BART model and tokenizer once during application startup
model_name = "facebook/bart-large-cnn"
bart_tokenizer = BartTokenizer.from_pretrained(model_name)
bart_model = BartForConditionalGeneration.from_pretrained(model_name)

app = FastAPI()

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace "*" with your frontend URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supported file types
SUPPORTED_FILE_TYPES = [".txt", ".pdf", ".docx"]

def handle_uploaded_file(file: UploadFile) -> str:
    """
    Save the uploaded file temporarily and return its path.

    Args:
        file: The uploaded file from the client.

    Returns:
        str: The path to the saved temporary file.
    """
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(file.file.read())
        return temp_file.name

def convert_to_plain_text(file_path: str, file_type: str) -> str:
    """
    Convert a file to plain text based on its type.

    Args:
        file_path: Path to the file.
        file_type: Type of the file (e.g., .txt, .pdf, .docx).

    Returns:
        str: Extracted plain text from the file.
    """
    if file_type == ".txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    elif file_type == ".pdf":
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text()
        return text
    elif file_type == ".docx":
        doc = Document(file_path)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

def ethical_check(summary: str) -> bool:
    """
    Perform ethical checks on the summary.

    Args:
        summary: The summary text to check.

    Returns:
        bool: True if the summary passes ethical checks, False otherwise.
    """
    # Example ethical checks
    prohibited_keywords = ["classified", "confidential", "unauthorized", "lethal"]
    for keyword in prohibited_keywords:
        if keyword.lower() in summary.lower():
            return False

    # Ensure the summary does not contain offensive or harmful language
    offensive_phrases = ["hate speech", "discrimination", "violence"]
    for phrase in offensive_phrases:
        if phrase.lower() in summary.lower():
            return False

    # Check if the summary is overly biased or opinionated
    if "biased" in summary.lower() or "opinion" in summary.lower():
        return False

    return True

@app.post("/summarize")
async def summarize(files: List[UploadFile] = File(...), model: str = Form(...)):
    """
    Upload files and summarize their content.
    """
    plain_texts = []

    for file in files:
        if not any(file.filename.endswith(ext) for ext in SUPPORTED_FILE_TYPES):
            return {"error": f"Unsupported file type: {file.filename}"}

        temp_path = handle_uploaded_file(file)
        try:
            file_type = os.path.splitext(file.filename)[1]
            plain_text = convert_to_plain_text(temp_path, file_type)
            plain_texts.append(plain_text)
        finally:
            os.unlink(temp_path)

    combined_text = "\n".join(plain_texts)
    prompt = f"summarize this text in context of military and make sure dont miss any important detail: {combined_text}"

    # Call the model-specific function
    if model == "chatgpt":
        summary = call_chatgpt_model(prompt)
    elif model == "bart":
        summary = call_bart_model(prompt)
    else:
        return {"error": "Unsupported model"}

    # Perform ethical checks
    while not ethical_check(summary):
        prompt = f"This summary does not fulfill military ethical standards. Please revise: {summary}"
        if model == "chatgpt":
            summary = call_chatgpt_model(prompt)
        elif model == "bart":
            summary = call_bart_model(prompt)

    return {"summary": summary}

def call_chatgpt_model(prompt: str) -> str:
    """
    Call the ChatGPT API to generate a summary.

    Args:
        prompt: The input text for the model.

    Returns:
        str: The generated summary.
    """

    # Replace 'your-api-key' with your actual OpenAI API key
    openai.api_key = "your-api-key"

    try:
        response = openai.Completion.create(
            engine="text-davinci-003",  # Use the appropriate engine
            prompt=prompt,
            max_tokens=300,  # Adjust token limit as needed
            temperature=0.7  # Adjust creativity level as needed
        )
        return response.choices[0].text.strip()
    except Exception as e:
        return f"Error calling ChatGPT API: {str(e)}"

def call_bart_model(prompt: str, num_beams: int = 4) -> str:
    """
    Call the BART model to generate a summary.

    Args:
        prompt: The input text for the model.

    Returns:
        str: The generated summary.

    Notes:
        - `length_penalty=2.0`: Encourages the model to generate longer summaries by penalizing shorter ones.
        - `early_stopping=True`: Stops the beam search process as soon as the best candidate is found, improving efficiency.
    """

    # Tokenize the input prompt
    tokens = bart_tokenizer.encode(prompt, return_tensors="pt", truncation=True, max_length=1024)

    # Generate the summary
    summary_ids = bart_model.generate(tokens, max_length=300, min_length=50, length_penalty=2.0, num_beams=num_beams, early_stopping=True)

    # Decode the generated summary
    summary = bart_tokenizer.decode(summary_ids[0], skip_special_tokens=True)

    return summary
