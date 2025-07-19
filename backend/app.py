# backend/app.py

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
# Import both matching functions
from match_percentage import calculate_semantic_match, calculate_skill_keyword_match
from firebase_admin import credentials, db, initialize_app
import firebase_admin
from werkzeug.utils import secure_filename
import docx2txt
import PyPDF2
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import tempfile
import traceback
import json # Import json for parsing the environment variable

app = Flask(__name__)
# IMPORTANT: In production, replace 'http://localhost:3000' with your live frontend URL
# For now, keep it flexible using an environment variable if you set one, or adjust later.
# Ensure 'origins' correctly reflects your frontend's deployed URL for CORS.
CORS(app, resources={r"/*": {"origins": os.environ.get("FRONTEND_URL", "http://localhost:3000")}}, supports_credentials=True)

UPLOAD_FOLDER = 'uploads/' # For temporary resume processing during matching
TEMP_FOLDER = 'temp_uploads/' # Not directly used in this flow, but kept for consistency
# New folder for storing applied resumes locally
LOCAL_RESUMES_FOLDER = 'local_resumes/'

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['TEMP_FOLDER'] = TEMP_FOLDER
app.config['LOCAL_RESUMES_FOLDER'] = LOCAL_RESUMES_FOLDER # Add new config

# Ensure these directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TEMP_FOLDER, exist_ok=True)
os.makedirs(LOCAL_RESUMES_FOLDER, exist_ok=True) # Create the new directory

if not firebase_admin._apps:
    try:
        # Get Firebase Admin SDK config from environment variable for deployment
        firebase_config_json = os.environ.get('FIREBASE_ADMIN_SDK_CONFIG')
        if firebase_config_json:
            # Parse the JSON string from the environment variable
            cred_dict = json.loads(firebase_config_json)
            cred = credentials.Certificate(cred_dict)
            initialize_app(cred, {
                'databaseURL': 'https://fyp-bbe4d-default-rtdb.asia-southeast1.firebasedatabase.app',
            })
            print("Firebase Admin SDK initialized successfully from environment variable.")
        else:
            # Fallback to local file for development if env var is not set
            print("FIREBASE_ADMIN_SDK_CONFIG environment variable not found. Attempting to load from local file (for local dev only).")
            # Ensure 'firebase-adminsdk.json' is in your .gitignore for production
            cred = credentials.Certificate("firebase-adminsdk.json")
            initialize_app(cred, {
                'databaseURL': 'https://fyp-bbe4d-default-rtdb.asia-southeast1.firebasedatabase.app',
            })
            print("Firebase Admin SDK initialized successfully from local file.")

    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}")
        print("Please ensure 'firebase-adminsdk.json' exists locally or FIREBASE_ADMIN_SDK_CONFIG env var is set on your hosting platform.")
        # Depending on the severity, you might want to exit or handle gracefully
        # For now, just print the error and let the app try to run.

# --- Helper Functions ---

def extract_text(file_path):
    """
    Extracts text from PDF, DOCX, or TXT files.
    """
    if file_path.endswith('.pdf'):
        try:
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() or ""
                return text
        except Exception as e:
            print(f"Error extracting text from PDF {file_path}: {e}")
            return ""
    elif file_path.endswith('.docx'):
        try:
            return docx2txt.process(file_path)
        except Exception as e:
            print(f"Error extracting text from DOCX {file_path}: {e}")
            return ""
    elif file_path.endswith('.txt'):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"Error extracting text from TXT {file_path}: {e}")
            return ""
    return ""

def get_all_jobs_from_firebase():
    """
    Retrieves all job vacancies from Firebase Realtime Database.
    """
    try:
        ref = db.reference('jobs')
        jobs_data = ref.get()
        job_list = []
        if jobs_data:
            for key, value in jobs_data.items():
                value["Job_ID"] = key
                job_list.append(value)
        return job_list
    except Exception as e:
        print(f"Error retrieving jobs from Firebase: {e}")
        return []

def scrape_topjobs(url="https://www.topjobs.lk/"):
    """
    Scrapes IT-related job listings from TopJobs.lk.
    NOTE: This is a basic example and highly dependent on the website's HTML structure.
    It may break if the website changes.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    jobs = []
    try:
        # You might need a specific URL or search query for IT jobs on TopJobs.lk
        # Example for IT jobs: url = "https://www.topjobs.lk/job-search/it-software-jobs" (hypothetical)
        # Always check the actual URL for IT jobs on topjobs.lk
        response = requests.get(url, headers=headers, timeout=15) # Increased timeout
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        soup = BeautifulSoup(response.text, 'html.parser')

        # --- IMPORTANT: These selectors are examples. You MUST inspect TopJobs.lk's HTML ---
        # Use more specific selectors if possible. Look for common patterns like:
        # <div class="job-card">, <li class="job-listing">, <a class="job-title-link">

        # Example: Try to find a common container for all job listings
        # This is a generic search; replace with actual class/id from topjobs.lk
        job_listings_container = soup.find('div', class_='job-list-container') # Hypothetical container class
        if not job_listings_container:
            job_listings_container = soup # Fallback to entire soup if container not found
            print("Job listings container not found, searching entire page. This might be less accurate.")

        # Look for individual job cards/elements within the container
        # Example: div class="job-item" or article class="job-post"
        # Adjust 'div' and class name based on actual HTML
        job_cards = job_listings_container.find_all('div', class_=lambda x: x and 'job-card' in x.lower()) # Generic search for "job-card"

        if not job_cards:
            print("No specific job cards found. Trying broader search for common job elements.")
            # Broader search if specific job-card class is not found
            job_cards = soup.find_all(['div', 'li', 'article'], class_=lambda x: x and ('job' in x.lower() or 'listing' in x.lower() or 'post' in x.lower()))

        if not job_cards:
            print("Still no job cards found. Scraping might not be possible with current selectors.")
            return []

        for card in job_cards[:15]: # Limit to first 15 for demonstration/rate limiting
            job_title = 'N/A'
            company_name = 'N/A'
            job_description = 'No description available.'
            job_url = url # Default to base URL if no link found
            required_skills = 'N/A' # Initialize required_skills for scraped jobs

            # Attempt to find common elements for title, company, description, and link
            # Adjust these selectors based on actual TopJobs.lk HTML structure
            title_tag = card.find(['h2', 'h3', 'a'], class_=lambda x: x and ('title' in x.lower() or 'job-title' in x.lower()))
            company_tag = card.find(['span', 'p', 'div'], class_=lambda x: x and ('company' in x.lower() or 'employer' in x.lower()))
            description_tag = card.find(['div', 'p'], class_=lambda x: x and ('description' in x.lower() or 'summary' in x.lower()))
            link_tag = card.find('a', href=True)
            # Attempt to find skills (often in a specific div or list)
            skills_tag = card.find(['div', 'ul', 'p'], class_=lambda x: x and ('skills' in x.lower() or 'requirements' in x.lower()))


            if title_tag:
                job_title = title_tag.get_text(strip=True)
            if company_tag:
                company_name = company_tag.get_text(strip=True)
            if description_tag:
                job_description = description_tag.get_text(separator=' ', strip=True)
            if skills_tag:
                required_skills = skills_tag.get_text(separator=', ', strip=True) # Extract skills
            if link_tag:
                job_url = link_tag['href']
                if not job_url.startswith('http'): # Make sure URL is absolute
                    job_url = requests.compat.urljoin(url, job_url) # Construct full URL

            # Attempt to fetch full description if link is available and description is short
            if job_url and len(job_description) < 100 and job_url.startswith('http'):
                try:
                    detail_response = requests.get(job_url, headers=headers, timeout=5)
                    detail_response.raise_for_status()
                    detail_soup = BeautifulSoup(detail_response.text, 'html.parser')
                    # Find a common container for job details on the detail page
                    full_desc_tag = detail_soup.find('div', class_=lambda x: x and ('job-details-content' in x.lower() or 'job-description-full' in x.lower()))
                    if full_desc_tag:
                        job_description = full_desc_tag.get_text(separator=' ', strip=True)
                    # Also try to find more skills on the detail page
                    full_skills_tag = detail_soup.find(['div', 'ul', 'p'], class_=lambda x: x and ('skills' in x.lower() or 'requirements' in x.lower()))
                    if full_skills_tag and required_skills == 'N/A': # Only update if not found previously
                        required_skills = full_skills_tag.get_text(separator=', ', strip=True)
                except Exception as detail_e:
                    print(f"Could not fetch full description for {job_url}: {detail_e}")

            # Filter for IT-related jobs (basic keyword check on title/description/skills)
            it_keywords = ['it', 'software', 'developer', 'engineer', 'programmer', 'analyst', 'data science', 'cybersecurity', 'network', 'cloud', 'devops', 'qa', 'ux', 'ui']
            combined_job_text_for_filter = (job_title + " " + job_description + " " + required_skills).lower()
            if any(keyword in combined_job_text_for_filter for keyword in it_keywords):
                jobs.append({
                    "Job_ID": f"topjobs_{hash(job_url)}", # Generate a unique ID based on URL
                    "Job_Title": job_title,
                    "Company_Name": company_name,
                    "Job_Description": job_description,
                    "Required_Skills": required_skills, # Include extracted skills
                    "Job_URL": job_url,
                    "Source": "TopJobs.lk"
                })

    except requests.exceptions.RequestException as e:
        print(f"Error during web scraping (network/HTTP issue): {e}")
        return []
    except Exception as e:
        print(f"An unexpected error occurred during scraping: {e}")
        return []
    return jobs

# --- Routes ---

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    """
    API endpoint to fetch all available job vacancies from Firebase.
    """
    try:
        jobs = get_all_jobs_from_firebase()
        return jsonify(jobs)
    except Exception as e:
        return jsonify({"message": f"Error fetching jobs: {str(e)}"}), 500

@app.route('/api/matcher', methods=['POST'])
def match_resume():
    """
    API endpoint to match uploaded resumes against a single job description.
    This endpoint is now updated to primarily use skill-based matching if
    'required_skills' is provided, otherwise falls back to semantic matching
    with the full job description.
    """
    resumes = request.files.getlist("resumes")
    job_description = request.form.get("job_description", "")
    job_required_skills = request.form.get("required_skills", "") # New field for specific skills

    if not resumes:
        return jsonify({"message": "No resume files provided"}), 400

    results = []

    for file in resumes:
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        resume_text = "" # Initialize resume_text
        
        try:
            # 1. Save the file
            file.save(save_path)
            print(f"File '{filename}' saved to '{save_path}'")

            # 2. Extract text
            resume_text = extract_text(save_path)

            if not resume_text:
                print(f"Warning: Could not extract text from {filename}. Skipping matching for this file.")
            else:
                # 3. Perform matching
                percentage = 0
                keywords = []

                if job_required_skills:
                    percentages, matched_keywords = calculate_skill_keyword_match(resume_text, [job_required_skills])
                    percentage = percentages[0] if percentages else 0
                    keywords = matched_keywords[0] if matched_keywords else []
                elif job_description:
                    percentages, matched_keywords = calculate_semantic_match(resume_text, [job_description])
                    percentage = percentages[0] if percentages else 0
                    keywords = matched_keywords[0] if matched_keywords else []
                else:
                    print(f"Warning: No job description or required skills provided for matching {filename}.")

                results.append({
                    "filename": filename,
                    "text": resume_text,
                    "match_percentage": round(percentage, 2),
                    "matched_keywords": keywords
                })
        except Exception as e:
            print(f"Error processing file {filename}: {e}")
            traceback.print_exc() # Print full traceback for debugging
        finally:
            # Always attempt to remove the file, but check if it exists first
            if os.path.exists(save_path):
                try:
                    os.remove(save_path)
                    print(f"File '{save_path}' removed successfully.")
                except Exception as e:
                    print(f"Error removing file {save_path}: {e}")
                    traceback.print_exc() # Print full traceback for debugging

    return jsonify({"results": results})

@app.route('/api/get_all_matched_jobs', methods=['POST'])
def get_all_matched_jobs():
    """
    API endpoint to match a single resume text against a list of job vacancies.
    This endpoint now specifically uses `calculate_skill_keyword_match`
    referring only to the 'Required_Skills' section of jobs.
    """
    resume_text = request.json.get("resume_text", "")
    job_list_from_frontend = request.json.get("jobList", []) # Accept job list from frontend

    if not resume_text:
        return jsonify({"message": "No resume text provided"}), 400

    jobs_to_match = []
    if job_list_from_frontend:
        # If jobs are provided by frontend (e.g., scraped jobs), use them
        jobs_to_match = job_list_from_frontend
    else:
        # Otherwise, fetch from Firebase (for resume-matcher page)
        jobs_to_match = get_all_jobs_from_firebase()

    if not jobs_to_match:
        return jsonify({"message": "No job vacancies found to match against."}), 200

    # Extract ONLY 'Required_Skills' text for matching
    job_required_skills_texts = []
    for job in jobs_to_match:
        required_skills = job.get("Required_Skills", "")
        job_required_skills_texts.append(required_skills)

    # Perform skill-based matching
    percentages, matching_words = calculate_skill_keyword_match(resume_text, job_required_skills_texts)

    matched_jobs_results = []
    for i, job in enumerate(jobs_to_match):
        current_percentage = percentages[i] if i < len(percentages) else 0
        current_keywords = matching_words[i] if i < len(matching_words) else []

        matched_jobs_results.append({
            "Job_ID": job.get("Job_ID", ""),
            "Job_Title": job.get("Job_Title", ""),
            "Company_Name": job.get("Company_Name", ""),
            "Job_Description": job.get("Job_Description", ""),
            "Required_Skills": job.get("Required_Skills", ""),
            "Education_Level": job.get("Education_Level", ""),
            "Experience_Required": job.get("Experience_Required", ""),
            "Location": job.get("Location", ""),
            "Job_URL": job.get("Job_URL", ""), # Include Job_URL for scraped jobs
            "Source": job.get("Source", "Firebase"), # Indicate source
            "match_percentage": round(current_percentage, 2),
            "matching_words": current_keywords,
            "companyUserId": job.get("companyUserId", "") # Ensure this is passed for Firebase jobs
        })

    matched_jobs_results = sorted(matched_jobs_results, key=lambda x: x["match_percentage"], reverse=True)

    return jsonify({
        "message": "Matching jobs fetched successfully",
        "results": matched_jobs_results
    })

@app.route('/api/apply', methods=['POST'])
def apply_for_job():
    """
    API endpoint for candidates to apply for a job.
    Receives job_id, candidate_id, candidate_email, resume_file, and matchPercentage.
    Stores resume locally and saves application data to Firebase Realtime Database.
    """
    job_id = request.form.get('jobId')
    company_user_id = request.form.get('companyUserId')
    candidate_user_id = request.form.get('candidateUserId')
    candidate_email = request.form.get('candidateEmail')
    job_title = request.form.get('jobTitle')
    job_url = request.form.get('jobUrl')
    job_source = request.form.get('jobSource')
    match_percentage_val = float(request.form.get('matchPercentage', 0))

    resume_file = request.files.get('resume_file')

    if not all([job_id, candidate_user_id, candidate_email, job_title, job_source, resume_file]):
        return jsonify({"message": "Missing required application data (jobId, candidateUserId, candidateEmail, jobTitle, jobSource, resume_file)"}), 400

    if job_source == "Firebase" and not company_user_id:
        return jsonify({"message": "Missing companyUserId for internal Firebase job application"}), 400

    try:
        if not resume_file:
            raise ValueError("Resume file is missing or invalid.")

        # 1. Store resume locally
        original_filename = secure_filename(resume_file.filename)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        # Create a unique filename for the stored resume
        local_filename = f"{job_id}_{candidate_user_id}_{timestamp}_{original_filename}"
        local_file_path = os.path.join(app.config['LOCAL_RESUMES_FOLDER'], local_filename)

        # Save the file to the local directory
        resume_file.save(local_file_path)
        print(f"Resume saved locally at: {local_file_path}")

        # 2. Save application data to Realtime Database
        applications_ref = db.reference('applications')
        new_application_ref = applications_ref.push()

        application_data = {
            "jobId": job_id,
            "companyUserId": company_user_id,
            "candidateUserId": candidate_user_id,
            "candidateEmail": candidate_email,
            "jobTitle": job_title,
            "jobUrl": job_url,
            "jobSource": job_source,
            "matchPercentage": match_percentage_val,
            "resumeFilePath": local_file_path, # Store the local file path instead of URL
            "resumeFileName": original_filename,
            "appliedAt": datetime.now().isoformat()
        }
        new_application_ref.set(application_data)
        return jsonify({"message": "Application submitted successfully!", "applicationId": new_application_ref.key}), 200
    except Exception as e:
        print(f"Error submitting application: {e}")
        traceback.print_exc()
        return jsonify({"message": f"Failed to submit application: {str(e)}"}), 500

# New endpoint to serve locally stored resumes (optional, for viewing/downloading)
@app.route('/api/resumes/<filename>', methods=['GET'])
def serve_resume(filename):
    """
    API endpoint to serve locally stored resume files.
    Companies can use this to download resumes.
    """
    try:
        return send_from_directory(app.config['LOCAL_RESUMES_FOLDER'], filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"message": "Resume file not found"}), 404
    except Exception as e:
        print(f"Error serving resume file: {e}")
        return jsonify({"message": f"Error serving file: {str(e)}"}), 500


@app.route('/api/scrape-topjobs', methods=['GET'])
def get_topjobs_listings():
    """
    API endpoint to scrape IT job listings from TopJobs.lk.
    """
    try:
        jobs = scrape_topjobs()
        if jobs:
            return jsonify({"message": "TopJobs listings scraped successfully", "jobs": jobs}), 200
        else:
            return jsonify({"message": "Could not scrape TopJobs listings or no IT jobs found."}), 200
    except Exception as e:
        print(f"Error in /api/scrape-topjobs endpoint: {e}")
        return jsonify({"message": f"Failed to scrape TopJobs listings: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
