// frontend/pages/company-applications.js

import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import '../lib/firebase'; // Ensure Firebase is initialized

export default function CompanyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  // Renamed from selectedResumeUrl to selectedResumePath to reflect local storage
  const [selectedResumePath, setSelectedResumePath] = useState(null);
  const [selectedResumeFileName, setSelectedResumeFileName] = useState(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        router.push('/login'); // Redirect to login if not authenticated
      }
    });
    return () => unsubscribeAuth();
  }, [auth, router]);

  useEffect(() => {
    if (!user) return; // Only fetch data if user is authenticated

    const db = getDatabase();
    const applicationsRef = ref(db, 'applications');

    const unsubscribeData = onValue(applicationsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedApplications = [];
      if (data) {
        for (const id in data) {
          const application = { id, ...data[id] };
          // Filter applications to show only those for the current company's jobs
          // based on companyUserId. External jobs (TopJobs.lk) are also shown
          // if they were applied through the platform.
          if (application.companyUserId === user.uid || application.jobSource === "TopJobs.lk") {
            loadedApplications.push(application);
          }
        }
      }
      setApplications(loadedApplications);
      setLoading(false);
      setError('');
    }, (err) => {
      console.error("Error fetching applications:", err);
      setError('Failed to load applications. Please check console.');
      setLoading(false);
    });

    return () => unsubscribeData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error logging out:", error);
      // Using a custom message box instead of alert()
      // For simplicity, this example uses console.error, but in a real app,
      // you'd have a UI component for messages.
      console.error("Failed to log out. Please try again.");
    }
  };

  // Modified to accept resumeFilePath and fileName
  const handleDownloadResume = (resumeFilePath, fileName) => {
    if (!resumeFilePath || !fileName) {
      console.error("Resume path or filename is missing.");
      // Display a message to the user if resume is not available
      return;
    }

    // Extract just the filename from the full local path
    // Example: "local_resumes/job_id_candidate_id_timestamp_original_filename.pdf" -> "job_id_candidate_id_timestamp_original_filename.pdf"
    const filenameOnly = resumeFilePath.split('/').pop();

    // Construct the URL for the backend's /api/resumes/<filename> endpoint
    const downloadUrl = `http://localhost:5000/api/resumes/${filenameOnly}`;

    // Open in a new tab to trigger download
    window.open(downloadUrl, '_blank');
  };


  const handleCloseResumeModal = () => {
    setIsResumeModalOpen(false);
    setSelectedResumePath(null); // Clear selected path
    setSelectedResumeFileName(null);
  };

  // Group applications by Job Title for better readability
  const applicationsByJob = applications.reduce((acc, app) => {
    const jobTitle = app.jobTitle || 'Unknown Job';
    if (!acc[jobTitle]) {
      acc[jobTitle] = [];
    }
    acc[jobTitle].push(app);
    return acc;
  }, {});

  if (!user || loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5 alert alert-danger">
        {error}
      </div>
    );
  }

  return (
    <div>
      <Navbar onLogout={handleLogout} userEmail={user?.email} />
      <div className="container mt-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Applications for Your Jobs</h2>
          <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        {Object.keys(applicationsByJob).length === 0 ? (
          <div className="alert alert-info text-center" role="alert">
            No applications received for your jobs yet.
          </div>
        ) : (
          <div>
            {Object.entries(applicationsByJob).map(([jobTitle, jobApplications]) => (
              <div key={jobTitle} className="card shadow mb-4">
                <div className="card-header bg-light">
                  <h4 className="mb-0">{jobTitle} ({jobApplications.length} Applications)</h4>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-striped table-hover mb-0">
                      <thead>
                        <tr>
                          <th>Applicant Email</th>
                          <th>Match %</th> {/* New column */}
                          <th>Source</th> {/* New column */}
                          <th>Applied At</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobApplications.map((app) => (
                          <tr key={app.id}>
                            <td>{app.candidateEmail}</td>
                            <td>{app.matchPercentage ? `${app.matchPercentage}%` : 'N/A'}</td> {/* Display match % */}
                            <td>{app.jobSource || 'N/A'}</td> {/* Display job source */}
                            <td>{new Date(app.appliedAt).toLocaleString()}</td>
                            <td>
                              {/* Check for resumeFilePath instead of resumeFileUrl */}
                              {app.resumeFilePath ? (
                                <button
                                  className="btn btn-sm btn-primary"
                                  // Pass resumeFilePath and resumeFileName to the download handler
                                  onClick={() => handleDownloadResume(app.resumeFilePath, app.resumeFileName)}
                                >
                                  Download CV
                                </button>
                              ) : (
                                <span className="text-muted">Resume N/A</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resume Viewer Modal (kept for consistency, though not strictly needed for direct download) */}
      {isResumeModalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Resume: {selectedResumeFileName || 'N/A'}</h5>
                <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={handleCloseResumeModal}></button>
              </div>
              <div className="modal-body">
                {selectedResumePath ? ( // Check selectedResumePath
                  <p>
                    {/* The direct download is handled by handleDownloadResume, this modal part might be redundant
                        if you only want direct download. If you want a "preview" then download,
                        you'd need a different approach (e.g., embedding PDF viewer).
                        For now, this modal simply shows a link to download.
                    */}
                    <a href={`http://localhost:5000/api/resumes/${selectedResumePath.split('/').pop()}`} target="_blank" rel="noopener noreferrer" className="btn btn-info">
                      Open/Download Resume
                    </a>
                  </p>
                ) : (
                  <p>Resume file not available.</p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseResumeModal}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
