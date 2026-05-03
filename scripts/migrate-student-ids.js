/**
 * Migration Script: Convert Firestore Document IDs from Phone to Student ID
 * 
 * This script migrates existing student data from using phone number as document ID
 * to using the generated studentId as document ID. It also updates all payment records
 * to reference the new studentId instead of studentPhone.
 * 
 * IMPORTANT: This is a one-time migration. Run this script after deploying the code changes.
 * Make sure to backup your data before running this script.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch, query, where, updateDoc } = require('firebase-admin/firestore');

// Replace with your Firebase service account credentials
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrateStudentIds() {
  console.log('Starting student ID migration...');
  
  try {
    // Step 1: Get all existing students
    console.log('\n1. Fetching all students...');
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    const students = [];
    
    studentsSnapshot.forEach(doc => {
      students.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    console.log(`   Found ${students.length} students`);
    
    // Step 2: Process each student
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const student of students) {
      const { id: phoneId, data } = student;
      const studentId = data.studentId;
      
      if (!studentId) {
        console.log(`   ⚠️  Skipping ${data.name} (no studentId)`);
        skippedCount++;
        continue;
      }
      
      if (studentId === phoneId) {
        console.log(`   ✓ Skipping ${data.name} (already using studentId)`);
        skippedCount++;
        continue;
      }
      
      console.log(`   🔄 Migrating ${data.name} (${phoneId} → ${studentId})`);
      
      try {
        // Check if new ID already exists
        const newDocRef = doc(db, 'students', studentId);
        const newDocSnap = await getDoc(newDocRef);
        
        if (newDocSnap.exists()) {
          console.log(`      ⚠️  Document ${studentId} already exists, skipping`);
          skippedCount++;
          continue;
        }
        
        // Create new document with studentId as ID
        await setDoc(newDocRef, {
          ...data,
          _migratedFrom: phoneId,
          _migratedAt: new Date().toISOString()
        });
        
        // Step 3: Update payment records to use studentId instead of studentPhone
        console.log(`      📝 Updating payment records...`);
        const paymentsQuery = query(collection(db, 'payments'), where('studentPhone', '==', phoneId));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        
        const batch = writeBatch(db);
        let paymentUpdateCount = 0;
        
        paymentsSnapshot.forEach(paymentDoc => {
          const paymentRef = doc(db, 'payments', paymentDoc.id);
          batch.update(paymentRef, { studentId: studentId });
          paymentUpdateCount++;
        });
        
        if (paymentUpdateCount > 0) {
          await batch.commit();
          console.log(`      ✓ Updated ${paymentUpdateCount} payment records`);
        }
        
        // Step 4: Update pending payment records
        const pendingQuery = query(collection(db, 'pendingPayments'), where('studentPhone', '==', phoneId));
        const pendingSnapshot = await getDocs(pendingQuery);
        
        const pendingBatch = writeBatch(db);
        let pendingUpdateCount = 0;
        
        pendingSnapshot.forEach(pendingDoc => {
          const pendingRef = doc(db, 'pendingPayments', pendingDoc.id);
          pendingBatch.update(pendingRef, { studentId: studentId });
          pendingUpdateCount++;
        });
        
        if (pendingUpdateCount > 0) {
          await pendingBatch.commit();
          console.log(`      ✓ Updated ${pendingUpdateCount} pending payment records`);
        }
        
        // Step 5: Delete old phone-based document
        console.log(`      🗑️  Deleting old document...`);
        await deleteDoc(doc(db, 'students', phoneId));
        
        console.log(`   ✅ Successfully migrated ${data.name}`);
        migratedCount++;
        
      } catch (error) {
        console.error(`      ❌ Error migrating ${data.name}:`, error.message);
        errorCount++;
      }
    }
    
    // Summary
    console.log('\n═══ Migration Summary ═══');
    console.log(`Total students: ${students.length}`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('\nMigration complete!');
    
    if (errorCount > 0) {
      console.log('\n⚠️  There were errors during migration. Please review the logs above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateStudentIds().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
