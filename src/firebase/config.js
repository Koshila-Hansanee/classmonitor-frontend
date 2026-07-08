import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyBA1HuZENnbZAxww997i0aMcogH2AmY29k",
  authDomain: "class-monitor-a0078.firebaseapp.com",
  projectId: "class-monitor-a0078",
  storageBucket: "class-monitor-a0078.firebasestorage.app",
  messagingSenderId: "618374714495",
  appId: "1:618374714495:web:ea8ff094409cc01b8a1b4a"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
