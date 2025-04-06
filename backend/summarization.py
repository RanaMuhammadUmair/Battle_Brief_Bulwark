import os
import openai
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
import anthropic
from backend.ethics import ethical_check

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
    return "The document contains sensitive content that cannot be summarized. Please try another document or consult with your supervisor."

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

def summarize_with_bart(text):
    """Summarize text using BART model"""
    try:
        # Ensure the BART model is loaded
        load_models()

        # Truncate input if it's too long
        max_input_length = 1024
        if len(text.split()) > max_input_length:
            text = " ".join(text.split()[:max_input_length])
        
        # Generate summary
        summary = models["bart"](text, max_length=150, min_length=50, do_sample=False)[0]['summary_text']
        return summary
    except Exception as e:
        print(f"BART summarization failed: {str(e)}")
        return f"Error: Could not generate BART summary. {str(e)}"

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
