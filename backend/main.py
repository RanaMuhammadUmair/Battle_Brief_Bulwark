import logging
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import os
import tempfile
from utils import extract_text_from_file
from summarization_module import summarize_text
from db import Database
from typing import List
from tika import parser
from auth import router as auth_router
from users_db import initialize_db

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

# Initialize the users DB (create table if not exists)
initialize_db()

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
async def summarize(files: List[UploadFile] = File(...), model: str = Form(...), user_id: str = Form(None)):
    """
    Upload one or more files and summarize their content.
    """
    summaries = {}
    for file in files:
        logger.info(f"Received summarization request for file: {file.filename} using model: {model}")
        
        if not any(file.filename.endswith(ext) for ext in SUPPORTED_FILE_TYPES):
            logger.error(f"Unsupported file type: {file.filename}")
            summaries[file.filename] = "file not supported"
            continue

        temp_path = handle_uploaded_file(file)
        try:
            logger.info(f"Extracting text from file {file.filename}...")
            plain_text = parser.from_file(temp_path).get('content').strip()
            logger.info(f"Extracted text length: {len(plain_text)} characters for file: {file.filename}")

            logger.info(f"Generating summary using {model} model for file: {file.filename}...")
            summary = summarize_text(plain_text, model)
            summaries[file.filename] = summary
            logger.info(f"Summary generated successfully for file: {file.filename}")

            
            metadata = { "filename": file.filename, "model": model }
            db.save_summary(user_id, plain_text, summary, metadata)
            logger.info(f"Summary saved to database for user: {user_id} and file: {file.filename}")

        except Exception as e:
            logger.error(f"Error processing file {file.filename}: {str(e)}")
            summaries[file.filename] = f"Error processing file: {str(e)}"
        finally:
            os.unlink(temp_path)
            
    # Return the live summaries so the frontend can display them immediately.
    return summaries

@app.get("/summaries")
async def get_summaries(user: str):
    """
    Retrieve stored summaries for a given user.
    """
    try:
        user_summaries = db.get_summaries_for_user(user)
        return {"summaries": user_summaries}
    except Exception as e:
        logger.error(f"Error retrieving summaries for user {user}: {str(e)}")
        return {"summaries": []}

app.include_router(auth_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
