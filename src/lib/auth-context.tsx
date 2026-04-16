"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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

      // Student: logged in via phone OTP
      if (fbUser.phoneNumber) {
        const phone = fbUser.phoneNumber;
        const studentSnap = await getDoc(doc(db, "students", phone));
        if (studentSnap.exists()) {
          setUser({
            uid: fbUser.uid,
            phone,
            role: "student",
            studentData: studentSnap.data(),
          });
        } else {
          setUser({ uid: fbUser.uid, phone, role: "student" });
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
