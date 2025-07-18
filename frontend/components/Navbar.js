// frontend/components/Navbar.js

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import '../lib/firebase'; // Ensure Firebase is initialized

export default function Navbar({ onLogout, userEmail }) {
  const [userRole, setUserRole] = useState(null);
  const auth = getAuth();
  const db = getDatabase();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRoleRef = ref(db, `users/${currentUser.uid}/role`);
        const snapshot = await get(userRoleRef);
        if (snapshot.exists()) {
          setUserRole(snapshot.val());
        } else {
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, [auth, db]);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        {userRole === 'company' ? (
          <Link href="/dashboard" className="navbar-brand">
            Company Portal
          </Link>
        ) : userRole === 'candidate' ? (
          <Link href="/candidate-dashboard" className="navbar-brand">
            Candidate Portal
          </Link>
        ) : (
          <Link href="/" className="navbar-brand">
            Job Matching Platform
          </Link>
        )}

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {userRole === 'company' && (
              <>
                <li className="nav-item">
                  <Link href="/dashboard" className="nav-link">
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/all-vacancies" className="nav-link" target="_blank" rel="noopener noreferrer">
                    All Vacancies
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/view-vacancies" className="nav-link">
                    My Vacancies
                  </Link>
                </li>
              </>
            )}
            {userRole === 'candidate' && (
              <>
                <li className="nav-item">
                  <Link href="/candidate-dashboard" className="nav-link">
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/resume-matcher" className="nav-link">
                    Platform Job Matcher
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/topjobs-matcher" className="nav-link">
                    TopJobs.lk Matcher
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/all-vacancies" className="nav-link" target="_blank" rel="noopener noreferrer">
                    View All Jobs
                  </Link>
                </li>
                {/* Add more candidate-specific links */}
              </>
            )}
            {/* If no role or not logged in, you might show general links */}
            {!userRole && (
              <li className="nav-item">
                <Link href="/" className="nav-link">Home</Link>
              </li>
            )}
          </ul>
          <ul className="navbar-nav">
            {userEmail && (
              <li className="nav-item">
                <span className="nav-link text-white-50">Signed in as: {userEmail}</span>
              </li>
            )}
            <li className="nav-item">
              <button className="btn btn-outline-light ms-2" onClick={onLogout}>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
