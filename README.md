# AIOS EDU - Student Portal

Payment management system for AIOS EDU with admin and student dashboards.

## Features

### Admin Panel (`/admin`)
- **Dashboard** — Overview of students, payments, collections
- **Students** — Add/manage students with fee details
- **Payments** — Record payments, generate & print receipts
- **Receipt View** — Professional printable receipt with amount in words

### Student Portal (`/student`)
- **Dashboard** — Fee progress bar, payment summary, quick actions
- **My Payments** — Full payment history with receipts
- **Make Payment** — QR code display, upload payment screenshot
- **Profile** — View enrolled details

### Auth
- Firebase Phone OTP authentication
- Admin vs Student role routing
- Admin phones configured via env variable

## Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (e.g., `aios-portal`)
3. Enable **Authentication** → **Phone** sign-in
4. Enable **Cloud Firestore** in test mode
5. Go to **Project Settings** → **General** → add a Web app → copy config

### 2. Configure Environment
Copy `.env.local.example` to `.env.local` and fill in your Firebase config:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_ADMIN_PHONES=+917411133333
```

### 3. Run
```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

## Tech Stack
- **Next.js 16** — React framework
- **Firebase Auth** — Phone OTP (10K free/month)
- **Cloud Firestore** — NoSQL database
- **Tailwind CSS v4** — Styling
- **Lucide React** — Icons

## Phase 2 (Planned)
- Razorpay payment gateway integration
- Email receipt delivery
- Firebase Storage for payment screenshots
