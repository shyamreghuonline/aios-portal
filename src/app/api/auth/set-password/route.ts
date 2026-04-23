import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const tokenRef = adminDb.collection("passwordTokens").doc(token);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    const tokenData = tokenSnap.data()!;

    if (tokenData.used) {
      return NextResponse.json({ error: "This link has already been used" }, { status: 400 });
    }

    const now = Date.now();
    const expiresAt = tokenData.expiresAt.toMillis();
    if (now > expiresAt) {
      return NextResponse.json({ error: "This link has expired" }, { status: 400 });
    }

    const email = `${tokenData.studentId}@aiosedu.local`;

    // Check if user already exists in Firebase Auth
    let authUser;
    try {
      authUser = await adminAuth.getUserByEmail(email);
    } catch {
      authUser = null;
    }

    if (authUser) {
      // Update existing user's password
      await adminAuth.updateUser(authUser.uid, { password });
    } else {
      // Create new user
      await adminAuth.createUser({
        uid: tokenData.studentId,
        email,
        password,
        displayName: tokenData.studentId,
      });
    }

    // Mark token as used
    await tokenRef.update({ used: true });

    return NextResponse.json({ success: true, studentId: tokenData.studentId });
  } catch (err: unknown) {
    console.error("[set-password] error:", err);
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
