# Production Deployment Guide

This guide covers everything needed to deploy the AIOS Portal to production with proper security.

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure all environment variables are set in your production Firebase project:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

### 2. Firestore Security Rules
Deploy production-ready security rules:

```bash
firebase deploy --only firestore:rules
```

See `FIRESTORE_SETUP.md` for detailed setup instructions.

### 3. Firebase Authentication
- Enable Email/Password authentication in Firebase Console
- Configure authorized domains for your production URL
- Set up password reset email template

### 4. Database Setup

#### Create Admin Emails Document
```
Collection: admins
Document: emails
Field: list (array)
Values: ["admin@example.com", "admin2@example.com"]
```

#### Create User Documents (Optional)
For each student, create:
```
Collection: users
Document: {firebase_uid}
Fields:
  - studentId: "26MYAIOS00013"
  - email: "student@example.com"
  - role: "student"
```

### 5. Build & Deploy

#### Build the application
```bash
npm run build
```

#### Deploy to Netlify/Vercel
```bash
# For Netlify
netlify deploy --prod

# For Vercel
vercel --prod
```

## Post-Deployment Verification

### 1. Test Admin Access
- [ ] Admin can login with email/password
- [ ] Admin can view all students
- [ ] Admin can add new students
- [ ] Admin can edit student profiles
- [ ] Admin can view all payments
- [ ] Admin can create payments

### 2. Test Student Access
- [ ] Student can login with their credentials
- [ ] Student can view their own profile
- [ ] Student can view their own payments
- [ ] Student cannot view other students' data
- [ ] Student can update profile (if enabled)

### 3. Test Security
- [ ] Unauthenticated users cannot access any data
- [ ] Students cannot access admin pages
- [ ] Students cannot modify their own data (except profile)
- [ ] Deleted students don't appear in active lists

### 4. Test Email Functionality
- [ ] Password reset emails are sent
- [ ] SMS notifications work (if configured)
- [ ] Email notifications work (if configured)

## Monitoring & Maintenance

### 1. Enable Logging
- Set up Cloud Logging in Firebase Console
- Monitor Firestore access patterns
- Alert on unusual activity

### 2. Regular Backups
- Enable automatic backups in Firestore
- Test backup restoration process
- Document backup procedures

### 3. Performance Monitoring
- Enable Firebase Performance Monitoring
- Monitor API response times
- Optimize slow queries

### 4. Security Updates
- Keep dependencies updated
- Monitor security advisories
- Review Firestore rules quarterly

## Troubleshooting

### Firebase Permission Errors
1. Verify admin email is in `admins/emails` document
2. Check that user is authenticated
3. Ensure Firestore rules are deployed
4. Check browser console for detailed error messages

### Build Failures
1. Run `npm install` to ensure dependencies are installed
2. Check Node.js version (should be 16+)
3. Verify all environment variables are set
4. Clear `.next` folder and rebuild

### Deployment Issues
1. Check deployment logs for errors
2. Verify environment variables in deployment platform
3. Test locally with `npm run dev` first
4. Check Firebase project quotas

## Support & Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/start)

## Emergency Contacts

- Firebase Support: https://firebase.google.com/support
- Next.js Community: https://github.com/vercel/next.js/discussions
- Deployment Platform Support: Check your hosting provider's support page
