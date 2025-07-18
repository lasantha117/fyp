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
try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print("SentenceTransformer model loaded successfully.")
except Exception as e:
    print(f"Error loading SentenceTransformer model: {e}")
    print("Please ensure you have an active internet connection for the first run to download the model.")
    model = None # Set model to None if loading fails to trigger fallback

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

# Initialize stop words and add custom common but irrelevant terms
stop_words = set(stopwords.words('english'))
# Add custom words that are often noise in resume/job description matching
custom_noise_words = {'years', 'year', 'experience', 'level', 'required', 'description', 'job', 'skills', 'education', 'background', 'summary', 'profile', 'objective', 'responsibilities', 'duties', 'qualifications', 'requirements', 'etc'}
stop_words.update(custom_noise_words)

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
    Cleans, tokenizes, removes stop words, and lemmatizes text using SpaCy and NLTK.
    Ensures only alphanumeric tokens are kept and removes very short words.
    """
    if nlp is None:
        # Fallback to basic cleaning if SpaCy model failed to load
        text = text.lower()
        text = re.sub(r'[^a-z0-9\s]', '', text) # Remove non-alphanumeric
        text = re.sub(r'\s+', ' ', text).strip()
        tokens = nltk.word_tokenize(text)
        tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stop_words and len(word) > 1 and word.isalpha()] # Added isalpha()
        return " ".join(tokens)

    doc = nlp(text.lower())
    tokens = []
    for token in doc:
        # Keep only alphanumeric tokens, remove stop words, punctuation, and very short words
        if token.is_alpha and not token.is_stop and not token.is_punct and len(token.text) > 1:
            # Check if the lemma itself is in the stop_words set
            if token.lemma_ not in stop_words:
                tokens.append(token.lemma_) # Use lemma for root form of the word
    return " ".join(tokens)

def extract_key_information(text):
    """
    Extracts and prioritizes text from key sections using regex headers.
    First filters PII, then preprocesses, then combines sections with weighting.
    Also ensures section headers themselves are not heavily weighted.
    """
    # 1. Filter PII first from the raw text
    text_without_pii = filter_pii(text)

    # 2. Define common section headers and their priority weights
    section_headers = {
        'skills': ['skills', 'technical skills', 'technologies', 'expertise', 'core competencies', 'proficiencies'],
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
    
    # Prioritize skills and experience heavily (repeat preprocessed text)
    if extracted_sections['skills']:
        processed_skills = preprocess_text(" ".join(extracted_sections['skills']))
        combined_text_parts.extend([processed_skills] * 3) # Triple weight
    
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
    if not combined_text_parts:
        combined_text_parts.append(preprocess_text(text_without_pii))

    return " ".join(combined_text_parts).strip()


def match_percentage(resume_text, job_descriptions):
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
            if word not in stop_words and len(word) > 2 # Filter out very short words
        ]
        # Sort for consistency and take top N
        common_words.sort()
        all_matching_words.append(common_words[:15]) # Limit to top 15 matching keywords

    return semantic_percentages, all_matching_words

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

    vectorizer = TfidfVectorizer(stop_words='english')
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
            if word not in stop_words and len(word) > 2
        ]
        common_words.sort()
        matching_words.append(common_words[:15])

    return percentages, matching_words
