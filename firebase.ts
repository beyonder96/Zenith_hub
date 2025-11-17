import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9ov9rEhfGNlhbz_JdePHlB6QCnBnayw",
  authDomain: "zenith-vision-app.firebaseapp.com",
  projectId: "zenith-vision-app",
  storageBucket: "zenith-vision-app.firebasestorage.app",
  messagingSenderId: "107291047079",
  appId: "1:107291047079:web:1dbdb3ea49b034b14c6773",
  measurementId: "G-16QW9DEZL7"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

console.log('Firebase initialized successfully');