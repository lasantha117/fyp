// frontend/pages/candidate-dashboard.js

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getDatabase, ref, onValue } from 'firebase/database';
import Navbar from '../components/Navbar'; // Reusing the Navbar component
import '../lib/firebase'; // Ensure Firebase is initialized

export default function CandidateDashboard() {
  const router = useRouter();
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // To store candidate's profile data
  const [myApplicationsCount, setMyApplicationsCount] = useState(0); // Count of applications made by this candidate
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Auth state listener and profile data fetch
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const db = getDatabase();
        const userRef = ref(db, `users/${currentUser.uid}`);
        onValue(userRef, (snapshot) => {
          const profileData = snapshot.val();
          if (profileData && profileData.role === 'candidate') {
            setUserProfile(profileData);
            fetchDashboardData(currentUser.uid); // Fetch candidate-specific data
          } else {
            // If user is not a candidate or role is missing, redirect to login
            signOut(auth);
            router.push('/login');
          }
        }, (error) => {
          console.error("Error fetching user profile:", error);
          signOut(auth); // Sign out on error
          router.push('/login');
        });
      } else {
        setUser(null);
        setUserProfile(null);
        router.push('/login'); // Redirect to login if not authenticated
      }
    });
    return () => unsubscribe();
  }, [auth, router]);

  // Fetch candidate-specific data (e.g., application count)
  const fetchDashboardData = (currentUserId) => {
    setLoadingDashboard(true);
    const db = getDatabase();

    // Fetch My Applications Count
    const applicationsRef = ref(db, 'applications');
    onValue(applicationsRef, (snapshot) => {
      const data = snapshot.val();
      let count = 0;
      if (data) {
        for (const id in data) {
          const application = data[id];
          if (application.candidateUserId === currentUserId) {
            count++;
          }
        }
      }
      setMyApplicationsCount(count);
      setLoadingDashboard(false);
    }, (error) => {
      console.error("Error fetching applications data for candidate:", error);
      setLoadingDashboard(false);
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Failed to log out. Please try again.");
    }
  };

  const handleGoToResumeMatcher = () => {
    router.push('/resume-matcher');
  };

  // Placeholder for viewing submitted applications
  const handleViewMyApplications = () => {
    // You would create a new page like /my-applications to list them
    alert("Feature coming soon: View your submitted applications!");
    // router.push('/my-applications');
  };

  if (loadingDashboard || !user || !userProfile) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading candidate dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <Navbar onLogout={handleLogout} userEmail={user?.email} />
      <div className="container mt-5">
        <div className="card shadow">
          <div className="card-header bg-primary text-white text-center">
            <h2>Candidate Dashboard</h2>
            <p className="mb-0">Welcome, {userProfile?.email || 'Candidate'}!</p>
          </div>
          <div className="card-body">
            <p className="lead text-center mb-4">Your personalized career hub.</p>

            {/* Candidate Overview Section */}
            <div className="row mb-5">
              <div className="col-md-6">
                <div className="card text-white bg-success mb-3">
                  <div className="card-header">Total Applications Submitted</div>
                  <div className="card-body">
                    <h5 className="card-title display-4">{myApplicationsCount}</h5>
                    <p className="card-text">Jobs you have applied for.</p>
                    <button className="btn btn-light btn-sm mt-2" onClick={handleViewMyApplications}>
                      View My Applications
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card text-white bg-info mb-3">
                  <div className="card-header">Recommended Jobs (Placeholder)</div>
                  <div className="card-body">
                    <h5 className="card-title display-4">XX</h5>
                    <p className="card-text">Personalized job recommendations.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="d-grid gap-3 col-md-8 mx-auto mb-5">
              <button
                className="btn btn-primary btn-lg"
                onClick={handleGoToResumeMatcher}
              >
                Go to Resume Matcher
              </button>
              {/* Add more candidate-specific actions */}
              <button className="btn btn-secondary btn-lg" onClick={() => alert("Feature coming soon: Update your profile!")}>
                Update My Profile
              </button>
            </div>

            {/* Profile Information Section */}
            {userProfile && (
              <div className="mt-5 border-top pt-4">
                <h4 className="mb-3">My Profile Information</h4>
                <ul className="list-group list-group-flush">
                  <li className="list-group-item"><strong>University:</strong> {userProfile.university || 'N/A'}</li>
                  <li className="list-group-item"><strong>Degree:</strong> {userProfile.degree || 'N/A'}</li>
                  <li className="list-group-item"><strong>Graduation Year:</strong> {userProfile.graduationYear || 'N/A'}</li>
                  <li className="list-group-item"><strong>Specialization:</strong> {userProfile.specialization || 'N/A'}</li>
                  <li className="list-group-item"><strong>Experience Level:</strong> {userProfile.experienceLevel || 'N/A'}</li>
                </ul>
              </div>
            )}

            {/* Placeholder for other sections */}
            <div className="mt-5 border-top pt-4">
              <h4>Interview Practice (Coming Soon)</h4>
              <p className="text-muted">Practice common interview questions with an AI chatbot.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
