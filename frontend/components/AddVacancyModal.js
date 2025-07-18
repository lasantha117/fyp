// frontend/components/AddVacancyModal.js

import React, { useState, useEffect } from 'react';
import { getDatabase, ref, push } from 'firebase/database';

export default function AddVacancyModal({ isOpen, onClose, onSave, currentUserId }) {
  const [vacancyData, setVacancyData] = useState({
    Job_Title: '',
    Company_Name: '',
    Job_Description: '',
    Required_Skills: '',
    Education_Level: '',
    Experience_Required: '',
    Location: '',
    companyUserId: currentUserId || '', // Ensure this is initialized with currentUserId
  });
  const [message, setMessage] = useState('');

  // Update companyUserId if currentUserId prop changes
  useEffect(() => {
    setVacancyData(prevData => ({
      ...prevData,
      companyUserId: currentUserId || '',
    }));
  }, [currentUserId]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setVacancyData({
        Job_Title: '',
        Company_Name: '',
        Job_Description: '',
        Required_Skills: '',
        Education_Level: '',
        Experience_Required: '',
        Location: '',
        companyUserId: currentUserId || '', // Ensure userId is set on reset
      });
      setMessage('');
    }
  }, [isOpen, currentUserId]); // Added currentUserId to dependency array

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVacancyData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Saving vacancy...');

    if (!currentUserId) {
      setMessage('Error: User not authenticated. Cannot add vacancy.');
      return;
    }

    const db = getDatabase();
    const jobsRef = ref(db, 'jobs'); // Reference to the 'jobs' node

    try {
      // Push new vacancy data to Firebase
      await push(jobsRef, vacancyData);
      setMessage('Vacancy added successfully!');
      onSave(); // Call parent's onSave callback
    } catch (error) {
      console.error("Error adding vacancy:", error);
      setMessage(`Error: ${error.message}`);
    }
  };

  // The modal should only render if isOpen is true
  if (!isOpen) return null;

  return (
    // Added 'fade' class for Bootstrap modal animation, and 'show d-block' for visibility
    <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">Add New Job Vacancy</h5>
            {/* Bootstrap 5 uses btn-close, ensure it's styled for dark background */}
            <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="Job_Title" className="form-label">Job Title</label>
                <input type="text" className="form-control" id="Job_Title" name="Job_Title" value={vacancyData.Job_Title} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label htmlFor="Company_Name" className="form-label">Company Name</label>
                <input type="text" className="form-control" id="Company_Name" name="Company_Name" value={vacancyData.Company_Name} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label htmlFor="Job_Description" className="form-label">Job Description</label>
                <textarea className="form-control" id="Job_Description" name="Job_Description" rows="3" value={vacancyData.Job_Description} onChange={handleChange} required></textarea>
              </div>
              <div className="mb-3">
                <label htmlFor="Required_Skills" className="form-label">Required Skills (comma-separated)</label>
                <input type="text" className="form-control" id="Required_Skills" name="Required_Skills" value={vacancyData.Required_Skills} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <label htmlFor="Education_Level" className="form-label">Education Level</label>
                <input type="text" className="form-control" id="Education_Level" name="Education_Level" value={vacancyData.Education_Level} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <label htmlFor="Experience_Required" className="form-label">Experience Required</label>
                <input type="text" className="form-control" id="Experience_Required" name="Experience_Required" value={vacancyData.Experience_Required} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <label htmlFor="Location" className="form-label">Location</label>
                <input type="text" className="form-control" id="Location" name="Location" value={vacancyData.Location} onChange={handleChange} />
              </div>
              
              <div className="d-flex justify-content-end">
                <button type="button" className="btn btn-secondary me-2" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Vacancy</button>
              </div>
            </form>
            {message && <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'} mt-3`}>{message}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
