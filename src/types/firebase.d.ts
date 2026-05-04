declare module 'firebase/firestore' {
  export const collection: any;
  export const getDocs: any;
  export const doc: any;
  export const setDoc: any;
  export const deleteDoc: any;
  export const getDoc: any;
  export const serverTimestamp: any;
  export const query: any;
  export const orderBy: any;
  export const where: any;
  export const limit: any;
  export const startAfter: any;
  export const updateDoc: any;
  export const addDoc: any;
  export const writeBatch: any;
  export const arrayUnion: any;
  export const arrayRemove: any;
  export const increment: any;
  export const Timestamp: any;
  export const FieldValue: any;
  export const DocumentData: any;
  export const QueryDocumentSnapshot: any;
  export const QuerySnapshot: any;
  export const DocumentReference: any;
  export const CollectionReference: any;
  export const Query: any;
}

declare module 'firebase/auth' {
  export const signInWithEmailAndPassword: any;
  export const createUserWithEmailAndPassword: any;
  export const signOut: any;
  export const onAuthStateChanged: any;
  export const sendPasswordResetEmail: any;
  export const updatePassword: any;
  export const reauthenticateWithCredential: any;
  export const EmailAuthProvider: any;
  export const User: any;
  export const Auth: any;
}

declare module 'firebase/app' {
  export const initializeApp: any;
  export const getApps: any;
  export const getApp: any;
  export const FirebaseApp: any;
}
