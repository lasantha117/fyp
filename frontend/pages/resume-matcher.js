// frontend/pages/resume-matcher.js

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Import auth functions
import { get } from 'firebase/database'; // Import get for fetching user role
import { useRouter } from 'next/router'; // Import useRouter for navigation
import '../lib/firebase'; // Ensure correct path to Firebase config
import MatchingKeywords from '../components/MatchingKeywords'; // Import the MatchingKeywords component

export default function ResumeMatcher() {
  const [resumes, setResumes] = useState([]);
  const [globalMessage, setGlobalMessage] = useState(''); // Renamed from 'message' for clarity
  const [jobMessages, setJobMessages] = useState({}); // New state for messages per job ID
  const [matchedResults, setMatchedResults] = useState({});
  const [allVacancies, setAllVacancies] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [user, setUser] = useState(null); // State to hold authenticated user
  const [userRole, setUserRole] = useState(null); // State to hold user's role
  const [selectedResumeText, setSelectedResumeText] = useState(''); // Stores extracted text of the single selected resume

  const auth = getAuth();
  const router = useRouter(); // Initialize router

  // Auth state listener to get current user and their role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch user's role from Realtime Database
        const db = getDatabase();
        const userRoleRef = ref(db, `users/${currentUser.uid}/role`);
        const snapshot = await get(userRoleRef);
        if (snapshot.exists()) {
          setUserRole(snapshot.val());
        } else {
          setUserRole(null); // Role not found
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
    });
    return () => unsubscribe(); // Cleanup subscription
  }, [auth]);

  // Effect hook to fetch all job vacancies from Firebase Realtime Database
  useEffect(() => {
    const db = getDatabase();
    const jobsRef = ref(db, 'jobs');

    setIsLoadingJobs(true);
    const unsubscribe = onValue(jobsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const jobsArray = Object.keys(data).map(key => ({
          Job_ID: key,
          // Ensure companyUserId is explicitly set. If it's missing or empty in Firebase,
          // it will default to an empty string here. The backend will then validate this.
          companyUserId: data[key].companyUserId || '',
          Job_Title: data[key].Job_Title || 'Untitled Job',
          Company_Name: data[key].Company_Name || 'Unknown Company',
          Job_Description: data[key].Job_Description || 'No description provided.',
          Required_Skills: data[key].Required_Skills || '',
          Education_Level: data[key].Education_Level || '',
          Experience_Required: data[key].Experience_Required || '',
          Location: data[key].Location || '',
          Job_URL: data[key].Job_URL || '',
          Source: data[key].Source || 'Firebase', // Default source to 'Firebase'
          ...data[key]
        }));
        setAllVacancies(jobsArray);
      } else {
        setAllVacancies([]);
      }
      setIsLoadingJobs(false);
    }, (error) => {
      console.error("Error fetching jobs from Firebase:", error);
      setGlobalMessage('🚫 Error fetching job vacancies. Please check console for details.');
      setIsLoadingJobs(false);
    });

    return () => unsubscribe();
  }, []);

  // Handler for file input change
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setResumes(files);
    setGlobalMessage('');
    setMatchedResults({});
    setSelectedResumeText(''); // Clear previously extracted text
    setJobMessages({}); // Clear all job-specific messages
  };

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


  // Handler for form submission to match resumes
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || userRole !== 'candidate') {
      setGlobalMessage('⚠️ Please log in as a candidate to match resumes.');
      return;
    }

    if (resumes.length === 0) {
      setGlobalMessage('⚠️ Please upload at least one resume.');
      return;
    }

    setGlobalMessage('🔍 Matching resumes to all job vacancies. Please wait...');
    setJobMessages({}); // Clear previous job-specific messages on new match
    const results = {};

    try {
      const resumeFile = resumes[0];
      const extractedResumeText = await extractTextFromFile(resumeFile);
      setSelectedResumeText(extractedResumeText);

      for (let job of allVacancies) {
        // Basic validation for job data before sending to backend
        if (!job.Job_ID || !job.Job_Title || !job.Job_Description) {
            console.warn(`Skipping job with missing critical data for matching: ${job.Job_ID || 'Unknown ID'}`);
            continue;
        }

        const formData = new FormData();
        formData.append('resumes', resumeFile);
        formData.append('job_description', job.Job_Description);

        const response = await axios.post('http://localhost:5000/api/matcher', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data && response.data.results) {
          results[job.Job_ID] = response.data.results.map(res => ({
            ...res,
            jobTitle: job.Job_Title,
            company: job.Company_Name,
            jobDescription: job.Job_Description,
            // Pass companyUserId, Job_URL, and Source from the original job object
            companyUserId: job.companyUserId,
            jobUrl: job.Job_URL,
            source: job.Source,
            showKeywords: false,
          }));
        }
      }

      setMatchedResults(results);
      setGlobalMessage(''); // Clear global message after matching
    } catch (error) {
      console.error('Error matching resumes:', error);
      setGlobalMessage('🚫 Error matching resumes. Please ensure the backend is running and accessible.');
    }
  };

  // Handler for applying to a job
  const handleApply = async (job) => {
    // Check if user is logged in as a candidate and a resume has been processed
    if (!user || userRole !== 'candidate') {
      setJobMessages(prev => ({ ...prev, [job.Job_ID]: { text: '⚠️ Please log in as a candidate to apply for jobs.', type: 'danger' } }));
      return;
    }
    if (resumes.length === 0) {
      setJobMessages(prev => ({ ...prev, [job.Job_ID]: { text: '⚠️ Please upload your resume first before applying.', type: 'danger' } }));
      return;
    }

    // Get the first (and only) resume file from the state
    const resumeFile = resumes[0];
    if (!resumeFile) {
      setJobMessages(prev => ({ ...prev, [job.Job_ID]: { text: '⚠️ Resume file not found. Please re-upload your resume.', type: 'danger' } }));
      return;
    }

    // --- START FIX: Explicitly check for missing companyUserId for Firebase jobs ---
    // If the job is from Firebase and companyUserId is missing, prevent application
    if (job.Source === "Firebase" && !job.companyUserId) {
      setJobMessages(prev => ({ ...prev, [job.Job_ID]: { text: '🚫 Cannot apply: This job from Firebase has incomplete data (missing company ID). Please contact the administrator.', type: 'danger' } }));
      console.error("Attempted to apply to a Firebase job with missing companyUserId:", job);
      return;
    }
    // --- END FIX ---

    // More robust check for all required fields from the job object and user session
    if (!job.Job_ID || !user.uid || !user.email || !job.Job_Title || !job.Source) {
      setJobMessages(prev => ({ ...prev, [job.Job_ID]: { text: '🚫 Missing critical data for application. Please ensure job data and user session are complete.', type: 'danger' } }));
      console.error("Missing application data:", {
        jobId: job.Job_ID,
        companyUserId: job.companyUserId,
        candidateUserId: user.uid,
        candidateEmail: user.email,
        jobTitle: job.Job_Title,
        jobUrl: job.Job_URL,
        jobSource: job.Source
      });
      return;
    }

    setJobMessages(prev => ({ ...prev, [job.Job_ID]: { text: `Submitting application for ${job.Job_Title}...`, type: 'info' } }));

    try {
      // Get the match percentage for the current job and selected resume
      const currentJobMatchResults = matchedResults[job.Job_ID];
      const matchPercentage = currentJobMatchResults && currentJobMatchResults.length > 0
        ? currentJobMatchResults[0].match_percentage
        : 0; // Default to 0 if no match data

      const formData = new FormData();
      formData.append('resume_file', resumeFile); // Append the actual resume file
      formData.append('jobId', job.Job_ID);
      formData.append('companyUserId', job.companyUserId || ''); // Ensure it's a string
      formData.append('candidateUserId', user.uid);
      formData.append('candidateEmail', user.email);
      formData.append('jobTitle', job.Job_Title);
      formData.append('jobUrl', job.Job_URL || ''); // Ensure it's a string
      formData.append('jobSource', job.Source);
      formData.append('matchPercentage', matchPercentage.toString()); // Convert to string for FormData

      const response = await axios.post('http://localhost:5000/api/apply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // Important for sending files
        },
      });

      if (response.data && response.data.message) {
        setJobMessages(prev => ({ ...prev, [job.Job_ID]: { text: `✅ ${response.data.message}`, type: 'success' } }));
      } else {
        setJobMessages(prev => ({ ...prev, [job.Job_ID]: { text: 'Application submitted, but no confirmation message received.', type: 'info' } }));
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setJobMessages(prev => ({ ...prev, [job.Job_ID]: { text: `🚫 Failed to submit application: ${error.response?.data?.message || error.message}`, type: 'danger' } }));
    } finally {
      // Clear the job-specific message after a few seconds
      setTimeout(() => {
        setJobMessages(prev => {
          const newState = { ...prev };
          delete newState[job.Job_ID];
          return newState;
        });
      }, 5000); // Message disappears after 5 seconds
    }
  };


  // Handler to clear all uploaded files and results
  const handleClear = () => {
    setResumes([]);
    setMatchedResults({});
    setGlobalMessage('');
    setJobMessages({}); // Clear all job-specific messages
    setSelectedResumeText('');
    document.getElementById('resumes').value = null;
  };

  // Helper function to get matching results for a specific job by its ID
  const getMatchingResult = (jobId) => {
    return matchedResults[jobId] || [];
  };

  return (
    <div className="container mt-5">
      <div className="card shadow rounded-2xl">
        <div className="card-header bg-primary text-white p-4 rounded-t-2xl">
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="text-2xl font-bold mb-0">Resume Matcher Against All Job Vacancies</h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => router.push('/candidate-dashboard')} // Navigate to candidate dashboard
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="card-body p-4">
          <form onSubmit={handleSubmit} className="mb-4">
            <div className="form-group mb-3">
              <label htmlFor="resumes" className="form-label text-gray-700 font-medium">Upload Resumes</label>
              <input
                type="file"
                className="form-control form-control-lg border rounded-lg p-2"
                id="resumes"
                multiple={false} // Only allow one resume for matching all jobs
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
              />
            </div>

            <button type="submit" className="btn btn-success me-3 px-4 py-2 rounded-full shadow-md hover:bg-green-600 transition duration-300" disabled={resumes.length === 0 || !user || userRole !== 'candidate'}>
              {user && userRole === 'candidate' ? 'Match Resume' : 'Login as Candidate to Match'}
            </button>
            <button type="button" className="btn btn-secondary px-4 py-2 rounded-full shadow-md hover:bg-gray-600 transition duration-300" onClick={handleClear}>Clear Results</button>
          </form>

          {globalMessage && <div className={`alert ${globalMessage.includes('Error') || globalMessage.includes('🚫') || globalMessage.includes('⚠️') ? 'alert-danger' : 'alert-info'} mt-3 p-3 rounded-lg`}>{globalMessage}</div>}

          <div className="mt-5">
            <h4 className="text-xl font-semibold text-gray-800 mb-4">📄 All Available Vacancies</h4>
            {isLoadingJobs ? (
              <p className="text-center text-muted">Loading job vacancies...</p>
            ) : allVacancies.length === 0 ? (
              <p className="text-center text-gray-500">No job vacancies available.</p>
            ) : (
              allVacancies
                .map((job) => {
                  const matchResults = getMatchingResult(job.Job_ID);
                  const topMatch = matchResults[0];
                  const percentage = topMatch ? Math.round(topMatch.match_percentage) : 0;
                  return { job, matchResults, percentage };
                })
                .sort((a, b) => b.percentage - a.percentage)
                .map(({ job, matchResults }, index) => {
                  // Determine if the "Apply Now" button should be disabled for this specific job
                  const canApply = user && userRole === 'candidate' && resumes.length > 0; // Check if a resume is selected
                  // Check if it's a Firebase job with a missing companyUserId
                  const isFirebaseJobWithoutCompanyId = job.Source === 'Firebase' && !job.companyUserId;
                  const currentJobMessage = jobMessages[job.Job_ID]; // Get message for this specific job

                  return (
                    <div key={job.Job_ID} className="border rounded-2xl p-4 mb-4 shadow-md bg-white">
                      <p className="mb-1"><strong className="text-gray-800">Job Title:</strong> {job.Job_Title}</p>
                      <p className="mb-1"><strong className="text-gray-800">Company:</strong> {job.Company_Name}</p>
                      <p className="mb-1"><strong className="text-gray-800">Description:</strong> {job.Job_Description}</p>
                      <p className="mb-1"><strong className="text-gray-800">Skills:</strong> {job.Required_Skills || 'N/A'}</p>
                      <p className="mb-1"><strong className="text-gray-800">Education:</strong> {job.Education_Level || 'N/A'}</p>
                      <p className="mb-1"><strong className="text-gray-800">Experience:</strong> {job.Experience_Required || 'N/A'}</p>
                      <p className="mb-1"><strong className="text-gray-800">Location:</strong> {job.Location || 'N/A'}</p>

                      {job.Source && job.Source !== 'Firebase' && (
                          <p className="mb-1"><strong className="text-gray-800">Source:</strong> {job.Source}</p>
                      )}
                      {job.Job_URL && (
                          <p className="mb-1"><strong className="text-gray-800">Job Link:</strong> <a href={job.Job_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Job</a></p>
                      )}

                      {matchResults.length > 0 && matchResults.map((result, idx) => {
                        const percentage = Math.min(100, Math.max(0, Math.round(result.match_percentage)));

                        return (
                          <div key={idx} className="mt-4 border-t pt-3 border-gray-200">
                            <p className="text-md font-medium text-gray-700"><strong>Matched Resume:</strong> {result.filename}</p>
                            <div className="flex flex-col items-center">
                              <div style={{ width: 100, height: 100 }}>
                                <CircularProgressbar
                                  value={percentage}
                                  text={`${percentage}%`}
                                  styles={buildStyles({
                                    pathColor: '#2ecc71',
                                    textColor: '#000',
                                    trailColor: '#eee',
                                    textSize: '18px',
                                  })}
                                />
                              </div>
                              <button
                                className="btn btn-outline-dark mt-3 px-4 py-2 rounded-full shadow-sm hover:bg-gray-100 transition duration-300"
                                onClick={() => {
                                  setMatchedResults(prev => {
                                    const updated = { ...prev };
                                    const jobSpecificResults = updated[job.Job_ID];
                                    if (jobSpecificResults && jobSpecificResults[idx]) {
                                      jobSpecificResults[idx].showKeywords = !jobSpecificResults[idx].showKeywords;
                                    }
                                    return updated;
                                  });
                                }}
                              >
                                {result.showKeywords ? 'Hide Matched Words' : 'Show Matched Words'}
                              </button>

                              {result.showKeywords && (
                                <div className="mt-2 w-full">
                                  <MatchingKeywords
                                    jobDescription={job.Job_Description}
                                    resumes={[result]}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Apply Button */}
                      <div className="flex flex-col items-center mt-4">
                        <div>
                          <button
                            className="btn btn-primary px-6 py-2 rounded-full shadow-md hover:bg-blue-700 transition duration-300"
                            onClick={() => handleApply(job)}
                            // Disable if not logged in as candidate, no resume selected, or if Firebase job is missing companyUserId
                            disabled={!canApply || isFirebaseJobWithoutCompanyId}
                          >
                            {user && userRole === 'candidate' ? (
                              isFirebaseJobWithoutCompanyId ? 'Cannot Apply (Job Data Incomplete)' : 'Apply Now'
                            ) : 'Login as Candidate to Apply'}
                          </button>
                          {isFirebaseJobWithoutCompanyId && (
                            <p className="text-danger text-sm mt-2">
                              This job has incomplete data and cannot be applied to.
                            </p>
                          )}
                          {/* Display job-specific message here */}
                          {currentJobMessage && (
                            <div className={`alert alert-${currentJobMessage.type} mt-2 text-sm text-center`} role="alert">
                              {currentJobMessage.text}
                            </div>
                          )}
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
  );
}
