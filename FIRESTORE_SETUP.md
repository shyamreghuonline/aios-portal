# Firestore Security Rules Setup Guide

This guide explains how to properly set up Firestore security rules for production.

## Prerequisites
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project initialized (`firebase init`)
- Admin access to your Firebase project

## Setup Steps

### 1. Deploy Security Rules

The `firestore.rules` file contains production-ready security rules. To deploy:

```bash
# Login to Firebase (if not already logged in)
firebase login

# Deploy the rules
firebase deploy --only firestore:rules
```

### 2. Create Admin Emails Document

The security rules reference an `admins/emails` document. Create it in Firestore:

1. Go to Firebase Console → Firestore Database
2. Create a new collection called `admins`
3. Create a document with ID `emails`
4. Add a field `list` (array type) with your admin email addresses

**Example:**
```
Collection: admins
Document: emails
Field: list (array)
Values: ["admin@example.com", "admin2@example.com"]
```

### 3. Create User Documents (Optional but Recommended)

For students to access their own data, create user documents:

```
Collection: users
Document: {uid} (Firebase Auth UID)
Fields:
  - studentId: "26MYAIOS00013"
  - email: "student@example.com"
  - role: "student"
```

## Security Rules Breakdown

### Admin Access
- Admins (emails in `admins/emails`) can read/write all collections
- Admins can create, update, and delete students and payments

### Student Access
- Students can read their own student profile
- Students can read their own payments
- Students can update their profile only if `profileEditEnabled` is true
- Students cannot access other students' data

### Public Access
- All other access is denied by default
- Unauthenticated users cannot access any data

## Testing Rules

### In Firebase Console
1. Go to Firestore → Rules
2. Click "Rules playground"
3. Test read/write operations with different user contexts

### In Code
The application handles authentication via Firebase Auth. Make sure:
1. Users are properly authenticated before accessing data
2. Admin emails are added to the `admins/emails` document
3. Student user documents are created with their student IDs

## Troubleshooting

### "Missing or insufficient permissions" Error
1. Check if user is authenticated in Firebase Auth
2. Verify admin email is in `admins/emails` document
3. Check if student document exists with correct studentId
4. Ensure `profileEditEnabled` is true for student profile updates

### Rules Not Updating
1. Run `firebase deploy --only firestore:rules` again
2. Wait a few seconds for rules to propagate
3. Clear browser cache and refresh

### Admin Can't Access Data
1. Verify email in Firebase Auth matches email in `admins/emails`
2. Check that `admins/emails` document exists
3. Ensure the `list` field is an array type

## Production Checklist

- [ ] `firestore.rules` deployed to Firebase
- [ ] `admins/emails` document created with admin emails
- [ ] User documents created for students (optional)
- [ ] Tested admin access to all collections
- [ ] Tested student access to own data only
- [ ] Verified unauthenticated users cannot access data
- [ ] Tested in production environment

## Additional Security Recommendations

1. **Enable Audit Logging**: Monitor Firestore access in Cloud Logging
2. **Use Custom Claims**: Add admin role to Firebase Auth custom claims
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Data Validation**: Validate all data before writing to Firestore
5. **Encryption**: Enable Application-level Encryption (CMEK) for sensitive data

## References
- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/start)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
