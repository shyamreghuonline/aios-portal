import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import crypto from "crypto";

function normalizePhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
}

export async function POST(request: NextRequest) {
  try {
    const { phone, studentId } = await request.json();

    if (!phone || !studentId) {
      return NextResponse.json(
        { error: "Phone and studentId are required" },
        { status: 400 }
      );
    }

    const fullPhone = normalizePhone(phone);

    // Verify student exists by studentId (new primary key)
    const studentSnap = await adminDb.collection("students").doc(studentId).get();
    if (!studentSnap.exists) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const studentData = studentSnap.data()!;
    if (studentData.phone !== fullPhone) {
      return NextResponse.json(
        { error: "Phone number mismatch" },
        { status: 400 }
      );
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in Firestore
    await adminDb.collection("passwordTokens").doc(token).set({
      studentId,
      phone: fullPhone,
      createdAt: now,
      expiresAt,
      used: false,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aios-portal.vercel.app";
    const link = `${appUrl}/set-password?token=${token}`;

    console.log(`[create-password-token] Token created for ${studentId} (${fullPhone}), link: ${link}`);

    return NextResponse.json({ token, link, phone: fullPhone, studentId });
  } catch (err) {
    console.error("[create-password-token] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
