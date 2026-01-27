/**
 * Firebase Admin SDK Configuration
 * Hearst Mining Architect
 */

const admin = require('firebase-admin');

let db = null;
let auth = null;

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirebase = () => {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      console.log('✅ Firebase already initialized');
      return { db, auth };
    }

    // Validate required environment variables
    const requiredVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY'
    ];

    const missingVars = requiredVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      console.warn(`⚠️ Missing Firebase env vars: ${missingVars.join(', ')}`);
      console.warn('⚠️ Running in mock mode without Firebase');
      return { db: null, auth: null, mockMode: true };
    }

    // Initialize Firebase Admin
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    db = admin.firestore();
    auth = admin.auth();

    console.log('✅ Firebase initialized successfully');
    console.log(`   Project: ${process.env.FIREBASE_PROJECT_ID}`);

    return { db, auth, mockMode: false };
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    return { db: null, auth: null, mockMode: true };
  }
};

/**
 * Get Firestore instance
 */
const getFirestore = () => {
  if (!db) {
    const result = initializeFirebase();
    return result.db;
  }
  return db;
};

/**
 * Get Auth instance
 */
const getAuth = () => {
  if (!auth) {
    const result = initializeFirebase();
    return result.auth;
  }
  return auth;
};

/**
 * Firestore Collections
 */
const COLLECTIONS = {
  USERS: 'users',
  FARMS: 'farms',
  MACHINES: 'machines',
  LAYOUTS: 'layouts',
  CALCULATIONS: 'calculations',
  MONITORING: 'monitoring',
  ALERTS: 'alerts',
  ELECTRICITY_RATES: 'electricity_rates',
  MACHINE_CATALOG: 'machine_catalog'
};

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  COLLECTIONS,
  admin
};
