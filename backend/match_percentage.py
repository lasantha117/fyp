# backend/match_percentage.py

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import re
import numpy as np
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import spacy

# --- NLTK Data Download (Run once) ---
def download_nltk_data():
    """
    Ensures necessary NLTK data is downloaded.
    This function will attempt to download the data if it's not found.
    """
    print("Checking and downloading NLTK data...")
    try:
        nltk.download('stopwords', quiet=True)
        print("NLTK 'stopwords' data checked/downloaded.")
    except Exception as e:
        print(f"Error downloading NLTK 'stopwords' data: {e}")

    try:
        nltk.download('wordnet', quiet=True)
        print("NLTK 'wordnet' data checked/downloaded.")
    except Exception as e:
        print(f"Error downloading NLTK 'wordnet' data: {e}")

    try:
        nltk.download('punkt', quiet=True)
        print("NLTK 'punkt' data checked/downloaded.")
    except Exception as e:
        print(f"Error downloading NLTK 'punkt' data: {e}")

download_nltk_data() # Call this function once when the module is imported

# --- Global NLP Resources ---
# Load a pre-trained sentence transformer model for semantic similarity
model = None # Initialize model to None
try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print("SentenceTransformer model loaded successfully.")
except Exception as e:
    print(f"Error loading SentenceTransformer model: {e}")
    print("Please ensure you have an active internet connection for the first run to download the model.")
    # model remains None if loading fails to trigger fallback

# Load SpaCy model for advanced NLP (tokenization, lemmatization)
nlp = None
try:
    nlp = spacy.load('en_core_web_sm')
    print("SpaCy 'en_core_web_sm' model loaded successfully.")
except OSError:
    print("SpaCy 'en_core_web_sm' model not found. Attempting to download it now...")
    try:
        spacy.cli.download('en_core_web_sm')
        nlp = spacy.load('en_core_web_sm')
        print("SpaCy 'en_core_web_sm' model downloaded and loaded.")
    except Exception as e:
        print(f"Error downloading or loading SpaCy model: {e}")
        print("SpaCy features (advanced tokenization, lemmatization) will be unavailable.")

# Initialize stop words - Re-introducing standard stop words
stop_words = set(stopwords.words('english'))

lemmatizer = WordNetLemmatizer()

# --- Helper Functions ---

def filter_pii(text):
    """
    Filters out personally identifiable information (PII) from the text.
    Focuses on emails and phone numbers using regex.
    Names are harder to filter accurately without a custom NER model,
    so we avoid generic name removal to prevent false positives.
    """
    # Remove email addresses
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', text)
    # Remove common phone number patterns (adjust regex for specific formats if needed)
    text = re.sub(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', '', text)
    # Remove URLs (already in clean_text, but good to have here too for PII context)
    text = re.sub(r'http\S+|www.\S+', '', text)
    return text

def preprocess_text(text):
    """
    Cleans, tokenizes, and lemmatizes text using SpaCy and NLTK.
    Ensures only relevant tokens are kept, allowing for common tech skill characters.
    Re-introduces standard stop word filtering.
    Removes the minimum length filter to allow short but important keywords.
    """
    print(f"--- Preprocessing Text (first 50 chars): '{text[:50]}' ---")
    # Apply PII filtering before further processing
    text = filter_pii(text)

    if nlp is None:
        print("Using NLTK fallback for preprocessing.")
        text = text.lower()
        # Allow alphanumeric, spaces, and common tech skill characters: ., #, +, -
        text = re.sub(r'[^a-z0-9\s\.\#\+\-]', '', text) 
        text = re.sub(r'\s+', ' ', text).strip()
        tokens = nltk.word_tokenize(text)
        print(f"NLTK Raw Tokens: {tokens}")
        
        processed_tokens = []
        for word in tokens:
            # Check if word contains any alphanumeric character or allowed symbol
            if any(c.isalnum() or c in ['.', '#', '+', '-'] for c in word):
                lemmatized_word = lemmatizer.lemmatize(word)
                # Re-introducing stop word check
                if lemmatized_word not in stop_words:
                    # Removed len(lemmatized_word) > 1 filter to keep short, significant words
                    processed_tokens.append(lemmatized_word)
        print(f"NLTK Processed Tokens: {processed_tokens}")
        return " ".join(processed_tokens)

    print("Using SpaCy for preprocessing.")
    doc = nlp(text.lower())
    tokens = []
    print(f"SpaCy Raw Tokens:")
    for token in doc:
        print(f"  - '{token.text}' (is_alpha: {token.is_alpha}, is_punct: {token.is_punct}, is_stop: {token.is_stop})")
        # Keep tokens that are alphanumeric OR contain allowed tech symbols, not just punctuation
        # Also ensure they are not just whitespace
        is_tech_skill_char = any(c in ['.', '#', '+', '-'] for c in token.text)
        
        # Re-introducing token.is_stop check
        if (token.is_alpha or token.is_digit or is_tech_skill_char) and not token.is_punct and not token.is_stop and token.text.strip():
            # Removed min length filter: len(token.text.strip()) > 1
            tokens.append(token.lemma_) # Use lemma for root form of the word
    print(f"SpaCy Processed Tokens: {tokens}")
    return " ".join(tokens)

def extract_key_information(text):
    """
    Extracts and prioritizes text from key sections using regex headers.
    First filters PII, then preprocesses, then combines sections with weighting.
    Also ensures section headers themselves are not heavily weighted.
    This function is primarily for parsing resumes where structure is less predictable.
    """
    print(f"\n--- Extracting Key Information from Resume (first 50 chars): '{text[:50]}' ---")
    # 1. Filter PII first from the raw text
    text_without_pii = filter_pii(text)

    # 2. Define common section headers and their priority weights
    section_headers = {
        'skills': ['skills', 'technical skills', 'technologies', 'expertise', 'core competencies', 'proficiencies', 'key skills'],
        'experience': ['experience', 'work experience', 'professional experience', 'employment history'],
        'education': ['education', 'academic background', 'qualifications'],
        'projects': ['projects', 'portfolio', 'key projects'],
        'summary': ['summary', 'profile', 'about me', 'objective'],
        'certifications': ['certifications', 'licenses'],
    }

    extracted_sections = {name: [] for name in section_headers}
    extracted_sections['other'] = []

    # Split text by lines to process section by section
    lines = text_without_pii.split('\n')
    current_section_key = 'other'

    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue

        found_header = False
        for sec_key, headers in section_headers.items():
            # Check if the line is a potential section header (case-insensitive)
            # Use word boundaries to match whole words and ensure it's a header, not just a word in a sentence
            if any(re.search(r'\b' + re.escape(h) + r'\b', line_stripped.lower()) for h in headers):
                # If it's a header, don't add the header itself to the content, just change the section
                current_section_key = sec_key
                found_header = True
                break
        
        if not found_header:
            extracted_sections[current_section_key].append(line_stripped)

    # Combine extracted sections with weighting (after preprocessing each part)
    combined_text_parts = []
    
    # Prioritize skills heavily (repeat preprocessed text)
    if extracted_sections['skills']:
        processed_skills = preprocess_text(" ".join(extracted_sections['skills']))
        print(f"Extracted & Processed Skills Section: '{processed_skills}'")
        combined_text_parts.extend([processed_skills] * 5) # Even higher weight for skills
    
    if extracted_sections['experience']:
        processed_experience = preprocess_text(" ".join(extracted_sections['experience']))
        combined_text_parts.extend([processed_experience] * 2) # Double weight

    # Add other relevant sections with less weight
    if extracted_sections['projects']:
        combined_text_parts.append(preprocess_text(" ".join(extracted_sections['projects'])))
    if extracted_sections['summary']:
        combined_text_parts.append(preprocess_text(" ".join(extracted_sections['summary'])))
    if extracted_sections['education']:
        combined_text_parts.append(preprocess_text(" ".join(extracted_sections['education'])))
    if extracted_sections['certifications']:
        combined_text_parts.append(preprocess_text(" ".join(extracted_sections['certifications'])))

    # Fallback to the entire preprocessed text if no specific sections were found
    # or if skills section was empty, still include other processed text for context
    if not combined_text_parts:
        processed_full_text = preprocess_text(text_without_pii)
        print(f"No specific sections found, using full processed text: '{processed_full_text}'")
        combined_text_parts.append(processed_full_text)

    final_extracted_text = " ".join(combined_text_parts).strip()
    print(f"Final Extracted Key Information: '{final_extracted_text}'")
    print(f"--- Finished Extracting Key Information ---")
    return final_extracted_text


def calculate_semantic_match(resume_text, job_descriptions):
    """
    Calculates the semantic similarity between a resume and multiple job descriptions
    using Sentence Embeddings, after advanced pre-processing, PII filtering,
    and focusing on relevant sections.
    Also identifies matching keywords from the preprocessed text.

    Args:
        resume_text (str): The raw text content of the resume.
        job_descriptions (list of str): A list of raw job description texts.

    Returns:
        tuple: A tuple containing:
            - percentages (list of float): Semantic similarity scores (0-100)
              for each job description.
            - matching_words (list of list of str): A list of lists, where each
              inner list contains common keywords (lemmas) found in the
              preprocessed resume and the corresponding preprocessed job description.
    """
    # --- Step 1: PII Filtering and Key Information Extraction ---
    # Apply PII filtering and key information extraction to resume and job descriptions
    # For semantic matching, we still process the full job description to get context
    processed_resume_for_embedding = extract_key_information(resume_text)
    processed_job_descriptions_for_embedding = [extract_key_information(jd) for jd in job_descriptions]

    # Combine processed texts for initial embedding generation
    temp_combined_texts = [processed_resume_for_embedding] + processed_job_descriptions_for_embedding

    # Handle cases where processed text might be empty for embedding (e.g., very short docs)
    # Provide a placeholder to prevent embedding errors
    all_processed_texts_for_embedding = [text if text.strip() else "empty document" for text in temp_combined_texts]

    # --- Step 2: Semantic Similarity Calculation (Cosine Similarity with Sentence Embeddings) ---
    if model is None:
        print("SentenceTransformer model not loaded. Falling back to TF-IDF matching for similarity.")
        return _tfidf_match_percentage_fallback(resume_text, job_descriptions)

    try:
        embeddings = model.encode(all_processed_texts_for_embedding, convert_to_tensor=True)
    except Exception as e:
        print(f"Error encoding processed sentences with SentenceTransformer: {e}")
        print("Falling back to TF-IDF for similarity due to embedding error.")
        return _tfidf_match_percentage_fallback(resume_text, job_descriptions)

    resume_embedding = embeddings[0].reshape(1, -1)
    job_embeddings = embeddings[1:]

    semantic_similarities = cosine_similarity(resume_embedding, job_embeddings)[0]
    semantic_percentages = [float(round(similarity * 100, 2)) for similarity in semantic_similarities]

    # --- Step 3: Keyword Matching (from preprocessed text for display) ---
    # For keyword matching, we want words that are common and meaningful after preprocessing
    
    # Preprocess original texts for keyword extraction (distinct from embedding preprocessing if needed)
    # Here, we'll use the same robust preprocessing for consistency
    preprocessed_resume_for_keywords = preprocess_text(filter_pii(resume_text))
    preprocessed_job_descriptions_for_keywords = [preprocess_text(filter_pii(jd)) for jd in job_descriptions]

    resume_words_set = set(preprocessed_resume_for_keywords.split())
    all_matching_words = []

    for i, preprocessed_job_text in enumerate(preprocessed_job_descriptions_for_keywords):
        job_words_set = set(preprocessed_job_text.split())
        
        # Find common words that are not stop words and have a reasonable length
        common_words = [
            word for word in resume_words_set.intersection(job_words_set)
            if word not in stop_words # Ensure they are not stop words
        ]
        # Sort for consistency and take top N
        common_words.sort()
        all_matching_words.append(common_words[:15]) # Limit to top 15 matching keywords

    return semantic_percentages, all_matching_words

def calculate_skill_keyword_match(resume_text, job_required_skills_list):
    """
    Calculates the match percentage based on keyword overlap between resume skills
    and job's Required_Skills.

    Args:
        resume_text (str): The raw text content of the resume.
        job_required_skills_list (list of str): A list where each element is the
                                                'Required_Skills' string for a job.

    Returns:
        tuple: A tuple containing:
            - percentages (list of float): Keyword overlap scores (0-100)
              for each job's required skills.
            - matching_words (list of list of str): A list of lists, where each
              inner list contains common keywords (lemmas) found in the
              preprocessed resume skills and the corresponding preprocessed job skills.
    """
    print(f"\n--- Starting calculate_skill_keyword_match ---")
    print(f"Raw Resume Text (first 100 chars): {resume_text[:100]}")

    # 1. Preprocess resume to extract and prioritize skills
    # Use extract_key_information to focus on skills section if available
    processed_resume_skills_text = extract_key_information(resume_text) 
    print(f"Processed Resume Skills Text: '{processed_resume_skills_text}'")
    resume_skills_set = set(processed_resume_skills_text.split())
    print(f"Resume Skills Set (after preprocessing): {resume_skills_set}")

    all_percentages = []
    all_matching_words = []

    for job_skills_text in job_required_skills_list:
        print(f"\nProcessing Job Required Skills: '{job_skills_text}'")
        # 2. Preprocess job's Required_Skills (it's already isolated, so simple preprocess)
        processed_job_skills_text = preprocess_text(job_skills_text)
        print(f"Processed Job Skills Text: '{processed_job_skills_text}'")
        job_skills_set = set(processed_job_skills_text.split())
        print(f"Job Skills Set (after preprocessing): {job_skills_set}")

        # Handle cases where either set is empty to avoid division by zero
        if not job_skills_set:
            print("Job skills set is empty, appending 0.0%")
            all_percentages.append(0.0)
            all_matching_words.append([])
            continue
        
        if not resume_skills_set:
            print("Resume skills set is empty, appending 0.0%")
            all_percentages.append(0.0)
            all_matching_words.append([])
            continue

        # 3. Calculate intersection of skills
        common_skills = resume_skills_set.intersection(job_skills_set)
        print(f"Common Skills (Intersection): {common_skills}")
        
        # 4. Calculate percentage: (number of matching skills / total unique required skills) * 100
        # This formula can lead to 100% if all job skills are in the resume, even if few.
        # Let's consider a balanced approach: (2 * intersection) / (len(resume_skills) + len(job_skills))
        # Or, just the ratio of common skills to job's required skills. Sticking to the latter for now as requested.
        percentage = (len(common_skills) / len(job_skills_set)) * 100
        all_percentages.append(round(percentage, 2))
        print(f"Calculated Percentage: {round(percentage, 2)}%")

        # 5. Prepare matching keywords for display
        # Filter out stop words from the common skills for display
        display_common_skills = [
            word for word in common_skills if word not in stop_words
        ]
        display_common_skills.sort()
        all_matching_words.append(display_common_skills[:15]) # Limit to top 15 for display
        print(f"Display Common Skills: {display_common_skills}")

    print(f"--- Finished calculate_skill_keyword_match ---")
    return all_percentages, all_matching_words


def _tfidf_match_percentage_fallback(resume_text, job_descriptions):
    """
    Fallback function to calculate match percentage using only TF-IDF
    if SentenceTransformer encounters an error or is not loaded.
    This fallback also uses the new preprocessing and PII filtering.
    """
    # Apply PII filtering and preprocessing for fallback TF-IDF
    cleaned_resume_text = preprocess_text(filter_pii(resume_text))
    cleaned_job_descriptions = [preprocess_text(filter_pii(jd)) for jd in job_descriptions]

    corpus = [cleaned_resume_text] + cleaned_job_descriptions
    
    # Handle empty documents for TF-IDF
    corpus = [text if text.strip() else "empty document" for text in corpus]

    vectorizer = TfidfVectorizer(stop_words='english') # TF-IDF has its own stop words, but we'll let it handle it
    tfidf_matrix = vectorizer.fit_transform(corpus)
    vectors = tfidf_matrix.toarray()

    resume_vector = vectors[0]
    job_vectors = vectors[1:]

    similarities = cosine_similarity([resume_vector], job_vectors)[0]
    percentages = [float(round(similarity * 100, 2)) for similarity in similarities]

    # Keyword extraction for fallback (similar to main function)
    resume_words_set = set(cleaned_resume_text.split())
    matching_words = []
    for i, job_text in enumerate(cleaned_job_descriptions):
        job_words_set = set(job_text.split())
        common_words = [
            word for word in resume_words_set.intersection(job_words_set)
            if word not in stop_words # Ensure they are not stop words
        ]
        common_words.sort()
        matching_words.append(common_words[:15])

    return percentages, matching_words
