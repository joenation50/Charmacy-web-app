import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot,
  collection, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLd3jN0EUlDdMdAHMDPnRbwO9ZOxzB1FA",
  authDomain: "charmacy-tracking.firebaseapp.com",
  projectId: "charmacy-tracking",
  storageBucket: "charmacy-tracking.firebasestorage.app",
  messagingSenderId: "187174319075",
  appId: "1:187174319075:web:4c4d6b781a6b31eb33a6d6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export { doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, orderBy, serverTimestamp };
export const orderRef = id => doc(db, 'orders', id);