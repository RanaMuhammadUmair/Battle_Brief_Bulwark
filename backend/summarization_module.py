import os
from dotenv import load_dotenv
from openai import OpenAI
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM, BartTokenizer, BartForConditionalGeneration, PegasusTokenizer, PegasusForConditionalGeneration
import anthropic
import torch
import requests
import runpod
import logging
import google.generativeai as genai

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load API keys from environment variables (.env )
load_dotenv()
# OpenAI API key
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
#RunPod API key
runpod.api_key = os.getenv("RUNPOD_API_KEY")
endpoint_id = os.getenv("YOUR_ENDPOINT_ID")
anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "YOUR_ANTHROPIC_API_KEY")

# Initialize Claude client
claude_client = anthropic.Client(api_key=anthropic_api_key)

# Initialize the models (load them only once)
models = {}

def load_models():
    """Initialize models on first use to save memory"""
    if not models.get("bart"):
        models["bart"] = pipeline("summarization", model="facebook/bart-large-cnn")
    
    if not models.get("t5"):
        t5_tokenizer = AutoTokenizer.from_pretrained("t5-small")
        t5_model = AutoModelForSeq2SeqLM.from_pretrained("t5-small", low_cpu_mem_usage=True)
        models["t5"] = (t5_model, t5_tokenizer)

def summarize_text(text, model_name):
    # Make sure models are loaded
    #load_models()
    summary = None  
    # Generate summary using the selected model
    if model_name.lower() == "gpt4":
        summary = summarize_with_gpt_4point1(text)
    elif model_name.lower() == "claude":
        summary = summarize_with_claude(text)
    elif model_name.lower() == "bart":
        summary = summarize_with_bart(text)
    elif model_name.lower() == "t5":
        summary = summarize_with_t5(text)
    elif model_name.lower() == "gemini2point5_pro":
        summary = summarize_with_gemini2point5_pro(text)
    elif model_name.lower() == "deepseek-r1":
        summary = summarize_with_DeepSeek_R1_runpod(text)
    else:
        return "Error: Unsupported model selected. Please choose from GPT-4, Claude, BART, T5, or Gemini 2.5 Pro."
    return summary

def summarize_with_DeepSeek_R1_runpod(text):
    logger.info("Summarizing with DeepSeek-R1-Distill-Qwen-1.5B model on RunPod")
    summarize_text= " "

    url = f"https://api.runpod.ai/v2/{endpoint_id}/openai/v1/chat/completions"

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {os.getenv("RUNPOD_API_KEY")}'
    }

    data = {
        "model": "deepseek-ai/deepseek-r1-distill-qwen-1.5b",  # ✅ Now explicitly included
        "messages": [
            {
    "role": "user",
    "content": (
        "You are required to produce a single, clear, accurate summary of the following military intelligence report. "
        "You have only one chance. Focus on key facts, strategic implications, and ethical considerations. "
        "Do not respond in a conversational or reflective style. Do not say things like 'I think' or 'Let's analyze.' "
        "Return only the final summary, formatted for presentation in a secure military system.\n\n"
        f"{text}"
        
        )
        }   

        ],
        "temperature": 0.3,
        "max_tokens": 5000,
        "presence_penalty": 0.1,
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        logger.info(f"LLM summary response: {result}")   
        # Extracting the summary content
        content = result['choices'][0]['message']['content']
        summary_start = content.find('</think>\n\n') + len('</think>\n\n')  # Find where the summary starts
        summary = content[summary_start:].strip()  # Get the rest of the content after that point
        # Log the extracted summary
        logger.info(f"LLM summary: {summary}")
        return summary
    except requests.exceptions.RequestException as e:
        logger.error(f"An error occurred: {e}")
        return "Error: Could not generate summary using DeepSeek-R1-Distill-Qwen-1.5B."
    except KeyError as e:
        logger.error(f"Unexpected response format: {e}, response was: {response.text}")
        return "Error: Unexpected response format from model."



def summarize_with_gpt_4point1(text):
    """
    Args:
        text (str): The text to be summarized.
    Returns:
        str: The summarized text.
    """
    try:
        # Sending a prompt to the OpenAI API with system and user role messages:
        response = openai_client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {
                    "role": "system",
                    "content": "You are a military intelligence analyst tasked with summarizing reports. Provide accurate summaries that capture key information while maintaining appropriate security posture and take care of ethical considerations."
                },
                {
                    "role": "user",
                    "content": f"Summarize this report and return text in well formatted way. Here is report text:\n\n{text}"
                }
            ],
            max_tokens=5000, # Limiting the output length / can be changed
            temperature=0.3, # Using a low temperature for focused outputs.
        )
        # Extracting and returning summary from the response
        return response.choices[0].message.content
    except Exception as e:
        # Handling any exceptions during the API call
        print(f"GPT-4.1 summarization failed: {type(e).__name__}: {e}")
        return f"Error: Could not generate GPT-4.1 summary. {str(e)}"

def summarize_with_claude(text):
    """Summarize text using Anthropic's Claude"""
    try:
        response = claude_client.messages.create(
            model="claude-2",
            max_tokens=500,
            messages=[
                {"role": "user", "content": f"Summarize this military report concisely:\n\n{text}"}
            ],
            system="You are a military intelligence analyst. Provide accurate, concise summaries that highlight key strategic information while maintaining appropriate security measures."
        )
        return response.content[0].text
    except Exception as e:
        print(f"Claude summarization failed: {str(e)}")
        return f"Error: Could not generate Claude summary. {str(e)}"

def summarize_with_bart(text, model_name="facebook/bart-large-cnn", max_input_tokens=1024, chunk_overlap=50,
                        chunk_max_length=500, chunk_min_length=50, final_max_length=2500, final_min_length=100):
    """
    Summarize long text using BART with token-based chunking and hierarchical summarization.
    Allows longer summaries by increasing max_length during generation.
    """
    # Initialize tokenizer and model
    tokenizer = BartTokenizer.from_pretrained(model_name)
    model = BartForConditionalGeneration.from_pretrained(model_name)
    
    # Tokenize the input text
    inputs = tokenizer(text, return_tensors="pt", truncation=False)
    input_ids = inputs["input_ids"][0]
    
    # Split into overlapping chunks
    chunks = []
    start = 0
    while start < len(input_ids):
        end = min(start + max_input_tokens, len(input_ids))
        chunks.append(input_ids[start:end])
        if end == len(input_ids):
            break
        start += max_input_tokens - chunk_overlap  # Move start point with overlap
    
    # Generate summaries for each chunk
    summaries = []
    for chunk in chunks:
        input_chunk = chunk.unsqueeze(0)  # Add batch dimension
        summary_ids = model.generate(
            input_chunk,
            max_length=chunk_max_length,
            min_length=chunk_min_length,
            length_penalty=2.0,
            num_beams=4,
            early_stopping=True
        )
        summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        summaries.append(summary)
    
    # Combine summaries and perform hierarchical summarization
    combined_summary = " ".join(summaries)
    inputs = tokenizer(combined_summary, return_tensors="pt", truncation=True, max_length=max_input_tokens)
    summary_ids = model.generate(
        inputs["input_ids"],
        max_length=final_max_length,
        min_length=final_min_length,
        length_penalty=2.0,
        num_beams=4,
        early_stopping=True
    )
    final_summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    
    return final_summary

def summarize_with_t5(text):
    return text
    
def summarize_with_gemini2point5_pro(text):
    """
    Summarize text using Google's Gemini Flash Preview API via the google-generativeai library.

    Args:
        text (str): The military report text to be summarized.

    Returns:
        str: The summarized text or an error message if the API call fails.
    """
    # Load the API key from environment variables
    api_key = os.getenv("GOOGLE_GENAI_API_KEY")
    if not api_key:
        logger.error("Gemini API key is not set in environment variables.")
        return "Error: Gemini API key not set."

    # Initialize model_name_to_use before the try block
    model_name_to_use = "gemini-2.5-flash-preview-04-17" # <-- Define intended model name here

    try:
        # Configure the genai library using the imported alias
        genai.configure(api_key=api_key)

        # --- Initialize the GenerativeModel ---
        logger.info(f"Attempting to use Gemini Preview model: {model_name_to_use}")
        model = genai.GenerativeModel(model_name_to_use)
        # --- End Initialization ---

        prompt = (
            "You are a military intelligence analyst tasked with summarizing reports. "
            "Provide a clear, concise, and accurate summary focusing on key facts, strategic implications, "
            "and ethical considerations. Return only the final summary.\n\n"
            f"{text}"
        )

        # --- Generate content using the model instance ---
        response = model.generate_content(prompt)
        # --- End Generation ---

        # --- Handle Response ---
        # (Response handling code remains the same)
        if response and hasattr(response, 'text') and response.text:
             return response.text.strip()
        elif response and hasattr(response, 'candidates') and response.candidates:
             if response.candidates[0].content and response.candidates[0].content.parts:
                 full_text = "".join(part.text for part in response.candidates[0].content.parts)
                 return full_text.strip()
             else:
                 logger.warning("Gemini response structure unexpected (candidates without content/parts).")
                 return "Error: Could not extract summary from Gemini response structure."
        else:
            logger.warning(f"Gemini response did not contain text or expected structure: {response}")
            return "Error: No summary generated or unexpected response format."
        # --- End Response Handling ---

    except ImportError:
        logger.error("google.generativeai package not found. Please install it using 'pip install google-generativeai'")
        return "Error: google-generativeai package not installed."
    except Exception as e:
        # Catch potential errors during model initialization or generation
        logger.error(f"Error calling Gemini API ({model_name_to_use}) via google.generativeai: {e}")
        error_details = str(e)
        if hasattr(e, 'message'):
             error_details = e.message
        if "permission denied" in error_details.lower() or \
           "not found" in error_details.lower() or \
           "quota" in error_details.lower() or \
           "resource_exhausted" in error_details.lower():
             error_details += " (This might be due to using a Preview model. Check access permissions, model availability, and API quotas.)"
        return f"Error: Could not generate summary using Gemini API. Details: {error_details}"

if __name__ == "__main__":
    # Test BART model loading
    try:
        load_models()
        print("BART model loaded successfully.")
    except Exception as e:
        print(f"Error loading BART model: {e}")
