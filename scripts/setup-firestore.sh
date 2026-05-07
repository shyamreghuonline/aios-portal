#!/bin/bash

# Firestore Security Rules Setup Script
# This script helps deploy Firestore security rules to Firebase

set -e

echo "🔐 Firestore Security Rules Setup"
echo "=================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed."
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI found"
echo ""

# Check if firestore.rules exists
if [ ! -f "firestore.rules" ]; then
    echo "❌ firestore.rules file not found in current directory"
    exit 1
fi

echo "✅ firestore.rules file found"
echo ""

# Login to Firebase
echo "🔑 Logging in to Firebase..."
firebase login

echo ""
echo "📋 Deploying Firestore security rules..."
firebase deploy --only firestore:rules

echo ""
echo "✅ Rules deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Go to Firebase Console → Firestore Database"
echo "2. Create a collection called 'admins'"
echo "3. Create a document with ID 'emails'"
echo "4. Add a field 'list' (array) with your admin email addresses"
echo ""
echo "Example:"
echo "  Collection: admins"
echo "  Document: emails"
echo "  Field: list = ['admin@example.com', 'admin2@example.com']"
echo ""
echo "For more details, see FIRESTORE_SETUP.md"
