import Constants from 'expo-constants';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';

type FirebaseExtra = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  databaseURL?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

const firebaseConfig = (Constants.expoConfig?.extra?.firebase ?? {}) as FirebaseExtra;

const hasConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

export const getFirebaseApp = (): FirebaseApp | null => {
  if (!hasConfig) {
    return null;
  }

  if (getApps().length > 0) {
    return getApps()[0] as FirebaseApp;
  }

  return initializeApp(firebaseConfig);
};
