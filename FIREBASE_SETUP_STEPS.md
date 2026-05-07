# Firebase Console Setup - Step by Step Guide

## Step 1: Go to Firebase Console

1. Open your browser and go to: **https://console.firebase.google.com**
2. Sign in with your Google account
3. Select your project: **aios-portal**
4. Click on **Firestore Database** in the left sidebar

---

## Step 2: Create Admin Emails Document

### 2.1 Create Collection
1. In Firestore, click **+ Start Collection**
2. Collection ID: Type `admins`
3. Click **Next**

### 2.2 Create Document
1. Document ID: Type `emails`
2. Click **Auto ID** if you want auto-generated ID, but use `emails` instead
3. Click **Save**

### 2.3 Add Admin Email Field
1. Click **+ Add field**
2. Field name: `list`
3. Type: Select **Array** from dropdown
4. Click **+ Add element** to add email addresses

### 2.4 Add Your Admin Email(s)
1. In the array, click **+ Add element**
2. Type: **String**
3. Value: Enter your admin email (e.g., `admin@aios.com`)
4. Click **✓** to confirm
5. Repeat for each admin email you want to add
6. Click **Save**

**Result:** You should now have:
```
admins/emails
{
  "list": ["admin@aios.com", "teacher@aios.com"]
}
```

---

## Step 3: Create User Documents

### 3.1 Create Users Collection
1. Click **+ Start Collection**
2. Collection ID: Type `users`
3. Click **Next**

### 3.2 Create First User Document

**You need the Firebase UID of your user.** Here's how to find it:

#### Finding Firebase UID:
1. In Firebase Console, go to **Authentication** (left sidebar)
2. Click **Users** tab
3. Find your user in the list
4. Copy the **UID** (it looks like: `abc123xyz789def456`)

### 3.3 Create Document with UID
1. Document ID: Paste the **UID** you copied
2. Click **Next**

### 3.4 Add User Fields
1. Click **+ Add field**
2. First field:
   - Field name: `studentId`
   - Type: **String**
   - Value: Enter the student's enrollment ID (e.g., `26MYAIOS00014`)
   - Click **✓**

3. Click **+ Add field** again
4. Second field:
   - Field name: `email`
   - Type: **String**
   - Value: Enter the user's email (e.g., `student@example.com`)
   - Click **✓**

5. Click **Save**

**Result:** You should now have:
```
users/{UID}
{
  "studentId": "26MYAIOS00014",
  "email": "student@example.com"
}
```

### 3.5 Repeat for Each User
- Repeat steps 3.2-3.4 for each student user
- Each user needs their own document with their UID as the document ID

---

## Step 4: Verify Student Documents

### 4.1 Check Student Collection
1. In Firestore, find the **students** collection
2. Click on a student document (e.g., `26MYAIOS00014`)
3. Verify it has these fields:
   - `name`: Student name
   - `studentId`: Enrollment ID
   - `email`: Email address
   - `personalDetails`: Object (can be empty `{}`)
   - `academicDetails`: Object (can be empty `{}`)

If any fields are missing, add them by clicking **+ Add field**

---

## Step 5: Test the Setup

### 5.1 Test as Admin
1. Go to your app: `http://localhost:3000`
2. Log in with your **admin email** (the one in `admins/emails.list`)
3. You should see all students and be able to edit them
4. No "Missing or insufficient permissions" error should appear

### 5.2 Test as Student
1. Log out
2. Log in with a **student email** (one that has a `users/{uid}` document)
3. You should only see your own student record
4. You should be able to view it

---

## Troubleshooting

### Error: "Missing or insufficient permissions"

**Check these in order:**

1. **Is your email in `admins/emails.list`?**
   - Go to Firestore → `admins/emails` document
   - Check if your email is in the `list` array
   - If not, add it

2. **Does `users/{uid}` document exist?**
   - Go to Firestore → `users` collection
   - Check if your Firebase UID is there
   - If not, create it with `studentId` and `email` fields

3. **Does the student document exist?**
   - Go to Firestore → `students` collection
   - Check if the student record exists
   - If not, create it from the admin dashboard

4. **Are the field names correct?**
   - Field names are **case-sensitive**
   - Use exactly: `studentId`, `email`, `list`
   - Not: `StudentId`, `Email`, `List`

5. **Did the rules deploy successfully?**
   - In your terminal, you should see: `Deploy complete!`
   - If not, run: `firebase deploy --only firestore:rules`

---

## Quick Reference

### Admin Setup
```
Collection: admins
Document: emails
Field: list (Array of strings)
Value: ["admin@aios.com", "teacher@aios.com"]
```

### User Setup
```
Collection: users
Document: {Firebase UID}
Fields:
  - studentId: "26MYAIOS00014" (String)
  - email: "student@example.com" (String)
```

### Student Setup (Already Exists)
```
Collection: students
Document: {studentId}
Fields:
  - name: "Student Name" (String)
  - studentId: "26MYAIOS00014" (String)
  - email: "student@example.com" (String)
  - personalDetails: {} (Object)
  - academicDetails: {} (Object)
```

---

## Need Help?

If you get stuck:
1. Take a screenshot of the error
2. Check the browser console (F12 → Console tab)
3. Verify all field names are spelled correctly
4. Make sure you're in the right collection/document
5. Try logging out and logging back in

Good luck! 🚀
