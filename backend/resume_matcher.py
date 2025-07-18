# backend/resume_matcher.py
# This file seems to be an older version or a utility not directly used by app.py's current logic
# The core logic for text extraction is now in app.py and matching in match_percentage.py.
# Keeping it here for completeness as it was in the original upload, but it's not strictly
# necessary for the current app.py functionality.

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import docx2txt
import PyPDF2
import os

def extract_text_from_file(file_path):
    """
    Extracts text from a given file path based on its extension.
    Supports .txt, .docx, and .pdf files.
    """
    ext = os.path.splitext(file_path)[-1].lower()

    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    elif ext == ".docx":
        return docx2txt.process(file_path)
    elif ext == ".pdf":
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text
    return ""

def match_resume_with_description(resume_text, job_description):
    """
    Calculates the cosine similarity percentage between a resume and a single job description.
    """
    vectorizer = TfidfVectorizer(stop_words='english')
    # Transform both texts into TF-IDF vectors
    tfidf_matrix = vectorizer.fit_transform([resume_text, job_description])
    # Calculate cosine similarity between the two vectors
    score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    return round(score * 100, 2)

# Example usage (if this file were run directly, which it isn't by app.py)
if __name__ == '__main__':
    # Dummy files for demonstration
    # In a real scenario, these would be actual file paths
    dummy_resume_path = "dummy_resume.txt"
    dummy_job_desc_path = "dummy_job_description.txt"

    # Create dummy files for testing purposes
    with open(dummy_resume_path, "w") as f:
        f.write("Experienced software engineer with skills in Python, Java, and web development.")
    with open(dummy_job_desc_path, "w") as f:
        f.write("Looking for a Python developer with strong web development experience.")

    resume_content = extract_text_from_file(dummy_resume_path)
    job_desc_content = extract_text_from_file(dummy_job_desc_path)

    if resume_content and job_desc_content:
        match_score = match_resume_with_description(resume_content, job_desc_content)
        print(f"Resume matches job description by: {match_score}%")
    else:
        print("Could not extract text from dummy files.")

    # Clean up dummy files
    os.remove(dummy_resume_path)
    os.remove(dummy_job_desc_path)
