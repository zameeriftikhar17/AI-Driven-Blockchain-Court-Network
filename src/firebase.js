import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDhtDdpxFpoANAPVxTIcyxleYjhW3CHhUw",
  authDomain: "courtnetwork-b6fc8.firebaseapp.com",
  databaseURL: "https://courtnetwork-b6fc8-default-rtdb.firebaseio.com",
  projectId: "courtnetwork-b6fc8",
  storageBucket: "courtnetwork-b6fc8.firebasestorage.app",
  messagingSenderId: "320580226786",
  appId: "1:320580226786:web:231adf7cda3aeee57858bb",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

export default app;