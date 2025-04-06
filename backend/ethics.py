def ethical_check(summary, model_name):
    """
    Enhanced ethical check that provides feedback on why content is flagged
    
    Returns:
        tuple: (is_ethical, feedback)
    """
    # Military-specific sensitive or classified terms
    classified_terms = [
        "top secret", "classified", "confidential", "eyes only", "noforn", 
        "sensitive compartmented information", "sci", "comsec", "sigint"
    ]
    
    # Violence and harmful content terms
    violent_terms = [
        "kill", "massacre", "torture", "rape", "murder", "slaughter", 
        "bomb civilian", "genocide", "ethnic cleansing"
    ]
    
    # Political sensitivity terms
    political_terms = [
        "regime change", "assassination", "coup", "overthrow government"
    ]
    
    # Check for classified information
    classified_found = [term for term in classified_terms if term in summary.lower()]
    if classified_found:
        return False, f"classification terms: {', '.join(classified_found)}"
    
    # Check for violent content
    violent_found = [term for term in violent_terms if term in summary.lower()]
    if violent_found:
        return False, f"violent or harmful content: {', '.join(violent_found)}"
    
    # Check for politically sensitive content
    political_found = [term for term in political_terms if term in summary.lower()]
    if political_found:
        return False, f"politically sensitive content: {', '.join(political_found)}"
    
    # Check for very long summaries that might contain too much sensitive info
    if len(summary) > 2000:
        return False, "summary length exceeds security guidelines"
    
    return True, ""
