import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export const firebaseConfig = {
  apiKey: "AIzaSyB2x23ygRiGfCxFVvy9HnQJeOU_qwpsoXw",
  authDomain: "wonders-cd738.firebaseapp.com",
  databaseURL: "https://wonders-cd738-default-rtdb.firebaseio.com",
  projectId: "wonders-cd738",
  storageBucket: "wonders-cd738.firebasestorage.app",
  messagingSenderId: "143153827629",
  appId: "1:143153827629:web:953ea6e80d050b144d4da4"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);