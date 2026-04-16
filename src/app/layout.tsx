import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "AIOS EDU - Student Portal",
  description: "AIOS EDU Student & Admin Portal - Payment Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-800 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
