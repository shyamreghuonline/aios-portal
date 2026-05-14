import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { studentId } = await request.json();

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 }
      );
    }

    // Verify student exists
    const studentSnap = await adminDb.collection("students").doc(studentId).get();
    if (!studentSnap.exists) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const studentData = studentSnap.data()!;

    // Generate secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in passwordTokens collection with type "details-only"
    await adminDb.collection("passwordTokens").doc(token).set({
      studentId,
      phone: studentData.phone || "",
      type: "details-only",
      createdAt: now,
      expiresAt,
      used: false,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aios-portal.vercel.app";
    const link = `${appUrl}/register/${token}`;

    console.log(`[create-details-token] Token created for ${studentId}, link: ${link}`);

    return NextResponse.json({
      token,
      link,
      studentId,
      studentName: studentData.name,
    });
  } catch (err) {
    console.error("[create-details-token] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
