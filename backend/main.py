import logging
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import os
import tempfile
from utils import extract_text_from_file
from summarization import summarize_text
from db import Database

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Console handler
        logging.FileHandler('app.log')  # File handler
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db = Database()

# Supported file types
SUPPORTED_FILE_TYPES = [".txt", ".pdf", ".docx"]

def handle_uploaded_file(file: UploadFile) -> str:
    """Save uploaded file temporarily and return its path"""
    logger.info(f"Handling uploaded file: {file.filename}")
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        content = file.file.read()
        temp_file.write(content)
        return temp_file.name

@app.post("/summarize")
async def summarize(file: UploadFile = File(...), model: str = Form(...), user_id: str = Form(None)):
    """
    Upload a file and summarize its content.
    """
    logger.info(f"Received summarization request for file: {file.filename} using model: {model}")
    
    if not any(file.filename.endswith(ext) for ext in SUPPORTED_FILE_TYPES):
        logger.error(f"Unsupported file type: {file.filename}")
        summary = "file not supported"
        return {"error": f"Unsupported file type: {file.filename}"}

    temp_path = handle_uploaded_file(file)
    try:
        logger.info("Extracting text from file...")
        plain_text = extract_text_from_file(temp_path, file.filename)
        print(plain_text)
        logger.info(f"Extracted text length: {len(plain_text)} characters")

        logger.info(f"Generating summary using {model} model...")
        summary = summarize_text(plain_text, model)
        logger.info("Summary generated successfully")

        # Save to database if user_id is provided
        if user_id:
            metadata = {
                "filename": file.filename,
                "model": model,
            }
            db.save_summary(user_id, plain_text, summary, metadata)
            logger.info(f"Summary saved to database for user: {user_id}")

        return {"summary": summary}
    except Exception as e:
        logger.error(f"Error processing file {file.filename}: {str(e)}")
        return {"error": f"Error processing file {file.filename}: {str(e)}"}
    finally:
        # Clean up temporary file
        os.unlink(temp_path)
        logger.info("Temporary file cleaned up")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
