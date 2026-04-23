"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";

interface AuthUser {
  uid: string;
  phone?: string;
  email?: string;
  role: "admin" | "student";
  studentData?: Record<string, unknown>;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  logout: async () => {},
});

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Admin: logged in via email/password
      if (fbUser.email) {
        const isAdmin = ADMIN_EMAILS.includes(fbUser.email.toLowerCase());
        if (isAdmin) {
          setUser({ uid: fbUser.uid, email: fbUser.email, role: "admin" });
          setLoading(false);
          return;
        }
      }

      // Student: logged in via email (studentId@aiosedu.local)
      if (fbUser.email && fbUser.email.endsWith("@aiosedu.local")) {
        const studentId = fbUser.email.replace("@aiosedu.local", "");
        // Look up student by studentId field in Firestore
        const studentsRef = collection(db, "students");
        const q = query(studentsRef, where("studentId", "==", studentId));
        const studentSnap = await getDocs(q);
        if (!studentSnap.empty) {
          const studentDoc = studentSnap.docs[0];
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            role: "student",
            studentData: { id: studentDoc.id, ...studentDoc.data() },
          });
        } else {
          setUser({ uid: fbUser.uid, email: fbUser.email, role: "student" });
        }
        setLoading(false);
        return;
      }

      // Unknown auth method — no access
      setUser(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function logout() {
    await auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
