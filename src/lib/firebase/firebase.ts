// src/lib/firebase/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from 'firebase/auth';
import { FIREBASE_CONFIG, isFirebaseConfigValid } from './config';

let app: FirebaseApp;
let auth: ReturnType<typeof getAuth>;
let googleProvider: GoogleAuthProvider;
let emailProvider: EmailAuthProvider; // Not strictly needed for email/pass but good to have for consistency if using federated identity

if (isFirebaseConfigValid()) {
  app = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  emailProvider = new EmailAuthProvider(); // Initialize EmailAuthProvider
} else {
  console.warn(
    'Firebase configuration is missing or invalid. Auth features will not work. Please check your .env file and Firebase project setup.'
  );
  // Provide mock/dummy objects if Firebase is not configured to prevent app crashes
  // @ts-ignore
  app = global.firebaseAppMock || { name: '[DEFAULT]', options: {}, automaticDataCollectionEnabled: false };
  // @ts-ignore
  auth = global.firebaseAuthMock || { currentUser: null, onAuthStateChanged: () => (() => {}) };
  // @ts-ignore
  googleProvider = global.googleProviderMock || { providerId: 'google.com' };
  // @ts-ignore
  emailProvider = global.emailProviderMock || { providerId: 'password' };

  // For testing or local development without full Firebase setup, you can expose these mocks:
  // if (typeof window !== 'undefined') {
  //   (window as any).firebaseAppMock = app;
  //   (window as any).firebaseAuthMock = auth;
  //   (window as any).googleProviderMock = googleProvider;
  //   (window as any).emailProviderMock = emailProvider;
  // }
}


export { app, auth, googleProvider, emailProvider, isFirebaseConfigValid as isFirebaseInitialized };
