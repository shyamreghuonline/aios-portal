@echo off
REM Firestore Security Rules Setup Script for Windows
REM This script helps deploy Firestore security rules to Firebase

setlocal enabledelayedexpansion

echo.
echo 🔐 Firestore Security Rules Setup
echo ==================================
echo.

REM Check if Firebase CLI is installed
where firebase >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Firebase CLI is not installed.
    echo Install it with: npm install -g firebase-tools
    pause
    exit /b 1
)

echo ✅ Firebase CLI found
echo.

REM Check if firestore.rules exists
if not exist "firestore.rules" (
    echo ❌ firestore.rules file not found in current directory
    pause
    exit /b 1
)

echo ✅ firestore.rules file found
echo.

REM Login to Firebase
echo 🔑 Logging in to Firebase...
call firebase login

echo.
echo 📋 Deploying Firestore security rules...
call firebase deploy --only firestore:rules

echo.
echo ✅ Rules deployed successfully!
echo.
echo 📝 Next steps:
echo 1. Go to Firebase Console ^> Firestore Database
echo 2. Create a collection called 'admins'
echo 3. Create a document with ID 'emails'
echo 4. Add a field 'list' (array) with your admin email addresses
echo.
echo Example:
echo   Collection: admins
echo   Document: emails
echo   Field: list = ['admin@example.com', 'admin2@example.com']
echo.
echo For more details, see FIRESTORE_SETUP.md
echo.
pause
