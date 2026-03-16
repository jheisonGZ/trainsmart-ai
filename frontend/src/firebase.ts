import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
export const db = getFirestore(app);

// Sesión solo dura mientras el tab esté abierto.
// Al cerrar el navegador o abrir una pestaña nueva → pide login de nuevo.
setPersistence(auth, browserSessionPersistence);