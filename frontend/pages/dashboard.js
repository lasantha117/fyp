// frontend/pages/dashboard.js

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getDatabase, ref, onValue } from 'firebase/database';
import AddVacancyModal from '../components/AddVacancyModal';
import Navbar from '../components/Navbar';
import '../lib/firebase';

export default function CompanyDashboard() {
  const router = useRouter();
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [myVacanciesCount, setMyVacanciesCount] = useState(0);
  const [recentMyVacancies, setRecentMyVacancies] = useState([]);
  const [myApplicationsCount, setMyApplicationsCount] = useState(0);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchDashboardData(currentUser.uid);
      } else {
        setUser(null);
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [auth, router]);

  const fetchDashboardData = (currentUserId) => {
    setLoadingDashboard(true);
    const db = getDatabase();

    // Fetch My Vacancies Count and Recent Vacancies
    const jobsRef = ref(db, 'jobs');
    onValue(jobsRef, (snapshot) => {
      const data = snapshot.val();
      const companySpecificVacancies = [];
      if (data) {
        for (const id in data) {
          const vacancy = { id, ...data[id] };
          if (vacancy.companyUserId === currentUserId) {
            companySpecificVacancies.push(vacancy);
          }
        }
      }
      setMyVacanciesCount(companySpecificVacancies.length);
      setRecentMyVacancies(companySpecificVacancies.slice(0, 5));
      setLoadingDashboard(false);
    }, (error) => {
      console.error("Error fetching my vacancies data:", error);
      setLoadingDashboard(false);
    });

    // Fetch My Applications Count
    const applicationsRef = ref(db, 'applications');
    onValue(applicationsRef, (snapshot) => {
      const data = snapshot.val();
      let count = 0;
      if (data) {
        for (const id in data) {
          const application = data[id];
          if (application.companyUserId === currentUserId) {
            count++;
          }
        }
      }
      setMyApplicationsCount(count);
    }, (error) => {
      console.error("Error fetching applications data:", error);
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Failed to log out. Please try again.");
    }
  };

  const handleAddVacancyClick = () => {
    setIsModalOpen(true);
  };

  const handleViewMyVacanciesClick = () => {
    router.push('/view-vacancies');
  };

  const handleViewAllPlatformVacanciesClick = () => {
    // --- IMPORTANT CHANGE: Open in new tab ---
    window.open('/all-vacancies', '_blank');
    // --- END IMPORTANT CHANGE ---
  };

  const handleViewApplicationsClick = () => {
    router.push('/company-applications');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleVacancyAdded = () => {
    console.log("Vacancy added successfully!");
    setIsModalOpen(false);
    if (user) {
      fetchDashboardData(user.uid);
    }
  };

  if (loadingDashboard && !user) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      <Navbar onLogout={handleLogout} userEmail={user?.email} />
      <div className="container mt-5">
        <div className="card shadow">
          <div className="card-header bg-primary text-white text-center">
            <h2>Company Dashboard</h2>
            <p className="mb-0">Welcome, {user?.email || 'Company User'}!</p>
          </div>
          <div className="card-body">
            <p className="lead text-center mb-4">Manage your job vacancies and view candidate applications.</p>

            {/* Dashboard Overview Section - Focused on company's own data */}
            <div className="row mb-5">
              <div className="col-md-6">
                <div className="card text-white bg-success mb-3">
                  <div className="card-header">My Live Vacancies</div>
                  <div className="card-body">
                    <h5 className="card-title display-4">{myVacanciesCount}</h5>
                    <p className="card-text">Number of active job postings by your company.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card text-white bg-info mb-3">
                  <div className="card-header">Applications Received</div>
                  <div className="card-body">
                    <h5 className="card-title display-4">{myApplicationsCount}</h5>
                    <p className="card-text">Total applications for your company&apos;s jobs.</p>
                    <button className="btn btn-light btn-sm mt-2" onClick={handleViewApplicationsClick}>
                      View Applications
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="d-grid gap-3 col-md-8 mx-auto mb-5">
              <button
                className="btn btn-success btn-lg"
                onClick={handleAddVacancyClick}
              >
                Add New Vacancy
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleViewMyVacanciesClick}
              >
                View My Vacancies
              </button>
              {/* New button to view all platform vacancies in a new tab */}
              <button
                className="btn btn-secondary btn-lg"
                onClick={handleViewAllPlatformVacanciesClick}
              >
                View All Platform Vacancies
              </button>
            </div>

            {/* Recent My Vacancies Section */}
            <div className="mt-5">
              <h4 className="mb-3">Recent Vacancies Added by Your Company</h4>
              {recentMyVacancies.length > 0 ? (
                <ul className="list-group">
                  {recentMyVacancies.map((vacancy) => (
                    <li key={vacancy.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{vacancy.Job_Title}</strong> at {vacancy.Company_Name}
                        <br />
                        <small className="text-muted">{vacancy.Location}</small>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => router.push(`/view-vacancies?editId=${vacancy.id}`)}
                      >
                        Manage
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">No recent vacancies added by your company.</p>
              )}
            </div>

            <div className="mt-5 border-top pt-4">
              <h4>Analytics & Reports (Coming Soon)</h4>
              <p className="text-muted">Detailed insights into your job postings and application trends will appear here.</p>
            </div>

          </div>
        </div>

        <AddVacancyModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleVacancyAdded}
          currentUserId={user?.uid}
        />
      </div>
    </div>
  );
}

