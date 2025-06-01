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
# Load environment variables
load_dotenv()

# Initialize the models (load them only once)
models = {}

def load_models():
    """Initialize models on first use to save memory"""
    if not models.get("bart"):
        models["bart"] = pipeline("summarization", model="facebook/bart-large-cnn")

def summarize_text(text, model_name):
    # Make sure models are loaded
    #load_models()
    summary = None  
    # Generate summary using the selected model
    if model_name == "GPT-4.1":
        summary = summarize_with_gpt_4point1(text)
    elif model_name == "CLAUDE":
        summary = summarize_with_claude(text)
    elif model_name == "BART":
        summary = summarize_with_bart(text)
    elif model_name == "T5":
        summary = summarize_with_t5(text)
    elif model_name == "Gemini 2.5 Pro":
        summary = summarize_with_gemini2point5_pro(text)
    elif model_name == "DeepSeek-R1":
        summary = summarize_with_DeepSeek_R1_runpod(text)
    elif model_name == "Llama 3.1":
        summary = summarize_with_llama3_point_1(text)
    else:
        return "Error: Unsupported model selected. Please choose from GPT-4, Claude, BART, T5, or Gemini 2.5 Pro."
    return summary



def summarize_with_llama3_point_1(text: str) -> str:
    """Summarize text using RunPod’s Llama-3.1 via the OpenAI-compatible endpoint."""
    runpod_llama_endpoint_id = os.getenv("LLAMA3_POINT_1_ENDPOINT_ID")
    url = f"https://api.runpod.ai/v2/{runpod_llama_endpoint_id}/openai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {os.getenv('RUNPOD_API_KEY')}"
    }
    data = {
        "model": "meta-llama/Llama-3.1-8B-Instruct",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a military intelligence summarizer. "
                    "Provide an accurate, concise summary of the following report, "
                    "focusing on key facts, strategic implications, and ethical considerations. "
                    "Return only the final summary in plain text."
                )
            },
            {
                "role": "user",
                "content": text
            }
        ],
        "temperature": 0.3,
        "max_tokens": 3000,
        "presence_penalty": 0.1
    }
    try:
        response = requests.post(url, headers=headers, json=data, timeout=90)
        response.raise_for_status()
        result = response.json()
        # extract content
        content = result["choices"][0]["message"]["content"]
        return content.strip()
    except requests.exceptions.RequestException as e:
        logger.error(f"RunPod Llama-3.1 error: {e} – response: {getattr(response, 'text', '')}")
        return "Error: Could not generate summary using Llama-3.1. Please try again later."
    except (KeyError, IndexError):
        return "Error: Unexpected response format from Llama-3.1."


def summarize_with_DeepSeek_R1_runpod(text):
    deepseek_R1_endpoint_id = os.getenv("DEEPSEEK_R1_ENDPOINT_ID")
    url = f"https://api.runpod.ai/v2/{deepseek_R1_endpoint_id}/openai/v1/chat/completions"

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {os.getenv("RUNPOD_API_KEY")}'
    }

    data = {
        "model": "deepseek-ai/deepseek-r1-distill-qwen-1.5b",  
        "messages": [
            {
    "role": "user",
    "content": (
        "You are required to produce a single, clear, accurate summary of the following military intelligence report. "
        "You have only one chance. Focus on key facts, strategic implications, and ethical considerations. "
        "Do not respond in a conversational or reflective style. Do not say things like 'I think' or 'Let's analyze.' "
        "Return only the final summary in plain text\n\n"
        f"{text}"
        
        )
        }   

        ],
        "temperature": 0.3,
        "max_tokens": 3000,
        "presence_penalty": 0.1,
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()  
        # Extracting the summary content
        content = result['choices'][0]['message']['content']
        summary_start = content.find('</think>\n\n') + len('</think>\n\n')  # Find where the summary starts
        summary = content[summary_start:].strip()  # Get the rest of the content after that point
        # Log the extracted summary
        return summary
    except requests.exceptions.RequestException as e:
        return "Error: Could not generate summary using DeepSeek-R1.Some times initialization of the Gpu at RunPod takes time. Please try again after some time."
    except KeyError as e:
        return "Error: Unexpected response format from model."


def summarize_with_gpt_4point1(text):
    """
    Args:
        text (str): The text to be summarized.
    Returns:
        str: The summarized text.
    """
    # Loading the OpenAI API key from environment variables
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
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
                    "content": f"Summarize this report and return only summary plain text. Here is report text:\n\n{text}"
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
            max_tokens=1000,
            messages=[
                {"role": "user", "content": f"Summarize this military report and return summary in plain text:\n\n{text}"}
            ],
            system="You are a military intelligence analyst. Provide accurate, concise summaries that highlight key strategic information while maintaining appropriate security measures."
        )
        return response.content[0].text
    except Exception as e:
        print(f"Claude summarization failed: {str(e)}")
        return f"Error: Could not generate Claude summary. {str(e)}"

def summarize_with_bart(text, model_name="facebook/bart-large-cnn", max_input_tokens=1024, chunk_overlap=50,
                        chunk_max_length=500, chunk_min_length=50, final_max_length=1500, final_min_length=50):
    """
    Summarize long text using BART with token-based chunking and hierarchical summarization.
    Allows longer summaries by increasing max_length during generation.
    """
    text= "[INSTRUCTION BEGIN] " \
    "Summarize the following report with ethical considerations" \
    "[Report begins]" + text
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
    Summarize text using Google's Gemini pro via the google-generativeai library.

    Args:
        text (str): The military report text to be summarized.

    Returns:
        str: The summarized text or an error message
    """
    # Loading the API key from environment variables
    api_key = os.getenv("GOOGLE_GENAI_API_KEY")
    model_name_to_use = "gemini-2.5-pro-preview-05-06" 

    try:
        # Configuring the genai library using the imported alias
        genai.configure(api_key=api_key)
        # --- Check if the model is available ---
        model = genai.GenerativeModel(model_name_to_use)

        prompt = (
            "You are a military intelligence analyst tasked with summarizing reports. "
            "Provide accurate summaries that capture key information while maintaining appropriate security posture and taking care of ethical considerations."
            "Return only the final summary.\n\n"
            "Summarize this report and return only summary plain text. Here is report text:\n\n" + text
        )
        #Generating content using the model instance
        response = model.generate_content(prompt)
        #Handling Response
        if response and hasattr(response, 'text') and response.text:
             print(f"Gemini response: {response.text}")
             return response.text.strip()
    except Exception as e:
        # Catch potential errors
        if hasattr(e, 'message'):
             error_details = e.message
        return f"Error: Could not generate summary using Gemini API. Details: {error_details}"

if __name__ == "__main__":
    # Test BART model loading
    try:
        load_models()
        print("BART model loaded successfully.")
    except Exception as e:
        print(f"Error loading BART model: {e}")
