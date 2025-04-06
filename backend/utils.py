import os
import PyPDF2
import docx
import magic

def extract_text_from_file(file_path, filename):
    """
    Extract text from various file types
    Supported: PDF, DOC/DOCX, TXT
    """
    # Determine file type using python-magic
    mime = magic.Magic(mime=True)
    file_type = mime.from_file(file_path)
    
    # Extract text based on file type
    if "pdf" in file_type:
        return extract_from_pdf(file_path)
    elif "msword" in file_type or "officedocument.wordprocessing" in file_type:
        return extract_from_docx(file_path)
    elif "text/plain" in file_type:
        return extract_from_txt(file_path)
    else:
        # If file type is not supported, try to determine from extension
        ext = os.path.splitext(filename)[1].lower()
        if ext == '.pdf':
            return extract_from_pdf(file_path)
        elif ext == '.docx' or ext == '.doc':
            return extract_from_docx(file_path)
        elif ext == '.txt':
            return extract_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

def extract_from_pdf(file_path):
    """Extract text from a PDF file"""
    text = ""
    try:
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            num_pages = len(reader.pages)
            
            for page_num in range(num_pages):
                page = reader.pages[page_num]
                text += page.extract_text()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
    
    return text

def extract_from_docx(file_path):
    """Extract text from a DOCX file"""
    try:
        doc = docx.Document(file_path)
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])
    except Exception as e:
        print(f"Error extracting text from DOCX: {e}")
        return ""

def extract_from_txt(file_path):
    """Extract text from a plain text file"""
    try:
        with open(file_path, 'r', errors='replace') as file:
            return file.read()
    except Exception as e:
        print(f"Error extracting text from TXT: {e}")
        return ""
