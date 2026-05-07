# Quick Start - Firebase Setup

## 🎯 What You Need to Do (3 Simple Steps)

### Step 1️⃣: Add Admin Emails
**Location:** Firebase Console → Firestore Database

Create this document:
```
Collection: admins
Document ID: emails

Content:
{
  "list": ["your-email@example.com", "other-admin@example.com"]
}
```

**⏱️ Time: 2 minutes**

---

### Step 2️⃣: Create User Records
**Location:** Firebase Console → Firestore Database

For each student user, create:
```
Collection: users
Document ID: {Firebase UID of the user}

Content:
{
  "studentId": "26MYAIOS00014",
  "email": "student@example.com"
}
```

**How to find Firebase UID:**
- Go to Firebase Console → Authentication → Users
- Copy the UID from the user list

**⏱️ Time: 1 minute per user**

---

### Step 3️⃣: Verify Student Records
**Location:** Firebase Console → Firestore Database

Check that each student in the `students` collection has:
- `name`
- `studentId`
- `email`
- `personalDetails` (object)
- `academicDetails` (object)

**⏱️ Time: 1 minute**

---

## ✅ After Setup

1. **Log in as Admin** (using email from `admins/emails.list`)
   - ✅ Should see all students
   - ✅ Should be able to edit students
   - ✅ No permission errors

2. **Log in as Student** (using email with `users/{uid}` document)
   - ✅ Should see only their own record
   - ✅ Should be able to view their profile
   - ✅ No permission errors

---

## 🆘 Still Getting Permission Error?

### Checklist:
- [ ] My email is in `admins/emails.list` array
- [ ] My Firebase UID document exists in `users` collection
- [ ] My `users/{uid}` document has `studentId` and `email` fields
- [ ] The student record exists in `students` collection
- [ ] Field names are spelled correctly (case-sensitive!)
- [ ] I logged out and logged back in after making changes

### If Still Not Working:
1. Open browser console: **F12 → Console tab**
2. Look for the exact error message
3. Check if the error mentions which collection/document is missing
4. Verify that document exists in Firestore

---

## 📚 Detailed Guide

For more detailed instructions with screenshots, see:
- **FIREBASE_SETUP_STEPS.md** - Step-by-step with all details

---

## 🚀 You're Almost Done!

The app is ready. You just need to set up these 3 things in Firebase Console and you're good to go!
