import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }

    const fullPhone = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
    const snap = await adminDb.collection("students").doc(fullPhone).get();

    return NextResponse.json({ registered: snap.exists });
  } catch (err) {
    console.error("[check-phone] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
