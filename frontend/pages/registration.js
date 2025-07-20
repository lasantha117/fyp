// frontend/pages/registration.js

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database'; // For saving user role
import Link from 'next/link';
import '../lib/firebase'; // Ensure Firebase is initialized

export default function RegistrationPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // New state for confirm password
  const [role, setRole] = useState('candidate'); // Default role
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Candidate-specific states
  const [university, setUniversity] = useState('');
  const [degree, setDegree] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');

  // Company-specific states
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');

  const router = useRouter();
  const auth = getAuth();
  const db = getDatabase();

  const handleRegistration = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    // Password confirmation validation
    if (password !== confirmPassword) {
      setMessage('Error: Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      let userData = {
        email: user.email,
        role: role,
        createdAt: new Date().toISOString()
      };

      // Add role-specific data
      if (role === 'candidate') {
        userData = {
          ...userData,
          university,
          degree,
          graduationYear,
          specialization,
          experienceLevel,
        };
      } else if (role === 'company') {
        userData = {
          ...userData,
          companyName,
          industry,
          companySize,
          companyWebsite,
        };
      }

      // Save user data to Realtime Database
      await set(ref(db, 'users/' + user.uid), userData);

      setMessage('Registration successful! You can now log in.');
      // Redirect to login page after successful registration
      router.push('/login');
    } catch (error) {
      console.error("Registration error:", error);
      let errorMessage = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use. Please use a different email or log in.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      }
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow mx-auto" style={{ maxWidth: '600px' }}> {/* Increased max-width */}
        <div className="card-header bg-primary text-white text-center">
          <h3>Register</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleRegistration}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email address</label>
              <input
                type="email"
                className="form-control"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autocomplete="email" // Added autocomplete for email
              />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="6" // Firebase requires at least 6 characters for password
                autocomplete="new-password" // Added autocomplete for new password
              />
            </div>
            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label> {/* New field */}
              <input
                type="password"
                className="form-control"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength="6"
                autocomplete="new-password" // Added autocomplete for confirming new password
              />
            </div>
            <div className="mb-3">
              <label htmlFor="role" className="form-label">Register as:</label>
              <select
                className="form-select"
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="candidate">Candidate (IT Degree Holder)</option>
                <option value="company">Company</option>
              </select>
            </div>

            {role === 'candidate' && (
              <>
                <h5 className="mt-4 mb-3">Candidate Details</h5>
                <div className="mb-3">
                  <label htmlFor="university" className="form-label">University</label>
                  <input
                    type="text"
                    className="form-control"
                    id="university"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    required
                    autocomplete="organization" // Example autocomplete for university
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="degree" className="form-label">Degree</label>
                  <input
                    type="text"
                    className="form-control"
                    id="degree"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    required
                    autocomplete="off" // No specific autocomplete for degree, use off
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="graduationYear" className="form-label">Graduation Year</label>
                  <input
                    type="number"
                    className="form-control"
                    id="graduationYear"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    required
                    autocomplete="off" // No specific autocomplete, use off
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="specialization" className="form-label">Specialization</label>
                  <input
                    type="text"
                    className="form-control"
                    id="specialization"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    autocomplete="off" // No specific autocomplete, use off
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="experienceLevel" className="form-label">Experience Level</label>
                  <select
                    className="form-select"
                    id="experienceLevel"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    required
                    autocomplete="off" // No specific autocomplete, use off
                  >
                    <option value="">Select Experience Level</option>
                    <option value="Entry-Level">Entry-Level</option>
                    <option value="Junior">Junior (1-3 years)</option>
                    <option value="Mid-Level">Mid-Level (3-7 years)</option>
                    <option value="Senior">Senior (7+ years)</option>
                  </select>
                </div>
              </>
            )}

            {role === 'company' && (
              <>
                <h5 className="mt-4 mb-3">Company Details</h5>
                <div className="mb-3">
                  <label htmlFor="companyName" className="form-label">Company Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    autocomplete="organization" // Autocomplete for company name
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="industry" className="form-label">Industry</label>
                  <input
                    type="text"
                    className="form-control"
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    required
                    autocomplete="off" // No specific autocomplete, use off
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="companySize" className="form-label">Company Size</label>
                  <select
                    className="form-select"
                    id="companySize"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    required
                    autocomplete="off" // No specific autocomplete, use off
                  >
                    <option value="">Select Company Size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="501-1000">501-1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="companyWebsite" className="form-label">Company Website (URL)</label>
                  <input
                    type="url"
                    className="form-control"
                    id="companyWebsite"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    autocomplete="url" // Autocomplete for URL
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
          {message && (
            <div className={`alert ${message.includes('successful') ? 'alert-success' : 'alert-danger'} mt-3`}>
              {message}
            </div>
          )}
          <p className="mt-3 text-center">
            Already have an account? <Link href="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
