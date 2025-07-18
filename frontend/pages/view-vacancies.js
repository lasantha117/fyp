// frontend/pages/view-vacancies.js

import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, remove, update } from 'firebase/database';
import { useRouter } from 'next/router';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'; // Import auth functions
import Navbar from '../components/Navbar'; // Assuming Navbar is in components
import '../lib/firebase'; // Ensure Firebase is initialized

export default function ViewVacancies() {
  const [vacancies, setVacancies] = useState([]); // This will store MY vacancies
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null); // State to hold authenticated user
  const [editingJobId, setEditingJobId] = useState(null); // State to track which job is being edited
  const [editFormData, setEditFormData] = useState({}); // State for form data during editing
  const router = useRouter();
  const auth = getAuth();

  // Auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
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
          const vacancy = { id, ...data[id] };
          // Filter to show only vacancies added by the current user
          if (vacancy.companyUserId === user.uid) {
            loadedVacancies.push(vacancy);
          }
        }
      }
      setVacancies(loadedVacancies);
      setLoading(false);
      setError('');
    }, (err) => {
      console.error("Error fetching my vacancies:", err);
      setError('Failed to load your vacancies. Please check console.');
      setLoading(false);
    });

    return () => unsubscribeData(); // Cleanup data subscription
  }, [user]); // Re-run when user state changes (i.e., after authentication)


  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vacancy?')) {
      const db = getDatabase();
      const jobRef = ref(db, `jobs/${id}`);
      try {
        await remove(jobRef);
        alert('Vacancy deleted successfully!');
      } catch (err) {
        console.error("Error deleting vacancy:", err);
        alert(`Failed to delete vacancy: ${err.message}`);
      }
    }
  };

  const handleEditClick = (job) => {
    setEditingJobId(job.id);
    setEditFormData(job); // Populate form with current job data
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingJobId) return;

    const db = getDatabase();
    const jobRef = ref(db, `jobs/${editingJobId}`);
    try {
      await update(jobRef, editFormData); // Update the job data
      alert('Vacancy updated successfully!');
      setEditingJobId(null); // Exit editing mode
      setEditFormData({}); // Clear edit form data
    } catch (err) {
      console.error("Error updating vacancy:", err);
      alert(`Failed to update vacancy: ${err.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingJobId(null);
    setEditFormData({});
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


  if (!user || loading) { // Show loading until user is determined and data is fetched
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading your vacancies...</p>
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
          <h2>My Vacancies</h2>
          <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        {vacancies.length === 0 ? (
          <div className="alert alert-info text-center" role="alert">
            You have not added any vacancies yet.
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
                  <th>Education</th>
                  <th>Experience</th>
                  <th>Location</th>
          
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vacancies.map((job) => (
                  <tr key={job.id}>
                    {editingJobId === job.id ? (
                      // Edit mode row
                      <>
                        <td><input type="text" className="form-control" name="Job_Title" value={editFormData.Job_Title || ''} onChange={handleEditFormChange} /></td>
                        <td><input type="text" className="form-control" name="Company_Name" value={editFormData.Company_Name || ''} onChange={handleEditFormChange} /></td>
                        <td><textarea className="form-control" name="Job_Description" rows="2" value={editFormData.Job_Description || ''} onChange={handleEditFormChange}></textarea></td>
                        <td><input type="text" className="form-control" name="Required_Skills" value={editFormData.Required_Skills || ''} onChange={handleEditFormChange} /></td>
                        <td><input type="text" className="form-control" name="Education_Level" value={editFormData.Education_Level || ''} onChange={handleEditFormChange} /></td>
                        <td><input type="text" className="form-control" name="Experience_Required" value={editFormData.Experience_Required || ''} onChange={handleEditFormChange} /></td>
                        <td><input type="text" className="form-control" name="Location" value={editFormData.Location || ''} onChange={handleEditFormChange} /></td>
                  
                        <td>
                          <button className="btn btn-success btn-sm me-2" onClick={handleSaveEdit}>Save</button>
                          <button className="btn btn-secondary btn-sm" onClick={handleCancelEdit}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      // Display mode row
                      <>
                        <td>{job.Job_Title}</td>
                        <td>{job.Company_Name}</td>
                        <td>{job.Job_Description}</td>
                        <td>{job.Required_Skills || 'N/A'}</td>
                        <td>{job.Education_Level || 'N/A'}</td>
                        <td>{job.Experience_Required || 'N/A'}</td>
                        <td>{job.Location || 'N/A'}</td>
                  
                        <td>
                          <button className="btn btn-warning btn-sm me-2" onClick={() => handleEditClick(job)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(job.id)}>Delete</button>
                        </td>
                      </>
                    )}
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
