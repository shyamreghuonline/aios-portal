import { NextRequest, NextResponse } from "next/server";

// SMS Service configuration
// You can use Twilio, MSG91, Fast2SMS, or any other SMS provider
// Configure these in your .env.local file

const SMS_PROVIDER = process.env.SMS_PROVIDER || "twilio"; // twilio, msg91, fast2sms
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || "AIOSDB";
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

interface SMSRequest {
  phone: string;
  studentName: string;
  studentId: string;
  portalUrl?: string;
  type?: "welcome" | "password-link";
  passwordLink?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SMSRequest = await request.json();
    const { phone, studentName, studentId, portalUrl, type, passwordLink } = body;

    if (!phone || !studentName) {
      return NextResponse.json(
        { error: "Phone and studentName are required" },
        { status: 400 }
      );
    }

    // Format phone number
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
    const portalLink = portalUrl || process.env.NEXT_PUBLIC_APP_URL || "https://aios-portal.vercel.app";

    // Message template based on type
    let message: string;
    if (type === "password-link" && passwordLink) {
      message = `Welcome to AIOS EDU! Dear ${studentName}, your enrollment ID: ${studentId} is confirmed. Set your portal password here: ${passwordLink} (valid 24h). -AIOS EDU Team`;
    } else {
      message = `Welcome to AIOS EDU! Dear ${studentName}, your enrollment is confirmed. Enrollment ID: ${studentId}. Access your student portal: ${portalLink}. Login with your registered mobile number to view fees, payments, and receipts. -AIOS EDU Team`;
    }

    let smsResult;

    // Send SMS based on configured provider
    switch (SMS_PROVIDER.toLowerCase()) {
      case "twilio":
        smsResult = await sendTwilioSMS(formattedPhone, message);
        break;
      case "msg91":
        smsResult = await sendMSG91SMS(formattedPhone.replace(/^\+91/, ""), { type, studentName, studentId, passwordLink, message });
        break;
      case "fast2sms":
        smsResult = await sendFast2SMSSMS(formattedPhone.replace(/^\+91/, ""), message);
        break;
      default:
        // Development mode - just log the message
        console.log("[DEV MODE] SMS would be sent to:", formattedPhone);
        console.log("[DEV MODE] Message:", message);
        console.warn(`[send-sms] No SMS provider configured. SMS_PROVIDER="${SMS_PROVIDER}". Set SMS_PROVIDER=twilio (or msg91/fast2sms) in .env.local to send real SMS.`);
        smsResult = { success: true, devMode: true, message: "SMS logged in development mode" };
    }

    return NextResponse.json({
      success: true,
      provider: SMS_PROVIDER,
      result: smsResult,
      phone: formattedPhone,
    });
  } catch (error) {
    console.error("Error sending SMS:", error);
    return NextResponse.json(
      { error: "Failed to send SMS", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Twilio SMS sender
async function sendTwilioSMS(phone: string, message: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error("Twilio credentials not configured");
  }

  try {
    // Dynamic import to avoid build-time errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const twilio = (await import("twilio" as any)).default;
    const client = twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!);

    const result = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER!,
      to: phone,
    });

    return { sid: result.sid, status: result.status };
  } catch (importErr) {
    throw new Error("Twilio package not installed. Run: npm install twilio");
  }
}

interface MSG91Payload {
  type?: "welcome" | "password-link";
  studentName: string;
  studentId: string;
  passwordLink?: string;
  message: string;
}

// MSG91 SMS sender (India)
// Requires a DLT-registered template for production use.
// Template format expected in MSG91 dashboard:
//   "Dear {#var#}, your enrollment ID: {#var#} is confirmed.
//    Set your portal password here: {#var#} (valid 24h). -AIOS EDU Team"
// Variables: var1=studentName, var2=studentId, var3=passwordLink
async function sendMSG91SMS(phone: string, payload: MSG91Payload) {
  if (!MSG91_AUTH_KEY) {
    throw new Error("MSG91 auth key not configured. Set MSG91_AUTH_KEY in .env.local");
  }

  // Flow API (DLT template required in India)
  if (MSG91_TEMPLATE_ID) {
    const body: Record<string, unknown> = {
      template_id: MSG91_TEMPLATE_ID,
      sender: MSG91_SENDER_ID,
      short_url: "1",
      mobiles: phone,
      var1: payload.studentName,
      var2: payload.studentId,
    };

    // For password-link messages, include the link as var3
    if (payload.type === "password-link" && payload.passwordLink) {
      body.var3 = payload.passwordLink;
    } else {
      // For welcome messages, include the portal URL as var3 if available
      body.var3 = payload.message.slice(0, 120);
    }

    const response = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "authkey": MSG91_AUTH_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.type === "error") {
      throw new Error(`MSG91 Flow API error: ${JSON.stringify(data)}`);
    }
    return data;
  }

  // Fallback: try older transactional endpoint for accounts that support it
  const response = await fetch(
    `https://control.msg91.com/api/sendhttp.php?` +
    new URLSearchParams({
      authkey: MSG91_AUTH_KEY,
      mobiles: phone,
      message: payload.message,
      sender: MSG91_SENDER_ID,
      route: "4", // transactional route
      country: "91",
    }).toString(),
    { method: "GET" }
  );

  const text = await response.text();
  if (!response.ok || text.toLowerCase().includes("error")) {
    console.error("[send-sms] MSG91 transactional API error:", text);
    throw new Error(
      `MSG91 SMS failed. Response: ${text}. ` +
      `In India, DLT template registration is mandatory for commercial SMS. ` +
      `Steps: 1) Register a DLT template with your telecom operator. ` +
      `2) Add the template in MSG91 dashboard. ` +
      `3) Set MSG91_TEMPLATE_ID in .env.local. ` +
      `Template variables: var1=studentName, var2=studentId, var3=passwordLink. ` +
      `Alternatively, set SMS_PROVIDER=twilio for immediate production use.`
    );
  }

  return { messageId: text };
}

// Fast2SMS sender (India)
async function sendFast2SMSSMS(phone: string, message: string) {
  if (!FAST2SMS_API_KEY) {
    throw new Error("Fast2SMS API key not configured");
  }

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      "authorization": FAST2SMS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "q", // Quick route for promotional
      message: message,
      language: "english",
      numbers: phone,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Fast2SMS API error: ${error}`);
  }

  return await response.json();
}
