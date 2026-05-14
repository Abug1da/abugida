import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDBY_hOIMfraU9hRR0r0GlEzDkh5T17GBw',
  authDomain: 'abugidaauth.firebaseapp.com',
  projectId: 'abugidaauth',
  storageBucket: 'abugidaauth.firebasestorage.app',
  messagingSenderId: '345025926301',
  appId: '1:345025926301:web:1193fd5d5c521612bf3074',
  measurementId: 'G-89NE38PB9W',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
