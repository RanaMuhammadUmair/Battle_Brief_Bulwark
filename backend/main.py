# --------------------------------------------------------------------------------
# Main module for the NATO LLM Summarizer backend service.
#
# Responsibilities:
#  - Load configuration from environment
#  - Initialize and configure logging, database, and middleware
#  - Expose endpoints to:
#       * Upload and summarize documents
#       * Evaluate summary quality and toxicity
#       * Persist and manage summaries per user
#
# --------------------------------------------------------------------------------

import logging
from dotenv import load_dotenv  
# Load environment variables from .env for API keys, DB settings, etc.
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import tempfile

# Utility modules for text extraction, summarization, and persistence
from utils import extract_text_from_file
from summarization_module import summarize_text
from db import Database

# Third-party processing libraries
from tika import parser
from auth import router as auth_router
from users_db import initialize_db
from detoxify import Detoxify
from evaluation_module import evaluate_with_mistral_small


# --------------------------------------------------------------------------------
# Configure logging: output to console and to 'app.log' for later inspection
# --------------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------------
# Initialize user database schema (creates tables if not present)
# --------------------------------------------------------------------------------
initialize_db()


# --------------------------------------------------------------------------------
# Create FastAPI app and allow all CORS origins during development
# --------------------------------------------------------------------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------------
# Instantiate the persistence layer for summaries
# --------------------------------------------------------------------------------
db = Database()


# --------------------------------------------------------------------------------
# Supported file extensions for upload validation
# --------------------------------------------------------------------------------
SUPPORTED_FILE_TYPES = [".txt", ".pdf", ".docx"]


# --------------------------------------------------------------------------------
# Load the Detoxify model to assess toxicity in original reports & summaries
# --------------------------------------------------------------------------------
detox_model = Detoxify('unbiased')


def handle_uploaded_file(file: UploadFile) -> str:
    """
    Persist an uploaded file to a temporary location on disk.

    Returns:
        The filesystem path to the temporary file.
    """
    logger.info(f"Handling uploaded file: {file.filename}")
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        content = file.file.read()
        temp_file.write(content)
        return temp_file.name


@app.post("/summarize")
async def summarize(
    user_id: str = Form(...),
    files: list[UploadFile] = File(None),
    model: str = Form(...)
):
    """
    Endpoint to process one or more uploaded files:
      1. Validate file types and word count limits.
      2. Extract plaintext via Apache Tika.
      3. Generate a summary with the specified LLM.
      4. Evaluate summary quality with Mistral and toxicity with Detoxify.
      5. Compute toxicity reduction percentages.
      6. Store the summary and metadata in the database.
    """
    logger.info(f"Received summarization request for user: {user_id} with model: {model}")
    summaries = {}

    for file in files:
        logger.info(f"Processing file: {file.filename}")
        # Validate supported file types
        if not any(file.filename.endswith(ext) for ext in SUPPORTED_FILE_TYPES):
            logger.error(f"Unsupported file type: {file.filename}")
            summaries[file.filename] = "file not supported"
            continue

        temp_path = handle_uploaded_file(file)
        try:
            # Extract and sanitize text
            logger.info(f"Extracting text from file {file.filename}...")
            plain_text = parser.from_file(temp_path).get('content').strip()

            # Enforce word count limit (max ~1500 words)
            word_count = len(plain_text.split())
            if word_count > 1500:
                raise Exception(
                    f"Document exceeds 1500-word limit ({word_count} words). "
                    "Please contact the administrator to increase the limit."
                )

            # Generate summary and evaluate quality & toxicity
            logger.info(f"Generating summary using {model} model...")
            summary = summarize_text(plain_text, model)
            quality_scores = evaluate_with_mistral_small(plain_text, summary)
            summary_scores = {k: float(v) for k, v in detox_model.predict(summary).items()}
            report_scores  = {k: float(v) for k, v in detox_model.predict(plain_text).items()}

            # Compute overall toxicity scores and reduction percentages
            summary_scores["overall"] = sum(summary_scores.values()) / len(summary_scores)
            report_scores["overall"]  = sum(report_scores.values())  / len(report_scores)
            percentage_reduction = {
                label: ((report_scores[label] - summary_scores[label]) / report_scores[label] * 100)
                           if report_scores[label] > 0 else 0.0
                for label in report_scores
            }

            # Persist results and prepare response payload
            metadata = {
                "filename": file.filename,
                "model": model,
                "detox_summary": summary_scores,
                "detox_report": report_scores,
                "percentage_reduction": percentage_reduction,
                "quality_scores": quality_scores,
            }
            db.save_summary(user_id, plain_text, summary, metadata)
            logger.info(f"Saved summary for user={user_id}, file={file.filename}")

            summaries[file.filename] = {"summary": summary, "metadata": metadata}

        except Exception as e:
            logger.error(f"Error processing {file.filename}: {e}")
            summaries[file.filename] = f"Error: {e}"

        finally:
            os.unlink(temp_path)

    return summaries


@app.get("/summaries")
async def get_summaries(user: str):
    """
    Retrieve all stored summaries for a given user.
    """
    try:
        return {"summaries": db.get_summaries_for_user(user)}
    except Exception as e:
        logger.error(f"Failed to fetch summaries for user={user}: {e}")
        return {"summaries": []}


@app.delete("/summaries/{summary_id}")
async def delete_summary_route(summary_id: int):
    """
    Delete a summary record by its database ID.
    """
    try:
        db.delete_summary(summary_id)
        return {"deleted": summary_id}
    except Exception as e:
        logger.error(f"Failed to delete summary id={summary_id}: {e}")
        raise HTTPException(status_code=500, detail="Could not delete summary")


# Include authentication routes (login, signup, token management)
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
