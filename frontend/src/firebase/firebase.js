import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBsKDL74BvooZC7R8etISHCIMKZvJ8oIxw",
  authDomain: "ayurvedic-system-552e6.firebaseapp.com",
  projectId: "ayurvedic-system-552e6",
  storageBucket: "ayurvedic-system-552e6.firebasestorage.app",
  messagingSenderId: "287788676490",
  appId: "1:287788676490:web:152a14aa0332cf81c98473"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);