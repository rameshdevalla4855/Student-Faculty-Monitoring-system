// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyA0pvwnssY5M6yFFvDB5m-RH5csJy25Iz0",
    authDomain: "fir-f-m-system.firebaseapp.com",
    projectId: "fir-f-m-system",
    storageBucket: "fir-f-m-system.firebasestorage.app",
    messagingSenderId: "222900749137",
    appId: "1:222900749137:web:c06db33571138dabc00970"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
