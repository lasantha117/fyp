// frontend/pages/login.js

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, get, child } from 'firebase/database'; // For fetching user role
import Link from 'next/link';
import '../lib/firebase'; // Ensure Firebase is initialized

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('candidate'); // Default role
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = getAuth();
  const db = getDatabase();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // After successful login, fetch user's stored role from Realtime Database
      const userRoleRef = child(ref(db, 'users'), user.uid);
      const snapshot = await get(userRoleRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        const storedRole = userData.role;

        if (storedRole === role) {
          setMessage('Login successful!');
          if (role === 'company') {
            router.push('/dashboard');
          } else {
            // Redirect candidates to their new dashboard
            router.push('/candidate-dashboard');
          }
        } else {
          // If selected role doesn't match stored role
          await auth.signOut(); // Log out the user
          setMessage('Login failed: Role mismatch. Please select the correct role or register with a new one.');
        }
      } else {
        // User data not found in DB, might be a new user or data issue
        await auth.signOut(); // Log out the user
        setMessage('Login failed: User data not found. Please register or contact support.');
      }
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = 'Login failed. Please check your credentials.';
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Your account has been disabled.';
      }
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow mx-auto" style={{ maxWidth: '400px' }}>
        <div className="card-header bg-primary text-white text-center">
          <h3>Login</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email address</label>
              <input
                type="email"
                className="form-control"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
              />
            </div>
            <div className="mb-3">
              <label htmlFor="role" className="form-label">Login as:</label>
              <select
                className="form-select"
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="candidate">Candidate</option>
                <option value="company">Company</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          {message && (
            <div className={`alert ${message.includes('successful') ? 'alert-success' : 'alert-danger'} mt-3`}>
              {message}
            </div>
          )}
          <p className="mt-3 text-center">
            Don't have an account? <Link href="/registration">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
