import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC72iSuRhZ0pCekj0DN2EOx6DAGxzGFsrE",
  authDomain: "koafy-5bbb8.firebaseapp.com",
  projectId: "koafy-5bbb8",
  storageBucket: "koafy-5bbb8.firebasestorage.app",
  messagingSenderId: "323380487956",
  appId: "1:323380487956:web:19644d280a0a1912c10401",
  measurementId: "G-D90V34D76C"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Inicializar Firestore

export { auth, db };
