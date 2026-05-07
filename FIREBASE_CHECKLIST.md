# Firebase Setup Checklist

## 📋 Complete Checklist for Firebase Setup

### Part 1: Admin Emails Setup
- [ ] Open Firebase Console: https://console.firebase.google.com
- [ ] Select project: **aios-portal**
- [ ] Go to **Firestore Database**
- [ ] Click **+ Start Collection**
- [ ] Collection ID: `admins`
- [ ] Click **Next**
- [ ] Document ID: `emails`
- [ ] Click **Next**
- [ ] Click **+ Add field**
- [ ] Field name: `list`
- [ ] Type: **Array**
- [ ] Click **+ Add element**
- [ ] Type: **String**
- [ ] Value: Enter your email (e.g., `admin@aios.com`)
- [ ] Click **✓** to confirm
- [ ] Click **Save**

**Result:** `admins/emails` document created with your email in the `list` array ✅

---

### Part 2: User Documents Setup

#### Step 1: Get Your Firebase UID
- [ ] In Firebase Console, go to **Authentication** (left sidebar)
- [ ] Click **Users** tab
- [ ] Find your user in the list
- [ ] Copy the **UID** (long string)
- [ ] Save it somewhere (you'll need it in next step)

#### Step 2: Create User Document
- [ ] Go back to **Firestore Database**
- [ ] Click **+ Start Collection**
- [ ] Collection ID: `users`
- [ ] Click **Next**
- [ ] Document ID: Paste the **UID** you copied
- [ ] Click **Next**
- [ ] Click **+ Add field**
- [ ] Field name: `studentId`
- [ ] Type: **String**
- [ ] Value: Enter student ID (e.g., `26MYAIOS00014`)
- [ ] Click **✓** to confirm
- [ ] Click **+ Add field** again
- [ ] Field name: `email`
- [ ] Type: **String**
- [ ] Value: Enter your email
- [ ] Click **✓** to confirm
- [ ] Click **Save**

**Result:** `users/{UID}` document created with `studentId` and `email` ✅

#### Step 3: Repeat for Each Student User
- [ ] Repeat Steps 1-2 for each student user
- [ ] Each user needs their own document with their unique UID

---

### Part 3: Verify Student Records

- [ ] Go to **Firestore Database**
- [ ] Find **students** collection
- [ ] Click on a student document
- [ ] Verify it has these fields:
  - [ ] `name` (String)
  - [ ] `studentId` (String)
  - [ ] `email` (String)
  - [ ] `personalDetails` (Object/Map)
  - [ ] `academicDetails` (Object/Map)
- [ ] If any field is missing, click **+ Add field** to add it
- [ ] Repeat for each student

**Result:** All student records have required fields ✅

---

### Part 4: Test the Setup

#### Test as Admin
- [ ] Go to your app: `http://localhost:3000`
- [ ] Log in with your **admin email**
- [ ] You should see the **admin dashboard**
- [ ] You should see all students in the list
- [ ] Click on a student to view their details
- [ ] No "Missing or insufficient permissions" error
- [ ] Click **Edit** button
- [ ] You should be able to edit the student record
- [ ] Click **Save Changes**
- [ ] Changes should be saved successfully

**Result:** Admin access works perfectly ✅

#### Test as Student
- [ ] Log out
- [ ] Log in with a **student email** (one that has a `users/{uid}` document)
- [ ] You should see the **student dashboard**
- [ ] You should see only your own student record
- [ ] You should be able to view your profile
- [ ] No "Missing or insufficient permissions" error

**Result:** Student access works perfectly ✅

---

## 🎯 Field Name Reference

### Must Use Exact Names (Case-Sensitive!)

#### In `admins/emails`:
```
list (Array of Strings)
```

#### In `users/{uid}`:
```
studentId (String)
email (String)
```

#### In `students/{studentId}`:
```
name (String)
studentId (String)
email (String)
personalDetails (Object)
academicDetails (Object)
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Missing or insufficient permissions"

**Check these in order:**

1. Is your email in `admins/emails.list`?
   - [ ] Go to `admins/emails` document
   - [ ] Check the `list` array
   - [ ] Your email should be there
   - [ ] If not, add it

2. Does `users/{uid}` document exist?
   - [ ] Go to `users` collection
   - [ ] Look for your Firebase UID
   - [ ] If not found, create it with `studentId` and `email`

3. Are field names correct?
   - [ ] Check spelling: `studentId` (not `StudentId`)
   - [ ] Check spelling: `email` (not `Email`)
   - [ ] Check spelling: `list` (not `List`)

4. Did you log out and log back in?
   - [ ] Log out completely
   - [ ] Close the browser tab
   - [ ] Log back in
   - [ ] Try again

### Issue 2: Can't Find Firebase UID

**Solution:**
1. Go to Firebase Console
2. Click **Authentication** (left sidebar)
3. Click **Users** tab
4. Find your user in the list
5. The **UID** is shown next to the user's email
6. Click the copy icon to copy it

### Issue 3: Field Names Not Recognized

**Check:**
- [ ] Is it spelled correctly? (Case-sensitive!)
- [ ] `studentId` ← lowercase 's', uppercase 'I'
- [ ] `email` ← all lowercase
- [ ] `personalDetails` ← camelCase
- [ ] `academicDetails` ← camelCase

### Issue 4: Still Not Working After All Checks

**Try this:**
1. Open browser console: **F12 → Console tab**
2. Look for error messages
3. Screenshot the error
4. Check which collection/document is mentioned
5. Verify that document exists in Firestore
6. Make sure all field names match exactly

---

## ✅ Final Verification

Before you're done, verify:

- [ ] `admins/emails` document exists
- [ ] Your email is in `admins/emails.list` array
- [ ] `users` collection exists
- [ ] `users/{uid}` document exists for your user
- [ ] `users/{uid}` has `studentId` and `email` fields
- [ ] `students` collection exists
- [ ] Student documents have all required fields
- [ ] All field names are spelled correctly
- [ ] You can log in as admin without errors
- [ ] You can see all students as admin
- [ ] You can edit students as admin
- [ ] You can log in as student without errors
- [ ] You can see only your record as student

---

## 🎉 You're Done!

If all checkboxes are checked, your Firebase setup is complete and the app should work perfectly!

**Next:** Log in and start using the app! 🚀
