// frontend/pages/all-vacancies.js

import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar'; // Assuming Navbar is in components
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'; // For auth check
import '../lib/firebase'; // Ensure Firebase is initialized

export default function AllVacancies() {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null); // To check authentication
  const router = useRouter();
  const auth = getAuth();

  // Auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // In a real app, you'd check if they are allowed to view this page (e.g., company or candidate)
        // For now, any authenticated user can view all vacancies.
      } else {
        setUser(null);
        router.push('/login'); // Redirect to login if not authenticated
      }
    });
    return () => unsubscribeAuth(); // Cleanup auth subscription
  }, [auth, router]);


  useEffect(() => {
    if (!user) return; // Only fetch data if user is authenticated

    const db = getDatabase();
    const jobsRef = ref(db, 'jobs'); // Reference to the 'jobs' node

    const unsubscribeData = onValue(jobsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedVacancies = [];
      if (data) {
        for (const id in data) {
          loadedVacancies.push({ id, ...data[id] });
        }
      }
      setVacancies(loadedVacancies);
      setLoading(false);
      setError('');
    }, (err) => {
      console.error("Error fetching all vacancies:", err);
      setError('Failed to load all vacancies. Please check console.');
      setLoading(false);
    });

    return () => unsubscribeData(); // Cleanup data subscription
  }, [user]); // Re-run when user state changes (i.e., after authentication)

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Failed to log out. Please try again.");
    }
  };

  if (!user || loading) { // Show loading until user is determined and data is fetched
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading all vacancies...</p>
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
          <h2>All Platform Vacancies</h2>
      
        </div>

        {vacancies.length === 0 ? (
          <div className="alert alert-info text-center" role="alert">
            No vacancies available on the platform yet.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Job Title</th>
                  <th>Company</th>
                  <th>Description</th>
                  <th>Skills</th>
                  <th>Location</th>
                  <th>Employment Type</th>
      
                </tr>
              </thead>
              <tbody>
                {vacancies.map((job) => (
                  <tr key={job.id}>
                    <td>{job.Job_Title}</td>
                    <td>{job.Company_Name}</td>
                    <td>{job.Job_Description}</td>
                    <td>{job.Required_Skills || 'N/A'}</td>
                    <td>{job.Location || 'N/A'}</td>
                    <td>{job.Employment_Type || 'N/A'}</td>
                
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
