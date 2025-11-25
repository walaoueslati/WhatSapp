// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCcmsolCtyO-ZBvCddD5TMtLjtMnpAZdE8",
  authDomain: "walaoueslatiwhatsapp.firebaseapp.com",
  projectId: "walaoueslatiwhatsapp",
  storageBucket: "walaoueslatiwhatsapp.firebasestorage.app",
  messagingSenderId: "562682350916",
  appId: "1:562682350916:web:7e7e43271d736d0b7bdb11",
  measurementId: "G-H5NY0P4NRG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
