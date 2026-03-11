import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCP3thp7DBGsycYV4w3xunRRULR0FTTr5k",
  authDomain: "trainsmart-d39e7.firebaseapp.com",
  projectId: "trainsmart-d39e7",
  storageBucket: "trainsmart-d39e7.firebasestorage.app",
  messagingSenderId: "274040871230",
  appId: "1:274040871230:web:e0e8cce14cf14d7492b46f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);