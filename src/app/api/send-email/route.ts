import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { to, subject, body, html } = await request.json();

    if (!to || !subject || (!body && !html)) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body/html" },
        { status: 400 }
      );
    }

    // Check if SendGrid API key is available
    const sendgridKey = process.env.SENDGRID_API_KEY;
    
    if (sendgridKey) {
      // Use SendGrid
      try {
        // @ts-ignore - Optional dependency
        const sgMail = await import("@sendgrid/mail");
        sgMail.default.setApiKey(sendgridKey);
        
        await sgMail.default.send({
          to,
          from: process.env.FROM_EMAIL || "noreply@aios.edu",
          subject,
          text: body,
          html: html || body?.replace(/\n/g, "<br>"),
        });
        
        return NextResponse.json({ success: true, provider: "sendgrid" });
      } catch (error: any) {
        console.error("SendGrid error:", error);
        return NextResponse.json(
          { error: "Failed to send via SendGrid", details: error.message },
          { status: 500 }
        );
      }
    }

    // Check if SMTP credentials are available
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      // Use Nodemailer with SMTP
      try {
        // @ts-ignore - Optional dependency
        const nodemailer = await import("nodemailer");
        
        const transporter = nodemailer.default.createTransporter({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: process.env.FROM_EMAIL || `"AIOS EDU" <${smtpUser}>`,
          to,
          subject,
          text: body,
          html: html || body?.replace(/\n/g, "<br>"),
        });

        return NextResponse.json({ success: true, provider: "smtp" });
      } catch (error: any) {
        console.error("SMTP error:", error);
        return NextResponse.json(
          { error: "Failed to send via SMTP", details: error.message },
          { status: 500 }
        );
      }
    }

    // No email provider configured - log for development
    console.log("=".repeat(50));
    console.log("EMAIL NOTIFICATION (No provider configured)");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Body:", body);
    console.log("=".repeat(50));

    return NextResponse.json({ 
      success: true, 
      provider: "console",
      message: "Email logged to console - no provider configured" 
    });

  } catch (error: any) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
