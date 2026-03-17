// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDBY_hOIMfraU9hRR0r0GlEzDkh5T17GBw",
  authDomain: "abugidaauth.firebaseapp.com",
  projectId: "abugidaauth",
  storageBucket: "abugidaauth.firebasestorage.app",
  messagingSenderId: "345025926301",
  appId: "1:345025926301:web:1193fd5d5c521612bf3074",
  measurementId: "G-89NE38PB9W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };