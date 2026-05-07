# Firestore Setup Guide

## Security Rules Deployed ✅

The Firestore security rules have been successfully deployed to your Firebase project.

## Required Setup Steps

### 1. Create Admin Emails Document

You need to create a document in Firestore at path: `admins/emails`

**Steps:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `aios-portal`
3. Go to **Firestore Database**
4. Click **Create Document**
5. Collection ID: `admins`
6. Document ID: `emails`
7. Add a field:
   - Field name: `list`
   - Type: `Array`
   - Value: Add your admin email addresses (e.g., `admin@example.com`, `teacher@example.com`)

**Example:**
```
admins/emails
{
  "list": [
    "admin@aios.com",
    "teacher@aios.com"
  ]
}
```

### 2. Create User Documents for Each Student

For each logged-in user, create a document at: `users/{uid}`

Where `{uid}` is the Firebase Authentication UID.

**Steps:**
1. In Firestore, create a new collection: `users`
2. Document ID: Use the user's Firebase UID
3. Add fields:
   - `studentId`: The student's enrollment ID (e.g., "26MYAIOS00014")
   - `email`: The user's email address

**Example:**
```
users/abc123xyz789
{
  "studentId": "26MYAIOS00014",
  "email": "student@example.com"
}
```

### 3. Verify Student Documents Have Correct Structure

Make sure your `students/{studentId}` documents have the required fields:
- `name`: Student name
- `studentId`: Enrollment ID
- `email`: Email address
- `personalDetails`: Object with personal information
- `academicDetails`: Object with academic information

## Security Rules Overview

### Admin Access
- Admins (email in `admins/emails.list`) can:
  - Read and write all student records
  - Manage all collections
  - Create and delete documents

### Student Access
- Students can:
  - Read their own student record (matched by `studentId`)
  - Update their own student record (if `profileEditEnabled == true`)
  - Read their own payment records
  - Read the admin emails list

### Public Access
- All other access is denied by default

## Testing the Rules

1. Log in as an admin (email in the admins list)
2. You should be able to access and edit all student records
3. Log in as a student
4. You should only see your own student record
5. You should be able to edit your own record if `profileEditEnabled` is true

## Troubleshooting

If you still get "Missing or insufficient permissions" error:

1. **Check Admin Email**: Verify your email is in `admins/emails.list`
2. **Check User Document**: Verify `users/{uid}` document exists with correct `studentId`
3. **Check Student Document**: Verify the student record exists with matching `studentId`
4. **Check Rules Deployment**: Verify rules were deployed successfully (you should see "Deploy complete!" message)

## Deploy Rules Again (if needed)

```bash
firebase deploy --only firestore:rules
```

## View Rules in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** → **Rules** tab
4. You should see your deployed rules
