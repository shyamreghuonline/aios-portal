import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
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

    // Fetch student data
    const studentSnap = await adminDb.collection("students").doc(tokenData.phone).get();
    if (!studentSnap.exists) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const studentData = studentSnap.data()!;

    return NextResponse.json({
      valid: true,
      studentId: tokenData.studentId,
      phone: tokenData.phone,
      name: studentData.name,
    });
  } catch (err) {
    console.error("[validate-token] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
