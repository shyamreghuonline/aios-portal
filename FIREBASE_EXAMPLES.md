# Firebase Firestore Examples

## Complete Example Setup

### Your Email: admin@aios.com
### Student Email: student@aios.com
### Student ID: 26MYAIOS00014

---

## 1. Admin Emails Document

**Path:** `admins/emails`

```json
{
  "list": [
    "admin@aios.com",
    "teacher@aios.com"
  ]
}
```

**In Firebase Console:**
```
Collection: admins
  └─ Document: emails
      └─ Field: list (Array)
          ├─ "admin@aios.com"
          └─ "teacher@aios.com"
```

---

## 2. User Documents

### Admin User
**Path:** `users/abc123xyz789` (Firebase UID)

```json
{
  "studentId": "26MYAIOS00001",
  "email": "admin@aios.com"
}
```

### Student User
**Path:** `users/def456uvw012` (Firebase UID)

```json
{
  "studentId": "26MYAIOS00014",
  "email": "student@aios.com"
}
```

**In Firebase Console:**
```
Collection: users
  ├─ Document: abc123xyz789
  │   ├─ Field: studentId = "26MYAIOS00001"
  │   └─ Field: email = "admin@aios.com"
  │
  └─ Document: def456uvw012
      ├─ Field: studentId = "26MYAIOS00014"
      └─ Field: email = "student@aios.com"
```

---

## 3. Student Documents

**Path:** `students/26MYAIOS00014`

```json
{
  "name": "John Doe",
  "studentId": "26MYAIOS00014",
  "email": "student@aios.com",
  "phone": "+919876543210",
  "course": "B.Tech",
  "university": "North East Frontier Technical University",
  "totalFee": 80000,
  "discountAmount": 0,
  "personalDetails": {
    "dob": "2005-01-15",
    "gender": "Male",
    "bloodGroup": "O+",
    "fatherName": "Mr. Doe",
    "motherName": "Mrs. Doe",
    "guardianName": "Mr. Doe",
    "address": "123 Main Street",
    "city": "Assam",
    "state": "Assam",
    "pincode": "781001",
    "aadhaarNumber": "123456789012",
    "employmentType": "Student",
    "yearsOfExperience": "0"
  },
  "academicDetails": {
    "sslc": {
      "institution": "ABC School",
      "board": "CBSE",
      "year": "2020",
      "percentage": "85"
    },
    "plustwo": {
      "institution": "XYZ College",
      "board": "CBSE",
      "stream": "Science",
      "year": "2022",
      "percentage": "88"
    },
    "ug": {
      "institution": "North East Frontier Technical University",
      "degree": "B.Tech",
      "year": "2026",
      "percentage": "75"
    }
  }
}
```

**In Firebase Console:**
```
Collection: students
  └─ Document: 26MYAIOS00014
      ├─ name: "John Doe"
      ├─ studentId: "26MYAIOS00014"
      ├─ email: "student@aios.com"
      ├─ phone: "+919876543210"
      ├─ course: "B.Tech"
      ├─ university: "North East Frontier Technical University"
      ├─ totalFee: 80000
      ├─ discountAmount: 0
      ├─ personalDetails: {object}
      │   ├─ dob: "2005-01-15"
      │   ├─ gender: "Male"
      │   ├─ bloodGroup: "O+"
      │   ├─ fatherName: "Mr. Doe"
      │   ├─ motherName: "Mrs. Doe"
      │   ├─ guardianName: "Mr. Doe"
      │   ├─ address: "123 Main Street"
      │   ├─ city: "Assam"
      │   ├─ state: "Assam"
      │   ├─ pincode: "781001"
      │   ├─ aadhaarNumber: "123456789012"
      │   ├─ employmentType: "Student"
      │   └─ yearsOfExperience: "0"
      │
      └─ academicDetails: {object}
          ├─ sslc: {object}
          │   ├─ institution: "ABC School"
          │   ├─ board: "CBSE"
          │   ├─ year: "2020"
          │   └─ percentage: "85"
          │
          ├─ plustwo: {object}
          │   ├─ institution: "XYZ College"
          │   ├─ board: "CBSE"
          │   ├─ stream: "Science"
          │   ├─ year: "2022"
          │   └─ percentage: "88"
          │
          └─ ug: {object}
              ├─ institution: "North East Frontier Technical University"
              ├─ degree: "B.Tech"
              ├─ year: "2026"
              └─ percentage: "75"
```

---

## How It Works

### When Admin Logs In:
1. User logs in with email: `admin@aios.com`
2. Firebase creates UID: `abc123xyz789`
3. App checks: Is `admin@aios.com` in `admins/emails.list`? ✅ YES
4. App grants **ADMIN ACCESS** → Can see and edit all students

### When Student Logs In:
1. User logs in with email: `student@aios.com`
2. Firebase creates UID: `def456uvw012`
3. App checks: Is `def456uvw012` in `users` collection? ✅ YES
4. App gets `studentId` from `users/def456uvw012` → `26MYAIOS00014`
5. App grants **STUDENT ACCESS** → Can only see `students/26MYAIOS00014`

---

## Field Name Reference

### Important: Field Names are Case-Sensitive!

✅ **Correct:**
- `studentId` (camelCase)
- `personalDetails` (camelCase)
- `academicDetails` (camelCase)
- `fatherName` (camelCase)
- `aadhaarNumber` (camelCase)

❌ **Wrong:**
- `StudentId` (PascalCase)
- `student_id` (snake_case)
- `STUDENTID` (UPPERCASE)

---

## Testing Checklist

- [ ] Created `admins/emails` with your email in the `list` array
- [ ] Created `users/{uid}` document for admin user
- [ ] Created `users/{uid}` document for student user
- [ ] Verified `students/{studentId}` document exists
- [ ] All field names are spelled correctly
- [ ] Logged out and logged back in
- [ ] Admin can see all students ✅
- [ ] Student can see only their own record ✅
- [ ] No permission errors ✅

---

## Common Mistakes

### ❌ Mistake 1: Wrong Field Names
```json
// WRONG - Will cause permission errors
{
  "StudentId": "26MYAIOS00014",  // Should be "studentId"
  "Email": "student@aios.com"     // Should be "email"
}
```

### ✅ Correct
```json
{
  "studentId": "26MYAIOS00014",
  "email": "student@aios.com"
}
```

### ❌ Mistake 2: Missing `users/{uid}` Document
If you create a user in Authentication but don't create a `users/{uid}` document, the app won't know which student they are.

### ✅ Solution
Always create a `users/{uid}` document for each user with their `studentId`.

### ❌ Mistake 3: Admin Email Not in List
```json
// WRONG - Email is not in the list
{
  "list": ["other@aios.com"]
}
```

### ✅ Correct
```json
{
  "list": ["admin@aios.com", "other@aios.com"]
}
```

---

## Need the Firebase UID?

1. Go to Firebase Console
2. Click **Authentication** (left sidebar)
3. Click **Users** tab
4. Find your user
5. Copy the **UID** (long string like `abc123xyz789def456`)
6. Use this as the Document ID in the `users` collection

That's it! 🎉
