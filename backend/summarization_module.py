import os
from dotenv import load_dotenv
from openai import OpenAI
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM, BartTokenizer, BartForConditionalGeneration, PegasusTokenizer, PegasusForConditionalGeneration
import anthropic
import torch
import requests
import runpod
import logging
from mistralai import Mistral
import google.generativeai as genai

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
# Load environment variables
load_dotenv()

#global cap for all summaries (in tokens)
MAX_SUMMARY_TOKENS = 650

def summarize_text(text, model_name):
    """
    Dispatch text summarization to the selected model implementation.

    Args:
        text (str): The input report or document to summarize.
        model_name (str): Identifier of the summarization model to use.
            Supported values:
              - "GPT-4.1"
              - "CLAUDE SONNET 3.7"
              - "BART"
              - "Mistral small"
              - "Gemini 2.5 Pro"
              - "DeepSeek-R1"
              - "Llama 3.1"
              - "Grok 3"

    Returns:
        str: The summary produced by the chosen model function. If an
             unsupported model is passed, returns an error message listing
             valid options.
    """
    summary = None

    # Select the appropriate summarization backend based on model_name
    if model_name == "GPT-4.1":
        # Use OpenAI GPT-4.1 via the OpenAI SDK
        summary = summarize_with_gpt_4point1(text)

    elif model_name == "CLAUDE SONNET 3.7":
        # Use Anthropic Claude Sonnet 3.7 client
        summary = summarize_with_claude_sonnet_3_7(text)

    elif model_name == "BART":
        # Use Hugging Face’s BART sequence‐to‐sequence model
        summary = summarize_with_bart(text)

    elif model_name == "Mistral small":
        # Use Mistral AI’s small model via their Python SDK
        summary = summarize_with_mistral_small(text)

    elif model_name == "Gemini 2.5 Pro":
        # Use Google’s Gemini 2.5 Pro via google-generativeai
        summary = summarize_with_gemini2point5_pro(text)

    elif model_name == "DeepSeek-R1":
        # Use DeepSeek-R1 hosted on RunPod
        summary = summarize_with_DeepSeek_R1_runpod(text)

    elif model_name == "Llama 3.1":
        # Use RunPod’s Llama-3.1 via the OpenAI-compatible endpoint
        summary = summarize_with_llama3_point_1(text)

    elif model_name == "Grok 3":
        # Use xAI’s Grok 3-latest model via OpenAI-compatible client
        summary = summarize_with_grok_3(text)

    else:
        # Fallback for unsupported model names
        return (
            "Error: Unsupported model selected. "
            "Please choose from GPT-4.1, CLAUDE SONNET 3.7, BART, "
            "Mistral small, Gemini 2.5 Pro, DeepSeek-R1, Llama 3.1, or Grok 3."
        )

    return summary

def summarize_with_llama3_point_1(text: str) -> str:
    """
    Summarizing text using RunPod’s Llama-3.1 via the OpenAI-compatible endpoint.

    Args:
        text (str): The input text to be summarized.

    Returns:
        str: The generated summary, or an error message on failure.
    """
    # Retrieving the RunPod endpoint identifier from environment variables
    runpod_llama_endpoint_id = os.getenv("LLAMA3_POINT_1_ENDPOINT_ID")

    # Constructing endpoint URL for chat completions
    url = f"https://api.runpod.ai/v2/{runpod_llama_endpoint_id}/openai/v1/chat/completions"

    # Preparing request headers (JSON + Bearer authorization)
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {os.getenv('RUNPOD_API_KEY')}"
    }

    # Building the payload with system/user messages and generation parameters
    data = {
        "model": "meta-llama/Llama-3.1-8B-Instruct",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a military intelligence analyst tasked with summarizing intelligence reports. Provide accurate summaries that capture key information while maintaining appropriate security posture and take care of ethical considerations."
                    "Return only the final summary in plain text (Paragraph form)."
                    "while writing summary, make sure summary should not include any markdown formatting, no lists, no headings, "
                    "no asterisks or backticks."
                )
            },
            {"role": "user", "content": text}
        ],
        "temperature": 0.3,              
        "max_tokens": MAX_SUMMARY_TOKENS, # Enforcing global summary token cap
        "presence_penalty": 0.1           # Discourage repetitive phrases
    }

    try:
        # Executing the POST request with a 120s timeout
        response = requests.post(url, headers=headers, json=data, timeout=120)
        response.raise_for_status()

        # Parsing JSON and extract the assistant’s reply
        result = response.json()
        content = result["choices"][0]["message"]["content"]

        # Returning the cleaned summary
        return content.strip()

    except requests.exceptions.RequestException as e:
        # Log HTTP/network errors and surface a user-friendly message
        logger.error(
            f"RunPod Llama-3.1 error: {e} – response: {getattr(response, 'text', '')}"
        )
        return "Error: Could not generate summary using Llama-3.1. Please try again later."

    except (KeyError, IndexError):
        # Handling unexpected or malformed API responses
        return "Error: Unexpected response format from Llama-3.1."


def summarize_with_DeepSeek_R1_runpod(text):
    """
    Summarizing text using DeepSeek-R1 hosted on RunPod via the OpenAI-compatible endpoint.

    Args:
        text (str): The input report text to be summarized.

    Returns:
        str: The generated summary, or an error message on failure.
    """
    # Retrieving the RunPod endpoint identifier for DeepSeek-R1 from environment
    deepseek_R1_endpoint_id = os.getenv("DEEPSEEK_R1_ENDPOINT_ID")
    # Constructing the RunPod chat completions URL
    url = f"https://api.runpod.ai/v2/{deepseek_R1_endpoint_id}/openai/v1/chat/completions"

    # Preparing request headers with JSON content type and Bearer token
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {os.getenv('RUNPOD_API_KEY')}"
    }

    # Building the payload: model spec, system/user prompts, and generation parameters
    data = {
        "model": "deepseek-ai/deepseek-r1-distill-qwen-1.5b",
        "messages": [
            {
            "role": "system",
            "content": (
                "You are a military intelligence analyst tasked with summarizing reports. Provide accurate summaries that capture key information while maintaining appropriate security posture and take care of ethical considerations."
                "Return only the final summary in plain text (Paragraph form)."
                "while writing summary, make sure maximum length of summary text should be {MAX_SUMMARY_TOKENS} tokens."
                "summary should not include any markdown formatting, no lists, no headings, "
                "no asterisks or backticks."
                
                
                
                
            ),
            },
            {"role": "user", "content": text}
        ],
        "temperature": 0.3,
        "max_tokens": MAX_SUMMARY_TOKENS * 4,    # Allowing buffer for internal reasoning tokens of DeepSeek-R1
        "presence_penalty": 0.1                  # Discourage repetition
    }

    try:
        # Executing the POST request with a 120-second timeout
        response = requests.post(url, headers=headers, json=data, timeout=120)
        response.raise_for_status()

        # Parsing JSON response and extracting the assistant's message content
        result = response.json()
        content = result["choices"][0]["message"]["content"]

        # Removing internal <think> block and strip whitespace
        marker = "</think>\n\n"
        start = content.find(marker)
        summary = content[start + len(marker):].strip() if start != -1 else content.strip()

        # Cleaning up any bold markdown artifacts
        return summary.replace("**", "")

    except requests.exceptions.RequestException as e:
        # Logging HTTP/network errors and returning a user-friendly message
        logger.error(f"RunPod DeepSeek-R1 error: {e} – response: {getattr(response, 'text', '')}")
        return "Error: Could not generate summary using DeepSeek-R1. Please try again later."

    except (KeyError, IndexError) as e:
        # Handling unexpected JSON structure
        logger.error(f"DeepSeek-R1 unexpected response format: {e}")
        return "Error: Unexpected response format from DeepSeek-R1."

    except ValueError as e:
        # Handling JSON decoding errors
        logger.error(f"DeepSeek-R1 JSON decode failed: {e}")
        return "Error: Invalid JSON response from DeepSeek-R1."


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
                    "content": f"Summarize this report and return only summary in plain text. Here is report text:\n\n{text}"
                }
            ],
            max_tokens=MAX_SUMMARY_TOKENS,      # ← use global cap
            temperature=0.3,
        )
        # Extracting and returning summary from the response
        return response.choices[0].message.content
    except Exception as e:
        # Handling any exceptions during the API call
        print(f"GPT-4.1 summarization failed: {type(e).__name__}: {e}")
        return f"Error: Could not generate GPT-4.1 summary. {str(e)}"

def summarize_with_claude_sonnet_3_7(text: str) -> str:
    """Summarize text using Claude Sonnet 3.7 via the anthropic Python client."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    try:
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            system=(
                "You are a military intelligence analyst tasked with summarizing reports. "
                "Provide accurate, concise summaries focusing on key facts, strategic implications, "
                "and ethical considerations. Return only the final summary in plain text."
            ),
            messages=[{"role": "user", "content": text}],
            max_tokens=MAX_SUMMARY_TOKENS,
            temperature=0.3,
        )
        summarize_text = response.content[0].text.strip()
        return summarize_text
    except Exception as e:
        logger.error(f"Claude Sonnet 3.7 (anthropic) summarization failed: {e}")
        return f"Error: Could not generate summary using Claude Sonnet 3.7. {e}"


def summarize_with_bart(text, model_name="facebook/bart-large-cnn", max_input_tokens=1024, chunk_overlap=50,
                        chunk_max_length=500, chunk_min_length=50, final_max_length=500,  # ← default to cap
                        final_min_length=100):
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



def summarize_with_grok_3(text: str) -> str:
    """
    Summarize *text* with xAI’s Grok 3-latest model.

    Args:
        text (str): The report or document to be summarized.
    Returns:
        str: A concise, plain-text summary.
    """

    grok_client = OpenAI(
        api_key=os.getenv("XAI_API_KEY"),
        base_url="https://api.x.ai/v1",
    )

    try:
        response = grok_client.chat.completions.create(
            model="grok-3-latest",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a military intelligence analyst tasked with summarizing reports. Provide accurate summaries that capture key information while maintaining appropriate security posture and take care of ethical considerations. "
                
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Summarize this report and output *only* the summary "
                        "as plain text:\n\n" + text
                    ),
                },
            ],
            max_tokens=MAX_SUMMARY_TOKENS,
            temperature=0.3,
            stream=False,     
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"Grok-3 summarization failed: {type(e).__name__}: {e}")
        return f"Error: Could not generate Grok-3 summary. {e}"






def summarize_with_mistral_small(text: str) -> str:
    """
    Summarize *text* with Mistral’s `mistral-small` model.

    Args:
        text (str): Raw report text.
    Returns:
        str: Concise plain-text summary.
    """

    client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))
    if not client:
        return "Error: Mistral client initialization failed. Please check your API key."

    try:
        response = client.chat.complete(
            model="mistral-small-latest",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a military intelligence analyst tasked with summarizing reports. Provide accurate summaries that capture key information while maintaining appropriate security posture and take care of ethical considerations. "
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Summarize this report and output only summary plain text:\n\n" + text
                    ),
                },
            ],
            max_tokens=MAX_SUMMARY_TOKENS,
            temperature=0.3,
            stream=False,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"Mistral summarization failed: {type(e).__name__}: {e}")
        return f"Error: Could not generate Mistral summary. {e}"


