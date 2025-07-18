// frontend/pages/index.js

import React from 'react';
import { useRouter } from 'next/router';
import 'bootstrap/dist/css/bootstrap.min.css'; // Ensure Bootstrap CSS is imported

const HomePage = () => {
  const router = useRouter();

  const navigateToMatcher = () => {
    router.push('/resume-matcher');
  };

  const navigateToDashboard = () => {
    router.push('/dashboard'); // Navigate to the new dashboard page
  };

  return (
    <div className="container mt-4 text-center">
      <h1 className="display-4 mb-4">Welcome to Job Matching Platform</h1>
      <p className="lead mb-5">
        Your ultimate tool for career development and job matching in the IT sector.
      </p>
      <div className="d-grid gap-3 col-md-6 mx-auto">
        <button className="btn btn-primary btn-lg" onClick={navigateToMatcher}>
          Find Your Job Match (Candidates)
        </button>
        <button className="btn btn-secondary btn-lg" onClick={navigateToDashboard}>
          Company Dashboard (Employers)
        </button>
      </div>
    </div>
  );
};

export default HomePage;
