import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

/**
 * Initialize Firebase (client-side only)
 */
export function initFirebase() {
  if (typeof window === 'undefined') {
    return { app: null, auth: null, db: null };
  }

  if (getApps().length === 0) {
    // Check if we have config
    if (!firebaseConfig.apiKey) {
      console.warn('Firebase config not found. Running without Firebase.');
      return { app: null, auth: null, db: null };
    }

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    app = getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  }

  return { app, auth, db };
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): Auth | null {
  if (!auth) {
    initFirebase();
  }
  return auth;
}

/**
 * Get Firestore instance
 */
export function getFirebaseDb(): Firestore | null {
  if (!db) {
    initFirebase();
  }
  return db;
}

export { app, auth, db };
