import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { token, studentId, personalDetails, academicDetails, detailsFilledAt } = await request.json();

    if (!token || !studentId) {
      return NextResponse.json({ error: "token and studentId are required" }, { status: 400 });
    }

    // Validate token is still valid
    const tokenRef = adminDb.collection("passwordTokens").doc(token);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    const tokenData = tokenSnap.data()!;

    if (tokenData.type !== "details-only") {
      return NextResponse.json({ error: "Invalid token type" }, { status: 400 });
    }

    if (tokenData.studentId !== studentId) {
      return NextResponse.json({ error: "Token does not match student" }, { status: 403 });
    }

    const now = Date.now();
    const expiresAt = tokenData.expiresAt.toMillis();
    if (now > expiresAt) {
      return NextResponse.json({ error: "This link has expired" }, { status: 400 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (personalDetails) updateData.personalDetails = personalDetails;
    if (academicDetails) updateData.academicDetails = academicDetails;
    if (detailsFilledAt) updateData.detailsFilledAt = detailsFilledAt;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No data to save" }, { status: 400 });
    }

    // Update student document
    await adminDb.collection("students").doc(studentId).update(updateData);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[save-details] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
