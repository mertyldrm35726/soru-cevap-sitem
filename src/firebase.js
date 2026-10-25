
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB9q8XqwXPsc1jbD26xlhE3FhHa6PbulhM",
  authDomain: "sorular-e1e81.firebaseapp.com",
  projectId: "sorular-e1e81",
  storageBucket: "sorular-e1e81.firebasestorage.app",
  messagingSenderId: "867679364078",
  appId: "1:867679364078:web:09d6762b5a9ef1d94e24ff",
  measurementId: "G-QL2S2MJ7Q8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
