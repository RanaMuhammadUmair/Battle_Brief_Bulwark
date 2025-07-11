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
    if model_name == "GPT 4.1":
        # Use OpenAI GPT 4.1 via the OpenAI SDK
        summary = summarize_with_gpt_4point1(text)

    elif model_name == "Claude Sonnet 3.7":
        # Use Anthropic Claude Sonnet 3.7 client
        summary = summarize_with_claude_sonnet_3_7(text)

    elif model_name == "Bart":
        # Use Hugging Face’s Bart sequence‐to‐sequence model
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
            "Please choose from GPT 4.1, Claude Sonnet 3.7, Bart, "
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
    # Initializing the OpenAI API client using the key from environment variables
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    try:
        # Creating a chat completion request to GPT-4.1 with system and user messages
        response = openai_client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {
                    "role": "system",
                    "content": "You are a military intelligence analyst tasked with summarizing reports. Provide accurate summaries that capture key information while maintaining appropriate security posture and take care of ethical considerations."
                    "Return only the final summary in plain text (Paragraph form)."
                    "while writing summary, make sure summary should not include any markdown formatting, no lists, no headings, "
                    "no asterisks or backticks."
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            max_tokens=MAX_SUMMARY_TOKENS,  # Enforcing token cap for summary length
            temperature=0.3,           
        )
        # Extracting and returning the generated summary from the API response
        return response.choices[0].message.content

    except Exception as e:
        # Logging the exception and returning a user-friendly error message
        print(f"GPT-4.1 summarization failed: {type(e).__name__}: {e}")
        return f"Error: Could not generate GPT-4.1 summary. {str(e)}"

def summarize_with_claude_sonnet_3_7(text: str) -> str:
    """
    Summarize text using Anthropic Claude Sonnet 3.7 via the anthropic Python client.

    Args:
        text (str): The input report or document to summarize.

    Returns:
        str: The summary produced by Claude Sonnet 3.7 or an error message.
    """
    # Initializing the Anthropic client with API key from environment variables
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    try:
        # Sending a request to Claude Sonnet 3.7 with system instructions and user content
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            system=(
                "You are a military intelligence analyst tasked with summarizing reports. Provide accurate summaries that capture key information while maintaining appropriate security posture and take care of ethical considerations."
                "Return only the final summary in plain text (Paragraph form)."
                "while writing summary, make sure summary should not include any markdown formatting, no lists, no headings, "
                "no asterisks or backticks."
            ),
            messages=[{"role": "user", "content": text}],
            max_tokens=MAX_SUMMARY_TOKENS,  # Global Cap the summary length in tokens
            temperature=0.3,
        )
        # Extracting the generated summary text and trim whitespace
        summarize_text = response.content[0].text.strip()
        return summarize_text

    except Exception as e:
        # Logging the error for debugging and returning a user-friendly message
        logger.error(f"Claude Sonnet 3.7 (anthropic) summarization failed: {e}")
        return f"Error: Could not generate summary using Claude Sonnet 3.7. {e}"





def summarize_with_bart(text, model_name="facebook/bart-large-cnn", max_input_tokens=1024, 
                        chunk_overlap=150, chunk_max_length=200, chunk_min_length=50,
                        final_max_length=MAX_SUMMARY_TOKENS, final_min_length=150):
    """
    Summarize text using Facebook's BART (Bidirectional and Auto-Regressive Transformers) model.
    
    This function handles both short and long texts by implementing a chunking strategy for 
    texts that exceed the model's input token limit. For long texts, it processes overlapping
    chunks and then performs hierarchical summarization to produce a final coherent summary.
    
    Args:
        text (str): Input text to be summarized
        model_name (str): HuggingFace model identifier for BART variant
        max_input_tokens (int): Maximum tokens per chunk for model processing
        chunk_overlap (int): Number of overlapping tokens between consecutive chunks
        chunk_max_length (int): Maximum length for individual chunk summaries
        chunk_min_length (int): Minimum length for individual chunk summaries
        final_max_length (int): Maximum length for the final consolidated summary
        final_min_length (int): Minimum length for the final consolidated summary
        
    Returns:
        str: Generated summary text or error message if processing fails
    """
    try:
        # Initialize BART model and tokenizer with optimal device allocation
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        tokenizer = BartTokenizer.from_pretrained(model_name)
        model = BartForConditionalGeneration.from_pretrained(model_name).to(device)
        model.eval()  # Set to evaluation mode for inference optimization
        
        # Tokenize input text while preserving attention masks for proper model processing
        inputs = tokenizer(text, return_tensors="pt", truncation=False, 
                          add_special_tokens=True, return_attention_mask=True)
        input_ids = inputs["input_ids"][0]
        attention_mask = inputs["attention_mask"][0]
        
        # Handle short texts that fit within model's input capacity directly
        if len(input_ids) <= max_input_tokens:
            # Process entire text in single pass for optimal coherence
            input_batch = input_ids.unsqueeze(0).to(device)
            attention_batch = attention_mask.unsqueeze(0).to(device)
            
            # Generate summary with memory-efficient context management
            with torch.no_grad():
                summary_ids = model.generate(
                    input_batch,
                    attention_mask=attention_batch,
                    max_length=min(final_max_length, len(input_ids) // 2),  # Adaptive max length based on input size
                    min_length=max(final_min_length, len(input_ids) // 8),  # Adaptive min length for proportional summarization
                    length_penalty=1.0,      # Balanced penalty to avoid overly short/long outputs
                    num_beams=4,             # Beam search for higher quality generation
                    no_repeat_ngram_size=3,  # Prevent repetitive phrase generation
                    repetition_penalty=1.2,  # Mild penalty for repetition while maintaining coherence
                    early_stopping=True,     # Stop generation when optimal summary is found
                    do_sample=False          # Deterministic output for consistent results
                )
            
            # Decode and return the generated summary
            summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
            return summary.strip()
        
        # Calculate optimal chunking strategy for long texts
        # Distribute input tokens evenly across chunks to maintain context balance
        num_chunks = (len(input_ids) + max_input_tokens - 1) // max_input_tokens
        optimal_chunk_size = len(input_ids) // num_chunks if num_chunks > 1 else max_input_tokens
        
        # Create overlapping text chunks with preserved attention masks
        chunks = []
        attention_chunks = []
        start = 0
        
        # Implement intelligent chunking with sentence boundary awareness
        while start < len(input_ids):
            end = min(start + optimal_chunk_size, len(input_ids))
            
            # Attempt to break chunks at sentence boundaries to preserve semantic coherence
            if end < len(input_ids) and start > 0:
                # Search for sentence-ending punctuation within reasonable proximity
                search_start = max(end - 50, start + optimal_chunk_size // 2)
                period_positions = [i for i in range(search_start, end) 
                                  if tokenizer.decode([input_ids[i]]).strip() in '.!?']
                if period_positions:
                    end = period_positions[-1] + 1  # Include the punctuation token
            
            # Store chunk and corresponding attention mask
            chunks.append(input_ids[start:end])
            attention_chunks.append(attention_mask[start:end])
            
            # Check for completion of input processing
            if end == len(input_ids):
                break
            start = end - chunk_overlap  # Maintain context continuity with overlap
        
        # Process individual chunks with robust error handling
        summaries = []
        for i, (chunk, attn_chunk) in enumerate(zip(chunks, attention_chunks)):
            try:
                # Prepare chunk tensors for GPU/CPU processing
                input_batch = chunk.unsqueeze(0).to(device)
                attention_batch = attn_chunk.unsqueeze(0).to(device)
                
                # Generate summary for current chunk with optimized parameters
                with torch.no_grad():
                    summary_ids = model.generate(
                        input_batch,
                        attention_mask=attention_batch,
                        max_length=chunk_max_length,    # Consistent chunk summary length
                        min_length=chunk_min_length,    # Ensure meaningful content in each summary
                        length_penalty=1.0,             # Balanced length optimization
                        num_beams=3,                    # Reduced beam size for processing speed
                        no_repeat_ngram_size=3,         # Prevent repetitive content
                        repetition_penalty=1.2,         # Encourage diverse vocabulary usage
                        early_stopping=True,            # Optimize generation efficiency
                        do_sample=False                 # Deterministic chunk processing
                    )
                
                # Decode chunk summary and add to collection
                summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
                summaries.append(summary.strip())
            
                
            except Exception as e:
                # Log chunk processing errors but continue with remaining chunks
                logger.error(f"Error processing chunk {i+1}: {e}")
                continue
        
        # Validate that at least some chunks were processed successfully
        if not summaries:
            return "Error: Failed to process any text chunks with BART."
        
        # Consolidate individual chunk summaries into coherent final summary
        combined_summary = " ".join(summaries)
        
        # Check if combined summary is within acceptable length limits
        combined_tokens = tokenizer(combined_summary, return_tensors="pt")["input_ids"]
        if len(combined_tokens[0]) <= final_max_length:
            return combined_summary
        
        # Perform hierarchical summarization when combined summary exceeds limits
        # Truncate combined summary to model's input capacity if necessary
        final_inputs = tokenizer(combined_summary, return_tensors="pt", 
                               truncation=True, max_length=max_input_tokens,
                               return_attention_mask=True)
        
        # Prepare final summarization batch tensors
        input_batch = final_inputs["input_ids"].to(device)
        attention_batch = final_inputs["attention_mask"].to(device)
        
        # Generate final consolidated summary with enhanced quality parameters
        with torch.no_grad():
            summary_ids = model.generate(
                input_batch,
                attention_mask=attention_batch,
                max_length=final_max_length,        # Global summary length constraint
                min_length=final_min_length,        # Ensure comprehensive coverage
                length_penalty=1.0,                 # Balanced output length optimization
                num_beams=4,                        # Higher quality for final summary
                no_repeat_ngram_size=3,             # Prevent repetitive final content
                repetition_penalty=1.2,             # Encourage vocabulary diversity
                early_stopping=True,                # Efficient generation termination
                do_sample=False                     # Consistent final output
            )
        
        # Decode and return the final hierarchical summary
        final_summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        return final_summary.strip()
    
    except Exception as e:
        # Log comprehensive error information for debugging
        logger.error(f"BART summarization failed: {e}")
        return f"Error: Could not generate summary using BART. {str(e)}"
    
    finally:
        # Perform GPU memory cleanup to prevent accumulation of cached tensors
        if torch.cuda.is_available():
            torch.cuda.empty_cache()






    
def summarize_with_gemini2point5_pro(text):
    """
    Summarize text using Google's Gemini pro via the google-generativeai library.

    Args:
        text (str): The military report text to be summarized.

    Returns:
        str: The summarized text or an error message
    """
    # Retrieving the Google Generative AI API key from environment variables
    api_key = os.getenv("GOOGLE_GENAI_API_KEY")
    model_name_to_use = "gemini-2.5-pro-preview-05-06" 

    try:
        # Configuring the Google Generative AI library with authentication credentials
        genai.configure(api_key=api_key)
        
        # Initializing the Gemini model instance with the specified version
        model = genai.GenerativeModel(model_name_to_use)

        # Constructing the prompt with military intelligence analyst role and ethical guidelines
        prompt = (
            "You are a military intelligence analyst tasked with summarizing reports. "
            "Provide accurate summaries that capture key information while maintaining appropriate security posture and taking care of ethical considerations."
            "Summarize this report and return only summary in plain text. Here is report text:\n\n" + text
        )
        
        # Generating summary content using the Gemini model with the constructed prompt
        response = model.generate_content(prompt)
        
        # Validating response structure and extracting summary text
        if response and hasattr(response, 'text') and response.text:
             # Returning the cleaned summary with whitespace trimmed
             return response.text.strip()
             
    except Exception as e:
        # Extracting detailed error information when available for better debugging
        error_details = e.message if hasattr(e, 'message') else str(e)
        
        # Returning user-friendly error message with technical details
        return f"Error: Could not generate summary using Gemini API. Details: {error_details}"



def summarize_with_grok_3(text: str) -> str:
    """
    Summarize *text* with xAI’s Grok 3-latest model.

    Args:
        text (str): The report or document to be summarized.
    Returns:
        str: A concise, plain-text summary.
    """
    # Initializing Grok client with XAI API key and custom base URL
    grok_client = OpenAI(
        api_key=os.getenv("XAI_API_KEY"),
        base_url="https://api.x.ai/v1",
    )

    try:
        # Building and sending chat completion request
        response = grok_client.chat.completions.create(
            model="grok-3-latest",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a military intelligence analyst tasked with summarizing reports. Provide accurate summaries that capture key information while maintaining appropriate security posture and take care of ethical considerations. "
                        "Return only the final summary in plain text (Paragraph form)."
                        "while writing summary, make sure summary should not include any markdown formatting, no lists, no headings, "
                        "no asterisks or backticks."
                
                    ),
                },
                {
                    "role": "user",
                    "content": text,
                },
            ],
            max_tokens=MAX_SUMMARY_TOKENS,  # enforcing global token cap for summary
            temperature=0.3,
            stream=False,                  # disabling streaming mode
        )

        # Extracting the assistant’s reply and trim whitespace
        return response.choices[0].message.content.strip()

    except Exception as e:
        # Printing error detail and return user‐friendly message
        print(f"Grok-3 summarization failed: {type(e).__name__}: {e}")
        return f"Error: Could not generate Grok-3 summary. {e}"






def summarize_with_mistral_small(text: str) -> str:
    """
    Summarize text using Mistral AI's small model via their Python SDK.

    This function connects to Mistral's API to generate concise summaries of military
    intelligence reports while maintaining security posture and ethical considerations.
    The function uses the 'mistral-small-latest' model with controlled generation
    parameters to ensure consistent, high-quality summaries.

    Args:
        text (str): The input report or document text to be summarized.

    Returns:
        str: A plain-text summary without markdown formatting, or an error message
             if the summarization process fails.
    """
    # Initializing Mistral client with API key from environment variables
    client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))

    # Validating client initialization to prevent downstream errors
    if not client:
        return "Error: Mistral client initialization failed. Please check your API key."

    try:
        # Sending chat completion request to Mistral's small model
        response = client.chat.complete(
            model="mistral-small-latest",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a military intelligence analyst tasked with summarizing reports. Provide accurate summaries that capture key information while maintaining appropriate security posture and take care of ethical considerations. "
                        "Return only the final summary in plain text (Paragraph form)."
                        "while writing summary, make sure summary should not include any markdown formatting, no lists, no headings, "
                        "no asterisks or backticks."
                    ),
                },
                {
                    "role": "user",
                    "content": text
                },
            ],
            max_tokens=MAX_SUMMARY_TOKENS,  # Enforce global token limit for consistency
            temperature=0.3,              
            stream=False,                   # Disable streaming for complete response handling
        )

        # Extracting and returning the generated summary with whitespace trimmed
        return response.choices[0].message.content.strip()

    except Exception as e:
        # Returning user-friendly error message with technical details
        return f"Error: Could not generate Mistral summary. {e}"
