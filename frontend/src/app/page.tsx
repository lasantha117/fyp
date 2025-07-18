// frontend/src/app/page.tsx
'use client';

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      console.log("User signed out successfully.");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="app-container"> {/* Replaced min-h-screen flex flex-col items-center justify-center p-4 bg-dark-primary text-light-foreground */}
      <main className="flex-col flex-center text-center max-w-4xl mx-auto py-12 px-6 card-container"> {/* Replaced Tailwind classes */}
        {/* Hero Section - Inspired by the image */}
        <div className="relative" style={{ width: '12rem', height: '12rem', marginBottom: '2rem' }}> {/* w-48 h-48 mb-8 */}
          <Image
            src="https://placehold.co/192x192/ff6b6b/ffffff?text=Logo" // Placeholder for a logo or user image
            alt="Profile or Logo"
            width={192}
            height={192}
            className="img-circle-border" // Replaced rounded-full object-cover border-4 border-accent shadow-lg
            priority
          />
          <div className="absolute inset-0 img-circle-border" style={{ borderColor: 'var(--color-accent)', opacity: 0.2, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></div> {/* Circular accent */}
        </div>

        <h1 className="text-heading"> {/* Replaced text-5xl font-extrabold text-light-foreground mb-4 leading-tight */}
          Hello. I'm <span style={{ color: 'var(--color-accent)' }}>Jensen</span>
        </h1>
        <h2 className="text-subheading"> {/* Replaced text-3xl font-semibold text-medium-foreground mb-8 */}
          Software Developer
        </h2>

        <p className="text-paragraph"> {/* Replaced text-lg text-medium-foreground mb-10 max-w-prose */}
          Welcome to the Resume Matcher, your ultimate tool for optimizing job applications.
          Match your resume with job descriptions, identify key skills, and boost your chances!
        </p>

        <div className="flex flex-col sm-flex-row gap-4 mb-12"> {/* Replaced flex flex-col sm:flex-row gap-4 mb-12 */}
          {user ? (
            <>
              <p className="text-medium-foreground text-lg flex-center"> {/* Replaced text-gray-700 dark:text-gray-300 */}
                Logged in as: <span style={{ fontWeight: '600', marginLeft: '0.5rem', color: 'var(--color-text-light)' }}>{user.email}</span> {/* font-semibold ml-2 text-light-foreground */}
              </p>
              <button
                onClick={handleLogout}
                className="btn btn-danger" // Replaced Tailwind classes
                style={{ height: '3rem', padding: '0.75rem 2rem' }} // h-12 px-8
              >
                Logout
              </button>
              <Link href="/resume-matcher" className="btn btn-primary" style={{ height: '3rem', padding: '0.75rem 2rem' }}> {/* Replaced Tailwind classes */}
                Go to Resume Matcher
              </Link>
            </>
          ) : (
            <>
              <Link href="/registration" className="btn btn-primary" style={{ height: '3rem', padding: '0.75rem 2rem' }}> {/* Replaced Tailwind classes */}
                Company Sign Up
              </Link>
              <Link href="/login" className="btn btn-secondary" style={{ height: '3rem', padding: '0.75rem 2rem' }}> {/* Replaced Tailwind classes */}
                Company Login
              </Link>
            </>
          )}
        </div>

        {/* Placeholder for "About Me" or "Features" section - inspired by image */}
        <div className="w-full text-left mt-12 pt-8" style={{ borderTop: '1px solid var(--color-border-subtle)' }}> {/* border-t border-dark-subtle */}
          <h3 className="text-heading" style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'left' }}>About the App</h3> {/* text-3xl font-bold text-light-foreground mb-6 */}
          <div className="grid md-grid-cols-3 gap-8"> {/* grid grid-cols-1 md:grid-cols-3 gap-8 */}
            <div className="flex-col flex-center text-center card-container" style={{ padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', border: '1px solid var(--color-border-subtle)' }}> {/* bg-dark-card p-6 rounded-lg shadow-md border border-dark-subtle */}
              <svg className="w-12 h-12" style={{ color: 'var(--color-accent)', marginBottom: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <h4 className="text-xl font-semibold" style={{ color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Accurate Matching</h4> {/* text-xl font-semibold text-light-foreground mb-2 */}
              <p style={{ color: 'var(--color-text-medium)' }}>Leverage TF-IDF and Cosine Similarity for precise resume-job matching.</p> {/* text-medium-foreground */}
            </div>
            <div className="flex-col flex-center text-center card-container" style={{ padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', border: '1px solid var(--color-border-subtle)' }}>
              <svg className="w-12 h-12" style={{ color: 'var(--color-accent)', marginBottom: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              <h4 className="text-xl font-semibold" style={{ color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Keyword Insights</h4>
              <p style={{ color: 'var(--color-text-medium)' }}>Identify key matching words to tailor your applications effectively.</p>
            </div>
            <div className="flex-col flex-center text-center card-container" style={{ padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', border: '1px solid var(--color-border-subtle)' }}>
              <svg className="w-12 h-12" style={{ color: 'var(--color-accent)', marginBottom: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.033 3-9s-1.343-9-3-9m0 18v-9"></path></svg>
              <h4 className="text-xl font-semibold" style={{ color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Streamlined Process</h4>
              <p style={{ color: 'var(--color-text-medium)' }}>Quickly upload resumes and get instant match results against job vacancies.</p>
            </div>
          </div>
        </div>

      </main>
      <footer className="w-full py-8 text-center text-medium-foreground text-sm" style={{ borderTop: '1px solid var(--color-border-subtle)', marginTop: '3rem' }}> {/* border-t border-dark-subtle mt-12 */}
        <p>&copy; {new Date().getFullYear()} Resume Matcher App. All rights reserved.</p>
        <div className="flex gap-4 items-center justify-center mt-4">
          <a
            className="flex-center gap-2 hover-underline-offset-4"
            href="https://nextjs.org/learn"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-text-medium)' }}
          >
            <Image aria-hidden src="/file.svg" alt="File icon" width={16} height={16} />
            Learn Next.js
          </a>
          <a
            className="flex-center gap-2 hover-underline-offset-4"
            href="https://vercel.com/templates"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-text-medium)' }}
          >
            <Image aria-hidden src="/window.svg" alt="Window icon" width={16} height={16} />
            Vercel Templates
          </a>
          <a
            className="flex-center gap-2 hover-underline-offset-4"
            href="https://nextjs.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-text-medium)' }}
          >
            <Image aria-hidden src="/globe.svg" alt="Globe icon" width={16} height={16} />
            nextjs.org →
          </a>
        </div>
      </footer>
    </div>
  );
}
