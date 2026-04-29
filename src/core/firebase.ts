import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your project's customized Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyBmBLtbarrkDb7DyP2cEey1xfc6-Rh8XQk",
	authDomain: "bible-verse-game-seven.firebaseapp.com",
	projectId: "bible-verse-game-seven",
	storageBucket: "bible-verse-game-seven.firebasestorage.app",
	messagingSenderId: "881993495113",
	appId: "1:881993495113:web:20b5adb36e103dfa37c598",
	measurementId: "G-Q0T8XB7D78"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const onAuth = (callback: (user: User | null) => void) => {
	onAuthStateChanged(auth, callback);
};
