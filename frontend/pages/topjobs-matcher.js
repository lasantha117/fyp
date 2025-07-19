// frontend/pages/topjobs-matcher.js

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { getDatabase, ref, get } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Navbar from '../components/Navbar';
import MatchingKeywords from '../components/MatchingKeywords';
import { useRouter } from 'next/router';
import '../lib/firebase'; // Ensure Firebase is initialized

export default function TopJobsMatcher() {
  const [resumes, setResumes] = useState([]); // This will hold the file object(s)
  const [message, setMessage] = useState('');
  const [scrapedJobs, setScrapedJobs] = useState([]);
  const [matchedResults, setMatchedResults] = useState({});
  const [isLoadingScrape, setIsLoadingScrape] = useState(false);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [selectedResumeFile, setSelectedResumeFile] = useState(null); // Stores the actual file object

  const auth = getAuth();
  const router = useRouter();

  // Auth state listener to get current user and their role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const db = getDatabase();
        const userRoleRef = ref(db, `users/${currentUser.uid}/role`);
        const snapshot = await get(userRoleRef);
        if (snapshot.exists()) {
          setUserRole(snapshot.val());
        } else {
          setUserRole(null);
          // If user role is not found, sign them out for security
          auth.signOut();
          router.push('/login');
        }
      } else {
        setUser(null);
        setUserRole(null);
        router.push('/login'); // Redirect to login if not authenticated
      }
    });
    return () => unsubscribe();
  }, [auth, router]);

  // Function to extract text from a file (client-side)
  const extractTextFromFile = useCallback(async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target.result;
        if (file.type === 'text/plain') {
          const text = new TextDecoder('utf-8').decode(arrayBuffer);
          resolve(text);
        } else {
          // For PDF/DOCX, send to backend for extraction
          const formData = new FormData();
          formData.append('resumes', file);
          formData.append('job_description', 'dummy'); // Dummy job_description
          try {
            const response = await axios.post('http://localhost:5000/api/matcher', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data && response.data.results && response.data.results.length > 0) {
              resolve(response.data.results[0].text);
            } else {
              reject(new Error("Failed to extract text from file via backend."));
            }
          } catch (error) {
            reject(new Error(`Backend extraction error: ${error.message}`));
          }
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0]; // Only allow one file
    setResumes(file ? [file] : []); // Store as an array for consistency
    setSelectedResumeFile(file || null); // Store the actual file object
    setMessage('');
    setMatchedResults({});
  };

  const handleScrapeJobs = async () => {
    setMessage('🔍 Scraping TopJobs.lk for IT vacancies. This may take a moment...');
    setIsLoadingScrape(true);
    setScrapedJobs([]); // Clear previous jobs
    setMatchedResults({}); // Clear previous matches

    try {
      const response = await axios.get('http://localhost:5000/api/scrape-topjobs');
      if (response.data && response.data.jobs) {
        // Add a showKeywords property to each job for local UI state management
        const jobsWithUIState = response.data.jobs.map(job => ({ ...job, showKeywords: false }));
        setScrapedJobs(jobsWithUIState);
        setMessage(`✅ Found ${response.data.jobs.length} jobs from TopJobs.lk.`);
      } else {
        setMessage('No jobs found or an error occurred during scraping.');
      }
    } catch (error) {
      console.error('Error scraping TopJobs:', error);
      setMessage(`🚫 Error scraping jobs: ${error.response?.data?.message || error.message}. Check backend console for details.`);
    } finally {
      setIsLoadingScrape(false);
    }
  };

  const handleMatchScrapedJobs = async () => {
    if (!user || userRole !== 'candidate') {
      setMessage('⚠️ Please log in as a candidate to match resumes.');
      return;
    }
    if (!selectedResumeFile) {
      setMessage('⚠️ Please upload your resume first.');
      return;
    }
    if (scrapedJobs.length === 0) {
      setMessage('⚠️ Please scrape jobs from TopJobs.lk first.');
      return;
    }

    setMessage('🔍 Matching your resume to scraped TopJobs.lk vacancies. Please wait...');
    setIsLoadingMatch(true);
    setMatchedResults({});

    try {
      const extractedResumeText = await extractTextFromFile(selectedResumeFile);

      // Send extracted resume text and scraped jobs to the backend for matching
      const response = await axios.post('http://localhost:5000/api/get_all_matched_jobs', {
        resume_text: extractedResumeText,
        jobList: scrapedJobs, // Pass the scraped jobs to the backend
      });

      if (response.data && response.data.results) {
        const transformedResults = {};
        response.data.results.forEach(job => {
          transformedResults[job.Job_ID] = [{
            filename: selectedResumeFile.name,
            text: extractedResumeText,
            match_percentage: job.match_percentage,
            matched_keywords: job.matching_words, // Use the keywords from backend
            jobTitle: job.Job_Title,
            company: job.Company_Name,
            jobDescription: job.Job_Description,
            jobUrl: job.Job_URL, // Include job URL for external apply
            source: job.Source, // Include source
            showKeywords: false, // Initial state for showing keywords
          }];
        });
        setMatchedResults(transformedResults);
        setMessage('✅ Matching complete!');
      } else {
        setMessage('No matching results found or an error occurred.');
      }
    } catch (error) {
      console.error('Error matching scraped jobs:', error);
      setMessage(`🚫 Error matching jobs: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoadingMatch(false);
    }
  };

  const handleApply = async (job) => {
    if (!user || userRole !== 'candidate') {
      setMessage('⚠️ Please log in as a candidate to apply for jobs.');
      return;
    }
    if (!selectedResumeFile) { // Check for the actual file object
      setMessage('⚠️ Please upload and match your resume first before applying.', 'danger');
      return;
    }

    // Ensure all required fields for application are present
    if (!job.Job_ID || !user.uid || !user.email || !selectedResumeFile || !job.Job_Title || !job.Job_URL || !job.Source) {
      setMessage('🚫 Missing critical data for application. Cannot apply.');
      console.error("Missing application data for external job:", {
        jobId: job.Job_ID,
        candidateUserId: user.uid,
        candidateEmail: user.email,
        resumeFile: selectedResumeFile.name, // Log filename for debugging
        jobTitle: job.Job_Title,
        jobUrl: job.Job_URL,
        source: job.Source
      });
      return;
    }

    setMessage(`Submitting application for ${job.Job_Title}...`);

    try {
      // Get the match percentage for the current job and selected resume
      const currentJobMatchResults = matchedResults[job.Job_ID];
      const matchPercentage = currentJobMatchResults && currentJobMatchResults.length > 0
        ? currentJobMatchResults[0].match_percentage
        : 0; // Default to 0 if no match data

      const formData = new FormData();
      formData.append('resume_file', selectedResumeFile); // Append the actual resume file
      formData.append('jobId', job.Job_ID);
      formData.append('companyUserId', job.companyUserId || ''); // External jobs typically won't have this
      formData.append('candidateUserId', user.uid);
      formData.append('candidateEmail', user.email);
      formData.append('jobTitle', job.Job_Title);
      formData.append('jobUrl', job.Job_URL || '');
      formData.append('jobSource', job.Source);
      formData.append('matchPercentage', matchPercentage.toString());

      const response = await axios.post('http://localhost:5000/api/apply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // Important for sending files
        },
      });

      if (response.data && response.data.message) {
        setMessage(`✅ ${response.data.message}`);
        // Optionally, open the actual job URL in a new tab for the candidate to apply
        window.open(job.Job_URL, '_blank');
      } else {
        setMessage('Application submitted, but no confirmation message received.');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setMessage(`🚫 Failed to submit application: ${error.response?.data?.message || error.message}`);
    } finally {
      // Clear the job-specific message after a few seconds
      setTimeout(() => {
        setMessage('');
      }, 5000); // Message disappears after 5 seconds
    }
  };


  if (!user || userRole === null) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Authenticating...</p>
      </div>
    );
  }

  if (userRole !== 'candidate') {
    return (
      <div className="container mt-5 alert alert-danger text-center">
        Access Denied. Please log in as a candidate to view this page.
      </div>
    );
  }

  return (
    <div>
      <Navbar onLogout={() => auth.signOut().then(() => router.push('/login'))} userEmail={user?.email} />
      <div className="container mt-5">
        <div className="card shadow rounded-2xl">
          <div className="card-header bg-primary text-white p-4 rounded-t-2xl">
            <h2 className="text-2xl font-bold">TopJobs.lk IT Job Matcher</h2>
            <p className="mb-0">Find and match with IT jobs directly from TopJobs.lk!</p>
          </div>

          <div className="card-body p-4">
            <div className="mb-4 border-b pb-4">
              <h3 className="text-xl font-semibold mb-3">1. Fetch Jobs from TopJobs.lk</h3>
              <button
                className="btn btn-info px-4 py-2 rounded-full shadow-md hover:bg-info-dark transition duration-300"
                onClick={handleScrapeJobs}
                disabled={isLoadingScrape}
              >
                {isLoadingScrape ? 'Scraping...' : 'Scrape Latest IT Jobs'}
              </button>
              {scrapedJobs.length > 0 && (
                <p className="mt-3 text-success">Successfully scraped {scrapedJobs.length} jobs.</p>
              )}
            </div>

            <div className="mb-4 border-b pb-4">
              <h3 className="text-xl font-semibold mb-3">2. Upload Your Resume & Match</h3>
              <div className="form-group mb-3">
                <label htmlFor="resumes" className="form-label text-gray-700 font-medium">Upload Your Resume (PDF, DOCX, TXT)</label>
                <input
                  type="file"
                  className="form-control form-control-lg border rounded-lg p-2"
                  id="resumes"
                  multiple={false}
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                />
                {selectedResumeFile && (
                  <p className="mt-2 text-sm text-gray-600">Selected file: <span className="font-semibold">{selectedResumeFile.name}</span></p>
                )}
              </div>
              <button
                className="btn btn-success px-4 py-2 rounded-full shadow-md hover:bg-green-600 transition duration-300"
                onClick={handleMatchScrapedJobs}
                disabled={!selectedResumeFile || scrapedJobs.length === 0 || isLoadingMatch || !user || userRole !== 'candidate'}
              >
                {isLoadingMatch ? 'Matching...' : 'Match My Resume to Scraped Jobs'}
              </button>
            </div>

            {message && <div className={`alert ${message.includes('Error') || message.includes('🚫') || message.includes('⚠️') ? 'alert-danger' : 'alert-info'} mt-3 p-3 rounded-lg`}>{message}</div>}

            <div className="mt-5">
              <h4 className="text-xl font-semibold text-gray-800 mb-4">Matched TopJobs.lk Vacancies (Sorted by Match)</h4>
              {isLoadingScrape ? (
                <p className="text-center text-muted">Loading job listings...</p>
              ) : scrapedJobs.length === 0 ? (
                <p className="text-center text-gray-500">Click &quot;Scrape Latest IT Jobs&quot; to fetch listings.</p>
              ) : isLoadingMatch ? (
                <p className="text-center text-muted">Matching jobs...</p>
              ) : Object.keys(matchedResults).length === 0 && scrapedJobs.length > 0 ? (
                <p className="text-center text-gray-500">Upload your resume and click &quot;Match My Resume to Scraped Jobs&quot; to see results.</p>
              ) : (
                Object.values(matchedResults)
                  .flat() // Flatten the array of arrays to get individual match results
                  .sort((a, b) => b.match_percentage - a.match_percentage) // Sort by match percentage
                  .map((result, _index) => {
                    // This variable is intentionally unused, so we can ignore it.
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const unusedIndex = _index;
                    // result here is the individual match object, which contains the job details
                    const job = result; // For clarity, assign result to job
                    const percentage = Math.min(100, Math.max(0, Math.round(job.match_percentage)));

                    return (
                      <div key={job.Job_ID} className="border rounded-2xl p-4 mb-4 shadow-md bg-white">
                        <p className="mb-1"><strong className="text-gray-800">Job Title:</strong> {job.Job_Title}</p>
                        <p className="mb-1"><strong className="text-gray-800">Company:</strong> {job.Company_Name}</p>
                        <p className="mb-1"><strong className="text-gray-800">Source:</strong> {job.Source}</p>
                        <p className="mb-1"><strong className="text-gray-800">Description:</strong> {job.Job_Description.substring(0, 200)}...</p> {/* Show snippet */}
                        <a href={job.Job_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Full Job</a>

                        <div className="mt-4 border-t pt-3 border-gray-200">
                          <p className="text-md font-medium text-gray-700"><strong>Match Percentage:</strong></p>
                          <div className="flex flex-col items-center">
                            <div style={{ width: 100, height: 100 }}>
                              <CircularProgressbar
                                value={percentage}
                                text={`${percentage}%`}
                                styles={buildStyles({
                                  pathColor: percentage > 75 ? '#2ecc71' : percentage > 50 ? '#f39c12' : '#e74c3c',
                                  textColor: '#000',
                                  trailColor: '#eee',
                                  textSize: '18px',
                                })}
                              />
                            </div>
                            {job.matched_keywords && job.matched_keywords.length > 0 && (
                                <button
                                    className="btn btn-outline-dark mt-3 px-4 py-2 rounded-full shadow-sm hover:bg-gray-100 transition duration-300"
                                    onClick={() => {
                                        setMatchedResults(prev => {
                                            const updated = { ...prev };
                                            // Find the specific result object within the array for this job ID
                                            const jobSpecificResult = updated[job.Job_ID][0];
                                            if (jobSpecificResult) {
                                                jobSpecificResult.showKeywords = !jobSpecificResult.showKeywords;
                                            }
                                            return { ...updated }; // Return new object to trigger re-render
                                        });
                                    }}
                                >
                                    {job.showKeywords ? 'Hide Matched Words' : 'Show Matched Words'}
                                </button>
                            )}


                            {job.showKeywords && (
                              <div className="mt-2 w-full">
                                <MatchingKeywords
                                  // Pass the job object directly, as it now contains matched_keywords
                                  job={job}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Apply Button */}
                        <div className="flex flex-col items-center mt-4">
                          <div>
                            <button
                              className="btn btn-primary px-6 py-2 rounded-full shadow-md hover:bg-blue-700 transition duration-300"
                              onClick={() => handleApply(job)}
                              disabled={!user || userRole !== 'candidate' || !selectedResumeFile}
                            >
                              {user && userRole === 'candidate' ? 'Apply Now' : 'Login as Candidate to Apply'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
