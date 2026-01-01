import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDGkUIMt5fkRYVsoGIpl1pTIB_v0h7STtQ",
    authDomain: "expensemanagement-6d555.firebaseapp.com",
    projectId: "expensemanagement-6d555",
    storageBucket: "expensemanagement-6d555.firebasestorage.app",
    messagingSenderId: "909159729554",
    appId: "1:909159729554:web:1bd296758667434cb4194b",
    measurementId: "G-L3L4X64F4X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };