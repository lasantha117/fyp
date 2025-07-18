// frontend/lib/firebase.js
// This file initializes Firebase for your frontend application.

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth"; // Import getAuth
import { getStorage } from "firebase/storage"; // Import getStorage

// Your web app's Firebase configuration
// For security, consider moving these to environment variables
const firebaseConfig = {
  apiKey: "AIzaSyDfp_Ya2eIUMFRg0Ub1ICsgvKqPMoWk4lM", // Replace with your actual API Key
  authDomain: "fyp-bbe4d.firebaseapp.com",
  databaseURL: "https://fyp-bbe4d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "fyp-bbe4d",
  storageBucket: "fyp-bbe4d.appspot.com", // Your Firebase Storage bucket name
  messagingSenderId: "75697914820",
  appId: "1:75697914820:web:7bab142f2d6313cf1c1a91"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig); // Export app itself

// Export Realtime Database instance
export const database = getDatabase(app);
// Export Auth instance
export const auth = getAuth(app); // Export the auth instance
// Export Storage instance
export const storage = getStorage(app); // Export the storage instance
