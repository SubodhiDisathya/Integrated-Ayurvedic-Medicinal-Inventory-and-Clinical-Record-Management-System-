const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// serviceAccountKey.json file එකේ path එක
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
console.log('🔍 Looking for file at:', serviceAccountPath);

// File එක තියෙනවද කියලා check කරන්න
if (fs.existsSync(serviceAccountPath)) {
    console.log('✅ serviceAccountKey.json file found!');
    
    try {
        // Load the service account key
        const serviceAccount = require(serviceAccountPath);
        
        // Initialize Firebase Admin
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        
        // Get Firestore database instance
        const db = admin.firestore();
        console.log('✅ Firebase Connected Successfully!');
        
        // Export for use in other files
        module.exports = { db, admin };
        
    } catch (error) {
        console.error('❌ Error initializing Firebase:', error.message);
        process.exit(1);
    }
} else {
    console.error('❌ serviceAccountKey.json file NOT found at:', serviceAccountPath);
    console.error('Please make sure the file exists in the config folder');
    process.exit(1);
}