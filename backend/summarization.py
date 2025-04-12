import os
import openai
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM, BartTokenizer, BartForConditionalGeneration
import anthropic
from ethics import ethical_check
import torch

# Load API keys from environment variables
openai.api_key = os.getenv("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY")
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

def summarize_text(text, model_name, max_attempts=3):
    """
    Summarize text using the specified model.
    Apply ethical checks and retry if needed.
    
    Args:
        text: Input text to summarize
        model_name: Name of the model to use
        max_attempts: Max number of attempts for ethical filtering
    
    Returns:
        Summarized text that passes ethical checks
    """
    # Make sure models are loaded
    load_models()
    
    # Initialize attempt counter
    attempts = 0
    summary = None
    
    while attempts < max_attempts:
        attempts += 1
        
        # Generate summary using the selected model
        if model_name.lower() == "gpt4":
            summary = summarize_with_gpt4(text)
        elif model_name.lower() == "claude":
            summary = summarize_with_claude(text)
        elif model_name.lower() == "bart":
            summary = summarize_with_bart(text)
        elif model_name.lower() == "t5":
            summary = summarize_with_t5(text)
        else:
            return "Error: Unsupported model selected. Please choose from GPT-4, Claude, BART, or T5."
        
        # Check if summary is ethical
        is_ethical, feedback = ethical_check(summary, model_name)
        
        if is_ethical:
            return summary
        
        # If not ethical and we have more attempts, try again with feedback
        if attempts < max_attempts:
            text = text + f"\n\nPlease ensure the summary avoids: {feedback}"
    
    # If we've exhausted attempts, return a sanitized version
    return "*The document contains sensitive content that required human review. Please consult with your supervisor before using this summary.* \n Summary: {summary}"

def summarize_with_gpt4(text):
    """Summarize text using OpenAI's GPT-4"""
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a military intelligence analyst tasked with summarizing reports. Provide concise, accurate summaries that capture key information while maintaining appropriate security posture."},
                {"role": "user", "content": f"Summarize this report concisely:\n\n{text}"}
            ],
            max_tokens=500
        )
        return response['choices'][0]['message']['content']
    except Exception as e:
        print(f"GPT-4 summarization failed: {str(e)}")
        return f"Error: Could not generate GPT-4 summary. {str(e)}"

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

def summarize_with_bart(text, model_name="facebook/bart-large-cnn", max_input_tokens=1024, chunk_overlap=50):
    """
    Summarize long text using BART with token-based chunking and hierarchical summarization.
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
        chunk = input_ids[start:end]
        chunks.append(chunk)
        if end == len(input_ids):
            break
        start += max_input_tokens - chunk_overlap  # Move start point with overlap

    # Generate summaries for each chunk
    summaries = []
    for chunk in chunks:
        input_chunk = chunk.unsqueeze(0)  # Add batch dimension
        summary_ids = model.generate(
            input_chunk,
            max_length=200,
            min_length=50,
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
        max_length=200,
        min_length=50,
        length_penalty=2.0,
        num_beams=4,
        early_stopping=True
    )
    final_summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)

    return final_summary
    

def summarize_with_t5(text):
    """Summarize text using T5-small model"""
    try:
        model, tokenizer = models["t5"]
        
        # Truncate input if it's too long
        max_length = 512
        inputs = tokenizer("summarize: " + text, return_tensors="pt", max_length=max_length, truncation=True)
        
        # Generate summary
        summary_ids = model.generate(
            inputs.input_ids, 
            max_length=150, 
            min_length=40, 
            length_penalty=2.0, 
            num_beams=4, 
            early_stopping=True
        )
        
        summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        return summary
    except Exception as e:
        print(f"T5 summarization failed: {str(e)}")
        return f"Error: Could not generate T5 summary. {str(e)}"

if __name__ == "__main__":
    # Test BART model loading
    try:
        load_models()
        print("BART model loaded successfully.")
    except Exception as e:
        print(f"Error loading BART model: {e}")
